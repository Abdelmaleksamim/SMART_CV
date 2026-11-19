
import json
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import WithJsonSchema
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Cv, Offre
from ..schemas import CvDetail, CvResult, CvUploadOut
from ..services.cv_parser import parse_cv
from ..services.pdf_extractor import extract_text
from ..services.cv_matching_service import match_cv_with_offer
from ..services.json_store import export_offre_json
from ..services.file_storage import (
    save_temp_pdf,
    verify_file_access,
    cleanup_temp_file,
)


router = APIRouter(prefix="/api/offres", tags=["CV"])

MAX_SIZE = 5 * 1024 * 1024  # 5 MB per file
MAX_FILES = 50

PDFUploadFile = Annotated[
    UploadFile,
    WithJsonSchema({
        "type": "string",
        "format": "binary"
    })
]


@router.post(
    "/{offre_id}/cvs",
    response_model=CvUploadOut,
    status_code=status.HTTP_201_CREATED
)
async def importer_cvs(
    offre_id: int,
    files: list[PDFUploadFile] = File(
        ...,
        description="Un ou plusieurs CV au format PDF"
    ),
    db: Session = Depends(get_db),
):
    """Import CVs, extract and structure them, then compare them with the job offer."""

    # 1. Retrieve the job offer
    offre = db.get(Offre, offre_id)

    if not offre:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Offre introuvable."
        )

    # 2. Validate the number of uploaded files
    if len(files) > MAX_FILES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Maximum {MAX_FILES} CV par import."
        )

    resultats: list[CvResult] = []

    try:
        for f in files:
            name = f.filename or "sans_nom.pdf"
            temp_path_str = None

            try:
                # 3. Save PDF temporarily on disk
                temp_path_str = save_temp_pdf(f)
                temp_path = Path(temp_path_str)

                # 4. Verify temporary file accessibility
                if not verify_file_access(temp_path_str):
                    resultats.append(
                        CvResult(
                            nom_fichier=name,
                            taille=0,
                            statut="rejete",
                            message="Fichier temporaire inaccessible."
                        )
                    )
                    continue

                file_size = temp_path.stat().st_size

                # 5. Validate file size
                if file_size > MAX_SIZE:
                    resultats.append(
                        CvResult(
                            nom_fichier=name,
                            taille=file_size,
                            statut="rejete",
                            message="Fichier supérieur à 5 Mo."
                        )
                    )
                    continue

                # 6. Read PDF from disk
                with open(temp_path, "rb") as bf:
                    file_data = bf.read()

                # 7. Validate PDF format
                if not file_data.startswith(b"%PDF"):
                    resultats.append(
                        CvResult(
                            nom_fichier=name,
                            taille=file_size,
                            statut="rejete",
                            message="Format non accepté (PDF uniquement)."
                        )
                    )
                    continue

                # 8. Extract raw text using PyMuPDF
                ex = extract_text(file_data)

                # 9. Structure extracted text using our existing parser
                parsed_cv = None
                message = ex.message

                if ex.statut == "extrait":
                    try:
                        parsed_cv = parse_cv(ex.texte, name)

                    except Exception as error:
                        print(f"CV parsing error: {error}")
                        message = (
                            "Texte extrait, mais analyse du CV impossible."
                        )

                # 10. Compare the structured CV with the job offer
                matching_result = None

                if parsed_cv is not None:
                    try:
                        matching_result = match_cv_with_offer(
                            parsed_cv,
                            offre
                        )

                    except Exception as error:
                        # Keep the extracted CV even if Gemini fails
                        print(f"Gemini matching error: {error}")
                        message = (
                            "CV extrait, mais comparaison Gemini indisponible."
                        )

                # 11. Save candidate information and matching results
                cv = Cv(
                    offre_id=offre_id,
                    nom_fichier=name,
                    taille=file_size,
                    nb_pages=ex.nb_pages,
                    statut=ex.statut,
                    message=message,

                    # Personal information
                    nom_candidat=(
                        parsed_cv.nom if parsed_cv else None
                    ),
                    email=None,
                    telephone=None,

                    # Professional information
                    poste=(
                        parsed_cv.poste if parsed_cv else None
                    ),
                    profil=(
                        parsed_cv.profil if parsed_cv else None
                    ),
                    experience_texte=(
                        parsed_cv.experience_texte if parsed_cv else None
                    ),
                    annees_experience=(
                        parsed_cv.annees_experience if parsed_cv else None
                    ),

                    # Education
                    niveau_etudes=(
                        parsed_cv.niveau_etudes if parsed_cv else None
                    ),
                    formations_json="[]",

                    # Skills
                    competences_json=json.dumps(
                        parsed_cv.competences if parsed_cv else [],
                        ensure_ascii=False
                    ),
                    competences_transversales_json="[]",

                    # Gemini matching results
                    score=(
                        matching_result["score"]
                        if matching_result else None
                    ),
                    categorie=(
                        matching_result["category"]
                        if matching_result else None
                    ),
                    matching_skills_json=json.dumps(
                        matching_result["matching_skills"]
                        if matching_result else [],
                        ensure_ascii=False
                    ),
                    missing_skills_json=json.dumps(
                        matching_result["missing_skills"]
                        if matching_result else [],
                        ensure_ascii=False
                    ),
                    experience_match=(
                        matching_result["experience_match"]
                        if matching_result else None
                    ),
                    education_match=(
                        matching_result["education_match"]
                        if matching_result else None
                    ),
                    justification=(
                        matching_result["justification"]
                        if matching_result else None
                    ),
                )

                db.add(cv)
                db.flush()

                # 12. Add upload result
                resultats.append(
                    CvResult(
                        id=cv.id,
                        nom_fichier=name,
                        taille=file_size,
                        nb_pages=ex.nb_pages,
                        statut=ex.statut,
                        message=message,
                        nb_caracteres=len(ex.texte),
                        nom_candidat=cv.nom_candidat,
                        poste=cv.poste
                    )
                )

            except HTTPException as error:
                resultats.append(
                    CvResult(
                        nom_fichier=name,
                        taille=0,
                        statut="rejete",
                        message=str(error.detail)
                    )
                )

            finally:
                # 13. Always clean up temporary PDF
                if temp_path_str:
                    cleanup_temp_file(temp_path_str)

        # 14. Commit all candidate records
        db.commit()

    except Exception:
        db.rollback()
        raise

    # 15. Update global JSON export
    export_offre_json(db, offre_id)

    rejetes = sum(
        1 for result in resultats
        if result.statut == "rejete"
    )

    return CvUploadOut(
        offre_id=offre_id,
        total=len(resultats),
        importes=len(resultats) - rejetes,
        rejetes=rejetes,
        resultats=resultats
    )


@router.get(
    "/{offre_id}/cvs",
    response_model=list[CvDetail]
)
def lister_cvs(
    offre_id: int,
    db: Session = Depends(get_db)
):
    """Return CVs belonging to a job offer with structured information."""

    # 1. Verify that the job offer exists
    if not db.get(Offre, offre_id):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Offre introuvable."
        )

    # 2. Retrieve CVs belonging to the offer
    return (
        db.query(Cv)
        .filter(Cv.offre_id == offre_id)
        .order_by(Cv.id)
        .all()
    )
