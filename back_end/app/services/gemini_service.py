
import os

from pathlib import Path

from dotenv import load_dotenv
from google import genai

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from the .env file")

client = genai.Client(api_key=GEMINI_API_KEY)


def generate_response(prompt: str) -> str:
    """
    Send a prompt to Gemini and return its text response.
    """
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )

    return response.text or ""
