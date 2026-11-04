"""US03 — Lecture des PDF avec PyMuPDF et extraction du texte de chaque CV."""
from dataclasses import dataclass

import pymupdf as fitz  # PyMuPDF

MIN_CHARS = 50          # en dessous : PDF considéré comme vide (scan, image seule…)
MIN_READABLE_RATIO = 0.6  # part de caractères lisibles attendue


@dataclass
class Extraction:
    statut: str  # extrait | vide | illisible
    texte: str = ""
    nb_pages: int = 0
    message: str | None = None


def _readable_ratio(text: str) -> float:
    visible = [c for c in text if not c.isspace()]
    if not visible:
        return 0.0
    ok = sum(1 for c in visible if c.isalnum() or c in ".,;:!?()-_/@+#%&'’\"")
    return ok / len(visible)


def extract_text(data: bytes) -> Extraction:
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception:
        return Extraction("illisible", message="Fichier PDF corrompu ou impossible à ouvrir.")

    with doc:
        if doc.needs_pass:
            return Extraction("illisible", nb_pages=doc.page_count, message="PDF protégé par mot de passe.")
        try:
            pages = [page.get_text("text") for page in doc]
        except Exception:
            return Extraction("illisible", nb_pages=doc.page_count, message="Erreur pendant la lecture du contenu.")
        nb_pages = doc.page_count

    text = "\n".join(p.strip() for p in pages if p.strip()).strip()

    if len(text) < MIN_CHARS:
        return Extraction("vide", text, nb_pages, "Aucun texte exploitable (PDF scanné ou composé d’images).")
    if "\ufffd" in text and text.count("\ufffd") / len(text) > 0.1 or _readable_ratio(text) < MIN_READABLE_RATIO:
        return Extraction("illisible", "", nb_pages, "Le texte extrait est illisible (encodage non reconnu).")

    return Extraction("extrait", text, nb_pages)
