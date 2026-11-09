import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from ..models import Cv

DATA_DIR = Path("data")


def export_offre_json(db: Session, offre_id: int) -> Path:
    """Réécrit data/offre_{id}.json avec tous les CV 'extrait' de l'offre."""
    DATA_DIR.mkdir(exist_ok=True)
    cvs = (
        db.query(Cv)
        .filter(Cv.offre_id == offre_id, Cv.statut == "extrait")
        .order_by(Cv.id)
        .all()
    )
    payload = {
        "offre_id": offre_id,
        "mis_a_jour": datetime.now(timezone.utc).isoformat(),
        "total": len(cvs),
        "candidats": [
            {
                "id": c.id,
                "nom_fichier": c.nom_fichier,
                "nom_candidat": c.nom_candidat,
                "poste": c.poste,
                "profil": c.profil,
                "competences": c.competences,
                "experience": c.experience_texte,
                "annees_experience": c.annees_experience,
                "niveau_etudes": c.niveau_etudes,
                "nb_pages": c.nb_pages,
            }
            for c in cvs
        ],
    }
    path = DATA_DIR / f"offre_{offre_id}.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)  # écriture atomique : pas de fichier à moitié écrit
    return path