
import json

from .gemini_service import generate_response


def extract_cv_data(cv_text: str) -> dict:
    """
    Extract structured candidate information from CV text using Gemini.
    """

    if not cv_text or not cv_text.strip():
        raise ValueError("CV text is empty.")

    prompt = f"""
You are an expert CV information extraction assistant.

Your task is to extract candidate information from the CV below.

IMPORTANT RULES:
- Extract only information explicitly present in the CV.
- Never invent or assume information.
- Use null when a single value is missing.
- Use an empty list when a list of values is missing.
- Return valid JSON only. Do not include Markdown or explanations.
- Write the extracted information in French when appropriate.

Expected JSON structure:

{{
    "nom": null,
    "email": null,
    "telephone": null,
    "poste": null,
    "profil": null,
    "annees_experience": null,
    "experiences": [
        {{
            "poste": null,
            "entreprise": null,
            "periode": null,
            "description": null
        }}
    ],
    "niveau_etudes": null,
    "formations": [],
    "competences_techniques": [],
    "competences_transversales": []
}}

CV TEXT:
\"\"\"
{cv_text}
\"\"\"
"""

    response = generate_response(prompt)

    # Remove Markdown code fences if Gemini returns them.
    response = response.strip()

    if response.startswith("```"):
        response = response.split("\n", 1)[1]
        response = response.rsplit("```", 1)[0].strip()

    try:
        data = json.loads(response)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Gemini returned invalid JSON: {error}"
        ) from error

    if not isinstance(data, dict):
        raise ValueError("Gemini response must be a JSON object.")

    return data
