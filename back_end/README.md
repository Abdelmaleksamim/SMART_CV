# SMART CV — Backend (FastAPI + SQLite)

Backend de l'application **SMART CV**, développé avec FastAPI et SQLite.

Il permet d'enregistrer des offres d'emploi, de recevoir plusieurs CV au format PDF, d'extraire leur contenu textuel et de stocker les résultats dans une base de données SQLite.

## Prérequis

- Python 3.10+
- pip

## Installation et lancement

### 1. Cloner le projet et accéder au backend

```bash
cd back_end
```

### 2. Créer un environnement virtuel

```bash
python -m venv .venv
```

### 3. Activer l'environnement virtuel

**Windows (PowerShell) :**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (CMD) :**

```cmd
.venv\Scripts\activate.bat
```

**Linux / macOS :**

```bash
source .venv/bin/activate
```

### 4. Installer les dépendances

```bash
python -m pip install -r requirements.txt
```

### 5. Lancer le serveur FastAPI

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Le backend sera accessible à l'adresse :

```text
http://localhost:8000
```

## Documentation interactive

FastAPI fournit automatiquement une documentation interactive permettant de consulter et de tester les endpoints.

**Swagger UI :**

http://localhost:8000/docs

**ReDoc :**

http://localhost:8000/redoc

## Base de données

La base de données SQLite `smart_cv.db` est créée automatiquement au démarrage de l'application.

Elle permet de stocker les offres d'emploi ainsi que les CV et leurs contenus textuels extraits.

Le fichier `smart_cv.db` se trouve dans le répertoire de travail depuis lequel le backend est lancé (si le chemin utilisé par l'application est relatif).

## Consulter la base de données SQLite avec Python

Il est possible de consulter directement la base de données avec Python, sans installer SQLite ou un outil supplémentaire.

Python possède une bibliothèque intégrée appelée `sqlite3`.

### 1. Ouvrir le terminal

Ouvrir PowerShell dans le dossier du backend, puis activer l'environnement virtuel :

```powershell
.\.venv\Scripts\Activate.ps1
```

### 2. Ouvrir l'interpréteur Python

```powershell
python
```

Une fois dans Python, le symbole `>>>` apparaît. Cela signifie que vous pouvez exécuter du code Python.

### 3. Se connecter à la base de données

```python
import sqlite3

# Connect to the database
conn = sqlite3.connect("smart_cv.db")

# Create a cursor
cursor = conn.cursor()
```

- `sqlite3` : bibliothèque intégrée de Python pour SQLite.
- `connect()` : ouvre une connexion à la base de données.
- `cursor()` : permet d'exécuter des requêtes SQL.

### 4. Afficher toutes les tables

```python
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")

print(cursor.fetchall())
```

Exemple de résultat :

```python
[('offres',), ('cvs',)]
```

Les noms des tables peuvent varier selon la structure réelle de la base de données.

### 5. Afficher les informations des CV

```python
cursor.execute("""
    SELECT id, nom_fichier, statut, nb_pages,
           length(texte_extrait)
    FROM cvs;
""")

for row in cursor.fetchall():
    print(row)
```

**Explication des colonnes :**

| Colonne | Signification |
|---|---|
| `id` | Identifiant du CV |
| `nom_fichier` | Nom du fichier PDF |
| `statut` | État de l'extraction |
| `nb_pages` | Nombre de pages du PDF |
| `length(texte_extrait)` | Nombre de caractères extraits |

Exemple de résultat :

```text
(1, 'CV_Abdelmalek.pdf', 'extrait', 2, 2450)
(2, 'CV_Candidate.pdf', 'extrait', 1, 1200)
(3, 'CV_Scan.pdf', 'vide', 2, 0)
```

### 6. Consulter le texte extrait d'un CV

Pour afficher le texte extrait du CV ayant l'identifiant `1` :

```python
cursor.execute(
    "SELECT texte_extrait FROM cvs WHERE id = ?",
    (1,)
)

result = cursor.fetchone()

if result:
    print(result[0])
else:
    print("CV not found")
```

Le symbole `?` est un paramètre SQL qui permet de transmettre une valeur de manière sécurisée.

### 7. Fermer la connexion et quitter Python

Fermer la connexion à la base de données :

```python
conn.close()
```

Quitter ensuite l'interpréteur Python :

```python
exit()
```

**Remarque :** Il est possible de consulter la base de données pendant que FastAPI fonctionne. Cependant, il est préférable d'éviter les modifications manuelles simultanées pendant que le backend écrit dans la base.

## Endpoints API

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/offres` | Enregistre une offre d'emploi à partir d'un JSON. |
| POST | `/api/offres/{offre_id}/cvs` | Reçoit plusieurs fichiers PDF, extrait leur texte et stocke les résultats. |

### 1. Créer une offre

**POST** `/api/offres`

Reçoit une offre d'emploi au format JSON contenant notamment :

- Titre
- Description
- Compétences recherchées
- Expérience requise
- Niveau d'études

L'offre est validée puis enregistrée dans SQLite.

La réponse contient notamment l'identifiant (`id`) de l'offre créée.

### 2. Ajouter des CV à une offre

**POST** `/api/offres/{offre_id}/cvs`

Permet d'envoyer plusieurs fichiers PDF en une seule requête.

- Type de requête : `multipart/form-data`
- Nom du champ : `files`
- Format accepté : PDF
- Taille maximale : 5 Mo par fichier

Le backend extrait le contenu textuel de chaque CV et enregistre les résultats dans SQLite.

### Statuts possibles d'un CV

| Statut | Description |
|---|---|
| `extrait` | Le texte du PDF a été extrait avec succès. |
| `vide` | Le PDF est un scan ou ne contient pas de texte exploitable. |
| `illisible` | Le fichier est corrompu, protégé ou impossible à lire. |
| `rejete` | Le fichier n'est pas un PDF ou dépasse 5 Mo. Il n'est pas stocké. |

## Tester l'API

1. Démarrer le backend.
2. Ouvrir http://localhost:8000/docs.
3. Tester `POST /api/offres` pour créer une offre.
4. Récupérer l'identifiant (`id`) de l'offre créée.
5. Tester `POST /api/offres/{offre_id}/cvs` pour envoyer plusieurs CV PDF.
6. Vérifier les réponses et les statuts retournés.
7. Consulter la base SQLite avec Python pour vérifier les données enregistrées.

## Arrêter le serveur

Dans le terminal où Uvicorn fonctionne, appuyer sur :

```text
CTRL + C
```

## Désactiver l'environnement virtuel

```bash
deactivate
```