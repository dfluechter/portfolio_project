# Project: Repository-Wide Markdown Harmonization & Verification

## Architecture & Scope
Dieses Projekt auditiert, harmonisiert und verifiziert alle Markdown-Dokumente (`*.md`) im gesamten Repository `portfolio_project` (einschließlich `/docs`, Root `README.md`, `AGENTS.md`, Specs, Wikis und Konfigurationsdateien). Ziel ist die lückenlose Übereinstimmung mit der realen Codebase, die Beseitigung aller gebrochenen internen Links und unportablen absoluten URIs sowie die Einhaltung höchster Markdown- und Sprachstandards.

## Feature Inventory
| # | Feature / Issue | Description | Milestone | Source | Status |
|---|---|---|---|---|---|
| F1 | `render.yaml` Configuration & Merge Repair | Bereinigung des unaufgelösten Merge-Konflikts, Behebung von Syntaxfehlern (`key: false` -> `sync: false`), Korrektur von `DJANGO_SETTINGS_MODULE` und `ALLOWED_HOSTS`. | M1 | Survey (Explorer 2 & 3) | DONE |
| F2 | Model Reference Modernization (`gemini-3.8-flash`) | Ablösung aller veralteten `gemini-2.5-flash` Erwähnungen in `.env.example`, `docs/adrs/007-...`, `docs/backlog.md` und `extractor.py`. | M1 | Survey (Explorer 1 & 2) | DONE |
| F3 | Backend & Dual-DB Documentation Sync | Präzisierung von Django 6.0 (`django>=5.2`), Neon/SQLite Dual-DB, pgvector vs SQLite Fallback, Hinzufügen von `bulk_approve`/`bulk_reject` und `password-reset` in `docs/architecture.md`. | M1 | Survey (Explorer 2) | DONE |
| F4 | Backlog & Epic Status Alignment | Aktualisierung von Epic 16 (i18n & Theme Polish) auf implementiert in `docs/backlog.md`. | M1 | Survey (Explorer 3) | DONE |
| F5 | Frontend Stack & Inventory Sync | Aktualisierung von `docs/frontend.md` und Wikis: Reale Komponenten (`components/ui/`, `LanguageSwitcher`, etc.), Entfernen fiktiver Manager, Korrektur der Dashboard-Tabs. | M2 | Survey (Explorer 3) | DONE |
| F6 | Test Suite & Tooling Metrics Harmonization | Vereinheitlichung der Vitest-Testanzahl auf 117 Tests (22 Dateien) in `README.md`, `docs/frontend.md`, `docs/deployment.md` und Wikis; TypeScript 7.x Angabe; Korrektur Chunk-Größen. | M2 | Survey (Explorer 3) | DONE |
| F7 | Route & URL Fixes | Korrektur des Passwort-Reset-URL-Tippfehlers (`/password-reset/confirm/...`) in `README.md`. | M2 | Survey (Explorer 3) | DONE |
| F8 | Broken Relative Links Elimination (404) | Behebung aller 20 toten Links, insb. Ergänzung fehlender `.md`-Endungen im GitHub Wiki (`Home.md`, `_Sidebar.md`) und relativer Root-Pfade in `CONTRIBUTING.md`. | M3 | Survey (Explorer 1) | DONE |
| F9 | Broken Heading Anchors Fix | Korrektur aller 7 defekten Header-Anker in `README.md`, `docs/architecture.md`, `docs/backlog.md`. | M3 | Survey (Explorer 1) | DONE |
| F10 | Absolute `file:///` URIs Elimination | Ersetzung aller 15 unportablen absoluten Windows-Dateipfade durch saubere relative Markdown-Links in `AGENTS.md`, `docs/deployment.md`, `docs/SECURITY.md`, `docs/backlog.md`, etc. | M3 | Survey (Explorer 1) | DONE |
| F11 | GFM Formatting & Code Fence Tags | Ergänzung fehlender Sprach-Tags (z.B. `docs/frontend.md:27`), Sicherstellung valider GFM-Tabellensyntax. | M3 | Survey (Explorer 1) | DONE |
| F12 | Monorepo Path Clarity | Vereinheitlichung von Pfadangaben im Fließtext (`backend/portfolio/...` statt unpräzisem `portfolio/...`). | M3 | Survey (Explorer 1) | DONE |
| F13 | Automated Opaque-Box E2E Integrity Suite | Entwicklung und Ausführung eines Test-Runners für Link-Validierung, Modell-Check, Anchor-Check und Fakten-Konsistenz. | E2E-Track | ORIGINAL_REQUEST | DONE |
| F14 | 100% E2E Verification & Adversarial Hardening | Vollständige Verifikation aller Akzeptanzkriterien, Adversarial Coverage Challenge und Forensic Audit. | M4 | ORIGINAL_REQUEST | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| E2E | E2E Testing Track | Aufbau der automatisierten Verifikationssuite (`scripts/verify_markdown_integrity.py`), `TEST_INFRA.md` & `TEST_READY.md`. | Survey done | DONE |
| M1 | Core Architecture, DB & Config Sync | F1 (`render.yaml`), F2 (Gemini 3.8), F3 (Dual-DB, Endpoints, Django 6.0), F4 (Backlog Epics). Gate: PASS. | Survey done | DONE |
| M2 | Frontend, Tooling & Metric Harmonization | F5 (Frontend Tree & Tabs), F6 (Vitest 117 Tests, TS 7), F7 (Passwort-Reset-Route). Gate: PASS. | M1 | DONE |
| M3 | Link Integrity, Anchors & Portability | F8 (20 tote Links), F9 (7 Anker), F10 (15 `file:///` URIs), F11 (Code-Fences), F12 (Monorepo-Pfade) + Entschärfung backlog.md:516. | M1, M2 | DONE |
| M4 | Final Acceptance & Adversarial Hardening | F14: 100% Pass der E2E Suite, Challenger-Hardening, Forensic Audit. | E2E, M1, M2, M3 | DONE |

