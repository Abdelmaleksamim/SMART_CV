import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

# Dossier de stockage temporaire sur disque
TEMP_DIR = Path("temp_cvs")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

def save_temp_pdf(file: UploadFile) -> str:
    """
    EN02-T01 & EN02-T02 : Enregistre le fichier PDF par flux sur le disque 
    avec un nom unique (UUID) pour éviter les conflits lors de gros volumes.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Format invalide, un fichier PDF est requis.")
    
    # Nom unique anti-conflit
    safe_name = Path(file.filename).name
    unique_filename = f"{uuid.uuid4()}_{safe_name}"
    file_path = TEMP_DIR / unique_filename
    
    try:
        # Écriture par blocs (chunks) pour ne pas saturer la RAM avec de gros CVs
        with open(file_path, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # Lecture par blocs de 1 Mo
                buffer.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'écriture du fichier temporaire : {str(e)}")
        
    return str(file_path)

def verify_file_access(file_path: str) -> bool:
    """
    EN02-T03 : Vérifie l'accès au fichier sur le disque et sa disponibilité.
    """
    path = Path(file_path)
    return path.is_file() and path.stat().st_size > 0

def cleanup_temp_file(file_path: str):
    """
    Nettoie et supprime le fichier du disque après traitement.
    """
    path = Path(file_path)
    if path.is_file():
        try:
            path.unlink()
        except Exception:
            pass
