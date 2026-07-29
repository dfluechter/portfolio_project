---
name: django-code-reviewer
description: >-
  Überprüft ein Django-Projekt automatisiert auf Code-Qualität und Typ-Sicherheit. Installiert Tools, fixt Linter-Fehler und führt Tests aus.
---

# Django Code Reviewer

## Overview
Dieser Skill orchestriert die Überprüfung eines Django-Projekts mit Linter (Ruff), Typechecker (Mypy) und Test-Framework (Pytest). Er stellt sicher, dass die benötigten Tools vorhanden sind, wendet Auto-Fixes an und repariert Mypy-Fehler sowie fehlgeschlagene Tests automatisch.

## Dependencies
- `uv`: Wird für das Ausführen und Installieren der Python-Pakete (`uv run`, `uv add`) benötigt.

## Quick Start
Sag einfach: "Überprüfe das Django Projekt"

## Workflow

### 1. Abhängigkeiten prüfen und installieren
- Führe `uv add --dev ruff mypy pytest pytest-django` im Root-Verzeichnis aus, um sicherzustellen, dass alle Tools installiert sind.

### 2. Linter ausführen und Auto-Fixes anwenden
- Führe `uv run ruff check --fix .` aus.
- Dies repariert automatisch leichte Fehler wie unsortierte Importe.
- Überprüfe den Output auf verbleibende Warnungen (z.B. `RUF012` mutable Default-Werte in `Meta`-Klassen von Django-Modellen). Passe diese im Code an, z.B. indem du Listen `["-created_at"]` in Tuples `("-created_at",)` wandelst.

### 3. Type-Checks ausführen und reparieren
- Führe `uv run mypy .` aus.
- Analysiere den Output auf Fehler (z.B. fehlende Type-Hints wegen `check_untyped_defs = true`).
- Öffne die betroffenen Dateien und füge fehlende Type-Hints hinzu.

### 4. Tests ausführen
- Führe `uv run pytest` aus.
- Wenn Tests fehlschlagen, analysiere den Fehler und korrigiere den Code, bis die Tests grün sind.
- Gib dem User am Ende eine Markdown-Zusammenfassung aller durchgeführten Checks und vorgenommenen Änderungen aus.

## Rate Limiting
Nicht zutreffend (rein lokale Skripte ohne externe API-Calls).

## Common Mistakes
- **Alte Migrationen editieren:** Ruff meckert oft über mutable Defaults in historischen Django-Migrationen. Editiere diese historischen Dateien idealerweise *nicht*, um die Migrations-Historie nicht zu stören. Fokussiere dich auf den echten App-Code.
- **Mypy "Duplicate Module":** Mypy stolpert manchmal über doppelte Module, wenn ein `build/`-Ordner existiert. Ergänze dann `exclude = ["^build/"]` im `[tool.mypy]` Block der `pyproject.toml`.
