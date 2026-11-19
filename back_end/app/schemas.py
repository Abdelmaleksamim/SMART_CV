from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class OffreCreate(BaseModel):
    titre: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    competences: list[str] = Field(min_length=1)
    experience: str
    niveau_etudes: str

    @field_validator("titre", "description")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Ce champ est obligatoire.")
        return v

    @field_validator("competences")
    @classmethod
    def clean_skills(cls, v: list[str]) -> list[str]:
        seen, out = set(), []
        for s in (x.strip() for x in v):
            if s and s.lower() not in seen:
                seen.add(s.lower())
                out.append(s)
        if not out:
            raise ValueError("Ajoutez au moins une compétence.")
        return out


class OffreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titre: str
    description: str
    competences: list[str]
    experience: str
    niveau_etudes: str
    created_at: datetime


class CvResult(BaseModel):
    id: int | None = None  # None si le fichier a été rejeté
    nom_fichier: str
    taille: int
    nb_pages: int = 0
    statut: str  # extrait | vide | illisible | rejete
    message: str | None = None
    nb_caracteres: int = 0
    nom_candidat: str | None = None
    poste: str | None = None


class CvUploadOut(BaseModel):
    offre_id: int
    total: int
    importes: int
    rejetes: int
    resultats: list[CvResult]




class CvDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nom_fichier: str
    nb_pages: int
    statut: str
    message: str | None = None

    # Personal information
    nom_candidat: str | None = None
    email: str | None = None
    telephone: str | None = None

    # Professional information
    poste: str | None = None
    profil: str | None = None
    experience_texte: str | None = None
    annees_experience: int | None = None

    # Education
    niveau_etudes: str | None = None
    formations: list = Field(default_factory=list)

    # Skills
    competences: list[str] = Field(default_factory=list)
    competences_transversales: list[str] = Field(default_factory=list)

    # Gemini matching results
    score: int | None = None
    categorie: str | None = None
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    experience_match: bool | None = None
    education_match: bool | None = None
    justification: str | None = None
