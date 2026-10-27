## 2026-10-23T00:12:57Z
Du bist Worker M1 für Milestone 1: Core Architecture, DB & Config Sync.
Dein Arbeitsverzeichnis ist: d:\dev\portfolio_project\.agents\teamwork\worker_m1_1
Original Request Path: d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Project Plan: d:\dev\portfolio_project\PROJECT.md
Backend Survey: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_2\survey_backend.md
Frontend Survey: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_3\survey_frontend.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

DEINE EXKLUSIVEN SCHREIB-DATEIEN (File Boundaries):
- `render.yaml`
- `.env.example`
- `backend/portfolio/services/extractor.py` (nur Docstring-Korrektur)
- `docs/architecture.md`
- `docs/adrs/007-rag-copilot-caching-guardrails.md`
- `docs/backlog.md`

AUFGABEN FÜR MILESTONE 1:
1. `render.yaml` reparieren:
   - Den unaufgelösten Git-Merge-Konflikt (Zeilen 46-58) bereinigen.
   - Syntaxfehler `key: false` bei `PORTFOLIO_OWNER_NAME` und `PORTFOLIO_OWNER_EMAIL` korrigieren zu `sync: false`.
   - `DJANGO_SETTINGS_MODULE: core.settings` setzen (statt fehlerhaftem `core.DJANGO_SETTINGS_MODULE`).
   - `ALLOWED_HOSTS: "dfluechter.ipv64.de,dfluechter.onrender.com,localhost,127.0.0.1"` setzen (statt `3.13.0`).
2. `.env.example`:
   - `GEMINI_MODEL=gemini-3.8-flash` setzen (Zeile 64 aktualisieren).
3. `backend/portfolio/services/extractor.py`:
   - Docstring in Zeile 580 von `Gemini 2.5 Flash Vision` auf `Gemini 3.8 Flash Vision` anpassen.
4. `docs/adrs/007-rag-copilot-caching-guardrails.md`:
   - In Zeile 33 `Google Gemini (gemini-2.5-flash)` durch `Google Gemini (gemini-3.8-flash)` ersetzen.
5. `docs/backlog.md`:
   - Zeile 516: Formulierung prüfen/harmonisieren bzgl. `gemini-3.8-flash`.
   - Epic 16 bzw. US 16.1 Status von „Geplant“ auf „Implementiert“ bzw. „Bereit“ aktualisieren, da i18n (`i18next`, `de.json`, `en.json`, `LanguageSwitcher.tsx`) bereits real im Frontend existiert.
6. `docs/architecture.md`:
   - Django-Version: Klarstellen auf „Django 6.0 (Spezifikation `django>=5.2`)“.
   - Dual-DB: Neon PostgreSQL (Pooled `DATABASE_URL` für Web, Direct `DIRECT_DATABASE_URL` für Migrationen via `IS_MIGRATION_COMMAND`) und lokaler SQLite Fallback (`backend/db.sqlite3`).
   - pgvector vs SQLite: HNSW CosineDistance bei PostgreSQL, Keyword-Fallback bei SQLite.
   - Tabelle 3.1: Um `POST /api/pending-certificates/bulk_approve/` und `POST /api/pending-certificates/bulk_reject/` ergänzen.
   - Tabelle 3.4: Um `/api/auth/password-reset/` (`PasswordResetRequestView`) ergänzen.
   - ETag Conditional Caching (`ConditionalCacheMixin` mit atomarer Cache-Version `portfolio_rag_context_version_v1`) präzisieren.
7. Verifikation:
   - Führe `uv run python manage.py check` im Backend aus, um sicherzustellen, dass keine Syntax-/Einstellungsfehler vorliegen.
   - Schutzregel: CERTIFICATES_PATH ist STRIKT READ-ONLY!

Dokumentiere deine Änderungen in handoff.md in deinem Arbeitsverzeichnis und melde dich per send_message an c0b5fa43-c061-4a8d-b0f6-8f11df6ab52f.
