# Agent Guidelines & Project Context

## Language Strategies

**[CONFIGURATION]**
- TARGET_LANGUAGE = **German**

**1. Internal Reasoning & Code:**
- **Reasoning:** English is permitted for internal chain-of-thought to maintain optimal accuracy.
- **Codebase:** Use standard English for all source code, including variables, classes, and generic comments (Exception: German `verbose_name` / `verbose_name_plural` and DB field comments according to [AGENTS.md](AGENTS.md)).

**2. User-Facing Output:**
- **Primary Rule:** ALL user-facing text MUST be written in the TARGET_LANGUAGE.
- **Chat:** Communicate exclusively in the TARGET_LANGUAGE.
- **Artifacts:** Content within documentation and planning files (e.g., `task.md`, `implementation_plan.md`, `walkthrough.md`) MUST be written in the TARGET_LANGUAGE.

**3. Task Metadata:**
- `TaskName`: MUST be in the TARGET_LANGUAGE.
- `TaskSummary`: MUST be in the TARGET_LANGUAGE.

## Project Context: Portfolio Backend & Dashboard

Detailed architecture, configuration, and API rules can be found in [AGENTS.md](AGENTS.md).

### Tech Stack & Standards
- Python 3.13, Django 5.2, Django REST Framework
- Package manager: `uv` (Never use pip directly!)
- Linter & Formatter: `ruff check .` and `ruff format .`
- Type checking: `mypy .`
- Tests: `uv run pytest --cov=portfolio --cov-fail-under=95`
- Media Storage: S3-compatible Supabase Storage
- Primary database: SQLite (local), Neon PostgreSQL (production)

### Working Rules for Code Changes
1. Always run makemigrations after model changes (`uv run python manage.py makemigrations`) and inspect the generated migrations.
2. Immediately add matching pytest fixtures and tests for new views/serializers.
3. Adhere to PEP 8 (max. 88 characters per line) and the guidelines in `.editorconfig`.
4. Use Conventional Commits for git commits (e.g., `feat:`, `fix:`, `chore:`).
5. Always consult [AGENTS.md](AGENTS.md) for backend specifics (e.g., hybrid serializer pattern, S3 settings, Djoser auth).
