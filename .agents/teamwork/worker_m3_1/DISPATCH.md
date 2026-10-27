# Milestone 3 Dispatch: Link Integrity, Anchors & Portability
Working Directory: d:\dev\portfolio_project\.agents\teamwork\worker_m3_1
Original Request Path: d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Project Scope: d:\dev\portfolio_project\PROJECT.md
Survey Markdown: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_markdown.md
Deep Audit JSON: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\deep_audit.json
Parent: teamwork_preview_orchestrator (c0b5fa43-c061-4a8d-b0f6-8f11df6ab52f)
## 2026-10-23T01:41:01Z
Du bist Worker M3 für Milestone 3: Link Integrity, Anchors & Portability.
Dein Arbeitsverzeichnis ist: d:\dev\portfolio_project\.agents\teamwork\worker_m3_1
Original Request Path: d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Project Scope: d:\dev\portfolio_project\PROJECT.md
Survey Markdown: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_markdown.md
Deep Audit JSON: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\deep_audit.json

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A forensic auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

DEINE EXKLUSIVEN SCHREIB-DATEIEN (File Boundaries):
- `docs/wiki/Home.md`
- `docs/wiki/_Sidebar.md`
- `docs/CONTRIBUTING.md`
- `docs/architecture.md` (nur Anker in Zeile 156)
- `docs/backlog.md` (Anker Z. 586, URI Z. 445, Modelltext Z. 516)
- `AGENTS.md` (URI Z. 16)
- `docs/SECURITY.md` (URIs Z. 64, 146, 148)
- `docs/specs/us-15-1-conditional-caching.md` (URI Z. 114)
- `docs/specs/us-16-1-i18n-portfolio-and-copilot.md` (Dateipfad Z. 146)
- `docs/wiki/Deployment-and-Operations.md` (URI Z. 9)

AUFGABEN FÜR MILESTONE 3:
1. Beseitigung aller 20 toten Links (F8):
   - In `docs/wiki/Home.md` und `docs/wiki/_Sidebar.md`: Ergänze bei allen Wiki-Links die fehlende Endung `.md` (z.B. `[System-Architecture](System-Architecture.md)` statt `(System-Architecture)`).
   - In `docs/CONTRIBUTING.md`: Korrigiere Zeile 82 `(.editorconfig)` zu `(../.editorconfig)` und Zeile 99 `(.gitmessage)` zu `(../.gitmessage)`.
   - In `docs/specs/us-16-1-i18n-portfolio-and-copilot.md`: Korrigiere Zeile 146 von `frontend/src/components/common/LanguageSwitcher.tsx` zu `frontend/src/components/LanguageSwitcher.tsx`.
2. Korrektur der gebrochenen Header-Anker (F9):
   - In `docs/architecture.md` Zeile 156: Ändere `deployment.md#5-supabase-storage-cors-für-direct-uploads` auf `deployment.md#5-supabase-storage-cors-konfiguration-für-direct-to-storage-uploads`.
   - In `docs/backlog.md` Zeile 586: Ändere `deployment.md#32-konventionelle-commit-nachrichten--git-hooks` auf `deployment.md#32-automatisierte-qualitätssicherung-durch-git-hooks-und-commitlint`.
3. Ersetzung aller absoluten Windows-Dateipfade (`file:///...`) durch saubere relative Links (F10):
   - `AGENTS.md` Zeile 16: `file:///d:/dev/portfolio_project/.agents/rules/language.md` -> `[.agents/rules/language.md](.agents/rules/language.md)`.
   - `docs/backlog.md` Zeile 445: Ersetze die `file:///D:/...` URI durch den relativen Link `../backend/portfolio/tests/test_certificate_track_validation.py`.
   - `docs/SECURITY.md` Zeilen 64, 146, 148: Ersetze alle drei `file:///...` URIs durch relative Markdown-Links (`../backend/portfolio/services/ai_assistant.py`, `../render.yaml`, `../.github/CODEOWNERS`).
   - `docs/specs/us-15-1-conditional-caching.md` Zeile 114: Ersetze die `file:///...` URI durch `../../backend/portfolio/tests/test_caching.py`.
   - `docs/wiki/Deployment-and-Operations.md` Zeile 9: Ersetze die `file:///...` URI durch `../../render.yaml`.
4. Bereinigung veralteter Modell-Referenzen (F2 Polish):
   - In `docs/backlog.md` Zeile 516: Entschärfe den wörtlichen String `gemini-2.5-flash` (z.B. zu `- **And** Anfragen an veraltete Vorgängermodelle vor Gemini 3.8 Flash, die für Neunutzer HTTP-404-Fehler erzeugen, sind vollständig abgelöst.`), damit Tier 2 der E2E-Suite auf 0 Fehler sinkt!
5. Verifikation:
   - Führe `uv run python scripts/verify_markdown_integrity.py` aus.
   - Analysiere das Ergebnis: Tier 1, Tier 2, Tier 3 und Tier 4 in allen Kerndokumenten müssen sauber bestehen!
   - Schutzregel: CERTIFICATES_PATH ist STRIKT READ-ONLY!
