from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Cv, Offre
from ..schemas import CvDetail, CvResult, CvUploadOut
import json

from ..services.cv_parser import parse_cv
from ..services.pdf_extractor import extract_text
from ..services.json_store import export_offre_json

router = APIRouter(prefix="/api/offres", tags=["CV"])

MAX_SIZE = 5 * 1024 * 1024  # 5 Mo par fichier
MAX_FILES = 50


@router.post("/{offre_id}/cvs", response_model=CvUploadOut, status_code=status.HTTP_201_CREATED)
async def importer_cvs(
    offre_id: int,
    files: list[UploadFile] = File(..., description="Un ou plusieurs CV au format PDF"),
    db: Session = Depends(get_db),
):
    """Étape 2 : reçoit tous les PDF, extrait le texte de chacun et l'enregistre."""
    if not db.get(Offre, offre_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    if len(files) > MAX_FILES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Maximum {MAX_FILES} CV par import.")

    resultats: list[CvResult] = []
    for f in files:
        data = await f.read()
        name = f.filename or "sans_nom.pdf"

        if len(data) > MAX_SIZE:
            resultats.append(CvResult(nom_fichier=name, taille=len(data), statut="rejete", message="Fichier supérieur à 5 Mo."))
            continue
        if not data.startswith(b"%PDF"):
            resultats.append(CvResult(nom_fichier=name, taille=len(data), statut="rejete", message="Format non accepté (PDF uniquement)."))
            continue

        ex = extract_text(data)
        parsed = parse_cv(ex.texte, name) if ex.statut == "extrait" else None
        cv = Cv(
            offre_id=offre_id,
            nom_fichier=name,
            taille=len(data),
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
        db.flush()  # obtient cv.id
        resultats.append(
            CvResult(id=cv.id, nom_fichier=name, taille=len(data), nb_pages=ex.nb_pages,
                     statut=ex.statut, message=ex.message, nb_caracteres=len(ex.texte),
                     nom_candidat=cv.nom_candidat, poste=cv.poste)
        )
    db.commit()

    export_offre_json(db, offre_id)  # réécrit data/offre_{id}.json avec tous les CV 'extrait' de l'offre

    rejetes = sum(1 for r in resultats if r.statut == "rejete")
    return CvUploadOut(offre_id=offre_id, total=len(resultats), importes=len(resultats) - rejetes,
                       rejetes=rejetes, resultats=resultats)


@router.get("/{offre_id}/cvs", response_model=list[CvDetail])
def lister_cvs(offre_id: int, db: Session = Depends(get_db)):
    """Retourne les CV d'une offre avec leurs informations structurées."""
    if not db.get(Offre, offre_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    return db.query(Cv).filter(Cv.offre_id == offre_id).order_by(Cv.id).all()
