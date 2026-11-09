import json

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Offre
from ..schemas import OffreCreate, OffreOut

router = APIRouter(prefix="/api/offres", tags=["Offres"])


@router.post("", response_model=OffreOut, status_code=status.HTTP_201_CREATED)
def creer_offre(payload: OffreCreate, db: Session = Depends(get_db)):
    """Étape 1 : enregistre l'offre d'emploi saisie dans le formulaire."""
    offre = Offre(
        titre=payload.titre,
        description=payload.description,
        competences_json=json.dumps(payload.competences, ensure_ascii=False),
        experience=payload.experience,
        niveau_etudes=payload.niveau_etudes,
    )
    db.add(offre)
    db.commit()
    db.refresh(offre)
    return offre
