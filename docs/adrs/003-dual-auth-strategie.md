# ADR-003: Dual-Auth Strategie

**Status:** Accepted  
**Datum:** 2026-10-06  

## Kontext und Problem
Das System bedient zwei unterschiedliche Arten von Clients:
1. Eine React-basierte Single Page Application (SPA), die über REST API Endpoints kommuniziert.
2. Das native Django-Admin-Dashboard und ggf. serverseitig gerenderte Ansichten.
Es musste eine sichere und praktikable Authentifizierungsstrategie gewählt werden, die beiden Ansätzen gerecht wird.

## Alternativen
- **Nur Session-Cookies:** Hervorragend für serverseitige Apps, aber bei entkoppelten SPAs oft problematisch bezüglich CSRF und Cross-Origin-Requests.
- **Nur JWT (JSON Web Tokens):** Gut für APIs und entkoppelte Clients, erfordert jedoch komplexes Token-Management (Storage, Refresh) und bietet keine eingebaute Sicherheit für das native Django-Admin-Interface.

## Entscheidung
Wir setzen eine **Dual-Auth-Strategie** ein:
- **Session-Cookies** für das native Django-Dashboard und Backend-Views.
- **JWT (JSON Web Tokens)** via Djoser + SimpleJWT für das React-Frontend und externe API-Zugriffe.

## Begründung
- Die React SPA benötigt zustandslose Authentifizierung (JWT) für die API (`api/auth/`), da dies Skalierbarkeit und Flexibilität bei der Client-Entwicklung (z. B. auch für zukünftige Mobile Apps) maximiert.
- Das Django-Ökosystem (insb. das Admin-Panel) verlässt sich tiefgreifend auf Session-Cookies. Diese Funktionalität künstlich auf JWT umzubauen, wäre fehleranfällig und unnötig aufwendig.
- Diese Trennung nutzt die jeweiligen Stärken beider Welten, ohne Kompromisse bei der Sicherheit einzugehen.

## Konsequenzen
- **Positiv:** Standardkonformes Verhalten im Django-Admin und flexible API-Nutzung für das Frontend.
- **Negativ:** Leicht erhöhte Komplexität in der Backend-Konfiguration (zwei Auth-Backends) und im Frontend (sicheres Verwalten des Refresh- und Access-Tokens).
