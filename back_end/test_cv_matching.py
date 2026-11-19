
from back_end.app.services.cv_matching_service import match_cv_with_offer
from back_end.app.services.cv_parser import parse_cv


# Example CV text (simulates the output of PyMuPDF)
cv_text = """
Anas Zahraoui
FULL STACK SOFTWARE ENGINEER

PROFIL PROFESSIONNEL
Full Stack developer with 4 years of experience in web application development.

COMPETENCES
React, TypeScript, Node.js, FastAPI, MySQL, Git, Docker

EXPERIENCE PROFESSIONNELLE
Full Stack Developer - 2022-2026

FORMATION
Master en informatique - Bac+5
"""

# Step 1: Structure the CV using your existing parser
parsed_cv = parse_cv(cv_text, "Anas_Zahraoui.pdf")


# Step 2: Define the job offer
offre = {
    "titre": "Développeur Full Stack Junior",
    "description": (
        "Development of web applications, REST APIs, "
        "frontend and backend solutions."
    ),
    "competences": [
        "Java",
        "Spring Boot",
        "React",
        "JavaScript",
        "SQL",
        "Git",
        "Docker"
    ],
    "experience": "1 to 2 years",
    "niveau_etudes": "Bac+3 minimum"
}


# Step 3: Compare the CV with the offer using Gemini
result = match_cv_with_offer(parsed_cv, offre)


# Step 4: Display the result
print("\n========== GEMINI MATCHING RESULT ==========")
print(f"Candidate: {parsed_cv.nom}")
print(f"Score: {result['score']}/100")
print(f"Category: {result['category']}")
print(f"Matching skills: {result['matching_skills']}")
print(f"Missing skills: {result['missing_skills']}")
print(f"Experience match: {result['experience_match']}")
print(f"Education match: {result['education_match']}")
print(f"Justification: {result['justification']}")
print("============================================")
