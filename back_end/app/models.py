
import json
from datetime import datetime, timezone

from sqlalchemy import ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now():
    return datetime.now(timezone.utc)


class Offre(Base):
    __tablename__ = "offres"

    id: Mapped[int] = mapped_column(primary_key=True)
    titre: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    competences_json: Mapped[str] = mapped_column(Text)
    experience: Mapped[str] = mapped_column(String(50))
    niveau_etudes: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    cvs: Mapped[list["Cv"]] = relationship(
        back_populates="offre",
        cascade="all, delete-orphan"
    )

    @property
    def competences(self) -> list[str]:
        return json.loads(self.competences_json or "[]")


class Cv(Base):
    __tablename__ = "cvs"

    id: Mapped[int] = mapped_column(primary_key=True)
    offre_id: Mapped[int] = mapped_column(
        ForeignKey("offres.id", ondelete="CASCADE"),
        index=True
    )
    nom_fichier: Mapped[str] = mapped_column(String(255))
    taille: Mapped[int] = mapped_column(Integer)
    nb_pages: Mapped[int] = mapped_column(Integer, default=0)
    statut: Mapped[str] = mapped_column(String(20))
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Structured information extracted from the CV
    nom_candidat: Mapped[str | None] = mapped_column(String(200), nullable=True)
    poste: Mapped[str | None] = mapped_column(String(200), nullable=True)
    profil: Mapped[str | None] = mapped_column(Text, nullable=True)
    competences_json: Mapped[str] = mapped_column(Text, default="[]")
    experience_texte: Mapped[str | None] = mapped_column(Text, nullable=True)
    annees_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    niveau_etudes: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Additional information extracted by Gemini
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    formations_json: Mapped[str] = mapped_column(Text, default="[]")
    competences_transversales_json: Mapped[str] = mapped_column(Text, default="[]")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=now
    )

    offre: Mapped[Offre] = relationship(back_populates="cvs")
    
    # Gemini CV matching results
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    categorie: Mapped[str | None] = mapped_column(String(50), nullable=True)

    matching_skills_json: Mapped[str] = mapped_column(Text, default="[]")
    missing_skills_json: Mapped[str] = mapped_column(Text, default="[]")

    experience_match: Mapped[bool | None] = mapped_column(nullable=True)
    education_match: Mapped[bool | None] = mapped_column(nullable=True)

    justification: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Convert JSON fields into Python lists
    @property
    def formations(self) -> list:
        return json.loads(self.formations_json or "[]")

    @property
    def competences_transversales(self) -> list[str]:
        return json.loads(self.competences_transversales_json or "[]")

    @property
    def competences(self) -> list[str]:
        return json.loads(self.competences_json or "[]")

    @property
    def matching_skills(self) -> list[str]:
        return json.loads(self.matching_skills_json or "[]")

    @property
    def missing_skills(self) -> list[str]:
        return json.loads(self.missing_skills_json or "[]")