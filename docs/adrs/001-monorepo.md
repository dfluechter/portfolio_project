# ADR-001: Monorepo vs. Polyrepo

**Status:** Accepted  
**Datum:** 2026-10-06  

## Kontext und Problem
Das Portfolio-Projekt besteht aus zwei Hauptkomponenten: einem Backend (Django 5.2) und einem Frontend (React 18). Es stellte sich die Frage, ob diese Komponenten in separaten Repositories (Polyrepo) oder in einem gemeinsamen Repository (Monorepo) verwaltet werden sollen.

## Alternativen
- **Polyrepo (Frontend und Backend getrennt):** Ermöglicht isolierte Berechtigungen und getrennte Deployment-Pipelines, führt aber zu einer schwereren Synchronisation zwischen API-Änderungen und UI-Anpassungen.
- **Monorepo (Gemeinsames Repository):** Beide Systeme leben im selben Versionskontrollsystem und werden gemeinsam versioniert.

## Entscheidung
Wir haben uns für eine **Monorepo-Strategie** entschieden. Backend und Frontend werden im selben Repository verwaltet.

## Begründung
- **Einfachere CI/CD:** Ein einziger Commit enthält sowohl die API-Anpassung als auch die dazugehörige UI-Anpassung, was atomare Änderungen erlaubt und die Pipeline-Konfiguration vereinfacht.
- **Konsistente Versionierung:** Es gibt keine Missverständnisse darüber, welche Frontend-Version zu welcher Backend-Version passt.
- **Geringerer Overhead:** Für ein kleines bis mittelgroßes Projekt ist das Management mehrerer Repositories mit einem unverhältnismäßigen Administrationsaufwand (Issue-Tracking, Pull Requests) verbunden.

## Konsequenzen
- **Positiv:** Sehr flüssiger Workflow für Fullstack-Entwickler, da alle Code-Änderungen an einem Ort stattfinden. Einfaches Onboarding.
- **Negativ:** Das Repository wächst schneller in der Größe. Die Deployment-Skripte (wie `build.sh` für Render) müssen intelligent genug sein, um die korrekten Build-Schritte auszuführen (z.B. Python-Abhängigkeiten via `uv` und statische Assets).
