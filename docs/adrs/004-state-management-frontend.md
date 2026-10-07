# ADR-004: State Management im Frontend

**Status:** Accepted  
**Datum:** 2026-10-06  

## Kontext und Problem
Die React 18 Single Page Application (SPA) des Projekts muss asynchrone API-Daten aus dem Django-Backend verwalten, cachen und synchronisieren sowie lokalen, globalen UI-Zustand (wie Authentifizierungsstatus oder Theme) verwalten. Die Wahl des State Managements ist entscheidend für die Performance und Wartbarkeit des Frontends.

## Alternativen
- **Redux / Redux Toolkit:** Sehr mächtig, erfordert aber viel Boilerplate und ist für viele reine Server-State-Probleme zu überdimensioniert.
- **Zustand oder Jotai:** Leichtgewichtige Client-State-Manager, decken aber das Caching und Deduplizieren von API-Requests nicht out-of-the-box ab.
- **React Context API für alles:** Führt schnell zu Performance-Problemen (unnötige Re-Renders) und komplexem Code für asynchrones Caching.

## Entscheidung
Wir verwenden einen hybriden Ansatz:
- **React Query (TanStack Query)** für den Server-State (Data Fetching, Caching, Synchronization).
- **React Context API** für den globalen UI- und Authentifizierungs-State.

## Begründung
- **React Query:** Der Großteil des States in dieser Anwendung ist Server-State (Zertifikate, Projekte, Skills). React Query übernimmt das Caching, Background-Refetches und Fehlerhandling, was den Code extrem verschlankt.
- **React Context:** Der verbleibende globale State (z. B. "Ist der User eingeloggt?") ist klein, ändert sich selten und benötigt keine komplexe Boilerplate. Die Context API ist in React integriert und für diesen Zweck völlig ausreichend.

## Konsequenzen
- **Positiv:** Weniger Boilerplate-Code im Vergleich zu Redux. Saubere Trennung zwischen UI-Zustand und Server-Daten. Out-of-the-box Caching und optimistische Updates.
- **Negativ:** Entwickler müssen das Konzept von "Server-State vs. Client-State" verstehen und lernen, die Tools entsprechend ihrer Bestimmung einzusetzen.
