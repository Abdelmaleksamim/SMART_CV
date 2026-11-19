
from app.services.cv_ai_extractor import extract_cv_data

sample_cv = """
Sofia Mansouri
Email: sofia@example.com
Telephone: 0612345678

Développeuse Full Stack avec 3 ans d'expérience.

Expérience professionnelle:
Développeuse Python chez Atlas Digital (2023-2025).
Développement d'API REST avec FastAPI.

Formation:
Master en informatique, Université Hassan II, 2022.

Compétences techniques:
Python, FastAPI, React, PostgreSQL.

Compétences transversales:
Communication, travail en équipe.
"""

result = extract_cv_data(sample_cv)

print("Extracted CV information:")
print(result)