## Interface Contracts & Guidelines
- **Dateipfade**: Alle internen Verweise zwischen Markdown-Dateien müssen relativ zur Quell-Datei sein (z.B. `[Architektur](docs/architecture.md)` aus Root, oder `[Root](../README.md)` aus `docs/`). Keine absoluten `file:///`-URIs!
- **Wiki-Dateien**: Links zwischen Wiki-Seiten in `docs/wiki/` müssen explizit die Dateiendung `.md` tragen (z.B. `[System-Architecture](System-Architecture.md)`), um sowohl im Git-Viewer als auch lokal zu funktionieren.
- **KI-Modell**: Verbindlicher Standardname ist `gemini-3.8-flash`.
- **Framework-Versionen**:
  - Python: `3.13`
  - Django: `6.0` (Spezifikation in `pyproject.toml`: `>=5.2`)
  - React: `19.0.0`
  - Vite: `8.3`
  - Tailwind CSS: `v4`
  - TanStack Query: `v5`
  - TypeScript: `7.0`
  - Vitest: `117 Tests in 22 Dateien`
- **Schutzregel**: `CERTIFICATES_PATH` und Originalzertifikate bleiben **STRIKT READ-ONLY**.

## Code Layout & Write Boundaries
- **Worker M1** (abgeschlossen): Hatte exklusiv `render.yaml`, `.env.example`, `docs/architecture.md`, `docs/adrs/007-rag-copilot-caching-guardrails.md`, `docs/backlog.md`, `backend/portfolio/services/extractor.py`.
- **Worker M2** (abgeschlossen): Hatte exklusiv `README.md`, `docs/frontend.md`, `docs/deployment.md`, `docs/wiki/Frontend-Architecture.md`, `docs/wiki/System-Architecture.md`.
- **Worker M3**: Besitzt exklusiv `docs/wiki/Home.md`, `docs/wiki/_Sidebar.md`, `docs/CONTRIBUTING.md`, `AGENTS.md`, `docs/SECURITY.md`, `docs/specs/us-15-1-conditional-caching.md`, `docs/wiki/Deployment-and-Operations.md`, `docs/backlog.md` (Zeile 516 Modell-Entschärfung) und alle weiteren Dateien mit Link-/Anker-Korrekturen.
