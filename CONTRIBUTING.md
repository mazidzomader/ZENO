# ZENO — Design System & Style Guide

## Core Philosophy

ZENO is infrastructure, not software-as-a-service. The UI should feel like an architectural blueprint, an industrial dashboard, or a precision print-ticketing system: heavily structured, typography-driven, and deliberately opposed to modern "SaaS" conventions — no bounce, no glow, no glassmorphism.

This document is the single source of truth for the visual identity of the ZENO MERN stack application. All frontend components must adhere to these constraints.

---

## 1. Color Palette

The palette mimics physical materials: drafting paper, harsh printer ink, and industrial safety indicators.

**Strict rules:** no gradients, no background alpha/opacity, no high-saturation neon colors.

| Swatch | Token | Hex | Role |
| ------ | ----------- | --------- | ---------------------------------- |
| ![](https://placehold.co/24x24/EAE8E3/EAE8E3.png) | `bgBase` | `#EAE8E3` | Base — industrial drafting paper |
| ![](https://placehold.co/24x24/DFDDD6/DFDDD6.png) | `bgAlt` | `#DFDDD6` | Darker zone / secondary surface |
| ![](https://placehold.co/24x24/111111/111111.png) | `ink` | `#111111` | Primary text & lines — harsh black |
| ![](https://placehold.co/24x24/555555/555555.png) | `inkMuted` | `#555555` | Secondary / muted text |
| ![](https://placehold.co/24x24/DDA15E/DDA15E.png) | `highlight` | `#DDA15E` | Ochre — accent / active state |
---

## 2. Typography

| Font              | Used for                                                    | CSS class      |
| ------------------ | ------------------------------------------------------------ | -------------- |
| **Inter**          | Body text, paragraphs, forms, general UI                    | `font-sans`    |
| **Space Grotesk**  | Headlines, logo, section titles, display typography          | `font-display` |
| **JetBrains Mono** | Data, labels, navigation, system/status text, technical UI   | `font-mono`    |

---

## 3. UI Components & Geometry

All UI elements follow flat, drafting-style geometry.

- **Corners (border radius):** `0px` everywhere. `rounded-none` is mandatory — every corner is a sharp 90°.
- **Shadows:** none. Elements are grounded, not floating. No `box-shadow` anywhere.
- **Borders:** solid `1px`, `2px`, or `4px` borders (`border-ink`) separate every element. Use borders and visible grid lines to define structure instead of relying on whitespace.
- **Forms & inputs:** plain rectangles with `1px`/`2px` solid borders. Background is transparent or `bg-bgBase`. On focus, the border color changes (e.g., to `ink` or `highlight`) — never a glow or blur ring.

---

## 4. Layout & Structure

- **Grid over whitespace:** embrace hard lines. Use dividing borders between columns, rows, and sections instead of invisible margins.
- **Asymmetry:** favor asymmetrical splits (e.g., a 30% sidebar next to a 70% content area, separated by a hard 2px border).
- **Tabular data:** use dense, well-structured tables for lists (slots, booking history, users) rather than generic stacks of floating cards.

---

## 5. Motion & Animation

Animation should read as mechanical state change, data processing, or precise tracking — never as decoration.

- **Timing:** quick, linear, and precise. Avoid spring/bounce easing; use `linear` or `step-start` timing functions.
- **Blinking:** sharp on/off toggles (like a server light) for live indicators, e.g. `animate-blink-fast`.
- **Scanlines:** linear translations to mimic scanning or processing.
- **State changes:** e.g., when a parking spot flips from "Available" to "Booked," the color swaps instantly — no crossfade.

---

## 6. Media & Iconography

- **No emojis, anywhere.** Use text statuses instead (e.g., `[SYS_OK]`).
- **Icons:** sharp, monochromatic, line-based vector icons (Lucide or Phosphor). Icons match `text-ink` exactly and are never placed inside colored circles or bubbles.

---

## 7. Tailwind Configuration

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgBase: '#EAE8E3',      // Industrial drafting paper
        bgAlt: '#DFDDD6',       // Darker zone
        ink: '#111111',         // Harsh black
        inkMuted: '#555555',    // Secondary data text
        alert: '#C34222',       // Rust / alert red
        safe: '#3A5A40',        // Muted industrial green
        highlight: '#DDA15E',   // Ochre warning / active
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderWidth: {
        DEFAULT: '1px',
        '2': '2px',
        '4': '4px',
      },
      boxShadow: {
        none: 'none', // Enforce no shadows
      },
    },
  },
  plugins: [],
}
```

