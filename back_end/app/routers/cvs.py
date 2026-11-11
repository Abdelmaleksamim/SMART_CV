import json
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Cv, Offre
from ..schemas import CvDetail, CvResult, CvUploadOut
from typing import Annotated
from pydantic import WithJsonSchema
from ..services.cv_parser import parse_cv
from ..services.pdf_extractor import extract_text
from ..services.json_store import export_offre_json
from ..services.file_storage import save_temp_pdf, verify_file_access, cleanup_temp_file

router = APIRouter(prefix="/api/offres", tags=["CV"])

MAX_SIZE = 5 * 1024 * 1024  # 5 Mo par fichier
MAX_FILES = 50

PDFUploadFile = Annotated[
    UploadFile,
    WithJsonSchema({
        "type": "string",
        "format": "binary"
    })
]

@router.post("/{offre_id}/cvs", response_model=CvUploadOut, status_code=status.HTTP_201_CREATED)
async def importer_cvs(
    offre_id: int,
    files: list[PDFUploadFile] = File(
    ...,
    description="Un ou plusieurs CV au format PDF"
),
    db: Session = Depends(get_db),
):
    """Importation, stockage temporaire sur disque (EN02), extraction depuis le disque et export JSON."""
    if not db.get(Offre, offre_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    if len(files) > MAX_FILES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Maximum {MAX_FILES} CV par import.")

    resultats: list[CvResult] = []
    
    for f in files:
        name = f.filename or "sans_nom.pdf"
        
        # 1. EN02 : Sauvegarde physique temporaire directe sur disque (avec nom unique UUID)
        try:
            temp_path_str = save_temp_pdf(f)
            temp_path = Path(temp_path_str)
        except HTTPException as he:
            resultats.append(CvResult(nom_fichier=name, taille=0, statut="rejete", message=he.detail))
            continue

        # 2. EN02-T03 : Vérification de la disponibilité et de l'accès au fichier sur le disque
        if not verify_file_access(temp_path_str):
            cleanup_temp_file(temp_path_str)
            resultats.append(CvResult(nom_fichier=name, taille=0, statut="rejete", message="Fichier temporaire inaccessible."))
            continue

        file_size = temp_path.stat().st_size

        # 3. Validation de la taille directement depuis le fichier disque
        if file_size > MAX_SIZE:
            cleanup_temp_file(temp_path_str)
            resultats.append(CvResult(nom_fichier=name, taille=file_size, statut="rejete", message="Fichier supérieur à 5 Mo."))
            continue

        # 4. Lecture du fichier depuis le disque pour analyse
        with open(temp_path, "rb") as bf:
            file_data = bf.read()

        if not file_data.startswith(b"%PDF"):
            cleanup_temp_file(temp_path_str)
            resultats.append(CvResult(nom_fichier=name, taille=file_size, statut="rejete", message="Format non accepté (PDF uniquement)."))
            continue

        # 5. Extraction du texte et parsing
        ex = extract_text(file_data)
        parsed = parse_cv(ex.texte, name) if ex.statut == "extrait" else None
        
        # 6. Enregistrement en base de données
        cv = Cv(
            offre_id=offre_id,
            nom_fichier=name,
            taille=file_size,
            nb_pages=ex.nb_pages,
            statut=ex.statut,
            message=ex.message,
            nom_candidat=parsed.nom if parsed else None,
            poste=parsed.poste if parsed else None,
            profil=parsed.profil if parsed else None,
            competences_json=json.dumps(parsed.competences if parsed else [], ensure_ascii=False),
            experience_texte=parsed.experience_texte if parsed else None,
            annees_experience=parsed.annees_experience if parsed else None,
            niveau_etudes=parsed.niveau_etudes if parsed else None,
        )
        db.add(cv)
        db.flush()  # Récupération de cv.id
        
        resultats.append(
            CvResult(
                id=cv.id, 
                nom_fichier=name, 
                taille=file_size, 
                nb_pages=ex.nb_pages,
                statut=ex.statut, 
                message=ex.message, 
                nb_caracteres=len(ex.texte),
                nom_candidat=cv.nom_candidat, 
                poste=cv.poste
            )
        )
        
        # 7. Nettoyage du fichier temporaire du disque après traitement
        cleanup_temp_file(temp_path_str)

    db.commit()
    
    # 8. Mise à jour de l'export JSON global de l'offre
    export_offre_json(db, offre_id)

    rejetes = sum(1 for r in resultats if r.statut == "rejete")
    return CvUploadOut(
        offre_id=offre_id, 
        total=len(resultats), 
        importes=len(resultats) - rejetes,
        rejetes=rejetes, 
        resultats=resultats
    )


@router.get("/{offre_id}/cvs", response_model=list[CvDetail])
def lister_cvs(offre_id: int, db: Session = Depends(get_db)):
    """Retourne les CV d'une offre avec leurs informations structurées."""
    if not db.get(Offre, offre_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    return db.query(Cv).filter(Cv.offre_id == offre_id).order_by(Cv.id).all()
