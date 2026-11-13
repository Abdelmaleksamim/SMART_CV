import json

from fastapi import APIRouter, Depends, HTTPException, status
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


@router.get("", response_model=list[OffreOut])
def lister_offres(db: Session = Depends(get_db)):
    """Liste les offres (à filtrer par propriétaire après activation de l'authentification)."""
    return db.query(Offre).order_by(Offre.created_at.desc()).all()


@router.put("/{offre_id}", response_model=OffreOut)
def modifier_offre(offre_id: int, payload: OffreCreate, db: Session = Depends(get_db)):
    """Met à jour une offre existante."""
    offre = db.get(Offre, offre_id)
    if not offre:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    offre.titre = payload.titre
    offre.description = payload.description
    offre.competences_json = json.dumps(payload.competences, ensure_ascii=False)
    offre.experience = payload.experience
    offre.niveau_etudes = payload.niveau_etudes
    db.commit()
    db.refresh(offre)
    return offre


@router.delete("/{offre_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_offre(offre_id: int, db: Session = Depends(get_db)):
    """Supprime une offre et les CV importés qui lui sont liés."""
    offre = db.get(Offre, offre_id)
    if not offre:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offre introuvable.")
    db.delete(offre)
    db.commit()
