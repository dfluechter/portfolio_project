# ADR-002: Wahl der Datenbank (Neon Serverless PostgreSQL)

**Status:** Accepted  
**Datum:** 2026-10-06  

## Kontext und Problem
Für das Django-Backend in Produktion wird eine relationale Datenbank benötigt. Es galt eine kosteneffiziente, skalierbare und gut in den Entwicklungs-Workflow integrierbare PostgreSQL-Lösung zu finden. 

## Alternativen
- **Lokales SQLite:** Ausreichend für Entwicklung (und wird auch genutzt), aber nicht geeignet für produktive Umgebungen (keine Nebenläufigkeit, fehlende Datensicherheit).
- **Herkömmliches AWS RDS / Managed PostgreSQL:** Sehr robust, verursacht aber kontinuierlich hohe Fixkosten, auch wenn keine Last anliegt.
- **Supabase PostgreSQL:** Bietet viele Features, aber der Fokus liegt stark auf dem eigenen Ökosystem (Realtime, Auth, PostgREST), was im Konflikt mit unserem nativen Django-Backend (Djoser/DRF) stehen kann.

## Entscheidung
Wir haben uns für **Neon Serverless PostgreSQL** für die Produktionsumgebung entschieden.

## Begründung
- **Scale-to-Zero & Kosten:** Neon skaliert die Compute-Ressourcen bei Inaktivität auf Null, was für ein Portfolio-Projekt ohne kontinuierlich hohen Traffic extrem kosteneffizient ist.
- **Branching-Features:** Neon bietet die Möglichkeit, Datenbank-Branches analog zu Git-Branches zu erstellen. Das erleichtert das Testen von Schema-Migrationen enorm.
- **Kompatibilität:** Es ist eine vollwertige PostgreSQL-Datenbank, die nahtlos mit Django harmoniert, konfiguriert über eine einfache `DATABASE_URL`.

## Konsequenzen
- **Positiv:** Minimale Betriebskosten und moderne Entwickler-Experience durch Database Branching.
- **Negativ:** Durch Scale-to-Zero kann es bei der ersten Anfrage nach einer Inaktivitätsphase zu einem "Cold Start"-Delay kommen.
- **Hinweis:** Die lokale Entwicklung erfolgt weiterhin auf SQLite (Fallback, wenn keine `DATABASE_URL` gesetzt ist).
