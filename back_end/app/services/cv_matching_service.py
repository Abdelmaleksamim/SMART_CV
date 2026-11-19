
import json
import re
from collections.abc import Mapping

from .gemini_service import generate_response


def _get_value(obj, field, default=None):
    """Read a value from a dictionary or an object."""
    if isinstance(obj, Mapping):
        return obj.get(field, default)
    return getattr(obj, field, default)


def _category_from_score(score: int) -> str:
    """Assign a relevance category based on the matching score."""
    if score >= 80:
        return "Très pertinent"
    if score >= 60:
        return "Pertinent"
    if score >= 40:
        return "Moyennement pertinent"
    return "Peu pertinent"


def _extract_json(response: str) -> dict:
    """Extract JSON from Gemini's response."""
    response = response.strip()

    # Remove Markdown code fences if Gemini includes them
    response = re.sub(r"^```(?:json)?\s*", "", response)
    response = re.sub(r"\s*```$", "", response)

    try:
        return json.loads(response)
    except json.JSONDecodeError:
        # Try to find a JSON object inside the response
        match = re.search(r"\{.*\}", response, flags=re.DOTALL)

        if not match:
            raise ValueError("Gemini did not return valid JSON.")

        return json.loads(match.group(0))


def match_cv_with_offer(cv, offre) -> dict:
    """
    Compare a structured CV with a job offer using Gemini.

    Args:
        cv: Parsed CV or CV model object.
        offre: Job offer model object or dictionary.

    Returns:
        Matching score, skills, experience, education and justification.
    """

    cv_data = {
        "nom": _get_value(cv, "nom") or _get_value(cv, "nom_candidat"),
        "poste": _get_value(cv, "poste"),
        "profil": _get_value(cv, "profil"),
        "competences": _get_value(cv, "competences", []) or [],
        "experience_texte": _get_value(cv, "experience_texte"),
        "annees_experience": _get_value(cv, "annees_experience"),
        "niveau_etudes": _get_value(cv, "niveau_etudes"),
    }

    offer_data = {
        "titre": _get_value(offre, "titre"),
        "description": _get_value(offre, "description"),
        "competences": _get_value(offre, "competences", []) or [],
        "experience": _get_value(offre, "experience"),
        "niveau_etudes": _get_value(offre, "niveau_etudes"),
    }

    prompt = f"""
Tu es un expert en recrutement et en analyse de CV.

Ta mission est de comparer le CV structuré d'un candidat avec une offre
d'emploi et d'évaluer la pertinence du candidat pour ce poste.

IMPORTANT :
- Les informations du CV sont tes seules preuves concernant le candidat.
- N'invente aucune compétence, expérience ou formation.
- Ne pénalise pas un candidat simplement parce qu'une information est absente.
- Accepte les compétences équivalentes ou les technologies similaires
  lorsqu'elles sont réellement pertinentes.
- Évalue les compétences, l'expérience et le niveau d'études.
- Le score doit être compris entre 0 et 100.
- Donne une justification claire et basée sur les informations disponibles.
- Retourne uniquement un objet JSON valide, sans Markdown.

OFFRE D'EMPLOI :
{json.dumps(offer_data, ensure_ascii=False, indent=2)}

CV DU CANDIDAT :
{json.dumps(cv_data, ensure_ascii=False, indent=2)}

Retourne exactement cette structure JSON :

{{
    "score": 0,
    "matching_skills": [],
    "missing_skills": [],
    "experience_match": null,
    "education_match": null,
    "justification": ""
}}

Règles :
- score : nombre entier entre 0 et 100.
- matching_skills : compétences de l'offre présentes ou équivalentes
  dans le CV.
- missing_skills : compétences demandées mais non démontrées dans le CV.
- experience_match : true, false ou null si les informations sont insuffisantes.
- education_match : true, false ou null si les informations sont insuffisantes.
- justification : explication en français.
"""

    response = generate_response(prompt)
    result = _extract_json(response)

    # Validate and normalize the score
    score = int(result.get("score", 0))
    score = max(0, min(100, score))

    return {
        "score": score,
        "category": _category_from_score(score),
        "matching_skills": result.get("matching_skills", []),
        "missing_skills": result.get("missing_skills", []),
        "experience_match": result.get("experience_match"),
        "education_match": result.get("education_match"),
        "justification": result.get("justification", ""),
    }
