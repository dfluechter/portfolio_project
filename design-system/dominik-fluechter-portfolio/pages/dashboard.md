# Dashboard Page Overrides — Swiss Operations Command Center

> **PROJECT:** Dominik Fluechter Portfolio
> **Updated:** 2026-11-02
> **Page Type:** Admin Operations Console / Data Telemetry View

> ⚠️ **IMPORTANT:** Rules in this file **override** the Master file (`design-system/dominik-fluechter-portfolio/MASTER.md`).

---

## 1. Architectural Vision: Swiss Operations Console

The Admin Dashboard is designed as a high-density, low-noise **Engineering Operations Console** inspired by Linear, Vercel, and Raycast:
- **Canvas:** Deep Slate (`#020617` / `bg-slate-950`) with subtle structural hairline grid (`bg-grid-pattern`) and ambient top-center indigo illumination.
- **Surfaces:** Layered translucent slate panels (`bg-slate-900/80 backdrop-blur-md`) with crisp `1px` borders (`border-slate-800/90`) and subtle top-edge highlights.
- **Typography:** `Plus Jakarta Sans` for scannable headings and table rows, paired with `JetBrains Mono` for telemetry codes (`KPI-01`, `MOD-01`, hashes, dates, S3 keys, and counters).

---

## 2. Layout & Component Architecture

1. **Command Header (`z-30 sticky top-0`):**
   - Displays operational status badge (`SYS.OPS // LIVE`), infrastructure health pills (`NEON PG`, `SUPABASE S3`), portfolio return link, and session logout control.
2. **Interactive Telemetry Bento Grid (4 Columns):**
   - Each KPI card includes:
     - Monospace telemetry ID (`KPI-01` .. `KPI-04`)
     - Large tabular numeric readout (`tabular-nums`)
     - Segmented micro-progress bar showing ratio/health (e.g., Published % or Review Queue load)
     - Direct click-to-navigate interaction to jump to the corresponding workspace module.
3. **Segmented Workspace Switcher (`MOD-01` .. `MOD-03`):**
   - Tactile pill navigation with monospace indices, live item counters, and active module metadata bar.
4. **Data Tables & Review Split-Panes:**
   - High-contrast status pills (`Emerald` for S3 Published, `Amber` for Incomplete/Pending, `Slate` for Draft).
   - Minimum `38px–44px` interactive hit targets with explicit `:focus-visible` rings and `cursor-pointer`.
   - Z-index scale strictly bounded to `z-10`, `z-20`, `z-30`, `z-40`, `z-50`.
