# Design System & UI-Architektur-Spezifikation — Portfolio Dominik Flüchter

> **Status:** Verbindliche Produktions-Spezifikation (Single Source of Truth)  
> **Version:** 3.0 (Swiss Precision Systems Architecture & Computational Monolith)  
> **Tech-Stack:** React 19 · TypeScript 7.x · Tailwind CSS v4 (`@tailwindcss/vite`) · Framer Motion · GSAP (`ScrollTrigger`) · Three.js / React Three Fiber · TanStack Virtual · Radix UI Slot · Lucide React · `react-i18next`  
> **Barrierefreiheit:** Strikt nach **WCAG 2.2 Level AA** (Textkontraste überwiegend **AAA**)

---

## Inhaltsverzeichnis

1. [Ästhetische Vision & Design-Prinzipien](#1-ästhetische-vision--design-prinzipien)
2. [Tailwind CSS v4 Architektur & Token-Engine](#2-tailwind-css-v4-architektur--token-engine)
3. [Farb-Tokens, Oberflächen & Kontrast-Spezifikation](#3-farb-tokens-oberflächen--kontrast-spezifikation)
4. [Typografie-System & Schrift-Hierarchie](#4-typografie-system--schrift-hierarchie)
5. [Spacing, Grid, Layout & Breakpoints](#5-spacing-grid-layout--breakpoints)
6. [Elevation, Borders, Glassmorphism & Radien](#6-elevation-borders-glassmorphism--radien)
7. [Motion Design & Micro-Interactions](#7-motion-design--micro-interactions)
8. [Komponenten-Spezifikationen](#8-komponenten-spezifikationen)
   - [8.1 Buttons & Taktile Action-Pills](#81-buttons--taktile-action-pills)
   - [8.2 Cards & Asymmetrische Bento-Container](#82-cards--asymmetrische-bento-container)
   - [8.3 Badges, Tags & Filter-Chips](#83-badges-tags--filter-chips)
   - [8.4 Modals, Split-Pane Review-Drawer & PDF-Viewer](#84-modals-split-pane-review-drawer--pdf-viewer)
   - [8.5 Formulare, Inputs & Validierungs-Architektur](#85-formulare-inputs--validierungs-architektur)
   - [8.6 RAG KI-Copilot Chat-Widget](#86-rag-ki-copilot-chat-widget)
   - [8.7 Timeline & Schweizer Chronologie-Ledger](#87-timeline--schweizer-chronologie-ledger)
   - [8.8 Filter-Bars, Omnibox-Suche & Navigation](#88-filter-bars-omnibox-suche--navigation)
   - [8.9 Skeletons, Empty States & System-Banner](#89-skeletons-empty-states--system-banner)
9. [Accessibility (a11y) Richtlinien nach WCAG 2.2 AA](#9-accessibility-a11y-richtlinien-nach-wcag-22-aa)
10. [Legacy-Token-Migration & Pre-Merge-Checkliste](#10-legacy-token-migration--pre-merge-checkliste)

---

## 1. Ästhetische Vision & Design-Prinzipien

### 1.1 Leitbild: *Swiss Precision Systems Architecture*

Das Portfolio von **Dominik Flüchter** präsentiert kein generisches Marketing-Template, sondern ein reales, produktionsreifes Software-Ökosystem (Headless Django REST API, Neon Serverless Postgres mit `pgvector`, Supabase S3 Direct-to-Storage, kaskadierende 3-Stufen-OCR und Gemini RAG Copilot).

Die visuelle Identität folgt deshalb dem Paradigma **Swiss Precision Systems Architecture**:
- Sie verbindet die mathematische Strenge, Rasterdisziplin und typografische Klarheit des **Schweizer Konstruktivismus (International Typographic Style)** mit der technischen **Telemetrie-Ästhetik moderner Developer-Plattformen** (Linear, Vercel, Raycast).
- Jedes Oberflächenelement spiegelt die Domäne wider: überprüfbare Datenintegrität (SHA-256-Prüfsummen, verifizierte S3-Nachweise), klare Systemzustände (`ONLINE`, `VERIFIED`, `ERR // LIVE_SYNC_FALLBACK`) und verzögerungsfreie Interaktion.

### 1.2 Die 6 verbindlichen Design-Prinzipien

1. **Visuelle Struktur ist Information (*Visual Structure is Information*)**
   - Rahmen, Haarlinien (`1px` Hairline-Dividers), Monospace-Indizes und Koordinaten-Grids dienen niemals als bloße Dekoration, sondern strukturieren komplexe Datenbestände (190+ Zertifikate, Architektur-Spezifikationen, OCR-Transcripts).
   - Nummerierte Marker (`01` bis `05` in der Navigation, `PRJ-01`, `CHR-01`, `SYS-01`) werden ausschließlich dort eingesetzt, wo eine echte Sequenz, Modul-Ordnung oder Referenzierbarkeit vorliegt.
2. **Gezielte Ausdruckskraft statt Reizüberflutung (*Spend Your Boldness in One Place*)**
   - Pro Viewport-Ebene gibt es genau **einen** inszenierten visuellen Schwerpunkt: im Hero-Bereich die interaktive 3D-WebGL-Szene (`HeroThreeBackground.tsx`) in Kombination mit dem System-Blueprint-Panel; am Seitenabschluss der monumentale `CinematicFooter` mit OKLCH-Lichtkanten und GSAP-Magnetphysik.
   - Alle dazwischenliegenden Inhaltssektionen (`Projekte`, `Zertifikate`, `Werdegang`, `Kontakt`, `Admin-Dashboard`) bleiben ruhig, diszipliniert und auf maximale Lesbarkeit optimiert.
3. **Kalibrierte Stille & Haarlinien-Ledgers statt Box-in-Box-Verschachtelung**
   - Statt Karten mehrfach ineinander zu schachteln (das klassische „SaaS-Card-Kit“-Anti-Pattern), nutzt das System durchgehende Haarlinien-Teilungen (`divide-y`, `divide-x`, `border-y`) innerhalb eines einzelnen, klar umrissenen Containers (z. B. im Hero-Stack-Footer, in der Zertifikats-Filterleiste, im Timeline-Ledger und im Kontakt-Profil-Ledger).
4. **Taktile Physis & Mikro-Haptik (*Tactile Physicality*)**
   - Interaktive Elemente vermitteln spürbares mechanisches Feedback: feine obere Lichtbrechungskanten (`.surface-refraction`), subtile Hover-Elevation auf Karten (`hover:-translate-y-0.5`) und ein präziser Druckpunkt beim Klicken (`active:scale-[0.98] active:translate-y-[1px]`).
   - Navigationsleisten und Toolbars verzichten strikt auf Layout-verschiebende Skalierungen (`hover:scale-105`), um optische Ruhe zu wahren.
5. **Dual-Theme-Parität (Öffentlich) & Dark-Cockpit-Fokus (Admin)**
   - **Öffentliche Routen (`/`, `/*`):** Vollwertiges Dual-Theme-System mit kristallklarem Light Mode (`bg-slate-50`, `#F8FAFC`) und tiefem Obsidian Dark Mode (`bg-slate-950`, `#020617`), synchronisiert über `ThemeContext` (`localStorage` + `prefers-color-scheme`).
   - **Administrative & Sicherheits-Routen (`/dashboard`, `/login`, `/password-reset/...`):** Dedizierte **Dark-Cockpit-Architektur** (`bg-slate-950 text-slate-100`). Für datendichte Tabellen, PDF-/Bild-Prüfungen und OCR-Abgleiche reduziert das dunkle Operations-Cockpit Blendung und hebt Statusfarben (`Emerald`, `Amber`, `Rose`, `Indigo`) unverfälscht hervor.
6. **Copywriting als Teil der Interface-Architektur**
   - Texte sind präzise, aktiv formuliert und frei von Werbefloskeln.
   - Call-to-Actions benennen exakt die ausgelöste Aktion (`Projekte entdecken`, `Nachricht senden`, `Speichern & Veröffentlichen`, `Suchfilter zurücksetzen`).
   - Fehler- und Leerzustände entschuldigen sich nicht vage, sondern benennen den technischen Zustand (`ERR // LIVE_SYNC_FALLBACK`, `SYS // EMPTY_DATASET`) und bieten sofort eine ausführbare Lösungsaktion (`Erneut versuchen`, `Filter zurücksetzen`).

### 1.3 Strikte Anti-Patterns (Verbotene Gestaltungsmuster)

| Verbotenes Muster (Anti-Pattern) | Warum verboten? | Verbindliche Alternative im Design System |
|---|---|---|
| **Mehrstufige Neon-/Pink-Farbverläufe** (`from-indigo-500 via-purple-500 to-pink-500`) | Typisches Erkennungsmerkmal generischer KI-Templates („AI Slop“). | Einzelner, kalibrierter Indigo-Akzent (`bg-indigo-600`, `bg-indigo-500/8 blur-[120px]`) oder klares Indigo-zu-Sky in der 404-Typografie. |
| **Einzelwort-Einfärbung/Kursivsetzung in Headlines** | Wirkt schablonenhaft und stört den Lesefluss. | Zweistufige Hierarchie in `<h1>`: Monospace-Eyebrow-Zeile in Indigo über einer durchgehend einfarbigen, kontrastreichen Hauptzeile (`text-slate-900 dark:text-white`). |
| **Emojis als funktionale UI-Icons** (z. B. 🔍, 🚀, ✅ in Buttons/Labels) | Inkonsistentes Rendering über Betriebssysteme hinweg, unpräzise Ausrichtung. | Ausschließlich vektorbasierte SVG-Icons aus `lucide-react` oder `TrackIcon` (CSS-Masking) mit `aria-hidden="true"`. *(Ausnahme: Konversationelle Beispiel-Prompts im KI-Chat).* |
| **Identische 3-Spalten-Kartenwüsten überall** | Monotonie, fehlende Gewichtung von Featured-Inhalten. | Asymmetrisches **7 / 5 / 12 Bento-Grid** für Projekte; **4 / 8 Haarlinien-Ledger** für den Werdegang; **5 / 7 Split** für Kontakt & Hero. |
| **Umbruch in kompakten Badges & Filter-Chips** | Zerstört die Zeilenhöhe und Rasterordnung in Toolbars. | Zwingend `whitespace-nowrap` auf allen Chips, Status-Badges und Telemetrie-Pills. |

---

## 2. Tailwind CSS v4 Architektur & Token-Engine

Das Projekt nutzt **Tailwind CSS v4** im nativen **CSS-First-Modus** über das offizielle Vite-Plugin `@tailwindcss/vite`. Eine separate `tailwind.config.js` existiert bewusst nicht; die gesamte Token-Registrierung erfolgt in [`frontend/src/index.css`](frontend/src/index.css).

### 2.1 CSS-First Konfiguration & Dark-Mode-Variante

```css
@import "tailwindcss";

/* Klassenbasierter Dark-Mode-Selektor am <html>-Element */
@custom-variant dark (&:where(.dark, .dark *));

/* Bridging der semantischen CSS-Variablen in Tailwind v4 Utility-Klassen */
@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}
```

### 2.2 Kollisionsfreie Klassen-Komposition (`cn`)

Für wiederverwendbare UI-Primitives (wie [`button.tsx`](frontend/src/components/ui/button.tsx) und [`motion-footer.tsx`](frontend/src/components/ui/motion-footer.tsx)) kombiniert [`frontend/src/lib/utils.ts`](frontend/src/lib/utils.ts) `clsx` und `tailwind-merge`, um CSS-Spezifitätskonflikte (z. B. überschriebene Paddings oder Hintergrundfarben) deterministisch aufzulösen:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Farb-Tokens, Oberflächen & Kontrast-Spezifikation

Farbe wird im System niemals rein dekorativ verwendet, sondern kodiert **Hierarchie, Tiefe und Systemzustand**. Alle Text- und Interaktionsfarben erfüllen mindestens **WCAG 2.2 Level AA** ($\ge 4.5:1$ für normalen Text, $\ge 3.0:1$ für großen Text und UI-Konturen), die primären und sekundären Textebenen erreichen **WCAG AAA** ($\ge 7.0:1$).

### 3.1 Semantische CSS-Custom-Properties (`:root` vs. `.dark`)

| CSS-Variable | Tailwind-Utility | Light Mode (`:root`) | Dark Mode (`.dark`) | Verwendung |
|---|---|---|---|---|
| `--background` | `bg-background` | `#FFFFFF` | `#020617` (`slate-950`) | Basis-Hintergrund für Komponenten & Primitives |
| `--foreground` | `text-foreground` | `#020617` (`slate-950`) | `#F8FAFC` (`slate-50`) | Primäre Text- & Iconfarbe |
| `--card` | `bg-card` | `#FFFFFF` | `#020617` (`slate-950`) | Basis-Kartenoberfläche |
| `--card-foreground` | `text-card-foreground` | `#020617` | `#F8FAFC` | Primärtext innerhalb von Karten |
| `--popover` | `bg-popover` | `#FFFFFF` | `#020617` | Floating-Container, Dropdowns |
| `--popover-foreground`| `text-popover-foreground`| `#020617` | `#F8FAFC` | Text in Popovers |
| `--primary` | `bg-primary` | `#0F172A` (`slate-900`) | `#F8FAFC` (`slate-50`) | Kontrast-CTA in CVA-Buttons |
| `--primary-foreground`| `text-primary-foreground`| `#F8FAFC` (`slate-50`) | `#0F172A` (`slate-900`) | Text auf `--primary` |
| `--secondary` | `bg-secondary` | `#F1F5F9` (`slate-100`) | `#1E293B` (`slate-800`) | Sekundäre Steuerelemente & Chips |
| `--secondary-foreground`| `text-secondary-foreground`| `#0F172A` | `#F8FAFC` | Text auf `--secondary` |
| `--muted` | `bg-muted` | `#F1F5F9` (`slate-100`) | `#1E293B` (`slate-800`) | Dezente Hintergrundflächen |
| `--muted-foreground` | `text-muted-foreground` | `#64748B` (`slate-500`) | `#94A3B8` (`slate-400`) | Sekundäre Metadaten, Sublines |
| `--accent` | `bg-accent` | `#F1F5F9` (`slate-100`) | `#1E293B` (`slate-800`) | Hover-Flächen auf Ghost/Outline-Elementen |
| `--accent-foreground` | `text-accent-foreground` | `#0F172A` | `#F8FAFC` | Text auf Hover-Flächen |
| `--destructive` | `bg-destructive` | `#EF4444` (`red-500`) | `#7F1D1D` (`red-900`) | Destruktive Lösch-Aktionen |
| `--destructive-foreground`| `text-destructive-foreground`| `#F8FAFC` | `#F8FAFC` | Text auf destruktiven Buttons |
| `--border` | `border-border` | `#E2E8F0` (`slate-200`) | `#1E293B` (`slate-800`) | Strukturelle 1px-Haarlinien |
| `--input` | `border-input` | `#E2E8F0` (`slate-200`) | `#1E293B` (`slate-800`) | Rahmen von Formulareingaben |
| `--ring` | `ring-ring` | `#6366F1` (`indigo-500`)| `#818CF8` (`indigo-400`)| Globaler Tastatur-Fokusring |

### 3.2 Oberflächen-Architektur (Surfaces)

Das System erzeugt Tiefe durch fein abgestufte Slate-Schichten statt durch schwere Schlagschatten:

| Oberflächenebene | Light Mode Klassen & Hex | Dark Mode Klassen & Hex | Einsatzort |
|---|---|---|---|
| **1. Canvas Primary** | `bg-slate-50` (`#F8FAFC`) | `dark:bg-slate-950` (`#020617`) | `<body>`, `PortfolioPage`, `Hero`, `ProjectsSection`, `TimelineSection` |
| **2. Canvas Alternating** | `bg-white` (`#FFFFFF`) | `dark:bg-slate-950` (`#020617`) | `CertificatesSection`, `ContactSection` (visuelle Sektionstrennung durch Helligkeitswechsel im Light Mode + Top-Border im Dark Mode) |
| **3. Card Surface (Standard)** | `bg-white` (`#FFFFFF`) | `dark:bg-slate-900/65` (`#0F172A` @ 65%) | Projekt-Bento-Karten, Kontakt-Formmailer, Dashboard-Module |
| **4. Card Surface (Subtle)** | `bg-slate-50/70` (`#F8FAFC` @ 70%) | `dark:bg-slate-900/55` (`#0F172A` @ 55%) | Zertifikatskarten (`hover:bg-white dark:hover:bg-slate-900/90`) |
| **5. Glass Floating Surface** | `bg-white/85 backdrop-blur-xl` | `dark:bg-slate-900/65 backdrop-blur-xl` | `Navbar` (`dark:bg-slate-950/85`), Hero-Blueprint-Panel, `PortfolioChatWidget` (`bg-white/95 dark:bg-slate-900/90`) |
| **6. Input / Well Surface** | `bg-slate-50` (`#F8FAFC`) | `dark:bg-slate-950/90` (`#020617` @ 90%) | Text-Inputs, Suchfelder, Code-/Vorschau-Wells (`CertificatePreviewPane`) |
| **7. Admin Dark Cockpit** | `bg-slate-950` (`#020617`) *(fixiert)* | `bg-slate-950` (`#020617`) *(fixiert)* | `DashboardPage`, `LoginPage`, `CertificateEditModal`, `UploadCertificateModal`, `ConfirmModal` |

### 3.3 Text-Hierarchie & WCAG-Kontrastmatrix

| Text-Ebene | Light Mode | Kontrast (auf `#FFFFFF` / `#F8FAFC`) | Dark Mode | Kontrast (auf `#020617` / `#0F172A`) | WCAG-Stufe | Verwendung |
|---|---|---|---|---|---|---|
| **Primary Text** | `text-slate-900` (`#0F172A`) | **17.4 : 1** | `dark:text-white` (`#FFFFFF`) / `dark:text-slate-100` (`#F1F5F9`) | **19.3 : 1** / **17.8 : 1** | **AAA** | `h1`–`h4`, Kartentitel, KPI-Werte, aktive Labels |
| **Secondary Body** | `text-slate-600` (`#475569`) | **7.2 : 1** | `dark:text-slate-300` (`#CBD5E1`) / `dark:text-slate-400` (`#94A3B8`) | **12.8 : 1** / **7.1 : 1** | **AAA** | Fließtext, Projektbeschreibungen, Navigationslinks |
| **Muted / Telemetry** | `text-slate-500` (`#64748B`) | **4.6 : 1** | `dark:text-slate-400` (`#94A3B8`) | **7.1 : 1** | **AA / AAA** | Datumsangaben, Credential-IDs, Zähler, Hilfetexte |
| **Decorative / Disabled**| `text-slate-400` (`#94A3B8`) | *(dekorativ / `aria-hidden`)* | `dark:text-slate-500` (`#64748B`) | *(dekorativ / `aria-hidden`)* | — | Nur für `aria-hidden="true"` Indizes, Trennzeichen (`·`, `/`) oder deaktivierte Controls (`disabled:opacity-50`) |

### 3.4 Akzent- & Semantische Status-Farben

| Semantische Rolle | Light Mode (Text / Fläche / Rahmen) | Dark Mode (Text / Fläche / Rahmen) | Kontrast | Einsatz im System |
|---|---|---|---|---|
| **Primary Brand Accent (Indigo)** | Text: `text-indigo-600` (`#4F46E5`)<br>CTA: `bg-indigo-600 hover:bg-indigo-500 text-white`<br>Tint: `bg-indigo-50 border-indigo-200/80` | Text: `dark:text-indigo-400` (`#818CF8`)<br>CTA: `bg-indigo-600 hover:bg-indigo-500 text-white`<br>Tint: `dark:bg-indigo-950/70 dark:border-indigo-800/80` | **5.1 : 1** (Light)<br>**7.4 : 1** (Dark) | Primäre CTAs, aktive Filter-Pills, Section-Eyebrows (`01 // ...`), Fokusringe, Track-Icons |
| **Deep-Link & Telemetry Accent (Cyan / Sky)** | Text: `text-sky-600` (`#0284C7`)<br>Ring: `ring-cyan-400/80` | Text: `text-cyan-400` (`#22D3EE`)<br>Tint: `bg-cyan-500/10 border-cyan-500/20` | **4.6 : 1** (Light)<br>**11.3 : 1** (Dark) | RAG-Chat Quell-Zitate (`scrollToAndHighlightSource` 2200ms Highlight-Ring), Dashboard `KPI-03 // ISSUERS`, Supabase-S3-Badge |
| **Verified & Online (Emerald)** | Text: `text-emerald-600` / `text-emerald-700` (`#059669` / `#047857`)<br>Dot: `bg-emerald-500` (`#10B981`) | Text: `dark:text-emerald-400` (`#34D399`)<br>Tint: `bg-emerald-500/10 border-emerald-500/20` | **4.6 : 1** (Light)<br>**10.2 : 1** (Dark) | Verifizierte Zertifikate, Live-Radar-Ping (`SYS.OPS // LIVE`), Stufe-1-OCR (`pypdf`), `ColdStartBanner` Erfolg, Speichern & Veröffentlichen |
| **Warning, Draft & Cold-Start (Amber)** | Text: `text-amber-600` (`#D97706`)<br>Tint: `bg-amber-500/10 border-amber-500/25` | Text: `text-amber-400` (`#FBBF24`)<br>Banner: `bg-amber-950/95 border-amber-500/40 text-amber-100` | **4.5 : 1** (Light)<br>**11.8 : 1** (Dark) | Entwurfs-Status, Caps-Lock-Warnung im Login, `KPI-04 // INBOX QUEUE`, Stufe-2-OCR (`Tesseract`), `ColdStartBanner` Timeout (>30s), KI-Token-Limit-Schutz |
| **Danger, Error & Destructive (Rose / Red)** | Text: `text-rose-600` / `text-red-600` (`#E11D48` / `#DC2626`)<br>Tint: `bg-rose-500/5 border-rose-500/25` | Text: `dark:text-rose-400` / `text-red-400` (`#FB7185` / `#F87171`)<br>CTA: `bg-red-600 hover:bg-red-500 text-white` | **4.8 : 1** (Light)<br>**6.9 : 1** (Dark) | Formular-Validierungsfehler, `ERR // LIVE_SYNC_FALLBACK`, 404-Status-Chip, `ConfirmModal` Löschbestätigung, Unvollständige Zertifikate |
| **AI Vision & Neural Accent (Purple / Violet)**| Text: `text-violet-600` (`#7C3AED`) | Text: `text-purple-300` (`#D8B4FE`)<br>Tint: `bg-purple-500/20 border-purple-500/40` | **5.3 : 1** (Light)<br>**11.1 : 1** (Dark) | Stufe-3-OCR Badge (`Gemini Flash Vision`), Zertifikats-Quell-Icon im KI-Chat |

### 3.5 3D-WebGL & Three.js Canvas-Farbpalette (`HeroThreeBackground.tsx`)

Die prozedurale 3D-Szene im Hero-Bereich passt ihre Shader- und Punktlicht-Farben reaktiv an das aktive Theme (`isDark`) an, sodass das neuronale Netz sowohl auf dunklem Obsidian (`#020617`) als auch auf hellem Papier-Canvas (`#F8FAFC`) hohen Kontrast ohne Überstrahlung bietet:

| 3D-Visual-Token | Dark Mode (`isDark = true`) | Light Mode (`isDark = false`) | Geometrische Zuordnung in der 3D-Szene |
|---|---|---|---|
| `aiCyan` | `#22D3EE` (Cyber-Cyan) | `#0284C7` (Sky 600) | Input-/Output-Neuronenschichten, synaptische Kanten, aufsteigende Matrix-Streams |
| `neuralViolet` | `#A855F7` (Violet 500) | `#7C3AED` (Violet 600) | Hidden-Layer-Neuronen, gegenläufiger Transformer-Attention-Torus |
| `codeEmerald` | `#34D399` (Emerald 400) | `#059669` (Emerald 600) | Hidden-Layer-Knoten, vertikale Code-Partikel, zweiter Attention-Ring |
| `tensorCoral` | `#FF6B4A` (Tensor-Coral) | `#EA580C` (Orange 600) | Zentraler pulsierender KI-Tensor-Kern (`Icosahedron` + `Octahedron`) |

### 3.6 Mathematische OKLCH Color-Mix Engine (`motion-footer.tsx`)

Für die Glas-Pills und Lichtkanten im `CinematicFooter` werden Farben im wahrnehmungsgetreuen **OKLCH-Farbraum** relativ zu `--foreground` und `--background` berechnet:

```css
.cinematic-footer-wrapper {
  --pill-bg-1: color-mix(in oklch, var(--foreground) 3%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 8%, transparent);

  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 8%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
}
```

---

## 4. Typografie-System & Schrift-Hierarchie

Typografie trägt die Persönlichkeit der Anwendung: Sie kombiniert eine sofort verfügbare, hochlesbare **System-Sans-Serif** für Fließtext und Überschriften mit einer präzisen **technischen Monospace-Schrift** für System-Telemetrie sowie einem **geometrischen Display-Font** für den Markenabschluss.

### 4.1 Font-Stacks & Rollenverteilung

1. **Primary UI & Editorial Sans (`font-sans` — Standard auf `<body>`):**
   ```css
   font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
   ```
   - **Begründung:** `0 kB` Netzwerk-Payload, `0 ms` Blockadezeit beim ersten Paint (LCP-Optimierung), keinerlei Layout-Shift (CLS = 0) durch nachladende Webfonts, native Subpixel-Kantenglättung (`antialiased`).
2. **Technical Telemetry Monospace (`font-mono`):**
   ```css
   font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
   ```
   - **Begründung:** Trennt strukturelle Metadaten optisch klar vom redaktionellen Inhalt. Zwingend für: Sektions-Indizes (`02 // System Implementations`), Projekt-/Chronologie-Codes (`PRJ-01`, `CHR-01`, `SYS-01`, `MOD-01`), Credential-IDs, SHA-256-Hashes, Datumsangaben, Prozentwerte (`95%`) und HTTP-/System-Statusmeldungen (`SYS // 404: ROUTE_NOT_RESOLVED`).
3. **Scoped Display Sans (`Plus Jakarta Sans` in `.cinematic-footer-wrapper`):**
   ```css
   font-family: 'Plus Jakarta Sans', sans-serif;
   ```
   - **Begründung:** Wird gezielt im `CinematicFooter` für die monumentale `24vw`-Konturschrift (`PORTFOLIO`) und die Abschluss-Headline eingesetzt, wo der geometrische Display-Schnitt (`font-weight: 800–900`) als skulpturales Gestaltungselement wirkt.

### 4.2 Verbindliche Typo-Skala

| Typo-Token / Rolle | Tailwind-Klassen | Größe (Mobile $\rightarrow$ Desktop) | Zeilenhöhe (`line-height`) | Schnitt & Tracking | Anwendungsbereich |
|---|---|---|---|---|---|
| **Giant Watermark** | `.footer-giant-bg-text` | `24vw` | `0.75` | `font-black` (`900`), `-0.05em` | 1px-Stroke-Hintergrundschrift im Footer |
| **404 Display** | `text-7xl sm:text-9xl font-mono` | `4.5rem` $\rightarrow$ `8rem` (`72px` $\rightarrow$ `128px`) | `1.0` | `font-black tracking-tighter` | Skulpturale 404-Statusanzeige |
| **Hero Display (`h1`)** | `text-4xl sm:text-5xl xl:text-6xl` | `2.25rem` $\rightarrow$ `3.75rem` (`36px` $\rightarrow$ `60px`) | `1.05` (`leading-[1.05]`) | `font-bold tracking-tighter` | Haupt-Headline im `Hero` |
| **Section Title (`h2`)** | `text-3xl sm:text-4xl` | `1.875rem` $\rightarrow$ `2.25rem` (`30px` $\rightarrow$ `36px`) | `1.15` | `font-extrabold tracking-tight` | Sektionsüberschriften (`Projekte`, `Zertifikate`, `Werdegang`, `Kontakt`) |
| **KPI Metric Value** | `text-2xl sm:text-3xl tabular-nums` | `1.5rem` $\rightarrow$ `1.875rem` (`24px` $\rightarrow$ `30px`) | `1.2` | `font-extrabold` + `tabular-nums` | Große Kennzahlen im Admin-Dashboard |
| **Timeline Role (`h3`)** | `text-lg sm:text-xl` | `1.125rem` $\rightarrow$ `1.25rem` (`18px` $\rightarrow$ `20px`) | `1.35` | `font-bold tracking-tight` | Positionsbezeichnungen im Werdegang |
| **Card Title (`h3`)** | `text-base sm:text-lg` | `1rem` $\rightarrow$ `1.125rem` (`16px` $\rightarrow$ `18px`) | `1.35` | `font-bold tracking-tight` | Projekt-, Zertifikats- & Modal-Titel |
| **Lead / Hero Copy** | `text-base sm:text-lg` | `1rem` $\rightarrow$ `1.125rem` (`16px` $\rightarrow$ `18px`) | `1.625` (`leading-relaxed`) | `font-normal` | Einleitungsabsatz im Hero (`max-w-[62ch]`) |
| **Body Default** | `text-xs sm:text-sm` / `text-sm` | `0.8125rem` $\rightarrow$ `0.875rem` (`13px` $\rightarrow$ `14px`) | `1.625` (`leading-relaxed`) | `font-normal` | Kartenbeschreibungen, Timeline-Text (`max-w-[65ch]`) |
| **UI Control / Label** | `text-xs` | `0.75rem` (`12px`) | `1.4` | `font-semibold` | Buttons, Filter-Pills, Formular-Labels |
| **Section Eyebrow** | `font-mono text-xs uppercase` | `0.75rem` (`12px`) | `1.2` | `font-semibold tracking-[0.18em]`| Sektions-Indizes (`02 // System Implementations`) |
| **Telemetry / Meta** | `font-mono text-[11px]` | `0.6875rem` (`11px`) | `1.35` | `font-medium` / `font-semibold` | Issuer-Badges, Credential-IDs, Datums-Chips |
| **Micro Status Tag** | `font-mono text-[10px] uppercase` | `0.625rem` (`10px`) | `1.0` | `font-bold tracking-wider` | `PRJ-01`, `MOD-01`, Skill-Tags, OCR-Stufen-Badges |

### 4.3 Lesbarkeits- & Satzregeln

- **Maximale Zeilenlänge (Measure):** Fließtext ist strikt auf **`60ch` bis `65ch`** begrenzt (`max-w-[62ch]` im Hero, `max-w-[65ch]` in Projekt- und Timeline-Beschreibungen, `max-w-md` in Sektions-Subheadings). Keine Fließtextzeile darf `80 Zeichen` überschreiten.
- **Tabellarische Ziffern (`tabular-nums`):** Alle dynamischen Zähler, Prozentwerte, Zeitstempel im Chat und Dashboard-KPIs nutzen `tabular-nums`, damit sich die Layoutbreite bei Wertänderungen nicht verschiebt.
- **Line-Clamping:** Projektbeschreibungen nutzen `line-clamp-3`, Zertifikatstitel `line-clamp-2`, um eine ruhige horizontale Fluchtlinie über benachbarte Karten hinweg sicherzustellen.

---

## 5. Spacing, Grid, Layout & Breakpoints

### 5.1 Responsive Breakpoints & Container-Geometrie

| Breakpoint | Mindestbreite | Spaltenverhalten & Layout-Anpassung |
|---|---|---|
| **Base (Mobile)** | `< 640px` (`375px` Referenz) | 1-spaltiges Stack-Layout, `px-4` (`16px` Außenabstand), Hamburger-Drawer-Navigation, Touch-Targets $\ge 44\text{px}$. |
| **`sm` (Large Mobile)** | `≥ 640px` | `px-6` (`24px` Außenabstand), mehrspaltige Formularzeilen (`sm:grid-cols-2`), horizontale Button-Gruppen. |
| **`md` (Tablet)** | `≥ 768px` | Desktop-Pill-Navigation aktiv (`hidden md:flex`), 2-Spalten-Grids (`md:grid-cols-2`) für Projekte & Zertifikate. |
| **`lg` (Desktop)** | `≥ 1024px` | `px-8` (`32px` Außenabstand), 12-Spalten-Schweizer-Splits (`lg:grid-cols-12`) in Hero, Projekten, Timeline, Kontakt und Review-Drawer; 3-Spalten-Grid in Zertifikaten; 4-Spalten-KPI-Grid im Dashboard. |
| **`xl` (Wide Desktop)** | `≥ 1280px` | Maximale Containerbreite `max-w-7xl` (`1280px`) erreicht; numerische Navigations-Indizes (`01`–`05`) in der `Navbar` eingeblendet (`hidden xl:inline`), maximale Hero-Typografie (`xl:text-6xl`). |

### 5.2 Vertikaler Rhythmus & Scroll-Anker-Kalibrierung

- **Feste Navigationshöhe:** `h-16` (`64px` / `4rem`) mit `fixed top-0 left-0 right-0 z-50`.
- **Anker-Offset gegen Überdeckung (WCAG 2.2 `2.4.11`):**
  - Global in `index.css` auf `html` und `:root`: `scroll-padding-top: 5rem;` (`80px`).
  - Auf jeder Ziel-Sektion (`#projects`, `#certificates`, `#timeline`, `#contact`): `scroll-mt-20` (`80px`), sodass beim Anspringen per Link oder KI-Deep-Link immer `16px` Luft zwischen Unterkante der Navbar und Oberkante der Sektion verbleiben.
- **Sektions-Padding:**
  - Standard-Sektionen (`ProjectsSection`, `CertificatesSection`, `TimelineSection`): `py-20` (`80px` oben/unten).
  - Abschluss-Sektion (`ContactSection`, `SkillsSection`): `py-24` (`96px` oben/unten).
  - Jede Sektion wird nach oben durch eine durchgehende `1px`-Haarlinie (`border-t border-slate-200/90 dark:border-slate-800/80`) vom Vorgänger getrennt.

### 5.3 Die 6 Schweizer Grid-Archetypen (ASCII-Wireframes)

#### A. Hero 12-Spalten Command Split (`7 / 5` + Bottom Ribbon)
```text
+-----------------------------------------------------------------------------------+
| [00 // STATUS PILL]                                   | ARCH // SYSTEM-SPEC v2.6  |
| DOMINIK FLÜCHTER — FULL-STACK SOFTWARE ENGINEER       |---------------------------|
| Moderne Web-Architektur mit Django & React (H1)       | SYS-01 // TDD/CI          |
|                                                       | SYS-02 // 190+ S3         |
| Kurzbeschreibung (max-w-[62ch], linksbündig)          | SYS-03 // Django 6        |
|                                                       |---------------------------|
| [ Projekte entdecken -> ] [ Zertifikate ] [ Kontakt ] | API  | UI ENGINE | STORAGE|
|                     (lg:col-span-7)                   |      (lg:col-span-5)      |
+-----------------------------------------------------------------------------------+
| border-t: [Python 3.13] · [Django 6] · [React 19] · [TypeScript] · [Neon] · [S3]  |
+-----------------------------------------------------------------------------------+
```

#### B. Projekte: Asymmetrisches Modulo-3 Bento-Grid (`7 / 5 / 12`)
Verhindert monotone 3-Spalten-Raster durch rhythmischen Wechsel der Spaltenbreiten (`idx % 3`):
```text
+---------------------------------------------+-------------------------------------+
| PRJ-01 (idx % 3 === 0 -> lg:col-span-7)     | PRJ-02 (idx % 3 === 1 -> col-span-5)|
| [Medien- oder Blueprint-Header (h-40/h-28)] | [Medien- oder Blueprint-Header]     |
| Titel, Beschreibung, Skill-Tags             | Titel, Beschreibung, Skill-Tags     |
| [ Code ]                      [ Live Demo ] | [ Code ]              [ Live Demo ] |
+---------------------------------------------+-------------------------------------+
| PRJ-03 (idx % 3 === 2 -> md:col-span-2 lg:col-span-12, horizontales lg:flex-row)  |
| [Header links: lg:w-2/5 bzw. lg:w-64] | [Inhalt & Action-Bar rechts: flex-1]     |
+-----------------------------------------------------------------------------------+
```

#### C. Zertifikate: Hairline-Filterkonsole + Virtualisiertes 3-Spalten-Grid
```text
+-----------------------------------------------------------------------------------+
| border-y: [ Suche (sm:w-72) ]          [ Alle Aussteller ] [ Meta ] [ Google ] ...|
| border-t: Themenpfade / Tracks: [ Alle (190) ] [ Backend (42) ] [ Cloud (38) ] ...|
+-----------------------------------------------------------------------------------+
| +-------------------------+ +-------------------------+ +-----------------------+ |
| | [Issuer]     [Datum]    | | [Issuer]     [Datum]    | | [Issuer]   [Datum]    | |
| | Zertifikatstitel        | | Zertifikatstitel        | | Zertifikatstitel      | |
| | ID: UC-12345            | | ID: G-98765             | | ID: AWS-54321         | |
| | [Track-Chip] [Track]    | | [Track-Chip]            | | [Track-Chip]          | |
| | Verifiziert  [PDF ->]   | | Verifiziert  [Prüfen->] | | Verifiziert [PDF ->]  | |
| +-------------------------+ +-------------------------+ +-----------------------+ |
|                 (Virtualisiert via useWindowVirtualizer ab > 6 Karten)            |
+-----------------------------------------------------------------------------------+
```

#### D. Werdegang (`TimelineSection`): Asymmetrisches `4 / 8` Schweizer Ledger
```text
+-----------------------------------------------------------------------------------+
| [Icon] CHR-01 [BERUFSERFAHRUNG] | Full-Stack Software Engineer & Backend Architect|
|        Jan. 2023 — Heute        | Selbstständig · Deutschland (Remote)            |
|        (lg:col-span-4)          | Beschreibungstext (max-w-[65ch])                |
|                                 | (lg:col-span-8 mit lg:border-l Haarlinie)       |
+---------------------------------+-------------------------------------------------+
| [Icon] CHR-02 [AUSBILDUNG]      | Continuous Professional Development             |
|        Jun. 2022 — Dez. 2024    | Meta, Google Cloud, AWS, IBM · Online           |
+---------------------------------+-------------------------------------------------+
```

#### E. Kontakt (`ContactSection`): `5 / 7` Verified-Profile-Ledger & Formmailer
```text
+-----------------------------------+-----------------------------------------------+
| Verified Profiles (lg:col-span-5) | Formmailer (lg:col-span-7)                    |
|-----------------------------------|-----------------------------------------------|
| [GH] GitHub-Profil    [Repos ->]  | [Mail] Formmailer (dominik@...)               |
|-----------------------------------|-----------------------------------------------|
| [AW] Credly-Profil   [Badges ->]  | Ihre Name *          [______________________] |
|-----------------------------------| Ihre Email Adresse * [______________________] |
| [MP] Standort: 59556 Lippstadt    | Nachricht * (0/2000) [______________________] |
|      [ Eingebettete Dark-Map ]    | TLS Encrypted        [ Nachricht senden -> ]  |
+-----------------------------------+-----------------------------------------------+
```

#### F. Admin-Dashboard & Review-Drawer (`4-Spalten KPI` + `5 / 7 Split-Modal`)
```text
+-----------------------------------------------------------------------------------+
| [<- Portfolio] Admin Command Center [SYS.OPS // LIVE]   [Neon•S3•JWT] [Abmelden]  |
+-----------------------------------------------------------------------------------+
| [MOD-01 // S3 DOCS] | [MOD-02 // REPOS]  | [KPI-03 // ISSUERS] | [MOD-03 // INBOX]|
+---------------------+--------------------+---------------------+------------------+
| Modal: CertificateEditModal (max-w-5xl, grid-cols-12)                             |
| +-----------------------------------+-------------------------------------------+ |
| | Dokumentenvorschau (lg:col-span-5)| OCR-Banner & Formular (lg:col-span-7)     | |
| | [ PDF-Iframe / Bild-Vorschau ]    | [Stufe 1/2/3 OCR] [Vorschläge übernehmen] | |
| | [ min-h-380px bg-slate-950 ]      | [Leistungsnachweis / Transcript-Tabelle]  | |
| |                                   | [Titel, Aussteller, Datum, ID, URL, Tracks]| |
| +-----------------------------------+-------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

### 5.4 Verbindliche Z-Index-Hierarchie

Um Überlagerungsfehler zwischen feststehender Navigation, schwebendem KI-Chat, Modals und Tastatur-Skip-Links auszuschließen, gilt folgende strikte Schichtenordnung:

| Z-Index-Klasse | Ebene | Zugewiesene Komponenten |
|---|---|---|
| `z-[60]` | **1. Notfall- & Fokus-Layer** | WCAG Skip-to-Content Link (`focus:fixed focus:top-3 focus:left-4 focus:z-[60]`) |
| `z-50` | **2. Globale Overlays & Fixed Chrome** | `Navbar` (`fixed top-0`), `ColdStartBanner`, `PortfolioChatWidget` (Floating Launcher & Dialog), alle Modal-Dialoge (`CertificateEditModal`, `UploadCertificateModal`, `ConfirmModal`, Passwort-Reset-Modal), `HeroSearch`-Ergebnis-Dropdown |
| `z-30` | **3. Sticky Workspace Header** | Sticky Command Console Header in `DashboardPage.tsx` (`sticky top-0 z-30`) |
| `z-10` | **4. Primärer Dokumenteninhalt** | `<main id="main-content">`, Sektions-Container über Hintergrund-Grids |
| `z-0` | **5. Hintergrund- & Canvas-Layer** | `.bg-architectural-grid`, `.bg-blueprint-grid`, `HeroThreeBackground` (WebGL-Canvas), subtile Radial-Glows |

---

## 6. Elevation, Borders, Glassmorphism & Radien

### 6.1 Hairline-Border-Architektur

Das Design System bevorzugt **strukturelle 1px-Haarlinien** gegenüber weichen Schattenwürfen:
- **Standard-Karten- & Sektionsrahmen:** `border border-slate-200/90 dark:border-slate-800/90` (bzw. `/80` auf transluzenten Glasflächen).
- **Interaktiver Hover-Rahmen:** `hover:border-indigo-500/50 dark:hover:border-indigo-500/50` (signalisiert Klickbarkeit oder Kartenfokus ohne aufdringlichen Vollrahmen).
- **Innere Teilungslinien (Ledgers & Tabellen):** `divide-y divide-slate-200/80 dark:divide-slate-800/80` sowie `divide-x` im Hero-Blueprint-Footer.

### 6.2 Liquid Glass & Surface Refraction Primitives (`index.css`)

Alle zentralen Oberflächen-Utilities sind in [`frontend/src/index.css`](frontend/src/index.css) definiert. Besonderes Merkmal ist `.surface-refraction` – eine `1px` feine, nach innen gerichtete Glanzkante am oberen Rand (`inset 0 1px 0 0`), die einfallendes Umgebungslicht auf physischen Paneelen simuliert:

```css
/* Transluzente Hauptkarte mit Blur und oberer Lichtbrechungskante */
.glass-card {
  @apply bg-white/85 dark:bg-slate-900/65 backdrop-blur-xl
         border border-slate-200/80 dark:border-slate-800/80
         shadow-sm dark:shadow-2xl
         shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)]
         dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]
         transition-all duration-300;
}

/* Subtile obere Lichtkante für Bento-Karten, Pills und Toolbars */
.surface-refraction {
  @apply shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)]
         dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)];
}

/* Standardisierte Hover-Elevation für interaktive Karten */
.glass-card-hover {
  @apply hover:border-indigo-500/50 hover:shadow-xl
         hover:shadow-indigo-500/5 hover:-translate-y-0.5;
}

/* Fixierte Kopfzeilen-Glasfläche */
.glass-nav {
  @apply bg-white/85 dark:bg-slate-950/85 backdrop-blur-md
         border-b border-slate-200/80 dark:border-slate-800/80;
}
```

### 6.3 Technische Hintergrund-Texturen (Grids)

1. **Architectural Dot Matrix (`.bg-architectural-grid`):**
   - `24px × 24px` radiales Punktmuster (`rgba(99, 102, 241, 0.12)` im Light Mode, `rgba(129, 140, 248, 0.14)` im Dark Mode). Einsatz: `NotFoundPage` und technische Sektionshintergründe.
2. **Orthogonal Blueprint Grid (`.bg-blueprint-grid`):**
   - `24px × 24px` feines Linienraster (`rgba(99, 102, 241, 0.06)` bzw. `0.07`). Einsatz: Fallback-Header von Projektkarten ohne Vorschaubild.
3. **48px Coordinate Grid (Hero & Skills):**
   - Großformatiges `48px × 48px` Koordinatennetz (`rgba(128, 128, 128, 0.05)`) als ruhige konstruktive Bühne hinter der 3D-Szene.

### 6.4 Border-Radius-Skala (Geometrische Hierarchie)

Statt eines einzigen Radius für alle Elemente skaliert der Eckradius streng nach der Komponentengröße (Außenradius = Innenradius + Padding-Differenz):

| Radius-Token | Pixelwert | Zugewiesene Komponenten |
|---|---|---|
| `rounded` / `rounded-md` | `4px` / `6px` | Kompakte Monospace-Tags (`PRJ-01`, `MOD-01`), Skill-Chips, OCR-Stufen-Badges, Quell-Pills im Chat |
| `rounded-lg` | `8px` (`0.5rem`) | Navigations-Links innerhalb der `Navbar`-Pill-Bar, Track-Badges auf Zertifikatskarten, Icon-Buttons in Modal-Headern |
| `rounded-xl` | `12px` (`0.75rem`) | **Standard für alle interaktiven Controls:** Buttons, Action-Pills, Filter-Chips, Formular-Inputs, Suchfelder, Icon-Container (`w-9 h-9`, `w-10 h-10`) |
| `rounded-2xl` | `16px` (`1rem`) | **Standard für alle Inhalts-Container:** Projekt-Bento-Karten, Zertifikatskarten, Kontakt-Formmailer, Dashboard-KPI-Karten, Admin-Modals (`ConfirmModal`, `CertificateEditModal`), Chat-Sprechblasen (`rounded-2xl` mit `rounded-tr-xs` bzw. `rounded-tl-xs`) |
| `rounded-3xl` | `24px` (`1.5rem`) | Schwebendes KI-Chat-Fenster (`PortfolioChatWidget`) sowie temporärer Deep-Link-Highlight-Ring |
| `rounded-full` | `9999px` | Status-Telemetry-Pill im Hero, Floating KI-Chat-Trigger-Button, Quick-Prompt-Pills, pulsierende Online-Status-Dots |

---

## 7. Motion Design & Micro-Interactions

### 7.1 Choreografie-Prinzipien

- **Sparsamkeit bei autonomen Animationen:** Unaufgeforderte Bewegung wird auf ein Minimum beschränkt. Es gibt kein generisches „Jede Sektion fadet beim Scrollen von unten ein“.
- **Ein inszenierter Seitenstart:** Der `Hero` nutzt eine einzige, präzise gestaffelte Framer-Motion-Sequenz (`staggerChildren: 0.08`, `delayChildren: 0.05`, `duration: 0.5`, Custom-Easing `[0.22, 1, 0.36, 1]`).
- **Direkte Antwort auf Nutzeraktionen:** Jede Bewegung im restlichen Interface beantwortet eine unmittelbare Eingabe (Filterwechsel mit `AnimatePresence` & `layout` über `200ms`, Öffnen von Modals, Kopieren in die Zwischenablage, Deep-Link-Sprung).

### 7.2 Zeitdauern (Durations) & Easing-Kurven

| Interaktionstyp | Dauer | Easing / Kurve | CSS / JS Implementierung |
|---|---|---|---|
| **Micro-Tap & Push-Feedback** | `150ms` | Standard Ease-Out | `active:scale-[0.98] active:translate-y-[1px] transition-all duration-150` |
| **Hover (Farbe, Rahmen, Elevation)**| `200ms` | `cubic-bezier(0.4, 0, 0.2, 1)` | `transition-colors duration-200` / `transition-all duration-200 hover:-translate-y-0.5` |
| **Filter-Grid & Modal-Einblendung**| `200ms` | Ease-Out / Zoom-95 | `animate-in fade-in zoom-in-95 duration-200` bzw. Framer Motion `duration: 0.2` |
| **Theme-Wechsel (Light $\leftrightarrow$ Dark)**| `300ms` | Ease-In-Out | `transition-colors duration-300` auf `<body>` und `.glass-card` |
| **Hero-Entrance-Choreografie** | `500ms` | `[0.22, 1, 0.36, 1]` (Expo-Out)| Framer Motion `itemVariants` (`y: 14 -> 0`, `opacity: 0 -> 1`) |
| **GSAP Magnetic Button Tracking** | `400ms` / `1200ms`| `power2.out` (Move) / `elastic.out(1, 0.3)` (Return) | 3D-Tilt (`rotationX`, `rotationY`, `scale: 1.05`) in `motion-footer.tsx` |
| **Deep-Link Quell-Highlight** | `2200ms` Haltezeit | `duration-500` Ring-Transition | `scrollToAndHighlightSource()` in `PortfolioChatWidget.tsx` |

### 7.3 Verbindlicher `prefers-reduced-motion` Schutz

Für Nutzer mit vestibulärer Empfindlichkeit oder aktivierter Betriebssystem-Einstellung `Bewegung reduzieren` greift ein dreistufiger Schutzmechanismus:

1. **Globaler CSS-Reset in `frontend/src/index.css`:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *,
     *::before,
     *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }

     .animate-float,
     .animate-pulse-slow {
       animation: none !important;
     }
   }
   ```
2. **Framer Motion Hook (`useReducedMotion`) in React-Komponenten (`Hero.tsx`, `HeroThreeBackground.tsx`):**
   - Setzt `staggerChildren: 0`, `y: 0` und verkürzt `duration` auf `0.1s`.
3. **WebGL / Three.js Frame-Loop-Pause (`HeroThreeBackground.tsx`):**
   - Bei aktivem `shouldReduceMotion` überspringt der `useFrame`-Loop sämtliche Rotations- und Partikel-Updates und rendert das 3D-Netzwerk als ruhige, statische Architektur-Skulptur.

---

## 8. Komponenten-Spezifikationen

### 8.1 Buttons & Taktile Action-Pills

Alle interaktiven Buttons führen zwingend `cursor-pointer`, einen sichtbaren Tastaturfokus (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`) und ein taktiles Druck-Feedback (`active:scale-[0.98] active:translate-y-[1px]`).

| Button-Variante | Mindesthöhe | Typografie & Padding | Verbindliche Tailwind-Klassen | Einsatzort |
|---|---|---|---|---|
| **Primary Hero CTA** | `min-h-[44px]` | `text-sm sm:text-base font-semibold px-7 py-3.5` | `rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] active:translate-y-[1px] shadow-sm shadow-indigo-600/20 hover:shadow-md transition-all duration-200` | Haupt-CTA im Hero (`Projekte entdecken`), Formmailer-Submit, 404-Startseiten-Button |
| **Secondary Glass CTA** | `min-h-[44px]` | `text-sm sm:text-base font-semibold px-6 py-3.5` | `rounded-xl text-slate-900 dark:text-slate-100 bg-white/90 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-md surface-refraction` | Sekundärer Hero-CTA (`Zertifikate einsehen`), 404-Zurück-Button |
| **Ghost / Tertiary CTA** | `min-h-[44px]` | `text-sm sm:text-base font-medium px-5 py-3.5` | `rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900/60` | Tertiärer Hero-Link (`Kontakt aufnehmen`) |
| **Card Action Pill (Primary)**| `min-h-[38px]` | `text-xs font-semibold px-3.5 py-1.5` | `rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200/70 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300` | `Live Demo`-Button auf Projektkarten, Dashboard-Quick-Link in `Navbar` |
| **Card Action Pill (Neutral)**| `min-h-[38px]` | `text-xs font-semibold px-3.5 py-1.5` | `rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70` | `Code` (GitHub)-Button auf Projektkarten, `Suchfilter zurücksetzen` |
| **Publish CTA (Emerald)** | `min-h-[36px]` | `text-xs font-semibold px-4 py-2` | `rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed` | `Speichern & Veröffentlichen` im `CertificateEditModal` |
| **Destructive CTA (Red)** | `min-h-[36px]` | `text-xs font-bold px-4 py-2` | `rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20` | Löschbestätigung in `ConfirmModal` |
| **CVA Base Button (`ui/button.tsx`)** | `h-9` / `h-10` / `h-11` | `text-sm font-medium` | Unterstützt `asChild` via `@radix-ui/react-slot` und die Varianten `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. | Wiederverwendbares UI-Primitive (z. B. `NotFoundPage`) |

### 8.2 Cards & Asymmetrische Bento-Container

#### A. Projekt-Bento-Karte (`ProjectsSection.tsx`)
- **Container:** `rounded-2xl bg-white dark:bg-slate-900/65 border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/50 shadow-xs hover:shadow-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5 surface-refraction`.
- **DOM-Anker:** Jede Karte trägt `id="project-${project.id}"` für das Deep-Linking aus dem KI-Chat.
- **Zwei Header-Modi:**
  1. *Medien-Header (wenn `project.image` vorhanden):* `h-40` (bzw. `lg:w-2/5` bei der breiten 12-Spalten-Karte) mit `loading="lazy"`, dunklem Basis-Gradienten (`from-slate-950/60`), links oben schwebendem `PRJ-01`-Badge und links unten Monospace-Datums-Badge.
  2. *Blueprint-Header (ohne Bild):* `h-28 bg-slate-50/90 dark:bg-slate-900/50 bg-blueprint-grid` mit `w-10 h-10 rounded-xl` Icon-Box, `PRJ-01`-Index und `FEATURED // ARCH`- bzw. `SYS // MODULE`-Telemetrie.
- **Body & Footer:** Titel (`group-hover:text-indigo-600`), 3-zeilige Beschreibung (`line-clamp-3`), Monospace-Skill-Pills und eine durch `border-t border-slate-100 dark:border-slate-800/80` getrennte Action-Bar.

#### B. Zertifikats-Karte (`CertificateCardItem` in `CertificatesSection.tsx`)
- **Performance:** Als `React.memo`-Komponente gekapselt, vorbereitet für DOM-Virtualisierung. Trägt `id="cert-${cert.id}"`.
- **Oberfläche:** `rounded-2xl bg-slate-50/70 dark:bg-slate-900/55 border border-slate-200/90 dark:border-slate-800/90 p-5 hover:border-indigo-500/50 hover:shadow-lg hover:bg-white dark:hover:bg-slate-900/90 transition-all duration-200 hover:-translate-y-0.5 surface-refraction`.
- **Kopfzeile:** Aussteller-Badge (`font-mono text-[11px] font-semibold`) links, Ausstellungsdatum (`font-mono text-[11px]`) rechts.
- **Inhalt:** Titel (`line-clamp-2`), optionale `ID: <credential_id>` in Monospace sowie klickbare Many-to-Many-Track-Chips zum direkten Filtern nach Themenpfad.
- **Fußzeile:** `border-t` mit `Verifiziert`-Indikator (`text-emerald-600 dark:text-emerald-400` + `CheckCircle2`) links sowie direkten Links zu `Online prüfen` (`credential_url`) und `PDF` (`pdf_file`) rechts.

#### C. Dashboard Telemetry KPI-Card (`DashboardPage.tsx`)
- **Interaktive Modul-Umschaltung:** Die Karten `MOD-01 // S3 DOCS`, `MOD-02 // REPOS` und `MOD-03 // INBOX QUEUE` fungieren gleichzeitig als Live-Telemetrie-Anzeige und als Tab-Umschalter (`<button type="button">`).
- **Aktiver Zustand:** `bg-slate-900/95 border-indigo-500/50 shadow-lg shadow-indigo-950/30` (bzw. `border-amber-500/50` für die Inbox-Queue).
- **Anatomie:** Monospace-Modul-Badge + Icon-Kachel oben, großer `tabular-nums`-Zähler mit Live/Entwurf-Verhältnis in der Mitte, `h-1.5` Fortschrittsbalken mit prozentualer Publikationsquote unten.

### 8.3 Badges, Tags & Filter-Chips

- **Unverzichtbare Grundregel:** Alle Badges und Filter-Chips verwenden `whitespace-nowrap`, damit mehrteilige Bezeichnungen niemals innerhalb eines Badges umbrechen.
- **Dynamisches SVG-Icon-Masking (`TrackIcon.tsx`):**
  - Fachbereichs-Icons (FontAwesome SVGs aus `/static/img/icons/`) werden über CSS `mask-image: url(...)` und `backgroundColor: 'currentColor'` gerendert. Dadurch erbt jedes Icon automatisch die exakte Textfarbe seines Eltern-Chips (z. B. `text-indigo-600` im Ruhezustand und `text-white` im aktivierten Zustand `isSelected = true`).
- **OCR-Stufen-Badges (`CertificateEditModal.tsx`):**
  - **Stufe 1 (`pypdf` Textlayer):** `bg-emerald-500/20 text-emerald-300 border-emerald-500/40`
  - **Stufe 2 (`Tesseract OCR`):** `bg-amber-500/20 text-amber-300 border-amber-500/40`
  - **Stufe 3 (`Gemini Flash Vision`):** `bg-purple-500/20 text-purple-300 border-purple-500/40`

### 8.4 Modals, Split-Pane Review-Drawer & PDF-Viewer

Alle modalen Dialoge implementieren folgende Pflichtmerkmale:
- Semantische Auszeichnung mit `role="dialog"`, `aria-modal="true"` und `aria-labelledby`.
- Automatisches Schließen bei Druck auf die Taste `Escape` (`keydown`-Listener).
- Abdunkelung des Hintergrunds mittels `fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm`.

#### A. Zertifikats-Review-Drawer & PDF-Viewer (`CertificateEditModal.tsx`)
- **Dimensionen:** `w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden`.
- **12-Spalten Split-Pane Body (`grid-cols-1 lg:grid-cols-12 gap-6`):**
  1. **Linke Spalte (`lg:col-span-5` — `CertificatePreviewPane`):**
     - Dunkler Dokumenten-Tresor (`min-h-[380px] max-h-[580px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden`).
     - Erkennt automatisch Bildformate (`.jpg`, `.png`, `.webp`, `.gif` $\rightarrow$ `<img className="object-contain p-2" />`) gegenüber PDF-Dokumenten ($\rightarrow$ `<iframe className="w-full h-full min-h-[460px] border-0" />`) und bietet einen Direktlink `In neuem Tab öffnen`.
  2. **Rechte Spalte (`lg:col-span-7` — OCR-Engine, Transcript-Tabelle & Formular):**
     - `CertificateOcrSuggestionsBanner`: Startet die 3-Stufen-OCR-Extraktion on-demand und erlaubt das Übernehmen einzelner Felder (`Übernehmen`) oder aller erkannten Metadaten (`Alle Vorschläge übernehmen`).
     - `CertificateTranscriptTable`: Rendert bei mehrseitigen Hochschul- oder Modul-Nachweisen (`pdfplumber`-Extraktion) eine strukturierte Tabelle aller Module inkl. Modulcode, ECTS/Credits, Note (`Bestanden`-Badge) und 1-Klick-Button `Als Titel`.
     - Validierungs-Sperre: Der Button `Speichern & Veröffentlichen` ist deaktiviert (`disabled={trackIds.length === 0}`), solange keines der Themengebiete (Tracks) zugewiesen wurde.

#### B. Direct-to-Storage Upload-Modal (`UploadCertificateModal.tsx`)
- Führt den dreistufigen S3-Upload-Flow (Presigned URL anfordern $\rightarrow$ direkter `PUT` zu Supabase S3 $\rightarrow$ DB-Registrierung) durch und zeigt währenddessen den aktuellen Fortschrittsschritt (`uploadStep`) an.
- Schlägt beim Auswählen einer Datei automatisch einen bereinigten Zertifikatstitel aus dem Dateinamen vor.

#### C. Sicherheits-Bestätigungsdialog (`ConfirmModal.tsx`)
- Kompaktes Dialogfenster (`max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl`) mit `AlertTriangle`-Icon in `bg-red-500/10 text-red-400` zur Absicherung destruktiver Löschvorgänge.

### 8.5 Formulare, Inputs & Validierungs-Architektur

1. **Strikte Label-Zuordnung (Keine Placeholder-Only-Inputs):**
   - Jedes Eingabefeld besitzt ein sichtbares `<label htmlFor="...">` oberhalb des Inputs (`flex flex-col gap-2` bzw. `mb-1.5`). Pflichtfelder sind mit `<span className="text-indigo-500">*</span>` (öffentlich) bzw. `text-red-400` (Admin) gekennzeichnet.
2. **Input-Styling & Fokusverhalten:**
   - **Öffentlicher Formmailer (`ContactSection.tsx`):**
     ```text
     w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors
     ```
   - **Fehlerzustand (Inline Field Error):**
     - Rahmen wechselt auf `border-rose-500/70 focus:ring-rose-500/30 focus:border-rose-500`.
     - Das Input-Element setzt `aria-invalid={true}` und verknüpft die Fehlermeldung über `aria-describedby="contact-<field>-error"`.
     - Sobald der Nutzer tippt, wird der Feldfehler des jeweiligen Feldes sofort zurückgesetzt.
3. **Sicherheits- & Komfort-Features in Formularen:**
   - **Spam-Schutz ohne CAPTCHA-Reibung:** Unsichtbares Honeypot-Feld (`className="sr-only" aria-hidden="true" tabIndex={-1}`) im Kontaktformular.
   - **Live-Zeichenzähler:** Monospace-Anzeige `{message.length} / 2000` rechts neben dem Nachrichten-Label.
   - **Caps-Lock-Erkennung (`LoginPage.tsx`):** Prüft `e.getModifierState('CapsLock')` bei der Passworteingabe und warnt sofort über ein `role="status"`-Banner in `text-amber-400`, falls die Feststelltaste aktiv ist.

### 8.6 RAG KI-Copilot Chat-Widget

Das schwebende KI-Assistenten-Widget (`PortfolioChatWidget.tsx`, `fixed bottom-5 right-5 z-50`) verbindet Konversations-UI mit direkter Seitennavigation:

1. **Floating Radar-Trigger:**
   - Pill-Button (`rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-xl`) mit pulsierendem Emerald-Online-Punkt (`animate-ping`), Label `Frag Dominiks KI` und `KI-Chat`-Badge.
2. **Dialog-Container:**
   - `w-[92vw] sm:w-[440px] h-[560px] max-h-[82vh] rounded-3xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl`.
   - Dunkler Status-Header (`bg-slate-900/95 dark:bg-slate-950/95`) mit Bot-Avatar, `Online`- bzw. `Deaktiviert (Token-Schutz)`-Badge, Reset-Button (`RotateCcw`) und Schließen-Button (`X`).
3. **Nachrichten-Log & Sprechblasen (`ChatMessageBubble`):**
   - Container trägt `role="log" aria-live="polite"`.
   - **User-Nachricht:** Rechtsbündig, `bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-xs`.
   - **KI-Antwort (`model`):** Linksbündig mit `Sparkles`-Avatar, `bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl rounded-tl-xs`, `tabular-nums`-Zeitstempel und Copy-to-Clipboard-Button (morpht für `2000ms` zu grünem Häkchen `Kopiert`).
4. **Interaktive Deep-Linking Quell-Badges (`ChatSourceBadges`):**
   - Unter jeder KI-Antwort werden verifizierte Quellen (`project` mit `FolderGit2`-Icon, `certificate` mit `Award`-Icon) als klickbare Badges gerendert.
   - Klickt der Nutzer auf ein Quell-Badge, scrollt `scrollToAndHighlightSource()` sanft zur entsprechenden Karte (`#project-<id>` oder `#cert-<id>`) und legt für **2200 ms** einen leuchtenden Fokus-Ring (`ring-2 ring-cyan-400/80 rounded-3xl shadow-xl shadow-indigo-500/20`) um das Zielelement.
5. **Thinking Wave & Session-Guardrails:**
   - Während der RAG-Antwortgenerierung erscheint `ChatThinkingIndicator` (3 gestaffelt animierte Indigo-Dots mit `0ms`, `150ms`, `300ms` Delay).
   - Nach maximal `10` Nutzer-Nachrichten pro Sitzung (oder bei HTTP `429`/`503`) aktiviert sich automatisch der Client-Circuit-Breaker (`isDisabled = true`) zum Schutz des API-Kontingents.

### 8.7 Timeline & Schweizer Chronologie-Ledger

- Statt einer verspielten Zick-Zack-Linie nutzt die Timeline (`TimelineSection.tsx`) ein **asymmetrisches 12-Spalten-Schweizer-Ledger** mit durchgehenden Haarlinien (`divide-y divide-slate-200/80 dark:divide-slate-800/80 border-t`).
- **Linke Spalte (`lg:col-span-4`):**
  - `w-9 h-9 rounded-xl` Icon-Container (`Briefcase` für Berufserfahrung, `GraduationCap` für Ausbildung), fortlaufender Telemetrie-Code (`CHR-01`, `CHR-02`), Kategorie-Badge (`bg-indigo-500/10 text-indigo-600 dark:text-indigo-400`) und Monospace-Zeitraum (`Jan. 2023 — Heute (Laufend)`).
- **Rechte Spalte (`lg:col-span-8 lg:pl-6 lg:border-l`):**
  - Vertikale Haarlinie trennt Metadaten und Inhalt auf Desktop-Viewports; enthält Rollentitel (`h3`), Organisation, Standort mit `MapPin`-Icon und die Aufgabenbeschreibung (`max-w-[65ch]`).

### 8.8 Filter-Bars, Omnibox-Suche & Navigation

1. **Sticky Navbar (`Navbar.tsx`):**
   - Links: Brand-Logo mit grünem Online-Status-Dot + `SYS // ARCHITECTURE` Subline.
   - Mitte (Desktop): Taktile Pill-Bar (`p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border surface-refraction`) mit den 5 Sektions-Ankern (`01 Skills` bis `05 Kontakt`).
   - Rechts: `LanguageSwitcher` (`DE`/`EN`), `ThemeToggle` sowie kontextsensitiver Auth-Bereich (`Login`-Button vs. `Dashboard`-Pill + `Logout`).
2. **Client-Seitige Omnibox (`HeroSearch.tsx`):**
   - Durchsucht verzögerungsfrei (`useDeferredValue`) alle 4 Entitätstypen (`project`, `skill`, `certificate`, `timeline`).
   - Unterstützt vollständige Tastatur-Navigation (`ArrowDown`, `ArrowUp`, `Enter` zum Anspringen der Sektion, `Escape` zum Schließen) über ein barrierefreies Listbox-Pattern.
3. **Zertifikats-Filterkonsole (`CertificatesSection.tsx` & `CertificateManager.tsx`):**
   - **Öffentlich:** Haarlinien-Toolbar (`border-y`) mit Volltextsuche, horizontal scrollbaren Aussteller-Pills und kombinierbaren M2M-Track-Filterchips samt aktivem Lernpfad-Banner.
   - **Admin (`CertificateManager`):** `300ms` Debounced-Server-Suche, segmentierte Status-Filter-Pills (`Alle`, `Veröffentlicht` in Emerald, `Entwürfe` in Amber, `Unvollständig` in Rose) und serverseitige Paginierung (`pageSize = 20`).

### 8.9 Skeletons, Empty States & System-Banner

1. **CLS-freie Loading Skeletons (`isLoading = true`):**
   - Alle datengetriebenen Sektionen (`ProjectsSection`, `CertificatesSection`, `TimelineSection`, `SkillsSection`) rendern während des Ladens exakte strukturelle Platzhalter (`animate-pulse` in `bg-slate-200 dark:bg-slate-800`) mit denselben Grid-Spannen (z. B. `7 / 5 / 12` im Projekt-Skeleton) und Höhen wie die späteren echten Karten.
   - Jeder Skeleton-Container trägt `aria-busy="true"` und ein lokalisiertes `aria-label="Wird geladen..."`.
2. **Dreistufiges `SectionEmptyState`-Pattern (`SectionEmptyState.tsx`):**
   - **Modus 1 — API-Fehler (`isError = true`):** `role="alert"`, Rose-Akzent (`bg-rose-500/5 border-rose-500/25`), Telemetrie-Code `ERR // TELEMETRY_SYNC_FAILED` und direkter Button `Erneut versuchen` (`onRetry`).
   - **Modus 2 — Aktiver Such-/Filterbegriff ohne Treffer (`query !== ''`):** Indigo-Icon (`SearchX`), hebt den gesuchten Begriff hervor und bietet den 1-Klick-Reset `Suchfilter zurücksetzen` (`onReset`).
   - **Modus 3 — Leerer Datenbestand (`query === ''`):** Gestrichelter Rahmen (`border-dashed`), Telemetrie-Code `SYS // EMPTY_DATASET` und sachliche Erklärung.
3. **Inline Fallback-Telemetrie-Bar (`ProjectsSection` & `TimelineSection`):**
   - Falls der Live-API-Abruf fehlschlägt, aber verifizierte Referenzdaten vorhanden sind, wird die Seite **nicht** durch einen Fehlerbildschirm blockiert. Stattdessen erscheint eine kompakte Rose-Telemetrieleiste (`ERR // LIVE_SYNC_FALLBACK`) mit Retry-Button über dem Referenzbestand.
4. **Render Free-Tier `ColdStartBanner` (`ColdStartBanner.tsx`):**
   - Überwacht API-Latenzen via `useColdStartTracker`. Überschreitet ein Request `2000ms`, informiert ein dezentes Floating-Banner (`role="status" aria-live="polite"`) über das Aufwachen des Containers, wechselt ab `30s` auf einen Amber-Warnzustand mit Retry-Option und blendet sich bei Erfolg in Emerald sanft aus.

---

## 9. Accessibility (a11y) Richtlinien nach WCAG 2.2 AA

Barrierefreiheit ist keine nachträgliche Ergänzung, sondern strukturelles Fundament jeder Komponente:

| WCAG 2.2 Kriterium | Technische Umsetzung im Portfolio |
|---|---|
| **2.4.1 Bypass Blocks (Skip-Link)** | Erstes fokussierbares Element in `PortfolioPage.tsx` ist der Skip-Link `<a href="#main-content">`, der bei `:focus-visible` mit `z-[60]` oben links eingeblendet wird. |
| **2.4.7 & 2.4.13 Focus Visible & Appearance** | Globaler Fokus-Indikator `:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }` in `index.css` bzw. `focus-visible:ring-2 focus-visible:ring-indigo-500` auf allen interaktiven Elementen. Niemals `outline-none` ohne gleichwertigen `focus-visible:ring-2`-Ersatz! |
| **2.4.11 Focus Not Obscured (Minimum)** | Durch `scroll-padding-top: 5rem` und `scroll-mt-20` wird kein per Tab oder Anker fokussiertes Element jemals von der `h-16` (`64px`) hohen `Navbar` verdeckt. |
| **2.5.8 Target Size (Minimum & Enhanced)** | Primäre Buttons, Formular-Inputs, Mobile-Drawer-Links und der Hamburger-Button erfüllen **`min-h-[44px]`** (`44×44px`). Kompakte sekundäre Filter- und Action-Pills unterschreiten niemals `min-h-[36px]`–`min-h-[38px]` bei ausreichendem `gap-2`. |
| **1.4.3 & 1.4.6 Contrast (Minimum & Enhanced)** | Alle Fließtexte (`slate-900`/`slate-600` auf Light, `white`/`slate-300` auf Dark) erreichen $> 7:1$ (**AAA**); gedämpfte Metadaten (`slate-500` / `slate-400`) und Akzentfarben erreichen $\ge 4.6:1$ (**AA**). |
| **1.4.1 Use of Color (Farbunabhängigkeit)** | Systemzustände werden niemals allein durch Farbe vermittelt, sondern immer durch die Kombination aus **SVG-Icon + Text-Label + semantischer Farbe** (z. B. `CheckCircle2` + `"Verifiziert"` + Emerald). |
| **4.1.2 Name, Role, Value & Live Regions** | Icon-Only-Buttons (`ThemeToggle`, Schließen-Buttons, Copy-Button, Logout) besitzen explizite `aria-label`-Attribute. Dekorative Icons neben Text tragen `aria-hidden="true"`. Dynamische Filterzähler nutzen `role="status" aria-atomic="true"`, Fehlermeldungen `role="alert"`, das Chat-Protokoll `role="log" aria-live="polite"`. |
| **2.3.3 Animation from Interactions** | Vollständige Abschaltung aller Endlos-Animationen und Reduktion von Transitionen bei `@media (prefers-reduced-motion: reduce)` sowie über `useReducedMotion()`. |

---

## 10. Legacy-Token-Migration & Pre-Merge-Checkliste

### 10.1 Legacy-Token-Migrationsmatrix

In älteren Komponenten (insbesondere [`SkillsSection.tsx`](frontend/src/components/SkillsSection.tsx)) finden sich noch vereinzelte Legacy-Klassen aus einer früheren Design-Iteration. Bei jedem Refactoring sind diese verbindlich durch die kanonischen Tokens zu ersetzen:

| Veraltete Legacy-Klasse | Kanonischer Ersatz im Design System v3.0 | Begründung |
|---|---|---|
| `text-text-primary` | `text-slate-900 dark:text-white` (oder `text-foreground`) | In `@theme` (`index.css`) nicht definiert; explizite Slate-Tokens sichern AAA-Kontrast. |
| `text-text-secondary` | `text-slate-600 dark:text-slate-400` (oder `text-muted-foreground`) | Einheitliche Sekundärtext-Hierarchie über alle Sektionen. |
| `text-text-muted` | `text-slate-500 dark:text-slate-400` | Garantierter WCAG AA Kontrast ($\ge 4.6:1$). |
| `bg-surface` / `bg-surface/80` | `bg-white dark:bg-slate-900/65 surface-refraction` (oder `bg-card`) | Konsistente Glas- und Kartenoberfläche. |
| `bg-surface-hover` | `bg-slate-200 dark:bg-slate-800` (in Skeletons) bzw. `hover:bg-slate-100 dark:hover:bg-slate-800/90` | Sichtbare Skeleton-Pulse und Hover-Flächen. |
| `text-accent-primary` / `bg-accent-primary` | `text-indigo-600 dark:text-indigo-400` / `bg-indigo-600 hover:bg-indigo-500` | Kanonischer Brand-Indigo-Akzent. |

### 10.2 Verbindliche Pre-Merge UI-Checkliste

Vor jedem Pull Request, der Frontend-Komponenten oder Styles berührt, sind folgende Kriterien zu verifizieren:

- [ ] **Dual-Theme-Prüfung:** Wurde die Ansicht sowohl im **Light Mode** (`slate-50` / `white`) als auch im **Dark Mode** (`slate-950` / `slate-900`) auf Kontrast (mind. 4.5:1) und Lesbarkeit geprüft?
- [ ] **Responsive Viewport-Prüfung:** Funktioniert das Layout fehlerfrei und ohne horizontalen Overflow auf Mobile (`375px`), Tablet (`768px`) und Desktop (`1280px+`)?
- [ ] **Tastatur- & Fokus-Disziplin:** Lassen sich alle interaktiven Elemente per `Tab` erreichen, per `Enter`/`Space` auslösen und Modals/Dropdowns per `Escape` schließen? Ist `:focus-visible` überall klar sichtbar?
- [ ] **Touch- & Pointer-Affordance:** Besitzen alle klickbaren Elemente `cursor-pointer`, `active:scale-[0.98]` und eine ausreichende Trefferfläche (`min-h-[44px]` primär, `min-h-[36px]`+ sekundär)?
- [ ] **Badge- & Typografie-Regeln:** Tragen alle kompakten Badges und Filter-Chips `whitespace-nowrap`? Sind Fließtexte auf `< 80` Zeichen (`max-w-[65ch]`) begrenzt und dynamische Zahlen mit `tabular-nums` ausgezeichnet?
- [ ] **Reduced-Motion & CLS:** Werden Bild-/Vorschau-Container mit festen Seitenverhältnissen oder Mindesthöhen reserviert und Animationen unter `prefers-reduced-motion: reduce` zuverlässig deaktiviert?
- [ ] **i18n-Vollständigkeit:** Sind alle neuen UI-Texte sowohl in `frontend/src/locales/de.json` als auch in `frontend/src/locales/en.json` hinterlegt?
- [ ] **Automatisierte Quality Gates:** Laufen `npm run lint` (Oxlint), `npm run build` (`tsc -b && vite build`) und `npm run test` (Vitest) fehlerfrei durch?
