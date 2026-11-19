
"""US03 — Lecture des PDF avec PyMuPDF et extraction du texte de chaque CV."""

import re
from dataclasses import dataclass

import pymupdf as fitz


# Configuration
MIN_CHARS = 50
MIN_READABLE_RATIO = 0.6

# Minimum horizontal gap required to consider a page as two-column.
COLUMN_GAP_RATIO = 0.12

# Blocks wider than this are considered full-width blocks.
FULL_WIDTH_RATIO = 0.72


@dataclass
class Extraction:
    statut: str  # extrait | vide | illisible
    texte: str = ""
    nb_pages: int = 0
    message: str | None = None


def _readable_ratio(text: str) -> float:
    """Calculate the proportion of readable characters."""

    visible = [c for c in text if not c.isspace()]

    if not visible:
        return 0.0

    ok = sum(
        1 for c in visible
        if c.isalnum() or c in ".,;:!?()-_/@+#%&'’\""
    )

    return ok / len(visible)


def clean_candidate_name(name: str | None) -> str | None:
    """Remove document reference prefixes from a candidate name."""

    if not name or not isinstance(name, str):
        return None

    name = name.strip()

    name = re.sub(
        r"^(?:DEV|CV|REF)-\d{4}-\d+\s*[-_:]?\s*",
        "",
        name,
        flags=re.IGNORECASE
    )

    name = re.sub(r"\s+", " ", name)
    name = name.strip(" -_:")

    return name if name else None


def _extract_page_blocks(page):
    """Extract text blocks with their coordinates."""

    blocks = []

    for block in page.get_text("blocks", sort=False):
        x0, y0, x1, y1, text = block[:5]

        # Ignore image and empty blocks.
        if len(block) > 6 and block[6] != 0:
            continue

        text = text.strip()

        if not text:
            continue

        blocks.append({
            "x0": x0,
            "y0": y0,
            "x1": x1,
            "y1": y1,
            "text": text,
            "center": (x0 + x1) / 2,
            "width": x1 - x0,
        })

    return blocks


def _find_column_split(blocks, page_width):
    """Detect a possible vertical separation between two columns."""

    narrow_blocks = [
        block for block in blocks
        if block["width"] < page_width * FULL_WIDTH_RATIO
    ]

    centers = sorted(set(
        block["center"] for block in narrow_blocks
    ))

    if len(centers) < 2:
        return None

    largest_gap = 0
    split_position = None

    for i in range(len(centers) - 1):
        gap = centers[i + 1] - centers[i]

        if gap > largest_gap:
            largest_gap = gap
            split_position = (centers[i] + centers[i + 1]) / 2

    if largest_gap < page_width * COLUMN_GAP_RATIO:
        return None

    left_blocks = [
        b for b in narrow_blocks
        if b["center"] < split_position
    ]

    right_blocks = [
        b for b in narrow_blocks
        if b["center"] >= split_position
    ]

    if not left_blocks or not right_blocks:
        return None

    return split_position


def _extract_page_text(page):
    """Extract text while handling common two-column CV layouts."""

    blocks = _extract_page_blocks(page)

    if not blocks:
        return ""

    page_width = page.rect.width

    split = _find_column_split(blocks, page_width)

    # If no two-column layout is detected, use normal extraction.
    if split is None:
        return page.get_text("text", sort=True).strip()

    left_blocks = []
    right_blocks = []
    full_width_blocks = []

    for block in blocks:

        if block["width"] >= page_width * FULL_WIDTH_RATIO:
            full_width_blocks.append(block)

        elif block["center"] < split:
            left_blocks.append(block)

        else:
            right_blocks.append(block)

    # Read each column from top to bottom.
    left_blocks.sort(key=lambda b: (b["y0"], b["x0"]))
    right_blocks.sort(key=lambda b: (b["y0"], b["x0"]))
    full_width_blocks.sort(key=lambda b: b["y0"])

    left_text = "\n".join(
        block["text"] for block in left_blocks
    )

    right_text = "\n".join(
        block["text"] for block in right_blocks
    )

    full_text = "\n".join(
        block["text"] for block in full_width_blocks
    )

    # Put full-width content before the columns when it appears
    # at the top of the page; otherwise append it at the end.
    first_column_y = min(
        [b["y0"] for b in left_blocks + right_blocks],
        default=0
    )

    top_blocks = [
        b for b in full_width_blocks
        if b["y0"] < first_column_y
    ]

    bottom_blocks = [
        b for b in full_width_blocks
        if b["y0"] >= first_column_y
    ]

    top_text = "\n".join(b["text"] for b in top_blocks)
    bottom_text = "\n".join(b["text"] for b in bottom_blocks)

    parts = [
        part for part in [
            top_text,
            left_text,
            right_text,
            bottom_text
        ]
        if part.strip()
    ]

    return "\n\n".join(parts)


def extract_text(data: bytes) -> Extraction:
    """Extract PDF text using PyMuPDF."""

    try:
        doc = fitz.open(stream=data, filetype="pdf")

    except Exception:
        return Extraction(
            "illisible",
            message="Fichier PDF corrompu ou impossible à ouvrir."
        )

    with doc:

        if doc.needs_pass:
            return Extraction(
                "illisible",
                nb_pages=doc.page_count,
                message="PDF protégé par mot de passe."
            )

        nb_pages = doc.page_count

        try:
            pages = [
                _extract_page_text(page)
                for page in doc
            ]

        except Exception as error:
            print(f"PDF extraction error: {error}")

            return Extraction(
                "illisible",
                nb_pages=nb_pages,
                message="Erreur pendant la lecture du contenu."
            )

    text = "\n\n".join(
        page.strip()
        for page in pages
        if page.strip()
    ).strip()

    if len(text) < MIN_CHARS:
        return Extraction(
            "vide",
            text,
            nb_pages,
            "Aucun texte exploitable (PDF scanné ou composé d’images)."
        )

    replacement_ratio = text.count("\ufffd") / len(text)

    if (
        replacement_ratio > 0.1
        or _readable_ratio(text) < MIN_READABLE_RATIO
    ):
        return Extraction(
            "illisible",
            "",
            nb_pages,
            "Le texte extrait est illisible (encodage non reconnu)."
        )

    return Extraction(
        "extrait",
        text,
        nb_pages
    )
