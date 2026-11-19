
from app.services.gemini_service import generate_response

response = generate_response(
    "Say hello and introduce yourself in one sentence."
)

print(response)
