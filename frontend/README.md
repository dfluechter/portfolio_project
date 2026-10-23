# Portfolio Single-Page Application (Frontend)

Moderne SPA auf Basis von **React 19**, **TypeScript** und **Vite** zur Verwaltung und Präsentation des Developer-Portfolios und der Zertifikate.

Ausführliche Architekturdokumentation, Routing-Konzepte und State-Management-Regeln finden sich in [docs/frontend.md](../docs/frontend.md) und [docs/architecture.md](../docs/architecture.md).

---

## Tech Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Build-Tool & Bundler:** Vite 6 mit Rollup Code-Splitting (`manualChunks`)
- **Programmiersprache:** TypeScript 7.x (Strict Mode)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Server State & Caching:** TanStack Query v5 (`@tanstack/react-query`)
- **Icons:** Lucide React (`lucide-react`)
- **Testing:** Vitest 3 + React Testing Library + jsdom
- **Linting:** ESLint 9 + TypeScript-ESLint + React Hooks Plugin

---

## Schnellstart

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Entwicklungsserver starten
```bash
npm run dev
```
Die Anwendung ist standardmäßig unter [http://localhost:3000](http://localhost:3000) erreichbar. Die Vite-Entwicklungskonfiguration leitet API-Anfragen an das Django-Backend auf Port 8000 weiter.

### 3. Umgebungsvariablen
Optionale Umgebungsvariablen können in `.env.local` definiert werden:
```env
VITE_API_URL=http://localhost:8000/api
```
In Produktion steuert Vite die API-URL über die Basis-Konfiguration.

---

## Verfügbare Scripts

| Script | Beschreibung |
|---|---|
| `npm run dev` | Startet den Vite-Dev-Server mit Hot Module Replacement (HMR) auf Port 3000 |
| `npm run build` | Führt `tsc -b` zur Typprüfung aus und bündelt die App nach `dist/` |
| `npm run preview` | Lokale Vorschau des erzeugten Produktions-Builds |
| `npm run lint` | Führt ESLint zur statischen Codeanalyse aus |
| `npm run test` | Startet Vitest im Watch-Modus |
| `npm run test:run` | Führt Vitest einmalig für CI/CD aus |

---

## Verzeichnisstruktur

```text
frontend/
├── src/
│   ├── assets/              # Statische Grafiken und Icons
│   ├── components/          # Wiederverwendbare UI-Komponenten (Navbar, Cards, Modale, chat/PortfolioChatWidget)
│   ├── context/             # AuthContext für Session-/Token-Zustand
│   ├── hooks/               # Custom Hooks (useDebounce, useAdminAuth etc.)
│   ├── pages/               # Seiten (PortfolioPage, LoginPage, DashboardPage)
│   ├── services/            # API-Clients (api.ts, portfolioService.ts, certificateService.ts)
│   ├── types/               # TypeScript-Typdefinitionen (Portfolio, Certificate etc.)
│   ├── test/                # Vitest-Setup und globale Mocks
│   ├── App.tsx              # Router und Layout-Shell
│   └── main.tsx             # Entry Point mit QueryClientProvider
├── index.html               # Single-Page-HTML-Shell
├── vite.config.ts           # Vite-Konfiguration mit Proxy und Manual Chunks
└── tsconfig.json            # TypeScript-Projektkonfiguration
```
