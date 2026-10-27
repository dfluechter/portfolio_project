# Test Infrastructure Specification: Markdown & Documentation Integrity

## 1. Übersicht & Methodik

Die Dokumentations- und Link-Integrität des `portfolio_project` Repositories wird über ein automatisiertes **Opaque-Box E2E Verifikations-Harness** sichergestellt (`scripts/verify_markdown_integrity.py`). Das Testsystem prüft das reale Dateisystem unabhängig von der Implementierungslogik und ohne invasive Modifikationen.

Gemäß den Vorgaben in `ORIGINAL_REQUEST.md` und `PROJECT.md` ist die Verifikation in **vier orthogonale Tiers** unterteilt:

```text
+-------------------------------------------------------------------------+
|                  E2E Markdown Integrity Test Suite                      |
+-------------------------------------------------------------------------+
       |                         |                    |             |
       v                         v                    v             v
+---------------+       +------------------+   +------------+ +-----------+
|    Tier 1     |       |      Tier 2      |   |   Tier 3   | |  Tier 4   |
| Link-         |       | Portabilität &   |   | Syntax &   | | Fakten-   |
| Integrität    |       | Veraltete Ref.   |   | Anchors    | | Konsistenz|
+---------------+       +------------------+   +------------+ +-----------+
| * 404 Links   |       | * file:/// URIs  |   | * Fences   | | * Django  |
| * Root Confus.|       | * Windows Pfade  |   | * LangTags | | * Dual-DB |
| * Wiki .md    |       | * Gemini 3.8     |   | * Tabellen | | * BuildCmd|
| * Ziel-Pfade  |       |   (statt 2.5)    |   | * Anchors  | | * Vitest  |
+---------------+       +------------------+   +------------+ +-----------+
```

---

## 2. Feature- & Test-Matrix

| Tier | Akzeptanzkriterium / Feature | Prüfumfang & Validierungslogik | Zieldokumente / Scope |
|---|---|---|---|
| **Tier 1** | **Link-Integrität & 404-Erkennung** (F8, F12) | Löst jeden relativen Pfad (`[text](path)` und `![alt](path)`) gegen das reale Dateisystem auf. Unterscheidet präzise zwischen:<br>• `DEAD_LINK_404`: Ziel existiert nirgends<br>• `ROOT_RELATIVE_PATH_ERROR`: Pfad existiert nur relativ zum Repo-Root (z.B. `.editorconfig` in `docs/CONTRIBUTING.md`)<br>• `MISSING_MD_EXTENSION`: Ziel existiert mit `.md`-Endung (z.B. GitHub-Wiki Links in `docs/wiki/Home.md` und `_Sidebar.md`) | Alle Markdown-Dateien im Repository (123 Dateien, exkl. `.git`, `.venv`, `node_modules`, `.agents/teamwork`) |
| **Tier 2** | **Portabilität & Veraltete Referenzen** (F2, F10) | • Verifiziert die vollständige Abwesenheit unportabler absoluter Windows-URIs (`file:///...` und `D:\dev\...`) in allen Projektdokumenten.<br>• Prüft auf veraltete Gemini-Modellreferenzen (`gemini-2.5-flash`, `gemini-1.5-*`); Standardmodell ist verbindlich `gemini-3.8-flash`. | Kern-Dokumente (`README.md`, `AGENTS.md`, `docs/**/*.md`, `design-system/**/*.md`, `.github/**/*.md`) |
| **Tier 3** | **Markdown-Syntax, Tabellen & Heading Anchors** (F9, F11) | • **Code-Fences**: Prüft auf lückenlos geschlossene Fences (` ``` ` / ` ~~~ `).<br>• **Language-Tags**: Verlangt zwingend ein gültiges Sprach-Tag in allen Code-Blöcken der Kern-Dokumente (`bash`, `python`, `tsx`, `text`, etc.).<br>• **Tabellensyntax**: Verifiziert GFM-Delimiterzeilen (`\|---\|---\|`) und einheitliche Spaltenanzahl inkl. Berücksichtigung formatierter Pipes (`\|`).<br>• **Heading Anchors**: Validiert jeden Anchor (`#slug`) gegen existierende Überschriften (GFM-Slug-Algorithmus) oder HTML-IDs im Quell- oder Zieldokument. | Kern-Dokumentation & Wiki |
| **Tier 4** | **Architektur-Fakten & Konsistenz** (F1, F3, F4, F5, F6, F7) | Cross-Check zwischen `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/frontend.md` und `render.yaml`:<br>• **Django-Version**: Konsistente Spezifikation von `Django 6.0` (`django>=5.2`).<br>• **Dual-DB**: Dokumentation von Neon PostgreSQL (`pgvector`) und SQLite-Fallback.<br>• **Build-Befehle**: `uv sync` (Backend) und `npm run build` (Frontend).<br>• **Vitest-Testanzahl**: 117 Tests in 22 Dateien.<br>• **Render Blueprint**: Keine Git-Konflikte (`<<<<<<<`), kein `key: false` (muss `sync: false` sein), `core.settings` als Modul. | System-Architektur, README, Deployment-Guide, Blueprint |

---

## 3. Testausführung

Das Test-Harness kann sowohl über die CLI als auch über `pytest` ausgeführt werden:

### 3.1 Standard-Ausführung (Alle 4 Tiers)
```bash
uv run python scripts/verify_markdown_integrity.py
```

### 3.2 Ausführung einzelner Tiers
```bash
# Nur Tier 1 (Link-Integrität)
uv run python scripts/verify_markdown_integrity.py --tier 1

# Tier 2 & 4 (Portabilität & Architektur-Konsistenz)
uv run python scripts/verify_markdown_integrity.py --tier 2,4
```

### 3.3 Maschinenlesbare JSON-Ausgabe
```bash
uv run python scripts/verify_markdown_integrity.py --json
```

### 3.4 Integration in Pytest
```bash
uv run --project backend pytest scripts/verify_markdown_integrity.py -v
```

---

## 4. Exit Codes & CI/CD Gate

- **Exit Code 0**: 100% Integrität verifiziert (0 Fehler). Alle Links, Modelle, Syntaxelemente und Architektur-Fakten stimmen überein.
- **Exit Code 1**: Integritätsverletzung erkannt. Detaillierte Liste der Fundstellen mit Zeilennummer, Kategorie, Fehlerursache und Kontextzeile auf stdout.

---

## 5. Schutzregel-Audit

- **Zertifikate-Schutz**: Das Testskript greift zu keinem Zeitpunkt auf den geschützten Ordner `CERTIFICATES_PATH` schreibend zu.
- **Reine Lese-Operationen**: Sämtliche Tests operieren streng im Read-Only-Modus gegen das Dateisystem.
