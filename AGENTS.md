# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack & Deployment

Django 5.2 + Python 3.13, managed with **uv** (never use `pip` or `poetry`).
- **Database**: Neon PostgreSQL in production (via `DATABASE_URL`), local SQLite fallback. No explicit `ENVIRONMENT` flag exists.
- **Media Storage**: Supabase S3-compatible storage (`USE_SUPABASE_S3=True`) / local `FileSystemStorage` (`MEDIA_ROOT=media/`).
- **Static Files**: WhiteNoise (`CompressedManifestStaticFilesStorage`) in production.
- **Deployment**: Deployed on Render. `build.sh` is the Render deployment hook (`buildCommand`), running `uv sync --frozen --no-dev`, `collectstatic`, and `migrate`. Environment variables are documented in `render.yaml`.
- **Auth**: Djoser + DRF + SimpleJWT (`api/auth/`).

## Commands

```bash
# Dev server
uv run python manage.py runserver

# Tests (uses core.settings_test automatically via pytest.ini)
uv run pytest

# Single test
uv run pytest portfolio/tests/test_models.py::TestCertificateUploadPath::test_standard_issuer_name

# Manual S3 connection check script (one-off script, not part of pytest suite)
uv run python test_s3.py

# Lint / Format (Ruff, line-length=88)
uv run ruff check .
uv run ruff format .

# Type check
uv run mypy .

# Sync dependencies / add package
uv sync
uv add <package_name>

# Production build script (Render deployment hook, do not run locally for dev)
bash build.sh
```

## Architecture & Configuration Rules

- **DB Routing**: `DATABASE_URL` env var presence determines the switch between Neon PostgreSQL (production) and SQLite (local).
- **Storage Routing**: `USE_SUPABASE_S3=True` env var switches `STORAGES["default"]` to `S3Boto3Storage`; `MEDIA_URL` also changes to `SUPABASE_PUBLIC_MEDIA_URL`.
- **S3 Configuration Quirks**: Supabase requires `AWS_S3_ADDRESSING_STYLE = "path"` and `AWS_S3_SIGNATURE_VERSION = "s3v4"`. `AWS_QUERYSTRING_AUTH = False` makes media URLs public; `AWS_S3_FILE_OVERWRITE = False` prevents silent file overwrites.
- **Static Files**: WhiteNoise handles static file serving in production; no separate static CDN.
- **Production Security**: Security settings (`SECURE_SSL_REDIRECT`, HSTS, secure cookies) activate only when `DEBUG=False`. HSTS preload is intentionally disabled.
- **App Structure**: Single Django app (`portfolio`). Provides REST API ViewSets (`Project`, `Provider`, `Certificate`, `Skill`, `TimelineEntry`) with `IsAuthenticatedOrReadOnly` permissions, plus Session-based Dashboard views (`login_view`, `dashboard_view`).

## Settings & Testing Rules

- **Two Settings Modules**:
  - `core.settings` — production/dev settings, loaded from `.env`
  - `core.settings_test` — used by pytest (set in `pytest.ini`). It imports `*` from `core.settings` and applies test overrides (`USE_SUPABASE_S3=False`, `MEDIA_ROOT=test_media/`, MD5 password hasher). Note: `core/settings_test.py` is a settings module, not a test file.
- **Never** set `DJANGO_SETTINGS_MODULE=core.settings` when running pytest; `pytest.ini` handles this. Add test-only overrides in `core.settings_test`, not in test files or `conftest`.
- **ORM & DB Tests**: `@pytest.mark.django_db` is required for any test touching the ORM. Pure logic tests (like `TestCertificateUploadPath`) use a plain `DummyInstance` without DB access.
- **Test Media**: Media files generated in tests land in `test_media/` (clean up manually if needed).

## Certificate Upload & Validation Rules

- `certificate_upload_path()` in `portfolio/models.py` uses `slugify(instance.provider.provider)` for directory names and falls back to `"unsorted"` if slugify returns an empty string (e.g. `"??? ***"` → `"unsorted"`).
- `Certificate.provider` is a `ForeignKey(Provider, on_delete=models.PROTECT, related_name="certificates")`.
- File upload validators (`validate_file_extension`, `validate_file_size`: `.pdf`, `.png`, `.jpg` ≤ 5 MB) are applied at model field level, not form level. They fire on `full_clean()`, not on `save()`.

## REST API & Serializers

- ViewSets use `permission_classes = (IsAuthenticatedOrReadOnly,)` so public visitors can view portfolio data (GET) without logging in, while write operations (POST, PUT, PATCH, DELETE) require authentication.
- Serializers follow the **Hybrid-Pattern**: Read requests output nested detail objects (`skill_details`, `provider_details`), while write operations accept PrimaryKey IDs (`skills`, `provider`).
- Serializer `Meta.fields` must always be declared as a **tuple** (e.g. `fields = ("id", "title")`), not a mutable list, to comply with Ruff rule `RUF012`.

## Management Commands (Local / Non-Portable)

- `scan_certificates` — scans local certificates path (configured via `CERTIFICATES_PATH` in `.env`), creates `Provider` objects.
- `import_certificates` — imports files from the same path with 1.5 s delay per file (Cloudflare rate-limit workaround); skips already-existing entries by `(title, provider)` uniqueness check.
- Both commands are tied to developer-local environment; do not modify or run for general use.

## Auth (Djoser + JWT)

Endpoints under `api/auth/` — Djoser endpoints include:
- `POST api/auth/jwt/create/` — Login → returns `access` + `refresh` token
- `POST api/auth/jwt/refresh/` — Refresh access token
- `POST api/auth/users/` — Registration (`USER_CREATE_PASSWORD_RETYPE=True`)

`LOGIN_FIELD = "email"` → Login runs via E-Mail, not Username.
Access Token: 60 min, Refresh Token: 7 Tage. Header: `Authorization: Bearer <token>`.

## Code Style & Conventions

- Package manager: **uv** only (never `pip install` or `poetry`). Use `uv add <pkg>` / `uv sync`.
- Ruff, line-length 88 (Black-compatible).
- Mypy with `ignore_missing_imports = true`, `check_untyped_defs = true`, Python 3.13.
- German `verbose_name` / `verbose_name_plural` on all model `Meta` classes.
- Inline DB model field comments in German.
- Test classes use plain `class` syntax (no `unittest.TestCase`).

