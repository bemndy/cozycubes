# CubeFlow — Project Spec & Agent Execution Plan

> **Read this whole document before writing code.** This is a spec for autonomous coding agents. It defines scope, architecture, decisions (with rationale), and a milestone-based delegation plan for a ~1–2 hour build session. Sections marked **[DECISION]** are settled — do not re-litigate them mid-build. Sections marked **[OPEN]** need a judgment call by the lead agent; make the call, document it in `DECISIONS.md`, and move on.

---

## 0. Vision

A colorful, sound-rich Rubik's Cube speedsolving timer — the timing rigor of csTimer, the keyboard-first minimal feel of monkeytype, the single-page satisfying-interaction feel of dotpiano/dragonfly.xyz. No accounts, no servers holding personal data, fully client-capable stats. A secondary "Flow Mode" turns solves into a music-and-color-reactive experience that scales with the user's skill tier, plus a lightweight, decaying XP metric for engagement.

---

## 1. Tech Stack **[DECISION — updated]**

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) + TypeScript**, single app | Changed from the earlier Vite+Fastify split per your steer — Fastify wasn't earning its keep since there's so little real backend work here. Next.js Route Handlers (`app/api/**/route.ts`) cover the two things a backend needs to do (serve the static music manifest, and later maybe a tiny anonymous aggregate-stats endpoint) without a second app, a second `package.json`, or a second deploy target. One framework, one dev server, one build. Still zero SEO/auth need — we're just using Next as "React + file-based routing + built-in API routes," not reaching for SSR-heavy patterns. Most pages should still be static/client-rendered (`"use client"`) since this is fundamentally an interactive app, not a content site. |
| Styling | **Tailwind CSS + CSS variables for theming** | Fast to build custom themes with; CSS variables let "Flow Mode" swap palettes/intensity at runtime without re-render churn. |
| Component library | **shadcn/ui (Radix primitives + Tailwind), NOT MUI** — see §1.5 for the reasoning | shadcn gives accessible, unstyled-by-default primitives (dialog/sheet, popover, slider, switch, tabs) that you fully theme with Tailwind/CSS vars — exactly what a "heavily themeable" app needs. MUI ships its own design language and its own styling engine (Emotion) that actively fights a custom-theme-per-second product; running both MUI and Tailwind/shadcn in one app means two styling systems, two bundle costs, and constant visual-language conflicts. Use **Headless UI** only as a fallback for the rare interaction shadcn doesn't cover — don't reach for it by default. |
| Animation | **Framer Motion** (UI) + **native CSS/requestAnimationFrame** (BPM-synced color pulses) | Framer Motion for hover/reveal polish; raw rAF for the beat-synced stuff since it needs tight timing control Framer isn't built for. |
| 3D/2D cube rendering | **SVG-based unfolded net renderer** (custom), not Three.js | An unfolded scramble diagram is 2D. Pulling in a 3D engine for this is unjustified weight. If a 3D cube preview is wanted later, that's a separate, explicitly-scoped feature — not in this build. |
| Scramble generation | Pure TypeScript, runs **client-side** | No reason this touches a server. Keeps timer usable offline and removes a network dependency from the critical timing path. |
| Persistence | **IndexedDB** (via a thin wrapper, e.g. `idb`), NOT IP-based tracking | See §4. |
| Package manager | pnpm | Fast, disk-efficient, fine default. |
| Monorepo tool | pnpm workspaces (no need for Turborepo/Nx at this scale — monkeytype uses Turborepo but it's a much larger multi-app codebase with a real backend; we don't have that shape) | `apps/web` (the single Next.js app), `packages/scramble-gen`, `packages/stats-engine`, `packages/shared-types` |
| Hosting (near-term) | Vercel, single project | Next.js on Vercel is the path of least resistance — static pages, route handlers, and assets all deploy from one project with zero extra config. |
| Hosting (future) | GCP (Cloud Run, using Next's standalone output mode) | `next build` with `output: "standalone"` produces a container-ready build today, so the GCP move later is a deploy-config change, not an app rewrite. |
| ML/Python | **None.** Confirmed no ML/Python need anywhere in this app. | Scramble generation is deterministic algorithmic work (random state permutation walk), not learned. Skip it entirely. |

---

## 1.5 UI/UX Research Findings **[reference — read before building any screen]**

You gave four references. Here's what's actually worth pulling from each, based on inspecting the live sites/repos:

- **monkeytype** ([repo](https://github.com/monkeytypegame/monkeytype)) — Worth noting: monkeytype's actual frontend is **SolidJS**, not React, and its backend is Express/MongoDB/Redis in a Turborepo monorepo — that's a bigger, older codebase shape than we need, so treat it as a *design/UX* reference, not an architecture template. What to actually copy: the muted, near-black background with a single saturated accent color; content vertically centered with huge negative space above and below; settings/config reachable via small icon buttons in a slim top bar rather than a cluttered nav; test config (mode toggles, duration pills) presented as compact pill/segmented-button groups exactly like the screenshot you sent (`punctuation`/`numbers`, `time`/`words`/`quote`/`zen`/`custom`, `15/30/60/120`) — **this pill/segmented-control pattern is the direct template for our cube-size selector and mode selector.**
- **dotpiano** (the site; the linked `DotPianoMidiPlayer` repo is a third-party MIDI-injection script, not the site's own source, so it's not useful for architecture — it's just confirmation dotpiano is a Tone.js-style web-audio piano) — What to take: an almost-empty black canvas where a small amount of glowing, colorful, physically-animated content (their falling/curling note trails in your screenshot) is the entire visual interest. This is the reference for **Flow Mode's** BPM-synced particle/trail visuals — restrained black canvas, a few glowing curved strokes reacting to the beat, not a busy particle-system explosion.
- **MOSS** (play.moss.town) — Minimal warm-dark UI, one muted accent color (burnt orange), boxy bordered cards with an icon + title + one-line description, friendly rounded mascot, small monospace version/credit footer. This is a strong reference for our **Settings/Config panel row layout** (icon + label + subtext per option) and general "playful but restrained" tone — pull the bordered-card list pattern directly for config panel sections.
- **dragonfly.xyz** — Big bold display type on black, sparse ASCII/wireframe-map texture in the background for depth without noise, thin top bar with a tiny dotted step-indicator. Reference for an **About/landing hero** treatment if we build one, and for how much restraint "colorful" should have at rest — the color (orange here) is used sparingly against near-total black/gray, not everywhere at once. Useful counter-balance to "make it colorful": colorful should mean *deliberate, high-contrast accents on a dark canvas*, not saturated color everywhere.

**Net design direction:** dark-first canvas (matches how most speedcubers time — low light), one or two saturated accent colors per theme, monkeytype-style pill/segmented controls for config, MOSS-style bordered-card rows for settings panels, dotpiano-style restrained glow/trail animation for Flow Mode, dragonfly-style typographic confidence for any marketing/about surface. Agents building UI should re-check this section, not just the tech stack table, before styling a new screen.

---

## 2. Non-Negotiable Product Requirements

### 2.1 Core Timer
- Keybind is **user-remappable**, default `Space`.
- Millisecond-precision timing using `performance.now()`, not `Date.now()`.
- Two distinct hold-color state machines, both driven by the same underlying "hold intensity" mechanic — this is a deliberate reuse, not two separate systems:

  **Mode A — Inspection ON** (WCA-style, default inspection time 15s, configurable):
  1. Solve becomes available → inspection countdown starts immediately (visible numeric countdown).
  2. User presses and holds the timer keybind at any point during inspection. While held, the ready indicator progressively shifts color along a gradient (start: neutral/blue → intensifying toward red) — the longer the *hold*, the more red, independent of how much inspection time is left, but the color ramp should be tuned so a hold that reaches the end of inspection lands at "full red."
  3. If the user is still holding when the inspection countdown hits 0, the timer **force-starts automatically** at that instant (color hits full red → snaps to the solving state color).
  4. If the user releases before inspection expires, the timer starts immediately at release. Apply WCA-style time penalties based on total inspection time elapsed at release: **0–15s → no penalty, 15–17s → +2, >17s → DNF**, applied automatically to the resulting solve.
  5. Releasing and re-pressing during inspection is allowed (doesn't reset the countdown) — only sustained hold matters for the color ramp and force-start.

  **Mode B — Inspection OFF** (standard timer, no countdown):
  1. User presses and holds the keybind. Same color-ramp mechanic as Mode A reused verbatim, but here it's a short, fixed ready-threshold (e.g. ramps from neutral to full "ready" green/red across ~0.3–0.5s of hold) purely to prevent accidental starts — there's no inspection clock driving it.
  2. Once the hold clears the ready-threshold, release starts the timer immediately. No countdown, no time-based penalty from this phase.
  3. This is the existing "hold-to-ready → release-to-start" convention, just now explicitly specified as sharing the color-ramp component with Mode A rather than being a separate implementation.

- Both modes: pressing the keybind again while solving stops the timer (`performance.now()` delta = raw time, before any penalty).
- Implement the color ramp as one reusable hook/component (e.g. `useHoldReadyState`) parameterized by `{ mode: "inspection" | "standard", durationMs }` — do not fork this into two copies of similar logic.

### 2.2 Scrambles
- Generate scrambles for **2×2 through 7×7**.
- Use standard move notation per cube size (WCA-legal move sets; big cubes use wide-move / layer notation, e.g. `3Rw`, `Uw`).
- **Scramble (both the unfolded net diagram and its text notation) is pinned at the top of the timer page at all times** — not behind a toggle, not below the fold. This is the primary reference the user glances at before starting a solve, so it must be immediately visible without scrolling or interaction.
- Render as an **unfolded (cross/net) diagram**, colored, with the text notation shown directly beneath it for people who read algs by string.
- Scramble regenerates automatically after each completed solve.
- **Separate, user-remappable keybind (default e.g. `Tab`, must not collide with the timer keybind) instantly generates a new scramble on demand**, without requiring a solve — for when someone wants to skip a scramble they don't like or re-practice. Guard this so it's disabled while the timer is actively running/inspecting, to avoid accidental scramble changes mid-hold.

### 2.3 Statistics — Per Device, No Accounts **[DECISION — see §4]**
- All-time solve list, per cube size.
- Best single, best of 5 (Bo5), average of 5 (Ao5, WCA trimmed-mean rules: drop best & worst of 5, average remaining 3), average of 12 (Ao12), all-time mean.
- Solve list supports: **+2 penalty**, **DNF**, delete, and edit-annotate (optional comment per solve).
- DNF and +2 must feed into Ao5/Ao12 exactly per WCA rules: DNF counts as worst; two DNFs in a set of 5 makes the whole Ao5 a DNF.
- "Reset all-time stats" with a confirm dialog (destructive, irreversible, client-side only — no undo).

### 2.4 Customization & Feel
- Theme system: multiple color palettes, dark/light-agnostic (most speedcubers time in dark rooms — bias default toward dark, vivid accent themes).
- Sound design: distinct, satisfying SFX for: ready-state engage, solve start, solve stop, PB (personal best), penalty applied, DNF applied, UI hover/click accents. Global mute toggle, independent volume sliders for "timer sounds" vs "ambient/music."
- Hover/reveal micro-animations throughout (buttons, stat cards, theme swatches) — restrained, monkeytype-tier polish, not gaudy.
- All animation/sound must be **fully disable-able** for accessibility and for competitive users who find flair distracting mid-solve.

**Configuration panel (quick-access, not the same as the full Settings page):**
- A small icon button, always visible near a corner of the timer screen (monkeytype-style: slim, unobtrusive, top bar), opens a **slide-over panel** (shadcn `Sheet` component, built on Radix `Dialog`) without navigating away from the timer.
- Panel contains, grouped as bordered-card rows (MOSS-style — icon + label + one-line description per row, expandable inline, not nested sub-pages):
  - **Keybindings** — timer keybind, new-scramble keybind, remap UI (press-to-set).
  - **Theme** — palette picker (swatches with hover preview).
  - **Cube** — active cube size (2×2–7×7) — this is also the primary control for which scramble generator and stats bucket are active.
  - **Mode** — inspection on/off, inspection duration, Flow Mode on/off.
  - **Sound** — the mute/volume controls from above, surfaced here too for quick access mid-session.
- This panel is for *fast, in-context* changes without breaking flow; the full **Settings page** (M2.4) is the exhaustive version of the same controls for people who want to sit and configure everything at once. Both should read/write the same underlying settings store — don't duplicate state.
- Panel must be dismissible via `Escape`, an overlay click, or the same icon button, and must not intercept the timer keybind while open (typing/remapping inside the panel shouldn't leak into the timer state machine).

### 2.5 "Flow Mode" — Music & Color Reactive Layer **[DECISION on structure, see §6]**
- Toggle setting (name it in-app; working name for spec purposes: **Flow Mode**).
- Skill-tier detection (see §6.1) selects a **BPM band + palette intensity band**.
- As the user's rolling average improves for a given cube size, tier increases → more intense music/visuals during the solve phase only (not idle/menu browsing).
- Music: royalty-free, predetermined, stored as a static manifest (not user-uploaded, not externally fetched from a third-party API at runtime — avoids licensing and reliability risk).
- XP/currency system with decay — see §6.2. **Flagged as intentionally under-specified by you; this build should implement a v1 and leave clear extension points, not over-build a system you said needs more design.**

### 2.6 Site Structure
- Minimal page count: Timer (home, does the heavy lifting), Settings, Stats, Privacy Policy, Terms & Conditions, Changelog, About/Open-source. That's it.
- Open source: MIT or Apache-2.0 (pick MIT unless you have a reason for Apache's patent grant — MIT is simpler and standard for hobby OSS).

---

## 3. Architecture

```
apps/
  web/                    # Next.js (App Router) + TS — single app, UI + API
    app/
      (timer)/            # home route: timer, pinned scramble, config panel
      stats/
      settings/
      privacy/ terms/ changelog/ about/
      api/
        music-manifest/route.ts   # static track manifest, tier→track lookup
components/
  ui/                     # shadcn/ui generated components (Sheet, Dialog, Tabs, Slider, Switch...)
packages/
  scramble-gen/           # Pure TS scramble algorithms, unit tested in isolation
  shared-types/           # Solve, Scramble, ThemeConfig, TierConfig types
  stats-engine/           # Pure functions: Ao5/Ao12/Bo5/DNF/+2 math, unit tested in isolation
```

Why split `scramble-gen` and `stats-engine` into their own packages: these are the two places correctness actually matters (a wrong Ao5 calc or an illegal scramble is a real bug users will notice). Isolating them means they can be unit-tested hard, independent of UI, and reused if you ever ship a CLI or mobile wrapper later. Collapsing to a single Next.js app (instead of separate `web`/`api` apps) removes a whole category of "which app does this go in" decisions for the agents building this — there's only one app.

---

## 4. Per-Device Stats: How to Do This With Least Overhead **[DECISION]**

You asked about IP-based tracking. **Don't do that.** Reasons:
- IP addresses are not stable per-device identifiers (NAT, mobile carriers rotate IPs constantly, VPNs, shared networks) — you'd get wrong data constantly.
- It requires a server round-trip for something that should be instant and offline-capable.
- It's arguably personal data (touches privacy-policy/regulatory surface you're trying to avoid by not having logins).

**Use IndexedDB, client-side, full stop.** This is exactly what mobile apps and sites like monkeytype actually do for local-only stats:
- IndexedDB (not localStorage) because solve history can grow into thousands of entries and localStorage is synchronous/string-only/size-capped (~5–10MB) and will jank the main thread as it grows. IndexedDB is async and scales fine.
- Wrap it with a tiny abstraction (`idb` npm package) so the actual DB calls read like a normal repository/service class — don't hand-roll raw IndexedDB transactions throughout the app.
- Data model: one object store `solves` keyed by UUID, indexed by `cubeSize` and `timestamp`; one object store `settings` (single row, theme/keybind/sound prefs); one object store `flowState` (XP, tier, last-visit timestamp for decay calc).
- "Per device" is the honest framing to give the user: clearing browser storage or switching browsers loses history. That's an acceptable, expected tradeoff for a no-login app — state this plainly in an FAQ/tooltip, don't hide it.
- No cookies needed. No IP logic anywhere in this app.

---

## 5. Flow Mode Detail

### 5.1 Skill Tiers
- Tier is computed **per cube size independently** (your own callout: 4×4 is slower than 3×3, so tiers must not be a single global number).
- Base it on rolling Ao12 (or Ao5 if fewer than 12 solves exist yet) compared against configurable WCA-ish reference bands per cube size (e.g. for 3×3: >60s beginner, 30–60s intermediate, 20–30s advanced, 12–20s fast, <12s elite — agent should source reasonable reference bands per cube size, document them in `TIER_BANDS.md`, and make them easy to tune later — don't hardcode magic numbers three files deep).
- Tier maps to a `{ bpmRange, paletteIntensity, particleDensity }` config — start with 4–5 tiers, not more; more tiers than that just means more asset/tuning work for marginal payoff in a 1–2hr build.

### 5.2 XP / Currency (v1, intentionally minimal)
Per your note this needs more design later — build the smallest honest version:
- Award XP on solve completion: base amount scaled by (a) solve being a new PB, (b) solve being non-DNF, (c) small bonus for clean Ao5/Ao12 improvements.
- Decay: on each app load, compute elapsed time since `lastVisitTimestamp`; apply a decay function (e.g. lose X% per day idle, floor at 0) before showing current XP.
- Store only current XP + last-visit timestamp — don't build a ledger/transaction history system, that's out of scope for a v1.
- Display XP somewhere persistent but non-intrusive (e.g. a small badge near stats) — this is explicitly *not* the main event of the app, don't let it crowd the timer UI.

---

## 6. CI/CD **[DECISION]**

GitHub Actions, two workflows:
1. **`ci.yml`** — on every PR: install (pnpm), typecheck, lint, run unit tests (`scramble-gen`, `stats-engine` especially), `next build` for `apps/web`. Must pass before merge.
2. **`deploy.yml`** — on merge to `main`: deploy `apps/web` to Vercel (single project, one deploy — the API route handlers ship as part of the same Next.js build, no separate deploy target). Use repo secrets for deploy tokens; don't hardcode anything.

Branch protection on `main`: require CI green + at least the review step described in §8 before merge (even if that "review" is an agent-run pass, treat it as a real gate).

---

## 7. Milestones & Ticket Breakdown

Four major features, git-branched, small tickets within each. Suggested branch naming: `feature/<milestone-slug>/<ticket-slug>`.

### Milestone 1 — `feature/core-timer`
Foundation. Nothing else works without this.
- `M1.1` Repo scaffold: pnpm workspaces, `apps/web` (Next.js App Router + TS + Tailwind), `packages/shared-types`, shadcn/ui initialized (`components/ui`), ESLint+Prettier config, base GitHub Actions `ci.yml`.
- `M1.2` `stats-engine` package: Ao5/Ao12/Bo5/mean/DNF/+2 pure functions + full unit test suite (this is the highest-correctness-risk piece — do not skip tests here).
- `M1.3` `scramble-gen` package: 2×2–7×7 scramble generators (random-state or WCA-legal random-move, document which and why in the package README) + unit tests asserting legal move sequences (no immediate move cancellation, no same-face-repeat rules per cube size).
- `M1.4` Timer core: the `useHoldReadyState` hook/state machine covering both Mode A (inspection, color-ramp-to-force-start, WCA penalty-on-release math) and Mode B (standard ready-threshold) from §2.1, `performance.now()` timing, remappable keybind stored in settings store.
- `M1.5` Scramble header: unfolded net SVG renderer wired to `scramble-gen` output, text notation beneath it, pinned to the top of the timer page, plus the remappable "new scramble" keybind (disabled while timer is running/inspecting).
- `M1.6` IndexedDB persistence layer (`idb` wrapper, `solves`/`settings`/`flowState` stores) + stats page wired to `stats-engine` reading real stored solves.
- `M1.7` Penalty controls on a completed solve (+2, DNF, delete) wired into stored data and recalculated stats.

**Checkpoint after M1:** clear context, fresh-eyes review pass (see §8) before starting M2.

### Milestone 2 — `feature/customization-polish`
- `M2.1` Theme system: CSS-variable-driven palettes, theme picker UI, persisted to settings store.
- `M2.2` Sound system: SFX for ready/start/stop/PB/penalty/DNF, mute toggle, separate volume sliders, lazy-loaded audio assets.
- `M2.3` Micro-animations: hover/reveal on buttons, stat cards, theme swatches (Framer Motion), with a global "reduce motion" toggle.
- `M2.4` Configuration slide-over panel (shadcn `Sheet`): keybindings, theme, cube size, mode (inspection/Flow Mode), sound — bordered-card row layout per §2.4, opened from a persistent icon button, reading/writing the shared settings store.
- `M2.5` Full Settings page: the exhaustive version of the same settings store for people who want the whole-page view rather than the quick panel — same underlying state as M2.4, don't duplicate it.

**Checkpoint after M2:** clear context, review pass.

### Milestone 3 — `feature/flow-mode`
- `M3.1` Tier calculation: per-cube-size rolling Ao12 → tier mapping, `TIER_BANDS.md` documenting the reference numbers used.
- `M3.2` Music manifest + playback: static royalty-free track list served from the `app/api/music-manifest` route handler (or bundled as a static JSON import if simpler — agent's call, document it in `DECISIONS.md`), BPM-tagged, tier-to-track selection logic.
- `M3.3` BPM-synced visual layer: rAF-driven color pulse/particle intensity tied to selected track's BPM, active only during solve phase.
- `M3.4` XP v1: award-on-solve logic, decay-on-load logic, small persistent XP display.
- `M3.5` Flow Mode master toggle wiring everything above together cleanly, off by default.

**Checkpoint after M3:** clear context, review pass.

### Milestone 4 — `feature/site-shell-and-ship`
- `M4.1` Remaining pages: Privacy Policy, Terms & Conditions, Changelog, About/Open-source (real MIT license file, real repo README with setup instructions).
- `M4.2` `deploy.yml` GitHub Action, Vercel project wiring for the single `apps/web` Next.js project.
- `M4.3` Full-app pass: routing, empty states (zero solves yet), first-run experience, mobile/responsive check on the timer specifically (space-hold doesn't translate to mobile — decide and implement a tap-based equivalent).
- `M4.4` Final review pass + `DECISIONS.md` and `TIER_BANDS.md` sanity check that they're actually filled in, not stubs.

**Checkpoint after M4:** final review, done.

---

## 8. Context-Clear + Review Protocol (apply after every milestone)

1. **Clear context.** Don't carry milestone-N implementation chatter into milestone-N+1 planning — start the reviewing agent fresh so it reads the actual code/UI rather than trusting its own prior narration of what it built.
2. **Review pass covers, in this order:**
   - Logic errors first (stats math, penalty handling, scramble legality) — these are silent and dangerous.
   - UI bugs (broken states, layout breaks at small viewport, unreachable controls).
   - Improvement opportunities (polish, but don't gold-plate — note them, only act on quick wins).
3. Log findings in a per-milestone `REVIEW_M<n>.md` at repo root (or `/docs/reviews/`) so there's a paper trail an agent (or you) can check against later.
4. Fix blocking issues before opening the next milestone's branch. Non-blocking polish items can be ticketed and deferred.

---

## 9. Explicit Non-Goals for This Build

- No user accounts/auth of any kind.
- No 3D cube rendering (unfolded net only).
- No ML/Python anywhere.
- No third-party API calls at runtime for music (predetermined static assets/manifest only).
- No cross-device sync (that would require accounts, which is explicitly out).
- No deep XP ledger/economy system — v1 counter + decay only, per your own note this needs future design.

---

## 10. Deliverables Checklist for the Agent Team

- [ ] Working monorepo, `pnpm i && pnpm dev` runs `apps/web` (Next.js, UI + API routes together) locally.
- [ ] `ci.yml` green on a real PR.
- [ ] All four milestones merged to `main` via PRs (not direct pushes).
- [ ] `DECISIONS.md`, `TIER_BANDS.md`, `REVIEW_M1–M4.md` present and non-empty.
- [ ] Deployed preview (Vercel) reachable, or documented reason it couldn't be in this session.
- [ ] README with local setup, architecture summary, and "how to add a new theme/track" doc (since those are things you'll likely want to extend yourself later).

---

## 11. Prompt to Hand to the Delegating/Lead Agent

> You are the lead agent for building **CubeFlow**, spec'd in `cube-timer-spec.md` at repo root. Read the full spec before acting. Work in the milestone order defined in §7. For each milestone: create the feature branch, implement its tickets as small commits, open a PR, then run the context-clear + review protocol in §8 before starting the next milestone. Do not skip the review checkpoints even under time pressure — they exist because stats/scramble correctness bugs are easy to introduce silently. Where the spec marks a decision **[DECISION]**, follow it as written. Where you must make a judgment call not covered by the spec, write it to `DECISIONS.md` with a one-line rationale and proceed — do not stop to ask. Budget roughly: 35–40 min M1, 20–25 min M2, 25–30 min M3, 15–20 min M4, remainder for reviews. If you're going to run out of time, protect M1 and M2 (a correct, good-feeling core timer) over M3 (Flow Mode is the ambitious stretch feature) — ship a smaller, correct app over a bigger, buggy one.