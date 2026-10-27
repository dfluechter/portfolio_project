# Design System Master Specification — Dominik Flüchter Portfolio

> **LOGIC:** When building or refactoring a specific page, first check `design-system/dominik-fluechter-portfolio/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the global tokens, accessibility rules, and component specifications below.

---

**Project:** Dominik Flüchter — Full-Stack Engineering & Cloud Architecture Portfolio
**Aesthetic Direction:** Minimalism & Swiss Style ("Precision Systems Architecture")
**Stack:** React 19 · TypeScript 7.x · Tailwind CSS v4 · Framer Motion · TanStack Query v5
**Accessibility Target:** WCAG 2.2 AA Compliant

---

## 1. Design Token Architecture (Dual-Theme: Light & Dark)

### 1.1 Semantic Color Tokens

| Semantic Token | Light Mode (Tailwind / Hex) | Dark Mode (Tailwind / Hex) | Contrast Ratio | Usage |
|----------------|-----------------------------|----------------------------|----------------|-------|
| `--surface-canvas` | `slate-50` (`#F8FAFC`) | `slate-950` (`#020617`) | Base | Primary page canvas |
| `--surface-section-alt` | `white` (`#FFFFFF`) | `slate-950` (`#020617`) | Base | Alternating section surface |
| `--surface-card` | `white` (`#FFFFFF`) | `slate-900/60` (`#0F172A`) | Elevated | Project, Skill, Certificate & Timeline cards |
| `--surface-subtle` | `slate-100` (`#F1F5F9`) | `slate-900` (`#0F172A`) | Subtle | Filter bars, metadata headers, code badges |
| `--text-primary` | `slate-900` (`#0F172A`) | `slate-100` (`#F1F5F9`) | > 15:1 (AAA) | Headings, primary copy, card titles |
| `--text-secondary` | `slate-600` (`#475569`) | `slate-300` (`#CBD5E1`) | > 7:1 (AAA) | Body descriptions, navigation links |
| `--text-muted` | `slate-500` (`#64748B`) | `slate-400` (`#94A3B8`) | ≥ 4.6:1 (AA) | Monospace indices, timestamps, helper labels |
| `--accent-primary` | `indigo-600` (`#4F46E5`) | `indigo-400` (`#818CF8`) | ≥ 4.8:1 (AA) | Primary interactive accent, active filter state, focus ring |
| `--accent-secondary` | `sky-600` (`#0284C7`) | `sky-400` (`#38BDF8`) | ≥ 4.5:1 (AA) | Secondary technical highlight & deep-link ring |
| `--status-verified` | `emerald-600` (`#059669`) | `emerald-400` (`#34D399`) | ≥ 4.5:1 (AA) | Verified credentials, live availability indicator |
| `--status-danger` | `red-600` (`#DC2626`) | `red-400` (`#F87171`) | ≥ 4.5:1 (AA) | Destructive actions, form validation errors |
| `--border-hairline` | `slate-200/80` (`#E2E8F0`) | `slate-800/80` (`#1E293B`) | Structural | Swiss grid dividers, card borders |
| `--focus-ring` | `indigo-500` (`#6366F1`) | `indigo-400` (`#818CF8`) | 2px solid + 2px offset | Keyboard `:focus-visible` indicator |

### 1.2 Typography & Vertical Rhythm

- **Primary Sans (`font-sans`):** System UI / Geometric Sans (`Archivo` / `Inter` / `-apple-system`) for high legibility and zero CLS font-swap jank.
- **Technical Monospace (`font-mono`):** Used strictly for:
  - Section indices (`01 // Technical Proficiency`, `02 // System Implementations`, `03 // Credentials & Verification`, `04 // Career Chronology`, `05 // Direct Communication`)
  - Credential IDs, SHA-256 hashes, proficiency percentages (`95%`), and keyboard shortcuts (`ESC`).
- **Typographic Scale:**
  - **Hero Display (`h1`):** `text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08]`
  - **Section Heading (`h2`):** `text-3xl sm:text-4xl font-extrabold tracking-tight`
  - **Card Title (`h3`):** `text-base sm:text-lg font-bold tracking-tight`
  - **Body Copy:** `text-sm sm:text-base leading-relaxed` (minimum line-height `1.5`)
  - **Technical Metadata / Badges:** `text-[11px] font-mono uppercase tracking-wider whitespace-nowrap`

### 1.3 Spacing & Swiss Grid System

- **Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Section Vertical Rhythm:** `py-20` with `border-t border-slate-200 dark:border-slate-800/80` hairline separation
- **Background Textures:**
  - `.bg-architectural-grid`: 24×24px radial dot matrix (`rgba(99, 102, 241, 0.12)`)
  - `.bg-blueprint-grid`: 24×24px orthogonal line grid (`rgba(99, 102, 241, 0.06)`)

