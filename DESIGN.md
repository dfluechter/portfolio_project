# Design System & UI Architecture — Portfolio Dominik Flüchter

> **Verbindliche Spezifikation des Frontend-Designsystems**  
> **Tech-Stack:** React 19 · Tailwind CSS v4 (`@tailwindcss/vite`) · TypeScript 7.x · Three.js / React Three Fiber · Framer Motion · GSAP (ScrollTrigger) · Radix UI Slot · Lucide React · TanStack Virtual  
> **Ästhetische Leitlinie:** *Swiss Precision Systems Architecture* kombiniert mit zeitgenössischem Developer Polish (Vercel / ibelick Inspiration)  
> **Barrierefreiheit:** Strikt nach WCAG 2.2 Stufe AA

---

## Inhaltsverzeichnis

1. [Design-Philosophie & Gestaltungsprinzipien](#1-design-philosophie--gestaltungsprinzipien)
2. [Tailwind CSS v4 CSS-First Architektur](#2-tailwind-css-v4-css-first-architektur)
3. [Design-Tokens, Farbarchitektur & OKLCH-Engine](#3-design-tokens-farbarchitektur--oklch-engine)
4. [3D-Visual-Tokens & Three.js Canvas Palette](#4-3d-visual-tokens--threejs-canvas-palette)
5. [Typografie-System & Schrift-Hierarchie](#5-typografie-system--schrift-hierarchie)
6. [Spacing-, Grid- & Layout-System](#6-spacing--grid---layout-system)
7. [Oberflächen, Texturen & Grids](#7-oberflächen-texturen--grids)
8. [Komponenten-Bibliothek & Design-Patterns](#8-komponenten-bibliothek--design-patterns)
9. [Admin-Dashboard & Command Console System](#9-admin-dashboard--command-console-system)
10. [Motion Design, Animationen & Interaktionsphysik](#10-motion-design-animationen--interaktionsphysik)
11. [Barrierefreiheit (Accessibility / WCAG 2.2 AA)](#11-barrierefreiheit-accessibility--wcag-22-aa)
12. [Legacy-Token Debt & Migrations-Matrix](#12-legacy-token-debt--migrations-matrix)
13. [Engineering-Leitfaden & UI-Checkliste](#13-engineering-leitfaden--ui-checkliste)

---

## 1. Design-Philosophie & Gestaltungsprinzipien

Das Designsystem verbindet die rationale Klarheit und typografische Strenge der **Schweizer Grafik (Swiss Graphic Design)** mit technischer **System-Architektur-Ästhetik** und haptischem Feedback moderner Entwicklerplattformen. Es visualisiert Solidität, Stabilität und Code-Qualität.

### 1.1 Leitprinzipien

1. **Information Architecture First (Präzision vor Dekoration)**
   - Jedes visuelle Element (Linien, Koordinaten-Grids, Ziffern und Badges) dient der Datenstrukturierung.
   - Technische Metadaten (Status-Codes, IDs wie `PRJ-01`, Prüfsummen, Timestamps) werden typografisch via Monospace als eigenständige Informationsebene geführt.
2. **Taktile Haptik & Reaktionsfreudigkeit**
   - Interaktive Steuerelemente besitzen physische Präsenz: Pill-Bars, Mikro-Elevationen (`hover:-translate-y-0.5`), Lichtkanten (`border-slate-200/80`) und Feder-Druckzustände (`active:scale-95`).
3. **Dark-Mode als primärer Entwickler-Standard**
   - Konzipiert als „Dark-Mode-First“ (`slate-950` Basis), synchronisiert über `ThemeContext` (`localStorage`, `prefers-color-scheme`) mit nahtlosem Light-Mode (`slate-50`).
4. **Garantierte Barrierefreiheit (WCAG 2.2 AA)**
   - Integrierte Skip-Links, kontrastreiche Tastaturfokus-Ringe (`:focus-visible`), Screenreader-Support (`role="status"`, `role="log"`) und strikte `prefers-reduced-motion`-Deaktivierung.

---

## 2. Tailwind CSS v4 CSS-First Architektur

Das Projekt verzichtet auf eine JavaScript-Konfigurationsdatei (`tailwind.config.js`). Das gesamte System basiert auf nativen CSS-Direktiven in `frontend/src/index.css`, verarbeitet über `@tailwindcss/vite`.

### 2.1 Vite-Integration (`frontend/vite.config.ts`)

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // ...
});
```

### 2.2 Token-Bridging via `@theme` & Custom Variants

In `frontend/src/index.css`:

```css
@import "tailwindcss";

/* HTML-Klassen-basierter Dark-Mode-Variant */
@custom-variant dark (&:where(.dark, .dark *));

/* Bridging semantischer CSS-Variablen in Tailwinds Utility-Engine */
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

### 2.3 Utility-Helper `cn()` (`frontend/src/lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Design-Tokens, Farbarchitektur & OKLCH-Engine

### 3.1 Semantische Basis-Tokens

| Token | Light Mode (`:root`) | Dark Mode (`.dark`) | Verwendungszweck |
|---|---|---|---|
| `--background` | `#ffffff` | `#020617` (Slate 950) | Seiten-Hintergrund |
| `--foreground` | `#020617` (Slate 950) | `#f8fafc` (Slate 50) | Primärtext, Überschriften |
| `--card` | `#ffffff` | `#020617` | Karten und Container |
| `--card-foreground` | `#020617` | `#f8fafc` | Text auf Karten |
| `--popover` | `#ffffff` | `#020617` | Tooltips, Dropdowns |
| `--popover-foreground` | `#020617` | `#f8fafc` | Text in Popovers |
| `--primary` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Primäre CTAs |
| `--primary-foreground` | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) | CTA-Schriftfarbe |
| `--secondary` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Sekundäre Steuerelemente |
| `--secondary-foreground` | `#0f172a` (Slate 900) | `#f8fafc` | Sekundärer Text |
| `--muted` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Zurückhaltende Flächen |
| `--muted-foreground` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Untertitel, Metadaten |
| `--accent` | `#f1f5f9` (Slate 100) | `#1e293b` (Slate 800) | Hover-Highlights, Chips |
| `--accent-foreground` | `#0f172a` | `#f8fafc` | Akzent-Text |
| `--destructive` | `#ef4444` (Red 500) | `#7f1d1d` (Red 900) | Löschaktionen, Fehler |
| `--destructive-foreground` | `#f8fafc` | `#f8fafc` | Fehler-Schriftfarbe |
| `--border` | `#e2e8f0` (Slate 200) | `#1e293b` (Slate 800) | Rahmen, Dividers |
| `--input` | `#e2e8f0` (Slate 200) | `#1e293b` (Slate 800) | Formularrahmen |
| `--ring` | `#6366f1` (Indigo 500) | `#818cf8` (Indigo 400) | Tastaturfokus (WCAG) |

### 3.2 Slate- & Indigo-Palette (Komponenten-Standard)

```text
Light Mode:
  Body:            bg-slate-50 text-slate-900
  Card Surface:    bg-white / bg-slate-50/70 border-slate-200/90
  Subtle Pills:    bg-slate-100 hover:bg-slate-200 text-slate-700
  Muted Text:      text-slate-600 / text-slate-500
  Brand Accent:    bg-indigo-600 text-white hover:bg-indigo-700
  Accent Tint:     bg-indigo-50 text-indigo-600 border-indigo-200/80

Dark Mode:
  Body:            dark:bg-slate-950 dark:text-slate-100
  Card Surface:    dark:bg-slate-900/65 dark:border-slate-800/90
  Subtle Pills:    dark:bg-slate-800/90 dark:hover:bg-slate-800 dark:text-slate-200
  Muted Text:      dark:text-slate-400 / dark:text-slate-500
  Brand Accent:    dark:bg-indigo-500 text-white hover:dark:bg-indigo-400
  Accent Tint:     dark:bg-indigo-950/70 dark:text-indigo-400 dark:border-indigo-800/80
```

### 3.3 Funktionale Status-Farben

- **Erfolg & Verifiziert (Emerald):** `#10b981` (`emerald-500`, `emerald-600`, `emerald-400`). Einsatz: Live-Radar-Ping im Header, verifizierte Zertifikate, Erfolgsmeldungen.
- **Fehler & Destruktiv (Red / Rose):** `#ef4444` (`red-500`, `rose-500`, `rose-600`). Einsatz: `ConfirmModal`, Formmailer-Validierungsfehler, unvollständige Zertifikatsfilter.
- **Warnung & Kaltstart (Amber):** `#fbbf24` (`amber-400`, `amber-950`). Einsatz: ThemeToggle Sun-Icon, `ColdStartBanner` Timeout-Status, Entwurfs-Status im Dashboard.
- **Deep-Linking & Copilot Highlight (Cyan):** `#22d3ee` (`cyan-400`). Einsatz: Deep-Linking Zitat-Highlight (`ring-cyan-400/80`) im RAG-Chatbot.

### 3.4 Mathematische OKLCH Color-Mix Engine (`motion-footer.tsx`)

Für stufenlose Transparenzen bei gleichbleibender Farbwahrnehmung nutzt das System native CSS-Farbraum-Mixe:

```css
.cinematic-footer-wrapper {
  /* Dynamische OKLCH Variablen */
  --pill-bg-1: color-mix(in oklch, var(--foreground) 3%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--background) 50%, transparent);
  --pill-highlight: color-mix(in oklch, var(--foreground) 10%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--background) 80%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 8%, transparent);

  /* Hover-Zustände */
  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 8%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 2%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--background) 70%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--foreground) 20%, transparent);
}
```

---

## 4. 3D-Visual-Tokens & Three.js Canvas Palette

Die interaktive 3D-Szene in `frontend/src/components/HeroThreeBackground.tsx` visualisiert neuronale Netze, Code-Tokenisierung und KI-Tensoren.

### 4.1 Shader- & Material-Farbpalette

| Token | Dark Mode (`isDark = true`) | Light Mode (`isDark = false`) | 3D-Bedeutung |
|---|---|---|---|
| `aiCyan` | `#22D3EE` (Cyber-Cyan) | `#0284C7` (Sky-600) | Neuronale Datenströme & Synapsen |
| `neuralViolet`| `#A855F7` (Neural-Violet) | `#7C3AED` (Violet-700)| Transformer Attention-Ringe |
| `codeEmerald` | `#34D399` (Syntax-Emerald)| `#059669` (Emerald-600)| Vertikale Matrix-Code-Partikel |
| `tensorCoral` | `#FF6B4A` (Tensor-Orange) | `#EA580C` (Orange-600) | Zentraler KI-Tensorkern (Icosahedron) |

### 4.2 WebGL-Resilienz & Performance

- **Headless- & SSR-Schutz:** `canUseWebGL()` prüft deterministisch die Verfügbarkeit von WebGL-Kontexten, um Abstürze in JSDOM und Headless-Tests zu verhindern.
- **Motion-Reset:** Bei `prefers-reduced-motion` pausiert der Frame-Loop (`useFrame`) automatische Rotationen und reduziert die Szene auf ein statisches Kristallgitter.

---

## 5. Typografie-System & Schrift-Hierarchie

### 5.1 Schriftfamilien

1. **System Font Stack (Standard UI, Hero & Fließtext)**
   ```css
   font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
   ```
   0 kB Download, maximale Performance und native Renderschärfe.
2. **Plus Jakarta Sans (Scoped Display Font für Brand-Footer)**
   - Exklusiv eingebunden in `.cinematic-footer-wrapper` (`motion-footer.tsx`).
   - Verleiht dem Abschlussbereich des Portfolios cinematischen Display-Charakter.
3. **Monospace Stack (Telemetrie, Codes & Badges)**
   - `font-mono` (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`).
   - Einsatz: Section Eyebrows (`02 // System Implementations`), Projekt-IDs (`PRJ-01`), Prüfsummen, Timestamps und Status-Chips.

### 5.2 Typografische Hierarchie

| Ebene | Tailwind-Klassen | Größe / Zeilenhöhe | Schnitt / Tracking | Einsatzbereich |
|---|---|---|---|---|
| **Display Hero** | `text-3xl sm:text-5xl xl:text-6xl` | `3.75rem / 1.06` | `font-bold tracking-tight` | Haupt-Claim Startseite |
| **Section Title (H2)** | `text-3xl sm:text-4xl` | `2.25rem / 1.15` | `font-extrabold tracking-tight` | Sektionsüberschriften |
| **Card Title (H3)** | `text-base sm:text-lg` | `1.125rem / 1.3` | `font-bold tracking-tight` | Projekt- & Zertifikatstitel |
| **Eyebrow / Telemetrie** | `font-mono text-xs uppercase` | `0.75rem / 1` | `font-semibold tracking-[0.2em]` | Nummern-Präfixe (`01 // ...`) |
| **Body (Fließtext)** | `text-sm sm:text-base` | `1rem / 1.625` | `font-normal leading-relaxed` | Beschreibungen, Absätze |
| **Caption / Meta** | `text-xs text-slate-500` | `0.75rem / 1.4` | `font-medium` | Datumsangaben, Hilfetexte |
| **Micro Tag** | `font-mono text-[10px]` | `0.625rem / 1` | `font-bold uppercase tracking-wider` | Status-Badges, Issuer-Tags |
| **Giant Background** | `footer-giant-bg-text` | `24vw / 0.75` | `font-black tracking-tighter` | 1px Stroke Konturschrift im Footer |

---

## 6. Spacing-, Grid- & Layout-System

### 6.1 Container & Vertikaler Rhythmus

- **Standard-Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Sticky Navbar:** Feste Höhe von `h-16` (64px) mit `fixed top-0 inset-x-0 z-50`.
- **Scroll-Padding:** Global verankert via `scroll-padding-top: 5rem`.
- **Sektions-Anker:** `scroll-mt-20` garantiert pixelgenaues Einrasten unterhalb der Navigation.
- **Sektionsabstand:** Standardmäßig `py-20` (80px) oder `py-24` (96px).

### 6.2 Z-Index Hierarchie

```text
z-[60]   — WCAG Skip-to-Content Link, Flyout Tooltips
z-50     — Fixed Navbar, ColdStartBanner, Modal Dialoge (ConfirmModal), Floating Chat Launcher
z-30     — Sticky Command Console Bar im Dashboard
z-10     — Hauptseiten-Inhalt (<main id="main-content">)
z-0      — Architektur-Grid-Hintergründe, Three.js Canvas, Ambient Illumination
```

---

## 7. Oberflächen, Texturen & Grids

### 7.1 Technische Grid-Muster

1. **Architectural Dot Grid (`.bg-architectural-grid`):**
   ```css
   .bg-architectural-grid {
     background-image: radial-gradient(rgba(99, 102, 241, 0.12) 1px, transparent 1px);
     background-size: 24px 24px;
   }
   .dark .bg-architectural-grid {
     background-image: radial-gradient(rgba(129, 140, 248, 0.14) 1px, transparent 1px);
     background-size: 24px 24px;
   }
   ```
2. **Technical Blueprint Grid (`.bg-blueprint-grid`):**
   ```css
   .bg-blueprint-grid {
     background-image:
       linear-gradient(to right, rgba(99, 102, 241, 0.06) 1px, transparent 1px),
       linear-gradient(to bottom, rgba(99, 102, 241, 0.06) 1px, transparent 1px);
     background-size: 24px 24px;
   }
   ```
3. **48px Coordinate Grid (Hero-Hintergrund):**
   ```tsx
   <div
     aria-hidden="true"
     className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:48px_48px]"
   />
   ```

### 7.2 Glassmorphism Primitives

```css
.glass-card {
  @apply bg-white/85 dark:bg-slate-900/65 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-2xl transition-all duration-300;
}
.glass-card-hover {
  @apply hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5;
}
.glass-nav {
  @apply bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80;
}
```

### 7.3 Dynamisches SVG Masking (`TrackIcon.tsx`)

Sorgt für pixelgenaue Einfärbung dynamisch geladener Fachbereichs-Icons synchron zur Textfarbe des Buttons:

```tsx
<span
  className="inline-block shrink-0 w-4 h-4"
  style={{
    maskImage: `url("${fullUrl}")`,
    WebkitMaskImage: `url("${fullUrl}")`,
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
    backgroundColor: 'currentColor',
  }}
  aria-hidden="true"
/>
```

---

## 8. Komponenten-Bibliothek & Design-Patterns

### 8.1 CVA Button-System (`frontend/src/components/ui/button.tsx`)

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 8.2 Taktile Action-Pills (Portfolio-Standard)

- **Abmessung:** `min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold`
- **Fokus:** `cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`
- **Primary Pill:** `bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-500/30 hover:bg-indigo-100`
- **Secondary Pill:** `bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70 hover:bg-slate-200/80`

### 8.3 GSAP Magnetic Button Primitive (`motion-footer.tsx`)

Interaktives Steuerelement mit echter 3D-Cursor-Verfolgung und Federrückstellung:

```tsx
// 3D-Tilt bei Cursor-Bewegung
gsap.to(element, {
  x: x * 0.4,
  y: y * 0.4,
  rotationX: -y * 0.15,
  rotationY: x * 0.15,
  scale: 1.05,
  ease: "power2.out",
  duration: 0.4,
});

// Elastischer Return beim Verlassen
gsap.to(element, {
  x: 0,
  y: 0,
  rotationX: 0,
  rotationY: 0,
  scale: 1,
  ease: "elastic.out(1, 0.3)",
  duration: 1.2,
});
```

### 8.4 Virtualisiertes Grid-Pattern (`CertificatesSection.tsx`)

Zur Bewältigung umfangreicher Zertifikatsbestände ohne DOM-Überlastung:
- **Engine:** `@tanstack/react-virtual` (`useWindowVirtualizer`).
- **Layout:** Dynamische 1-, 2- oder 3-Spalten-Berechnung basierend auf Container-Breite.
- **Scroll-Resilienz:** Feste `estimateSize`-Höhen verhindern Layout-Jitter beim Scrollen.

### 8.5 Kaltstart-Banner (`ColdStartBanner.tsx`)

Transparente Information über das Aufwachen des Render-Backends:
- **Verbindungsaufbau:** `bg-slate-900/95 border-indigo-500/30 text-slate-100`
- **Timeout (>30s):** `bg-amber-950/95 border-amber-500/40 text-amber-100` mit manuellem Retry-Button
- **Erfolg:** `bg-emerald-950/95 border-emerald-500/40 text-emerald-100` mit automatischem Ausblenden
- **ARIA:** `role="status" aria-live="polite" aria-atomic="true"`

### 8.6 RAG Portfolio-Copilot Chat-Widget (`PortfolioChatWidget.tsx`)

- **Floating Launcher:** Radarpulsierender Trigger (`animate-ping`) mit Live-Status-Dot.
- **Deep-Linking Zitate:** Klickbare Quell-Badges (`#project-<id>`, `#cert-<id>`), die zum Zielelement scrollen und dieses für **2200 ms** visuell hervorheben:
  ```typescript
  const highlightClasses = [
    'ring-2',
    'ring-cyan-400/80',
    'rounded-3xl',
    'transition-all',
    'duration-500',
    'shadow-xl',
    'shadow-indigo-500/20'
  ];
  ```
- **Thinking Wave:** Animierte 3-Dot Bouncing Wave (`animate-bounce` mit gestaffeltem Delay).

---

## 9. Admin-Dashboard & Command Console System

Das Dashboard (`DashboardPage.tsx`) nutzt eine fokussierte **Dark Cockpit Ästhetik** (`bg-slate-950 text-slate-100`), optimiert für administrative Übersicht und fehlerfreie Massenbearbeitung.

### 9.1 Sticky Command Console Header

- **Positionierung:** `sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/90`.
- **Rückkehr-Pill:** Haptischer Back-Link zum Portfolio mit Pfeil-Translation (`group-hover:-translate-x-0.5`).
- **Metriken-Chips:** Live-Anzeige von `pendingCount` und Veröffentlichungsquote (`publishedCertRatio`) in Monospace-Badges.

### 9.2 Segmentierte Status-Pill Filter

In `CertificateManager.tsx`:
- **Alle:** `bg-indigo-600 text-white` (Aktiv) vs. `text-slate-400 hover:text-white`
- **Veröffentlicht:** `bg-emerald-600 text-white` mit `CheckCircle2`
- **Entwürfe:** `bg-amber-600 text-white` mit `EyeOff`
- **Unvollständig (Prüfbedarf):** `bg-rose-600 text-white` mit `AlertCircle`

### 9.3 Sicherheits- & Löschdialoge (`ConfirmModal.tsx`)

- **Backdrop:** `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200`.
- **Container:** `rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200`.
- **Destruktiver Button:** `bg-red-600 hover:bg-red-500 text-white shadow-red-600/20`.
- **Tastatur:** Automatischer Abbruch bei `Escape`.

---

## 10. Motion Design, Animationen & Interaktionsphysik

1. **Zweckgebundenheit:** Animationen dienen ausschließlich der visuellen Hierarchie, Orientierung und Bestätigung.
2. **Keyframe-Definitionen (`index.css` & `motion-footer.tsx`):**
   - `.animate-float`: 6s sanftes Schweben (`translateY(-8px)`)
   - `.animate-pulse-slow`: 8s Atmen für Umgebungslicht
   - `.animate-footer-scroll-marquee`: 40s linearer Endlos-Slider
   - `.animate-footer-heartbeat`: 2s rhythmischer Puls mit OKLCH Drop-Shadow
3. **Framer Motion Choreografie:**
   - Hero Entrance: `staggerChildren: 0.08`, `ease: [0.22, 1, 0.36, 1]`

---

## 11. Barrierefreiheit (Accessibility / WCAG 2.2 AA)

1. **Skip-to-Content Link:**
   Vor der Navbar platziert:
   ```tsx
   <a
     href="#main-content"
     className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-indigo-600 focus:text-white focus:font-semibold focus:text-xs focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
   >
     Direkt zum Hauptinhalt springen
   </a>
   ```
2. **Tastatur-Fokusindikator (`:focus-visible`):**
   Global in `index.css`:
   ```css
   :focus-visible {
     outline: 2px solid #6366f1;
     outline-offset: 2px;
   }
   ```
3. **Prefers-Reduced-Motion Reset:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
     .animate-float, .animate-pulse-slow {
       animation: none !important;
     }
   }
   ```
4. **Touch-Flächen & Kontraste:**
   - Mindestgröße interaktiver Elemente: $\ge 38 \times 38\text{px}$ (Formular-Buttons $44 \times 44\text{px}$).
   - Textkontrast $\ge 7:1$ für Haupttexte, $\ge 4.5:1$ für Sekundärtexte.

---

## 12. Legacy-Token Debt & Migrations-Matrix

Im Codebase verbliebene Klassen aus älteren Konfigurationen sind schrittweise wie folgt zu substituieren:

| Veraltete Legacy-Klasse | Kanonischer Ersatz | Erläuterung |
|---|---|---|
| `text-text-primary` | `text-slate-900 dark:text-white` oder `text-foreground` | Primäre Überschriften & Text |
| `text-text-secondary` | `text-slate-600 dark:text-slate-400` oder `text-muted-foreground` | Sekundärer Fließtext & Sublines |
| `bg-surface` | `bg-white dark:bg-slate-900/65` oder `bg-card` | Karten- und Panel-Hintergründe |
| `hover:bg-surface-hover` | `hover:bg-slate-100 dark:hover:bg-slate-800/90` | Hover-Flächen |
| `bg-accent-primary` | `bg-indigo-600 hover:bg-indigo-700` | Primärer Brand-Call-to-Action |
| `bg-accent-secondary` | `bg-cyan-500` oder `bg-indigo-400` | Sekundäre Akzente & Glows |

---

## 13. Engineering-Leitfaden & UI-Checkliste

### 13.1 Pre-Merge Checkliste für UI-Pull-Requests

- [ ] Sieht die Komponente sowohl im **Light-Mode** als auch im **Dark-Mode** einwandfrei aus?
- [ ] Wurde das Verhalten auf Mobile (375px), Tablet (768px) und Desktop (1280px) geprüft?
- [ ] Funktioniert die vollständige Bedienung rein per **Tastatur (Tab, Enter, Space, Escape)**?
- [ ] Ist der sichtbare Fokusindikator (`:focus-visible`) auf allen Elementen vorhanden?
- [ ] Werden alle Animationen bei aktiviertem `prefers-reduced-motion` minimiert oder deaktiviert?
- [ ] Wurden alle Strings in `frontend/src/locales/de.json` und `en.json` gepflegt?
- [ ] Werden keine harten Pixel-Breiten verwendet, sondern standardisierte Container (`max-w-7xl`)?
