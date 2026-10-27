# Orchestrator Plan: Repository-Wide Markdown Harmonization & Verification

## Phase 0: Survey & Discovery (Top-Level)
- 3 parallele Explorer spawnen:
  - **Explorer 1 (Markdown & Link Inventory)**: Findet alle `*.md`-Dateien im Repository (inklusive `/docs`, `README.md`, `AGENTS.md`, `.agents/`, `backend/`, `frontend/`, Specs, Wiki), extrahiert alle relativen Links und Dateiverweise und prüft sie gegen das Dateisystem.
  - **Explorer 2 (Codebase Reality Check - Backend & Data)**: Analysiert die reale Backend-Architektur: Django Version (5.2/6.0), Datenbank-Setup (Neon PostgreSQL vs SQLite Fallback `backend/db.sqlite3`), RAG-Stack (Modell: `gemini-3.8-flash`, pgvector vs SQLite Vector Fallback, Signals/Caching), API-Routen/Endpoints (`/api/certificates/`, `/api/ai/chat/`, etc.).
  - **Explorer 3 (Codebase Reality Check - Frontend & Build/Deploy)**: Analysiert Frontend-Stack (React 19, Vite, Tailwind CSS v4, TanStack Query v5, shadcn UI unter `frontend/src/components/ui`), Build-Befehle (`uv sync`, `npm run build`), Umgebungsvariablen (`CERTIFICATES_PATH`, `DATABASE_URL`, `GEMINI_API_KEY`, etc.) und Deployment-Konfigurationen (`render.yaml`).
- Merge der Explorer-Ergebnisse in `PROJECT.md § Feature Inventory` und `TEST_INFRA.md`.

## Phase 1: Dual Track Setup
- **Track A (Implementation Track)**:
  - Milestone 1: Architektur- & Technologie-Harmonisierung (README.md, docs/architecture.md, docs/backlog.md, docs/deployment.md) anpassen an tatsächliche Codebase (Neon/SQLite, gemini-3.8-flash, React 19/Tailwind v4/Vite/TanStack/shadcn).
  - Milestone 2: Link-Integrität, Symbol-Abgleich & Pfad-Bereinigung in allen *.md-Dateien (Behebung aller toten Links, exakte Funktions-/Klassennamen und Endpunkte).
  - Milestone 3: Formatierung, Code-Fences (Sprach-Tags) & Sprachqualität (Konsistentes GFM, Rechtschreibung/Grammatik, Schutzregeln in AGENTS.md bewahren).
- **Track B (E2E Testing Track)**:
  - Opaque-box Test-Runner (Python-Script), das alle Markdown-Dateien scannt:
    - Tier 1: Link-Validierung aller relativen Pfade gegen das Dateisystem.
    - Tier 2: Veraltete Begriffsprüfungen (z. B. keine alten Modelle wie gemini-2.5-flash).
    - Tier 3: Markdown-Syntax (Codeblock-Fences geschlossen, Tabellen gültig).
    - Tier 4: Konsistenz-Cross-Check wichtiger Architekturfakten über Dokumente hinweg.
  - Veröffentlichung von `TEST_READY.md`.

## Phase 2: Implementation & Gatekeeping
- Je Milestone: Explorer -> Worker -> Reviewer (2x) -> Challenger (2x) -> Auditor (Forensic Integrity) -> Gate Status Check.
- Sicherstellung, dass CERTIFICATES_PATH strikt unberührt bleibt.

## Phase 3: Final Acceptance & Adversarial Hardening (Tier 5)
- 100% E2E Test Pass.
- Challenger-gestützte Adversarial Verification.
- Finaler Audit-Check.
- Victory Claim an Sentinel.
