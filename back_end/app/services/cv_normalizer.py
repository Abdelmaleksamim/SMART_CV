
import re
from pathlib import Path


def clean_candidate_name(name: str | None) -> str | None:
    """
    Clean a candidate name by removing document references.

    Example:
    DEV-2026-007 Sofia Mansouri
    -> Sofia Mansouri
    """

    if not name or not isinstance(name, str):
        return None

    name = name.strip()

    # Remove document reference prefixes.
    name = re.sub(
        r"^(?:DEV|CV|REF)-\d{4}-\d+\s*[-_:]?\s*",
        "",
        name,
        flags=re.IGNORECASE
    )

    name = re.sub(r"\s+", " ", name)

    return name.strip(" -_:") or None


def name_from_filename(filename: str) -> str | None:
    """
    Extract a fallback candidate name from a CV filename.

    Example:
    DEV-2026-007_Sofia_Mansouri.pdf
    -> Sofia Mansouri
    """

    stem = Path(filename).stem

    # Remove document reference.
    stem = re.sub(
        r"^(?:DEV|CV|REF)-\d{4}-\d+[_\s-]*",
        "",
        stem,
        flags=re.IGNORECASE
    )

    return re.sub(r"[_\s]+", " ", stem).strip() or None