---

## 2. Atomic Component Hierarchy

1. **Atoms:**
   - **Section Eyebrow Index:** Monospace index (`01 // ...`) + decorative SVG icon (`aria-hidden="true"`) + contextual count.
   - **Compact Filter Chip / Badge:** Single-line (`whitespace-nowrap`), `cursor-pointer`, explicit `aria-pressed` or `aria-label`, minimum touch comfort.
   - **Segmented Proficiency Bar:** 100% width bar with 25%/50%/75% tick markers and `role="progressbar"`.
   - **ThemeToggle:** Accessible icon button (`aria-label="Design-Modus umschalten"`, `cursor-pointer`, smooth 200ms border/color transition without layout-shifting scale).
2. **Molecules:**
   - **HeroSearch Command Bar:** Instant client-side omnibox (`useDeferredValue`) with keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) and `role="listbox"` / `role="option"`.
   - **SectionEmptyState:** Constructive zero-results state with one-click filter reset (`Suchfilter zurücksetzen`).
   - **ChatSourceBadges:** Deep-linking citation chips inside `PortfolioChatWidget` that scroll to `#project-{id}` or `#cert-{id}` and apply a temporary highlight ring.
3. **Organisms:**
   - **Navbar:** Fixed top architectural bar (`h-16`) with responsive mobile drawer (`aria-expanded`, `aria-controls="mobile-menu"`, `min-h-[44px]` touch targets).
   - **Hero:** System status banner + headline + `HeroSearch` + 3-column Architecture Specification Matrix (`01 / Backend Core`, `02 / Reactive Client`, `03 / Quality & Security`).
   - **SkillsSection (`01`):** Category filter bar + segmented skill cards (`Top Skill` badge for ≥90%).
   - **ProjectsSection (`02`):** Blueprint/media header (`h-40`) + technology stack chips + GitHub/Live links.
   - **CertificatesSection (`03`):** Search + Issuer filter + M2M Track filter chips + `useWindowVirtualizer` grid + live status count (`role="status" aria-atomic="true"`).
   - **TimelineSection (`04`):** Vertical engineering chronology with active status indicator (`Heute (Laufend)` vs. `Abgeschlossen`).
   - **ContactSection (`05`) & Footer:** Direct communication channels + system stack summary.

---

## 3. Accessibility & Inclusive Design Rules (WCAG 2.2 AA)

1. **Keyboard Navigation & Focus Management:**
   - Global `:focus-visible` outline (`2px solid #6366f1`, `outline-offset: 2px`) must never be removed without an explicit high-contrast replacement (`focus-visible:ring-2`).
   - Modals (`CertificateEditModal`, `PortfolioChatWidget`) support keyboard interaction and explicit ARIA labeling (`role="dialog"`, `aria-modal="true"`).
2. **Touch Targets & Pointer Affordance:**
   - Every interactive `<button>` and `<a>` must have `cursor-pointer`.
   - Mobile navigation links and primary action buttons maintain a minimum hit target height of `44px` (`min-h-[44px]`).
3. **Screen Reader & Live Region Discipline:**
   - Decorative icons next to text labels must have `aria-hidden="true"`.
   - Icon-only buttons must have an explicit descriptive `aria-label`.
   - Dynamic filter counters use `<span role="status" aria-atomic="true">` to announce contextual updates without stealing focus.
4. **Motion & Cognitive Accessibility:**
   - `@media (prefers-reduced-motion: reduce)` disables all infinite animations (`.animate-float`, `.animate-pulse-slow`) and collapses transition durations.

---

## 4. Forbidden Anti-Patterns

- ❌ **No blurred neon AI purple/pink gradients** (`from-indigo-500 via-violet-500 to-pink-500 blur-3xl`)
- ❌ **No emojis as UI icons** — use Lucide SVG icons consistently
- ❌ **No layout-shifting hover scale transforms** (`hover:scale-105`) on navigation or toolbar controls
- ❌ **No wrapping compact badge labels** — always apply `whitespace-nowrap` on filter chips and status pills
- ❌ **No hardcoded background-size hacks** on full cards

---

## 5. Pre-Delivery Verification Checklist

- [x] No emojis used as icons (all SVG via `lucide-react`)
- [x] `cursor-pointer` on all interactive buttons, chips, and links
- [x] Decorative icons marked with `aria-hidden="true"`
- [x] Hover states use smooth 150–250ms color/border/elevation transitions
- [x] Light & Dark mode contrast ≥ 4.5:1 across all text and badges
- [x] `:focus-visible` states clearly visible for keyboard navigation
- [x] `prefers-reduced-motion: reduce` respected in `index.css`
- [x] Zero linter errors (`npm run lint`), clean TypeScript build (`npm run build`), 100% unit/integration test pass (`npx vitest run`)
