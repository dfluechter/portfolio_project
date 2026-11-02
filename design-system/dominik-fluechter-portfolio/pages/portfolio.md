# Portfolio Page Overrides — Precision Systems Architecture (UI/UX Pro Max)

> **PROJECT:** Dominik Flüchter Portfolio
> **Generated:** 2026-11-02
> **Page Type:** Portfolio Landing Page (`PortfolioPage.tsx`)
> **Aesthetic Direction:** Swiss Precision Architecture + Modular Bento Grid (`bento-box-grid` & `minimalism-and-swiss-style`)
> **Stack:** React 19 · TypeScript 7.x · Tailwind CSS v4 · Framer Motion · TanStack Virtual

> ⚠️ **IMPORTANT:** Rules in this file **override** or refine the Master file (`design-system/dominik-fluechter-portfolio/MASTER.md`) for the main portfolio route (`/`).

---

## 1. Page-Specific Architecture & Layout Rules

### 1.1 Scroll & Focus Not Obscured (WCAG 2.2 AA `2.4.11`)
- **Scroll Padding:** `html` and all `<section id="...">` elements use `scroll-mt-20` (`scroll-padding-top: 5rem`) so that anchor jumps (`#about`, `#skills`, `#projects`, `#certificates`, `#timeline`, `#contact`) and keyboard focus are never obscured by the fixed `h-16` (`64px`) `Navbar`.
- **Skip-to-Content Link:** `PortfolioPage` provides a screen-reader and keyboard-accessible Skip Link (`#main-content`) that becomes visible on `:focus-visible`.

### 1.2 Hero Section (`#about`) — Command Center & Architecture Matrix
- **Asymmetric 12-Column Swiss Split:**
  - **Left Column (`lg:col-span-7`):** Live system telemetry status pill (`00 // SYSTEM ONLINE`), high-contrast geometric display heading (`h1`), concise value proposition (`max-w-2xl`), interactive `HeroSearch` Omnibox with quick-filter suggestions, and primary/secondary CTAs with `min-h-[44px]` touch targets.
  - **Right Column (`lg:col-span-5`):** Interactive Architecture Showcase Frame with mode switcher (`Visualisierung` vs. `Live-Terminal`) and hardware-inspired telemetry header.
- **3-Column Architecture Specification Matrix:**
  - Hairline-divided (`divide-y md:divide-y-0 md:divide-x`) specification ledger with numbered indices (`01 // Backend Core`, `02 // Reactive Client`, `03 // Quality & Security`), interactive hover elevation, and technical stack tags.

### 1.3 Skills Section (`#skills` — `01 // Technical Proficiency`)
- **Segmented Proficiency Bars (MASTER.md §2.1):**
  - Every skill card renders a 100% width progress bar (`role="progressbar"`) with explicit `25%`, `50%`, and `75%` architectural tick markers overlaid on the track.
- **Category Filter Bar:**
  - Filter buttons maintain `whitespace-nowrap`, `cursor-pointer`, `aria-pressed`, and category item counts.

### 1.4 Projects Section (`#projects` — `02 // System Implementations`)
- **Architectural Blueprint Cards:**
  - Numbered project index (`PRJ-01`, `PRJ-02`, ...), blueprint grid header with status indicator (`PRODUCTION` / `VERIFIED`), tech stack badges (`whitespace-nowrap`), and clear action bar (`Code` & `Live Demo`) with `min-h-[38px]` / `cursor-pointer`.

### 1.5 Certificates Section (`#certificates` — `03 // Credentials & Verification`)
- **Unified Filter & Telemetry Console:**
  - Combines full-text search, issuer filter pills, and M2M Learning Path (`Track`) filter chips with live result counters (`role="status" aria-atomic="true"`).
- **Virtualized Swiss Credential Grid:**
  - Preserves `useWindowVirtualizer` for > 6 items while rendering crisp credential cards with issuer badge, date, monospace credential ID, interactive track pills, and verification links.

### 1.6 Timeline Section (`#timeline` — `04 // Career Chronology`)
- **Precision Engineering Chronology:**
  - Vertical hairline axis with illuminated node markers, monospace date ranges, current status badge (`Heute (Laufend)`), and structured organization/location metadata.

### 1.7 Contact Section (`#contact` — `05 // Direct Communication`)
- **Direct Communication Ledger:**
  - 12-column split with editorial copy + availability status card on the left, and a structured 3-row interactive ledger (Email with 1-click Copy & Open, GitHub repository link, and Location with dark-mode-adapted map preview) on the right.

---

## 2. Verification & Quality Gates
- Zero emojis as UI icons (strictly `lucide-react` SVGs with `aria-hidden="true"`).
- `prefers-reduced-motion: reduce` disables infinite animations and collapses transitions.
- Full bilingual support (`de` / `en`) via `react-i18next`.
