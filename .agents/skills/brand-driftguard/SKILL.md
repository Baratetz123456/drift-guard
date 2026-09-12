---
name: brand-driftguard
description: >-
  Standard branding specifications, visual identity guidelines, SVG logo geometry,
  color tokens, and media standards for DriftGuard.
---

# DriftGuard Brand & Visual Design System (brand-driftguard)

DriftGuard is an enterprise desktop verification instrument designed for network operations centers (NOC) and network engineering teams. It embodies a calm, high-contrast, technical aerospace/flight-instrument aesthetic.

---

## 1. Core Brand Identity

- **Product Name**: `DriftGuard` (Sentence case in all UI copy, documentation, and metadata; NEVER ALL-CAPS).
- **Tagline**: `"Before. After. Understood."`
- **Tagline Presentation Rule**:
  - The tagline MUST be presented as an electric Voltage pill badge or sub-anchor.
  - It MUST NEVER be duplicated verbatim as the main `<h2>` page headline. Page titles must feature an operational, risk-focused headline in sentence case (e.g., *"Zero blind spots during production network changes"*).

---

## 2. "The Converged Trace" Logo Vector Geometry

The official DriftGuard mark is defined on a **24×24 coordinate grid** and consists of four geometric layers:

| Layer | SVG Element | Geometry / Coordinates | Stroke / Fill |
| :--- | :--- | :--- | :--- |
| **1. Geometric Shield** | `<path>` | `d="M4 3.5C4 3.5 12 2.5 12 2.5C12 2.5 20 3.5 20 3.5C20.5 3.5 21 3.9 21 4.5V13C21 17.5 16.8 20.8 12 22C7.2 20.8 3 17.5 3 13V4.5C3 3.9 3.5 3.5 4 3.5Z"` | Stroke: `#64748B` (Slate-500), width: `1.8`–`2.0` |
| **2. Baseline Trace** | `<line>` | `x1="6" y1="14" x2="18" y2="14"` | Stroke: `#94A3B8` (Slate-400), width: `1.8`–`2.0` |
| **3. Converged Trace** | `<path>` | `d="M6 14C8 14 9 8 12 8C14 8 14.8 12.5 16 14"` | Stroke: `#C8FF00` (Voltage Lime), width: `2.0` |
| **4. Catch-Point Node** | `<circle>` | `cx="16" cy="14" r="1.6"` | Fill: `#C8FF00` (Voltage Lime) |

### Strict Logo Prohibitions
- **Zero-Delta Law**: Strictly ZERO delta ($\Delta$), triangle, or chevron motifs anywhere in the brand identity or iconography.
- **Single Source of Truth**: UI components MUST import `<BrandLogo />` from `frontend/src/components/common/BrandLogo.tsx`.

---

## 3. Color Token Hierarchy

- **Brand Accent — Voltage (`#c8ff00`)**:
  - Used for branding badges, primary buttons, active navigation items, verified status indicators, and diff additions.
  - **Dark Text Rule**: Any text rendered on a `#c8ff00` background surface MUST always be pure dark (`text-zinc-950 font-bold` or `text-slate-950 font-bold`).
  - **Surface Density**: Keep pure Voltage surface coverage under 10% on any screen.
  - **Light Mode Adaptation**: In light mode, pure `#c8ff00` is illegal for text or thin strokes; use `#4d7c0f` (Lime-700).
- **Zero-Emerald Law**:
  - Emerald and standard greens are completely eliminated from the design system.
  - Verified and success states are unified with Voltage (`#c8ff00`).
  - Diff additions use `bg-[#c8ff00]/10 text-[#c8ff00]`.
- **Canvas & Backgrounds**:
  - Deep obsidian dark mode: `slate-950` (`#020617`) and `zinc-950` (`#09090b`).
  - Panels & Cards: `slate-900/60` and `zinc-900/60` with subtle border `zinc-800`.

---

## 4. Banners & Showcase Media Standards

1. **Repository Hero Banners**:
   - Stored under `docs/assets/driftguard-banner.svg` and `docs/assets/driftguard-banner.png`.
   - MUST render the exact 4-layer vector geometry of "The Converged Trace", the bold white logotype, `v1.2` badge, and Voltage tagline pill against `slate-950` with subtle circuit telemetry lines.
2. **Borderless Background-Blended Animation Standard**:
   - Showcase animations MUST NOT be wrapped in borders, cards, or boxed containers with contrasting background rectangles.
   - Animations MUST render transparently and blend natively into `slate-950`.
   - External JSON animation engines (e.g. DotLottie) are prohibited in favor of native HTML5 Canvas or SVG.
   - Drifting text or diff tokens must use dark backdrop pills behind node labels to preserve 100% legibility.
3. **Documentation Visual Standards (Zero-Mermaid Law)**:
   - Public documentation MUST NOT use Mermaid text code blocks.
   - All architecture and workflow diagrams MUST be generated as high-resolution visual assets stored under `docs/assets/diagrams/`.
   - Diagrams MUST follow the **Dark Technical Blueprint** theme (`slate-950` canvas with `#c8ff00` directional signal traces) and incorporate official service logos (AWS, Cisco).

---

## 5. Typography & Voice

- **Fonts**: Inter (UI / Headings / Subtitles) and JetBrains Mono (Code / Hostnames / Telemetry / Tagline pill).
- **Sentence Case**: All headings, sub-headings, table headers, badges, and button labels MUST use sentence case.
- **Senior Engineer Tone**: Calm, precise, directly technical, zero exclamation marks (`!`), zero emojis, and zero operator blame.

---

## 6. Layout Geometry & Navigation Component Invariants

### 1. Viewport & Detail Container Standards
- Main page containers use `w-full space-y-6 font-sans` without artificial horizontal max-width constraints.
- When displaying device or entity profiles:
  - **Top**: Breadcrumb navigation with `<Link>` and `<CaretRight />` separators.
  - **Header**: Entity title in sentence/monospace font, verified status badge, driver badge, and operational action buttons (`Run collection`, `Test Connection`, `Delete`).
  - **Telemetry Row**: 4 summary cards (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`) displaying Reachability, Driver & Transport, Topology Groups, and Snapshot Vault activity with direct drill-down links.
  - **Body**: Full-width form/configuration cards using `bg-zinc-900/60 border-zinc-800`.

### 2. Navigation Cleanliness & Zero-Badge-Count Invariant
- Navigation tabs and sidebar links must convey clear information architecture without noisy counter badges.
- Tab buttons follow the flat monochrome styling:
  - Active: `bg-[#c8ff00] text-zinc-950 font-bold shadow-sm`
  - Inactive: `text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50`
  - No counter pills inside the tab button.

