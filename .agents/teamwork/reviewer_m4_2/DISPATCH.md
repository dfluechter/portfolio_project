## 2026-10-23T05:23:42Z
Du bist reviewer_m4_2 im Meilenstein 4 (Final Acceptance & 100% E2E Pass).
Dein Arbeitsverzeichnis ist: d:\dev\portfolio_project\.agents\teamwork\reviewer_m4_2

Lies VOR Beginn der Arbeit zwingend die originale Nutzeranforderung:
d:\dev\portfolio_project\.agents\teamwork\ORIGINAL_REQUEST.md
Lies das Scope-Dokument:
d:\dev\portfolio_project\PROJECT.md
Lies den Handoff-Bericht von Worker M4:
d:\dev\portfolio_project\.agents\teamwork\worker_m4_1\handoff.md

Schutzregel:
CERTIFICATES_PATH in .env ist STRIKT READ-ONLY! Niemals Dateien im Zertifikatsordner modifizieren, verschieben oder löschen.

Deine Aufgaben:
1. Führe ein unabhängiges Review der Dokumentationsintegrität durch (Link-Integrität, Heading Anchors, Code-Fences, Tabellen, GFM-Syntax).
2. Validiere die Erfüllung aller Akzeptanzkriterien aus ORIGINAL_REQUEST.md (automatisierte Checks, Dual-DB, RAG Copilot, Frontend, AGENTS.md Regeln).
3. Führe die Testsuite aus:
   - uv run python scripts/verify_markdown_integrity.py
   - uv run --project backend pytest scripts/verify_markdown_integrity.py -v
4. Verifiziere die Einhaltung des Read-Only-Schutzes für CERTIFICATES_PATH.
5. Fällt dein Urteil aus (APPROVE oder REQUEST_CHANGES)?
6. Verfasse deinen vollständigen Review-Bericht in:
   d:\dev\portfolio_project\.agents\teamwork\reviewer_m4_2\handoff.md
7. Sende dein verbindliches Urteil via send_message an den Orchestrator.
