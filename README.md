# Portfolio Backend

Django REST API für mein persönliches Portfolio. Verwaltet Zertifikate, Projekte und Zertifikatsanbieter über das Django Admin Interface. Authentifizierung via JWT (Djoser).

## Tech Stack

| Komponente | Technologie |
|---|---|
| Framework | Django 5.2 |
| Sprache | Python 3.13 |
| Package Manager | uv |
| Datenbank (lokal) | SQLite |
| Datenbank (Produktion) | Neon PostgreSQL |
| Media Storage | Supabase (S3-kompatibel) |
| Static Files | WhiteNoise |
| Auth | Djoser + DRF + SimpleJWT |
| Deployment | Render |

## Voraussetzungen

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) installiert

## Lokales Setup

```bash
# 1. Repository klonen
git clone <repo-url>
cd portfolio_project

# 2. Abhängigkeiten installieren
uv sync

# 3. .env anlegen
cp .env.example .env
# .env anpassen (SECRET_KEY, ggf. DATABASE_URL und Supabase-Werte)

# 4. Datenbank migrieren
uv run python manage.py migrate

# 5. Superuser anlegen
uv run python manage.py createsuperuser

# 6. Dev-Server starten
uv run python manage.py runserver
```

Admin-Interface: http://localhost:8000/admin/

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `SECRET_KEY` | ✅ | Django Secret Key |
| `DEBUG` | — | `True` für lokale Entwicklung |
| `DATABASE_URL` | — | Neon PostgreSQL URL (fehlt → SQLite) |
| `DJANGO_ALLOWED_HOSTS` | Prod | Komma-getrennte Hostnamen |
| `CSRF_TRUSTED_ORIGINS` | Prod | Komma-getrennte Origins |
| `USE_SUPABASE_S3` | — | `True` aktiviert S3-Media-Storage |
| `AWS_ACCESS_KEY_ID` | S3 | Supabase S3 Key ID |
| `AWS_SECRET_ACCESS_KEY` | S3 | Supabase S3 Secret |
| `AWS_STORAGE_BUCKET_NAME` | S3 | Bucket-Name (`portfolio-media`) |
| `AWS_S3_ENDPOINT_URL` | S3 | Supabase S3 Endpoint URL |
| `SUPABASE_PUBLIC_MEDIA_URL` | S3 | Öffentliche Basis-URL für Media-Dateien |

## API Endpunkte

### Auth (`/api/auth/`)

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `api/auth/jwt/create/` | POST | Login → `access` + `refresh` Token |
| `api/auth/jwt/refresh/` | POST | Access Token erneuern |
| `api/auth/jwt/verify/` | POST | Token validieren |
| `api/auth/users/` | POST | Registrierung |
| `api/auth/users/me/` | GET | Eigenes Profil |

**Login via E-Mail** (`LOGIN_FIELD = "email"`).
Header für geschützte Endpunkte: `Authorization: Bearer <access_token>`

Token-Laufzeiten: Access 60 min · Refresh 7 Tage

## Datenmodelle

### `Certificate`
Speichert Zertifikate mit Datei-Upload. Upload-Pfad: `certificates/<slugified-issuer>/<filename>`.
Erlaubte Formate: `.pdf`, `.png`, `.jpg` · Maximale Dateigröße: 5 MB

### `Provider`
Zertifikatsanbieter mit optionalem Logo und URL.

### `Project`
Portfolio-Projekte mit Vorschaubild, GitHub- und Live-URL.

## Befehle

```bash
# Tests ausführen
uv run pytest

# Einzelnen Test ausführen
uv run pytest portfolio/tests/test_models.py::TestCertificateUploadPath::test_standard_issuer_name

# Tests mit Coverage
uv run pytest --cov=portfolio --cov=core --cov-report=term-missing

# Linting
uv run ruff check .

# Formatierung
uv run ruff format .

# Type Check
uv run mypy .

# Migrationen erstellen
uv run python manage.py makemigrations

# Statische Dateien sammeln
uv run python manage.py collectstatic
```

## Test Coverage

Ergebnis vom letzten Testlauf (4 Tests, alle bestanden):

```
Name                                                               Stmts   Miss  Cover
--------------------------------------------------------------------------------------
core\__init__.py                                                       0      0   100%
core\asgi.py                                                           4      4     0%
core\settings.py                                                      57     11    81%
core\settings_test.py                                                  8      0   100%
core\urls.py                                                           3      3     0%
core\wsgi.py                                                           4      4     0%
portfolio\admin.py                                                    20      0   100%
portfolio\apps.py                                                      4      0   100%
portfolio\management\commands\import_certificates.py                  46     46     0%
portfolio\management\commands\scan_certificates.py                    29     29     0%
portfolio\migrations\...                                              16      0   100%
portfolio\models.py                                                   52      9    83%
portfolio\tests\test_models.py                                        27      0   100%
portfolio\views.py                                                     1      1     0%
--------------------------------------------------------------------------------------
TOTAL                                                                271    107    61%
```

> Die 0%-Abdeckung bei `asgi.py`, `wsgi.py`, `urls.py` und den Management Commands ist erwartetes Verhalten — diese Dateien werden nicht durch Unit-Tests aufgerufen.

## Deployment (Render)

Das Deployment erfolgt automatisch über [`render.yaml`](render.yaml). Der Build-Prozess:

```bash
bash build.sh   # uv sync --frozen --no-dev && collectstatic && migrate
```

Startbefehl: `uv run gunicorn core.wsgi:application`

## Projektstruktur

```
portfolio_project/
├── core/
│   ├── settings.py          # Haupt-Settings (Prod + Dev)
│   ├── settings_test.py     # Test-Settings (überschreibt settings.py)
│   └── urls.py              # URL-Konfiguration
├── portfolio/
│   ├── admin.py             # Admin-Konfiguration
│   ├── models.py            # Certificate, Provider, Project
│   ├── management/
│   │   └── commands/        # import_certificates, scan_certificates
│   ├── migrations/
│   └── tests/
│       └── test_models.py
├── build.sh                 # Render Build-Hook
├── render.yaml              # Render Deployment-Konfiguration
├── pyproject.toml           # Abhängigkeiten + Tool-Konfiguration
└── pytest.ini               # Pytest-Konfiguration
```
