# Developer Guide & Beitragsrichtlinien

Dieser Leitfaden beschreibt das lokale Setup, Git-Konventionen, Test-Ausführung und Qualitäts-Gates für Entwickler und Mitwirkende.

---

## 1. Voraussetzungen

- **Python**: 3.13+
- **Paketmanager Python**: [uv](https://docs.astral.sh/uv/) (`pip install uv` oder per Installer)
- **Node.js**: 22.x LTS (Active LTS) & `npm`
- **Git**: 2.40+ mit Unterstützung für Git Hooks

---

## 2. Lokales Entwicklungs-Setup

### 2.1 Repository klonen
```bash
git clone https://github.com/dfluechter/portfolio_project.git
cd portfolio_project
```

### 2.2 Backend einrichten
```bash
cd backend
uv sync                                      # Installiert alle Dependencies inkl. Dev-Tools
cp ../.env.example ../.env                   # Erzeugt .env im Root-Verzeichnis
uv run python manage.py migrate              # Führt DB-Migrationen aus
uv run python manage.py index_rag_chunks     # Baut semantische Wissens-Chunks auf
uv run python manage.py createsuperuser      # Legt E-Mail-basierten Admin-Account an
uv run python manage.py runserver            # Startet Dev-Server auf Port 8000
```

### 2.3 Frontend einrichten (in zweitem Terminal)
```bash
cd frontend
npm install                                  # Installiert Node Dependencies
npm run dev                                  # Startet Vite Dev-Server auf Port 3000
```

---

## 3. Git-Commit-Governance & Commitlint

Alle Git-Commits werden vor der Erstellung durch **Husky** und **Commitlint** geprüft.

### 3.1 Format-Konvention
```text
<type>(<scope>): <description>
```

- **Header-Länge**: Maximal 72 Zeichen.
- **Typen**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `enh`.
- **Scopes**: Erlaubt sind `camelCase` (z. B. `ragChat`, `authContext`), `kebab-case` (z. B. `deps-backend`, `deps-frontend`) oder `lower-case`.
- **Subject**: Ausschließlich in Kleinschreibung (`lower-case`), kein Schlusspunkt (`.`).

### 3.2 Beispiele
```bash
git commit -m "feat(rag): add deep link badge click handler"
git commit -m "fix(backend): correct magic byte validation range"
git commit -m "docs(wiki): update deployment guide for render"
```

---

## 4. Test-Ausführung & Code-Qualität

Vor jedem Push müssen Linter und Tests lokal fehlerfrei durchlaufen:

### 4.1 Backend (im Ordner `backend/`)
```bash
# Test-Suite mit Coverage-Gate (>= 95%)
uv run pytest --cov=portfolio --cov-fail-under=95

# Linter & Formatierung
uv run ruff check .                          # Ruff Linter
uv run ruff format --diff .                  # Formatter-Check
uv run mypy .                                # Statische Typprüfung
```

### 4.2 Frontend (im Ordner `frontend/`)
```bash
npm run lint                                 # Oxlint statische Codeanalyse
npm run test                                 # Vitest Unit- und Komponententests
npm run build                                # TypeScript Check und Production-Build
```

---

## 5. Lokale Pre-Commit Hooks
Pre-Commit-Hooks können optional lokal installiert werden:
```bash
uv run pre-commit install
```
Dies führt vor jedem Commit automatisch Whitespace-Checks, JSON/YAML/TOML-Validierung, Ruff und Mypy aus.
