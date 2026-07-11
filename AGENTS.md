# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack

Django 5.2 + Python 3.13, managed with **uv** (not pip/poetry). Static files via WhiteNoise, media via Supabase S3-compatible storage, DB is Neon PostgreSQL in production / SQLite locally. Deployed on Render. Auth via **Djoser + DRF + SimpleJWT** (JWT Bearer tokens).

## Commands

```bash
# Dev server
uv run python manage.py runserver

# Tests (uses core.settings_test automatically via pytest.ini)
uv run pytest

# Single test
uv run pytest portfolio/tests/test_models.py::TestCertificateUploadPath::test_standard_issuer_name

# Lint/Format (Ruff, line-length=88)
uv run ruff check .
uv run ruff format .

# Type check
uv run mypy .

# Sync dependencies
uv sync

# Production build (collectstatic + migrate)
bash build.sh
```

## Critical: Two Settings Modules

- `core.settings` — production/dev settings, loaded from `.env`
- `core.settings_test` — used by pytest (set in `pytest.ini`); forces `USE_SUPABASE_S3=False`, uses `test_media/` instead of `media/`, uses MD5 password hasher

**Never** set `DJANGO_SETTINGS_MODULE=core.settings` when running pytest; `pytest.ini` already handles this correctly via `core.settings_test`.

## Media Storage Toggle

`USE_SUPABASE_S3=True` (env var) switches `STORAGES["default"]` to `S3Boto3Storage`. When `False`, local `FileSystemStorage` with `MEDIA_ROOT=media/` is used. Tests always force this off via `settings_test.py`.

## Certificate Upload Path

`certificate_upload_path()` in `portfolio/models.py` uses `slugify(instance.issuer)` for the directory name and falls back to `"unsorted"` if slugify returns an empty string (e.g. `"??? ***"` → `"unsorted"`). Validators allow only `.pdf`, `.png`, `.jpg` ≤ 5 MB.

## Management Commands (one-time / local only)

- `scan_certificates` — scans hardcoded local OneDrive path, creates `Provider` objects
- `import_certificates` — imports files from same path with 1.5 s delay per file (Cloudflare rate-limit workaround); skips already-existing entries by `(title, issuer)` uniqueness check

Both commands are tied to `C:\Users\domin\OneDrive\Documents\Zertifikate (Beruf)` — not portable, do not modify for general use.

## Auth (Djoser + JWT)

Endpoints unter `api/auth/` — Djoser stellt u.a. bereit:
- `POST api/auth/jwt/create/` — Login → gibt `access` + `refresh` Token zurück
- `POST api/auth/jwt/refresh/` — Access Token erneuern
- `POST api/auth/users/` — Registrierung (mit Password-Wiederholung, da `USER_CREATE_PASSWORD_RETYPE=True`)

`LOGIN_FIELD = "email"` → Login läuft über E-Mail, nicht Username.
Access Token: 60 min, Refresh Token: 7 Tage. Header: `Authorization: Bearer <token>`.

## Code Style

- Ruff, line-length 88 (Black-compatible)
- Mypy with `ignore_missing_imports = true`, `check_untyped_defs = true`, Python 3.13
- German `verbose_name` / `verbose_name_plural` on all model `Meta` classes
- DB model field comments in German inline
- Test classes use plain `class` (no `unittest.TestCase`); DB tests require `@pytest.mark.django_db`
