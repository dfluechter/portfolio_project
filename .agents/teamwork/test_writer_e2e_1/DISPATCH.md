# E2E Test Track Dispatch: Test Infrastructure & Verification Harness
Working Directory: d:\dev\portfolio_project\.agents\teamwork\test_writer_e2e_1
Original Request Path: d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Project Plan: d:\dev\portfolio_project\PROJECT.md
Survey Markdown: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_markdown.md
Deep Audit JSON: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\deep_audit.json
Parent: teamwork_preview_orchestrator (c0b5fa43-c061-4a8d-b0f6-8f11df6ab52f)
## 2026-10-23T00:12:56Z
Du bist der E2E Test Writer für das Projekt.
Dein Arbeitsverzeichnis ist: d:\dev\portfolio_project\.agents\teamwork\test_writer_e2e_1
Original Request Path: d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Project Scope: d:\dev\portfolio_project\PROJECT.md
Survey Markdown: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\survey_markdown.md
Deep Audit JSON: d:\dev\portfolio_project\.agents\teamwork\teamwork_preview_explorer_survey_1\deep_audit.json

AUFGABE:
1. Lies zuerst ORIGINAL_REQUEST.md und PROJECT.md.
2. Erstelle ein robustes, automatisiertes Opaque-Box Testskript unter `scripts/verify_markdown_integrity.py`.
   Dieses Skript muss die 4 Tiers der Akzeptanzkriterien unabhängig und reproduzierbar verifizieren:
   - Tier 1: Link-Integrität: Jeder relative Link (z.B. [link](path), [link](../path), [link](docs/...), [link](file.md)) in allen .md-Dateien muss gegen das reale Dateisystem geprüft werden. Meldet 404 / tote Links.
   - Tier 2: Portabilität & Veraltete Referenzen:
     - Keine absoluten Windows-URIs (`file:///...`) in Projektdokumenten.
     - Keine Referenzen auf veraltete Gemini-Modelle (wie `gemini-2.5-flash`), stattdessen `gemini-3.8-flash`.
   - Tier 3: Markdown-Syntax & Formatierung:
     - Keine ungeschlossenen Code-Fences.
     - Alle Code-Blöcke in Kern-Dokumenten müssen gültige Language-Tags haben.
     - Valide GFM-Tabellensyntax.
     - Heading Anchors (`#anchor-name`) müssen existierenden Überschriften entsprechen.
   - Tier 4: Fakten-Konsistenz (Architecture Cross-Check):
     - Konsistenzprüfung zwischen README.md, docs/architecture.md, docs/deployment.md bzgl. Django-Version (Django 6.0 / >=5.2), Dual-DB (Neon / SQLite Fallback), Build-Befehle (`uv sync`, `npm run build`), Vitest-Testanzahl (117 Tests) und Render Blueprint.
3. Erstelle im Projekt-Root `TEST_INFRA.md` gemäß der Vorlage aus dem Project Pattern (Methodik, Feature-Matrix, Befehl zur Testausführung).
4. Sobald das Skript erstellt und getestet ist, erstelle `TEST_READY.md` im Projekt-Root mit dem genauen Ausführungsbefehl (z.B. `python scripts/verify_markdown_integrity.py` oder `uv run python scripts/verify_markdown_integrity.py`) und der Coverage-Zusammenfassung.
5. Schutzregel: CERTIFICATES_PATH ist STRIKT READ-ONLY!

Schreibe dein handoff.md in dein Arbeitsverzeichnis und melde dich via send_message an c0b5fa43-c061-4a8d-b0f6-8f11df6ab52f.
