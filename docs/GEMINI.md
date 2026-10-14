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
- **Backend:** Python 3.13, Django 5.2, Django REST Framework, Djoser (Headless Token Auth)
- **Frontend:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, TanStack Query v5, Lucide React
- **Package Manager:** Backend `uv` (niemals direkt `pip`), Frontend `npm`
- **Linter & Formatter:** Backend `ruff check .` und `ruff format .`, Frontend `npm run lint`
- **Type Checking:** Backend `mypy .`, Frontend `npm run build` (`tsc -b`)
- **Tests:** Backend `uv run pytest --cov=portfolio --cov-fail-under=95` (212 Tests), Frontend `npm run test` (Vitest, 51 Tests)
- **Media Storage:** S3-kompatibler Supabase Storage (Presigned Uploads & Downloads)
- **Primary Database:** SQLite (lokal), Neon PostgreSQL (Produktion)

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
- **`planer`**: Technical Product Manager. Pflegt die Dokumentation in `/docs`, definiert Epics, User Stories und präzise BDD-Akzeptanzkriterien.
