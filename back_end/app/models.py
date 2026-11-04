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
    competences_json: Mapped[str] = mapped_column(Text)  # liste JSON de compétences
    experience: Mapped[str] = mapped_column(String(50))
    niveau_etudes: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    cvs: Mapped[list["Cv"]] = relationship(back_populates="offre", cascade="all, delete-orphan")

    @property
    def competences(self) -> list[str]:
        return json.loads(self.competences_json)


class Cv(Base):
    __tablename__ = "cvs"

    id: Mapped[int] = mapped_column(primary_key=True)
    offre_id: Mapped[int] = mapped_column(ForeignKey("offres.id", ondelete="CASCADE"), index=True)
    nom_fichier: Mapped[str] = mapped_column(String(255))
    taille: Mapped[int] = mapped_column(Integer)
    nb_pages: Mapped[int] = mapped_column(Integer, default=0)
    statut: Mapped[str] = mapped_column(String(20))  # extrait | vide | illisible
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Données structurées (remplies seulement si statut == "extrait")
    nom_candidat: Mapped[str | None] = mapped_column(String(200), nullable=True)
    poste: Mapped[str | None] = mapped_column(String(200), nullable=True)
    profil: Mapped[str | None] = mapped_column(Text, nullable=True)
    competences_json: Mapped[str] = mapped_column(Text, default="[]")
    experience_texte: Mapped[str | None] = mapped_column(Text, nullable=True)
    annees_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    niveau_etudes: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    offre: Mapped[Offre] = relationship(back_populates="cvs")

    @property
    def competences(self) -> list[str]:
        return json.loads(self.competences_json or "[]")
