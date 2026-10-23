# Frontend-Architektur

Die Benutzeroberfläche des Portfolio-Projekts ist eine hochperformante, moderne Single Page Application (SPA), basierend auf **React 19**, **TypeScript 7.x**, **Vite 8** und **Tailwind CSS v4**.

---

## 1. Technologiestack & Bibliotheken

| Bereich | Technologie | Beschreibung / Rolle |
|---|---|---|
| **Core** | React 19 / TypeScript 7.x | Komponenten-Architektur und strenge statische Typisierung |
| **Bundler & Dev** | Vite 8 + `@tailwindcss/vite` | Blitzschnelle Builds mit Rollup/Rolldown-Optimierung |
| **Styling** | Tailwind CSS v4 | CSS-first Utility-Framework mit nativem `@theme`-System |
| **Server-State** | TanStack Query v5 | Automatisches Caching, Refetching und Mutation-Handling |
| **Client-State** | React Context (`AuthContext`, `ThemeContext`) | Authentifizierungs- und Dark/Light-Theme-Verwaltung |
| **HTTP-Client** | Axios (`api/client.ts`) | Concurrency-sichere 401-Token-Refresh-Queue via JWT |
| **Animationen** | Framer Motion + Lucide React | Sanfte Übergänge, Glassmorphism-Modale & Icons |
| **Testing** | Vitest + React Testing Library | 117 Unit- & Komponententests in 22 Dateien mit Mock-Service-Worker |

---

## 2. Komponenten-Architektur

Das Frontend gliedert sich in zwei Hauptbereiche:
1. **Public Portfolio (`pages/PortfolioPage.tsx`)**:
   - `HeroSection`: Profilvorstellung, Social-Links, Call-to-Action.
   - `CertificatesSection`: Interaktive Many-to-Many Track-Filterchips, Textsuche und Zertifikatskarten mit Bildvorschau.
   - `ProjectsSection`: Projektportfolio mit Vorschaubildern, Tags und Deep-Links.
   - `SkillsSection`: Gruppierte Skills nach Domänen.
   - `TimelineSection`: Interaktiver Werdegang.
   - `PortfolioChatWidget`: Schwebender RAG-KI-Assistent mit Deep-Linking.
   - `ColdStartBanner`: Informiert Besucher transparent, wenn der Render Free-Tier Container hochfährt.

2. **Admin Dashboard (`pages/DashboardPage.tsx`)**:
   - Geschützter Bereich via `ProtectedRoute`.
   - Strukturiert in **3 Tabs**:
     - **Zertifikate (`CertificateManager`)**: Server-paginierte Tabelle mit Review-Filter, Track-Icons und Aktionen.
     - **Projekte (`ProjectManager`)**: Vollwertige CRUD-Verwaltung für Portfolio-Projekte.
     - **Inbox (`PendingCertificateManager`)**: Posteingangs-Verwaltung mit "Show File"-Vorschau und Bulk-Freigabe.
   - `CertificateEditModal`: Review-Drawer mit Dokumentenvorschau (PDF/Bild), Track-Pflicht-Validierung und On-Demand-OCR-Analyse.
   - *Hinweis:* Es gibt keine separaten `TrackManager` / `SkillManager` Tabs im Dashboard.

---

## 3. Auth-Lifecycle & Concurrency-Safe Refresh-Queue

Authentifizierte Requests werden über einen Axios-Interceptor gesteuert:
- **Request-Interceptor**: Injiziert den JWT Access Token (`Authorization: Bearer <token>`).
- **Response-Interceptor (`401 Unauthorized`)**:
  - Trifft ein `401` ein, stoppt der Interceptor nachfolgende Requests in einer Warteschlange (`failedQueue`).
  - Ein einzelner Refresh-Request an `/api/auth/jwt/refresh/` wird gesendet.
  - Bei Erfolg werden alle gestauten Requests mit dem neuen Token erneut ausgeführt.
  - Schlägt der Refresh fehl, feuert das systemweite Event `auth:unauthorized`, das den Benutzer abmeldet und Tokens aus dem `localStorage` bereinigt.

---

## 4. Code-Splitting, Lazy Loading & Resilienz

Um die Ladezeit für öffentliche Besucher minimal zu halten:
- **`React.lazy()` & `Suspense`**: Die schweren Admin-Seiten (`DashboardPage`, `LoginPage`, `PasswordResetConfirmPage`) werden getrennt vom Haupt-Bundle ausgeliefert.
- **`lazyRetry()`-Wrapper**: Fängt Chunk-Ladefehler bei neuen Deployments oder kurzzeitigen Verbindungsabbrüchen transparent ab, indem ein einmaliger Reload mit `sessionStorage`-Flag ausgeführt wird:
  ```typescript
  export const DashboardPage = lazy(() => lazyRetry(() => import('./pages/DashboardPage')));
  ```
- **Bundle-Größe**: Das initiale Besucher-Bundle bleibt unter 500 kB (Gzip < 120 kB).
