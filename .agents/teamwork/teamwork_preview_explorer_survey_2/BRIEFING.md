# BRIEFING — 2026-10-23T00:09:15Z

## Mission
Untersuchung der realen Backend- und Datenbank-Architektur (Django, Python, DB-Setup, RAG/Gemini, Dokumentations-Inkonsistenzen) und Erstellung von survey_backend.md und handoff.md.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_2
- Original parent: c0b5fa43-c061-4a8d-b0f6-8f11df6ab52f
- Milestone: survey_backend

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CERTIFICATES_PATH und Original-Zertifikate sind STRIKT READ-ONLY
- Deutsche Sprache für alle Antworten, Gedankengänge und Berichte
- Schreibe nur in das eigene Arbeitsverzeichnis

## Current Parent
- Conversation ID: c0b5fa43-c061-4a8d-b0f6-8f11df6ab52f
- Updated: 2026-10-23T00:09:15Z

## Investigation State
- **Explored paths**:
  - `backend/pyproject.toml`, `backend/uv.lock`, `.python-version`
  - `backend/core/settings.py`, `backend/core/urls.py`, `backend/core/settings_test.py`
  - `backend/portfolio/models.py`, `backend/portfolio/views.py`, `backend/portfolio/signals.py`
  - `backend/portfolio/services/` (`ai_assistant.py`, `retrieval.py`, `embeddings.py`, `chunking.py`, `extractor.py`)
  - `backend/portfolio/migrations/0014_knowledgechunk_pgvector.py`
  - `backend/portfolio/management/commands/index_rag_chunks.py`
  - `render.yaml`, `backend/build.sh`, `build.sh`, `.env.example`, `.env`
  - `docs/architecture.md`, `docs/backlog.md`, `docs/ai-assistant-rag.md`, `docs/deployment.md`, `docs/adrs/007-rag-copilot-caching-guardrails.md`
- **Key findings**:
  - Python: 3.13; Django: 6.0.8 gelockt in `uv.lock` (Spezifikation `django>=5.2`), Dokumente nennen "Django 5.2".
  - Dual-DB: Neon PostgreSQL (Pooled `DATABASE_URL` für Gunicorn, Direct `DIRECT_DATABASE_URL` für Migrationen) vs. lokales SQLite-Fallback (`backend/db.sqlite3`).
  - RAG: Gemini 3.8 Flash (`gemini-3.8-flash`), `text-embedding-004` (768 Dim), pgvector CosineDistance mit SQLite Keyword-Fallback, Django Signals $O(1)$ Caching.
  - Veraltete Referenzen auf `gemini-2.5-flash` in `.env.example`, `ADR-007` und `extractor.py` Docstring.
  - Git-Merge-Konflikt-Marker in `render.yaml`.
  - Fehlende Endpunkte in `docs/architecture.md` (`bulk_approve`, `bulk_reject`, `/api/auth/password-reset/`).
- **Unexplored areas**: Keine, alle 5 Fragestellungen sind vollständig beantwortet.

## Key Decisions Made
- Detaillierter technischer Bericht in `survey_backend.md` geschrieben.
- Handoff Report in `handoff.md` erstellt.

## Artifact Index
- DISPATCH.md — Aufgabenstellung von Parent
- progress.md — Liveness Heartbeat
- survey_backend.md — Detaillierter technischer Bericht
- handoff.md — 5-Komponenten Handoff-Report
