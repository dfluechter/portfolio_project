# Agent Guidelines & Project Context

## Language Strategies

**[CONFIGURATION]**
- TARGET_LANGUAGE = **German**

**1. Sprache & Gedankengänge (Language Rule):**
- **Gedankengänge & Erklärungen:** Gemäß [.agents/rules/language.md](../.agents/rules/language.md) und [AGENTS.md](../AGENTS.md) sind alle Antworten, Erklärungen und Gedankengänge ausnahmslos auf Deutsch zu verfassen.
- **Codebase:** Standard-Englisch für den Quellcode (Variablennamen, Klassen, Methoden, generische Kommentare). Ausnahmen: Deutsche `verbose_name` / `verbose_name_plural` und DB-Feldkommentare in Django-Modellen.

**2. User-Facing Output:**
- **Primäre Regel:** Sämtliche an den Benutzer gerichteten Texte MÜSSEN auf Deutsch verfasst sein.
- **Chat:** Ausschließliche Kommunikation auf Deutsch.
- **Artefakte:** Inhalte von Dokumentations- und Planungsdateien (`.md`) MÜSSEN auf Deutsch verfasst sein.

**3. Task Metadata:**
- `TaskName`: MUSS auf Deutsch sein.
- `TaskSummary`: MUSS auf Deutsch sein.

## Project Context: Portfolio Backend & Frontend

Detaillierte Systemarchitektur, Konfigurationen und API-Spezifikationen befinden sich in [AGENTS.md](AGENTS.md) und [architecture.md](architecture.md).

### Tech Stack & Standards
- **Backend:** Python 3.13, Django 6.0 (django>=5.2), Django REST Framework, Djoser (Headless Token Auth)
- **KI, Embeddings & Vektorsuche:** Google Gemini & `text-embedding-004` (`google-genai`), RAG Portfolio-Copilot (`/api/ai/chat/`), `pgvector` HNSW-Index (`KnowledgeChunk`) mit Hybrid Retrieval, Signals Caching & multimodale OCR
- **Frontend:** React 19, TypeScript 7.x, Vite 8, Tailwind CSS v4, TanStack Query v5, Lucide React
- **Package Manager:** Backend `uv` (niemals direkt `pip`), Frontend `npm`
- **Linter & Formatter:** Backend `ruff check .` und `ruff format --diff .`, Frontend `npm run lint`
- **Type Checking:** Backend `mypy .`, Frontend `npm run build` (`tsc -b`)
- **Tests:** Backend `uv run pytest --cov=core --cov=portfolio --cov-fail-under=95` (314 Tests, >95% Coverage), Frontend `npm run test` (Vitest, 117 Tests in 22 Dateien)
- **Media Storage:** S3-kompatibler Supabase Storage (Presigned Uploads & Downloads inkl. Magic-Byte Range-Validierung)
- **Primary Database:** SQLite (lokal), Neon Serverless PostgreSQL + `pgvector` (Produktion)

### Working Rules for Code Changes
1. Nach Modelländerungen immer Migrationen erzeugen (`uv run python manage.py makemigrations`) und prüfen.
2. Neue Views, Serializer und Komponenten sofort mit passenden Pytest- bzw. Vitest-Tests abdecken.
3. PEP 8 (max. 88 Zeichen) und `.editorconfig` einhalten.
4. Conventional Commits für Git-Commits nutzen (z. B. `feat:`, `fix:`, `chore:`).
5. Immer [AGENTS.md](AGENTS.md) für Backend- und Architekturvorgaben heranziehen.

## Sub-Agent Delegation (Team)

Das Projekt wird durch spezialisierte Sub-Agenten unterstützt. Aufgaben sind bedarfsgerecht an die Spezialisten zu delegieren:
- **`django-experte`**: Django ORM-Optimierung, komplexe SQL-Abfragen, Backend-Performance, DRF Views/Serializer und Security (OWASP).
- **`frontend-developer`**: React 19 Komponenten, Single-Page Architecture, TanStack Query Server-State-Management, Tailwind CSS v4 Design-System und strikte TypeScript-Typisierung.
- **`qa-tester`**: Automatisierte Tests (`pytest` für Django Backend inkl. `assertNumQueries`, `vitest` + React Testing Library für Frontend, Test-Coverage).
- **`devops`**: CI/CD Pipelines (GitHub Actions), Neon PostgreSQL Branching, Render Web Service & Blueprint (`render.yaml`), Docker & Deployment-Automatisierung.
- **`planer`**: Technical Product Manager. Pflegt die Dokumentation in `/docs`, definiert Epics, User Stories und präzise BDD-Akzeptanzkriterien.
