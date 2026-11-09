"""Structuration d'un CV déjà extrait : nom, poste, profil, compétences, expérience, niveau d'études."""
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path


@dataclass
class ParsedCv:
    nom: str | None = None
    poste: str | None = None
    profil: str | None = None
    competences: list[str] = field(default_factory=list)
    experience_texte: str | None = None
    annees_experience: int | None = None
    niveau_etudes: str | None = None


HEADINGS = {
    "profil": ["profil professionnel", "profil", "resume", "resume professionnel", "a propos", "summary", "objectif"],
    "competences": ["competences", "competences techniques", "competences cles", "skills", "technologies"],
    "experience": ["experience", "experiences", "experience professionnelle", "experiences professionnelles",
                   "parcours professionnel", "work experience"],
    "formation": ["formation", "formations", "education", "etudes", "diplomes", "parcours academique",
                  "formation et diplomes"],
    "autre": ["langues", "certifications", "certificats", "projets", "centres d interet", "loisirs",
              "contact", "informations personnelles", "coordonnees", "references"],
}
LOOKUP = {name: key for key, names in HEADINGS.items() for name in names}


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _heading_key(line: str) -> str | None:
    n = _norm(line)
    if not n or len(n) > 45:
        return None
    if n in LOOKUP:
        return LOOKUP[n]
    for name, key in LOOKUP.items():
        if n.startswith(name + " ") and len(n.split()) <= len(name.split()) + 2:
            return key
    return None


def _split_sections(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        key = _heading_key(line)
        if key:
            current = key
            sections.setdefault(current, [])
            continue
        # « Compétences : Python, SQL » sur une seule ligne
        if ":" in line:
            before, after = line.split(":", 1)
            key = _heading_key(before)
            if key and after.strip():
                current = key
                sections.setdefault(current, []).append(after.strip())
                continue
        sections.setdefault(current, []).append(line)
    return sections


def _from_filename(filename: str) -> tuple[str | None, str | None]:
    stem = Path(filename).stem.replace("_", " ")
    stem = re.sub(r"^cv[\s\-–\d]*", "", stem, flags=re.I).strip()
    m = re.match(r"^(?P<nom>[^()]+?)\s*(?:\((?P<poste>[^)]+)\))?$", stem)
    if not m:
        return None, None
    nom = m.group("nom").strip().title() or None
    return nom, (m.group("poste") or "").strip() or None


NAME_RE = re.compile(r"^[A-Za-zÀ-ÿ'’.\- ]{3,50}$")


def _name_and_poste(header: list[str], filename: str) -> tuple[str | None, str | None]:
    nom = poste = None
    for i, line in enumerate(header[:6]):
        n = _norm(line)
        if NAME_RE.match(line) and 2 <= len(line.split()) <= 4 and "curriculum" not in n and n != "cv":
            nom = line.strip().title() if line.isupper() else line.strip()
            for nxt in header[i + 1:i + 3]:
                if "@" not in nxt and len(nxt) <= 80 and sum(c.isdigit() for c in nxt) < 4:
                    poste = nxt.strip()
                    break
            break
    f_nom, f_poste = _from_filename(filename)
    return nom or f_nom, poste or f_poste


def _skills(lines: list[str]) -> list[str]:
    out, seen = [], set()
    for line in lines:
        line = re.sub(r"^[\-•·▪●*►>\s]+", "", line)
        if ":" in line and len(line.split(":", 1)[0]) <= 30:
            line = line.split(":", 1)[1]
        for part in re.split(r"[,;|•·/]", line):
            s = part.strip(" .-")
            if 1 < len(s) <= 40 and s.lower() not in seen:
                seen.add(s.lower())
                out.append(s)
    return out


def _years_of_experience(text: str) -> int | None:
    m = re.search(r"(\d{1,2})\s*\+?\s*ans?\s+d['’]?\s*exp", text, flags=re.I)
    if m:
        return int(m.group(1))
    now = date.today().year
    spans = []
    for a, b in re.findall(r"((?:19|20)\d{2})\s*[-–—à]\s*((?:19|20)\d{2}|pr[ée]sent|aujourd.hui|actuel|en cours)", text, flags=re.I):
        end = int(b) if b.isdigit() else now
        if int(a) <= end:
            spans.append((int(a), end))
    if not spans:
        return None
    spans.sort()
    total, (cs, ce) = 0, spans[0]
    for s, e in spans[1:]:
        if s <= ce:
            ce = max(ce, e)
        else:
            total, (cs, ce) = total + (ce - cs), (s, e)
    return total + (ce - cs)


def _education_level(text: str) -> str | None:
    t = _norm(text)
    if re.search(r"\b(doctorat|phd)\b", t):
        return "Doctorat"
    nums = [int(x) for x in re.findall(r"bac ?\+? ?([2-8])\b", t)]
    if nums:
        return f"Bac +{max(nums)}"
    if re.search(r"\b(master|ingenieur|cycle ingenieur|m2|mba)\b", t):
        return "Bac +5"
    if re.search(r"\b(licence|bachelor|licence professionnelle)\b", t):
        return "Bac +3"
    if re.search(r"\b(dut|bts|deug|deust)\b", t):
        return "Bac +2"
    if re.search(r"\bbaccalaureat\b", t):
        return "Bac"
    return None


def parse_cv(text: str, filename: str = "") -> ParsedCv:
    sec = _split_sections(text)
    nom, poste = _name_and_poste(sec.get("header", []), filename)
    exp = "\n".join(sec.get("experience", [])) or None
    form = "\n".join(sec.get("formation", []))
    return ParsedCv(
        nom=nom,
        poste=poste,
        profil=" ".join(sec.get("profil", [])) or None,
        competences=_skills(sec.get("competences", [])),
        experience_texte=exp,
        annees_experience=_years_of_experience(exp or text),
        niveau_etudes=_education_level(form or text),
    )
