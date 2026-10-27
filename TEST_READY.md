# Test Readiness Report: Markdown & Documentation Integrity

**Datum:** 2026-10-23  
**Status:** **READY**  
**Harness:** `scripts/verify_markdown_integrity.py`  
**Test Track:** E2E Automated Verification  

---

## 1. Test-Ausführungsbefehle

Die automatisierte E2E-Integritätssuite kann über folgende Standardbefehle aus dem Projekt-Root aufgerufen werden:

### Primärer Ausführungsbefehl (CLI-Modus)
```bash
uv run python scripts/verify_markdown_integrity.py
```

### Pytest-Ausführung
```bash
uv run --project backend pytest scripts/verify_markdown_integrity.py -v
```

### Schnellprüfung einzelner Tiers
```bash
uv run python scripts/verify_markdown_integrity.py --tier 1
uv run python scripts/verify_markdown_integrity.py --tier 2
uv run python scripts/verify_markdown_integrity.py --tier 3
uv run python scripts/verify_markdown_integrity.py --tier 4
```

---

## 2. Coverage-Zusammenfassung

Das Testsystem deckt 100% der Anforderungen aus `ORIGINAL_REQUEST.md` und `PROJECT.md` über 4 orthogonale Tiers ab:

| Tier | Name | Testumfang & Erfasste Dateien | Validierte Metriken | Status Test-Harness |
|---|---|---|---|---|
| **Tier 1** | **Link-Integrität & 404 Detection** | 123 Markdown-Dateien im Repository | • Relative Pfadauflösung gegen Realdokumente<br>• Erkennung toter Links (404)<br>• Root-Relative Pfadverwechslung (`ROOT_RELATIVE_PATH_ERROR`)<br>• Fehlende `.md`-Endungen im Wiki (`MISSING_MD_EXTENSION`) | **ACTIVE & VERIFIED** |
| **Tier 2** | **Portabilität & Veraltete Referenzen** | Kern-Dokumentation & Spezifikationen | • Abwesenheit unportabler absoluter `file:///...` Windows-URIs<br>• Abwesenheit harter `D:\dev\...` Pfade<br>• Erkennung veralteter Gemini-Modelle (`gemini-2.5-flash` $\rightarrow$ `gemini-3.8-flash`) | **ACTIVE & VERIFIED** |
| **Tier 3** | **Markdown-Syntax, Tabellen & Anchors** | Alle Dokumente & Kern-Docs | • Vollständig geschlossene Code-Fences<br>• Pflicht für Sprach-Tags (`bash`, `python`, `tsx`, `text`, etc.) in Kern-Docs<br>• GFM-Tabellen-Syntax (Delimiter & Spaltengleichheit inkl. `\|`)<br>• Heading-Anchor-Validierung (#slug) mit GFM-Spezifikation | **ACTIVE & VERIFIED** |
| **Tier 4** | **Architektur-Fakten & Konsistenz** | `README.md`, `docs/architecture.md`, `docs/deployment.md`, `docs/frontend.md`, `render.yaml` | • Django 6.0 (`django>=5.2`) Ausrichtung<br>• Neon PostgreSQL (`pgvector`) & SQLite Dual-DB Dokumentation<br>• Build-Befehle (`uv sync`, `npm run build`)<br>• Vitest-Metriken (117 Tests in 22 Dateien)<br>• `render.yaml` Blueprint-Validierung (keine Git-Konflikte, `sync: false`, Settings, Allowed Hosts) | **ACTIVE & VERIFIED** |

---

## 3. Aktuelle Baseline-Testergebnisse (Vor M1–M3 Fixes)

Die Ausführung gegen die aktuelle Codebase deckt präzise die vom Explorer identifizierten Defekte auf:

```text
================================================================================
MARKDOWN & DOCUMENTATION INTEGRITY VERIFICATION SUITE
================================================================================
Scanned Markdown Files: 123
Repository Root:        D:\dev\portfolio_project
--------------------------------------------------------------------------------
[TIER 1] Link Integrity & 404 Detection:             21 issue(s)
[TIER 2] Portability & Deprecated Model References:   15 issue(s)
[TIER 3] Markdown Syntax, Tables & Heading Anchors:   11 issue(s)
[TIER 4] Fact Consistency & Architecture Cross-Check: 2 issue(s)
--------------------------------------------------------------------------------
OVERALL STATUS: [FAILED] 49 integrity issues detected across selected tiers.
================================================================================
```

### Details der erfassten Defekte:
1. **Tier 1 (21 Fundstellen)**: 17 fehlende `.md`-Endungen im Wiki (`docs/wiki/Home.md`, `docs/wiki/_Sidebar.md`), 2 Root-relative Pfadverwechslungen in `docs/CONTRIBUTING.md`, 2 veraltete Überschriften-Anker in `docs/architecture.md` und `docs/backlog.md`.
2. **Tier 2 (15 Fundstellen)**: 14 absolute `file:///...` URIs in `AGENTS.md`, `docs/deployment.md`, `docs/SECURITY.md`, `docs/specs/...`, etc.; 1 veraltetes Modell `gemini-2.5-flash` in `docs/backlog.md:516`.
3. **Tier 3 (11 Fundstellen)**: 1 fehlendes Language-Tag in `docs/frontend.md:27`; 9 fehlerhafte TOC-Anker mit führendem Bindestrich in `README.md:19-27`; 1 Vendor-Anker.
4. **Tier 4 (2 Fundstellen)**: Veraltetes Django 5.2 in `docs/deployment.md`; veraltete 82 Vitest-Tests in `README.md`. (`render.yaml` und `docs/architecture.md` wurden durch Worker M1 bereits begonnen).

---

## 4. Zielzustand (100% Pass Kriterium für M4)

Sobald die Milestones M1, M2 und M3 abgeschlossen sind, verifiziert das Skript die vollständige Fehlerfreiheit mit Exit Code 0:

```text
OVERALL STATUS: [PASSED] 100% Documentation & Link Integrity Verified.
```
