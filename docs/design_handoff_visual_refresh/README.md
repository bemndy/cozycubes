# Handoff: CozyCubes Visual Refresh

## Overview
Cosmetic-only UI refresh for the CozyCubes speedcubing timer. Ports 7 visual changes from the HTML mockups (`CozyCubes.dc.html`, options **4a** and **2a**) into the real app. No timer, scrambler, or data logic should change — this is presentation-layer only.

## About the design file
`CozyCubes.dc.html` in this bundle is an **HTML design reference** — a stack of mockup options (ids like `4a`, `2a`), not a codebase to copy wholesale. Recreate the look described below inside the app's existing real stack and component structure.

## Fidelity
High-fidelity for color, gradient construction, type, and the ASCII boot animation (port that algorithm directly). The "good/bad solve" thresholds and light-theme surface colors below are proposed defaults — tune to the app's real data and taste.

## Do NOT touch
The solve history / all-time list ("library"/directory). Its current implementation and styling in the live app stay exactly as they are. None of the 7 changes below apply to it.

## Changes to implement

### 1. Solve metrics placement + good/bad indicator
Keep the current stat layout — metrics already sit below the scramble + timer, no reflow needed. Add a small filled square (8×8px) next to each time in the stats/recent-times readout flagging solve quality: bright accent fill = good solve, dimmed/gray = average, low-opacity warning tone = DNF/+2. Wire the actual good/bad rule to whatever comparison the app already has (e.g. vs. session average or PB) — this is a visual flag, not new business logic.

### 2. `>` prefix on the scramble line
Prefix the scramble string with `>` in the accent color, scramble text in muted white, both in the mono technical font — e.g. `> R2 U' F2 L2 D F2 R2 B2 U2 L' B U2 L' F' R' D' B2 R'`.

### 3. ASCII boot loader on first load
Before the app is usable, show a full-screen centered ASCII-art rotating 3D wireframe cube (rendered as characters, not an image) with "press any key" beneath it, pulsing in opacity. Any keydown or click dismisses it: it fades + scales up slightly (opacity 1→0, scale 1→1.08, ~0.7s ease) while the real UI fades + slides up into place (opacity 0→1, translateY 16px→0, ~0.8s ease, ~0.1s delay).

Rendering approach — port faithfully; a full working version is in `CozyCubes.dc.html`'s logic class, method `stepCube()`:
- Rotation angle increments every frame (~80ms tick), plus a periodic "speed boost" pulse every ~65 ticks that decays (a solve flourish).
- Build cube vertices + edges + a few internal grid lines (it's a 3×3×3, not a plain box) in 3D, rotate on two axes, apply simple perspective projection to 2D.
- Plot into a character grid (~46×22): edges as `#`, vertices as `@`, grid lines shaded by depth using ramp string `.:-=+*#%` (nearer = denser character).
- Render the grid as a `<pre>` in the mono technical font.

### 4. Floating header + footer, icon-only controls
Header and footer become inset floating glass pills (not edge-to-edge): centered horizontally, ~24px inset from the top/bottom edge, `backdrop-filter: blur(50px) saturate(180%)`, translucent fill, 16px border-radius, a 1.5px hairline border (thicker/higher-contrast than a standard 1px hairline), soft drop shadow. All footer toggles (inspection time, sound, hints, theme, etc.) become icon-only glyphs, no text labels — simple line-drawn glyphs (circle-with-tick, play-triangle, diamond outline, half-filled circle for theme switch). Hover/active state = opacity/color shift only (e.g. 30%→100%), never a background fill or box.

### 5. Theme system: dark (default) + light
Keep the current OLED-black theme as default. Add a light theme:
- Background: warm off-white surface (proposed `oklch(97% 0.01 80)`) instead of `#000`.
- Text: near-black ink (proposed `rgba(20,16,14,.9)`) instead of white, same opacity-based hierarchy.
- Glass panels: lighter translucent fill (proposed `rgba(255,255,255,.55)`) with a darker hairline border (proposed `rgba(0,0,0,.14)`) instead of a white one.
- Background gradient blobs: same fall-palette hues, lower alpha (~.28–.35 vs ~.55–.6), normal blend mode instead of `plus-lighter` (which blows out on a light surface).
- Vignette: soft warm-white fade instead of black.
Starting values, not final — adjust for contrast once live.

### 6. (see "Do NOT touch" above)

### 7. Background + color system: match mockup `4a`; pixel accents + palette from `2a`
Background technique = mesh gradient (`4a`): 6–7 large blurred radial blobs in the fall palette, each independently drifting (slow position + scale wobble, 26–42s ease-in-out, alternating), blended with `mix-blend-mode: plus-lighter` over black, plus a radial vignette (`transparent` center ~34% → `rgba(0,0,0,.62)` at 88%) so the UI stays legible. A few near-invisible hex byte pairs (mono font, ~7% white) in the far corners add texture.

Palette (OKLCH, fall/urban-indie): hot pink `oklch(70% 0.22 350)`, peach `oklch(82% 0.15 80)`, terracotta `oklch(80% 0.13 55)`, amber `oklch(64% 0.15 38)`, supporting tones `oklch(78% 0.15 65)`, `oklch(58% 0.14 30)`, `oklch(75% 0.17 40)` light pink `oklch(90% 0.13 370)`.

Also considering creating a more black and white theme, dark theme with white border thick elements, and a light theme with black border thick elements. And a loader inspired color theme.

Pixel-art accents from `2a`: small decorative 3×3 pixel-dot clusters (amber, ~18% opacity) tucked in UI corners, and a monospace "3³"-style glyph mark next to the wordmark.

## Typography
- **Arial, 400 weight** — all primary UI chrome and the hero timer digits. Elegance comes from scale, tight letter-spacing, and opacity variation, not weight changes.
- **JetBrains Mono** — scramble text, stat values, the ASCII boot art, any technical/data readout. Google Fonts: `family=JetBrains+Mono:wght@400;500`.

## Design tokens
- Header height 56px · Footer height 52px · Floating inset from edge 24px · Panel radius 16px
- Glass panel (dark): `background: rgba(255,255,255,.06)`; `border: 1.5px solid rgba(255,255,255,.4)`; `box-shadow: 0 20px 45px rgba(0,0,0,.4)`
- Blur: `backdrop-filter: blur(50px) saturate(180%)`
- Text opacity scale (dark theme): dim nav/labels `rgba(255,255,255,.35–.4)` → active/hover `rgba(255,255,255,1)`
- Keyframes to port: `driftA/B/C` (blob position+scale wobble), `asciiGlow` (ascii text color cycling through the palette), `softFlash` (opacity pulse, boot prompt), `blink` (cursor)

## Files
- `CozyCubes.dc.html` — reference mockups. Relevant sections: id `4a` (background/gradient system to match) and id `2a` (palette + pixel-art accents + ASCII boot). The rotating-cube ASCII renderer is in that file's logic class, method `stepCube()`.
- `screenshots/4a-mesh-gradient.png` — static reference for the mesh-gradient background system (change 7).
- `screenshots/2a-arial-calm.png` — static reference for the palette, pixel-art corner accents, and ASCII boot screen (changes 3, 7).
