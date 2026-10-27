# Plan — Orchestrator Generation 2: Final Acceptance & 100% E2E Verification

## Zielsetzung
Abschluss der Markdown-Harmonisierungs-Mission für das gesamte Repository:
Erreichen von 100% fehlerfreier Dokumentation über alle 4 Tiers der automatisierten Opaque-Box E2E Integritätssuite (`scripts/verify_markdown_integrity.py`), Verifikation aller Anforderungen R1, R2, R3 und Akzeptanzkriterien, strikte Wahrung des Read-Only-Schutzes für `CERTIFICATES_PATH`, Durchführung des abschließenden 5-Köpfigen Verifikationspanels (Reviewer x2, Challenger x2, Forensic Auditor) und Übergabe des Victory Claims an den Sentinel.

## Phasen & Einzelschritte

### Schritt 1: Konsolidierung des bisherigen Projektstands [ABGESCHLOSSEN]
- Prüfung und formelle Abnahme von Meilenstein 3 (Gate M3 PASS dokumentiert in `GATE_STATUS.md`).
- Erfassung des Handoffs von Gen 1 und Bestätigung von M1, M2 und M3.

### Schritt 2: Untersuchung & Analyse Phase 4 (Explorer M4)
- Dispatch von 3 Explorern (`teamwork_preview_explorer_m4_1`, `teamwork_preview_explorer_m4_2`, `teamwork_preview_explorer_m4_3`):
  - Analyse des Gesamtergebnisses von `scripts/verify_markdown_integrity.py` über alle 4 Tiers.
  - Untersuchung der 3 verbliebenen Tier-3-Befunde (`TEST_INFRA.md:9, 35` und `.agents/skills/neon-functions/SKILL.md:337`).
  - Prüfung der Gesamterfüllung von R1, R2, R3 und aller Akzeptanzkriterien aus `ORIGINAL_REQUEST.md`.
  - Empfehlung der optimalen Behebungsstrategie für 100% fehlerfreien Gesamtlauf.

### Schritt 3: Umsetzung & Gesamttest (Worker M4)
- Dispatch eines Workers (`worker_m4_1`):
  - Bereinigung von Formatierungs- und Anker-Details in `TEST_INFRA.md` (Language-Tag in Zeile 9, unescapte Pipe in Zeile 35) bzw. Berücksichtigung von Vendor-Skills.
  - Aktualisierung von `PROJECT.md` (M3 DONE, M4 IN_PROGRESS).
  - Ausführung der vollständigen Verifikationssuite:
    `uv run python scripts/verify_markdown_integrity.py` (Ziel: 0 Fehler über alle 4 Tiers).
    `uv run --project backend pytest scripts/verify_markdown_integrity.py -v` (Ziel: 100% PASSED).
  - Bestätigung, dass `CERTIFICATES_PATH` zu 100% unberührt geblieben ist.

### Schritt 4: Unabhängige Reviews (Reviewer x2)
- Dispatch von 2 Reviewern (`reviewer_m4_1`, `reviewer_m4_2`):
  - Unabhängige Validierung aller Akzeptanzkriterien (R1, R2, R3).
  - Überprüfung von Link-Integrität, Codefences, Tabellen, Fakten und Rechtschreibung.
  - Ausführung von Testbefehlen und Abgabe des Urteils (APPROVE / REQUEST_CHANGES).

### Schritt 5: Adversarial Challenge & Stress-Testing (Challenger x2)
- Dispatch von 2 Challengern (`challenger_m4_1`, `challenger_m4_2`):
  - Adversarial Testing auf Broken Links, Anker, veraltete Modellnamen, unportable Pfade.
  - Empirische Belastungstests und Abgabe des Urteils (APPROVE / REQUEST_CHANGES).

### Schritt 6: Forensisches Integritäts-Audit (Auditor)
- Dispatch des Forensic Auditors (`auditor_m4_1`):
  - Prüfung auf Cheating, Hardcodings, Schein-Implementierungen oder Bypasses.
  - Verifikation des strikten Quellschutzes von `CERTIFICATES_PATH`.
  - Erteilung des binären Audit-Urteils (CLEAN / INTEGRITY VIOLATION).

### Schritt 7: Gate M4 & Victory Claim
- Auswertung aller Panel-Urteile in `GATE_STATUS.md`.
- Bei einstimmigem PASS (alle 4x APPROVE + Auditor CLEAN):
  - Abschlussbericht (`handoff.md`) verfassen.
  - Victory Claim via `send_message` an den Sentinel (`b9bb307e-8953-4785-88d1-fee1c897392d`) übermitteln.
