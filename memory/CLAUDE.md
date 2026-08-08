# CozyCubes (CubeFlow) — Repo Memory

Source of truth for full product spec: `initial_spec.md` at repo root. Read it before
resuming work — this file is a pointer + running status, not a replacement.

## Standing workflow preference — stacked feature branches
User wants every unit of work on its own branch, named `feature/claude/<name>`, and
**each new branch created off the tip of the previous feature branch** (not off `main`),
so the branches form a stack: `main → feature/claude/a → feature/claude/b → ...`.
Do NOT merge to `main` directly. Do NOT merge branches into each other automatically —
the user reviews and merges themselves, feature by feature, so they can see the diff
at each step. Open a PR per branch if/when a remote exists; locally, just keep committing
on the correct branch and moving to the next.

**Why:** user explicitly corrected the default "just merge to main" flow — they want to
review the app growing feature-by-feature, matching the convention used by their other
agents.

**How to apply:** before starting each new ticket, `git checkout -b feature/claude/<name>`
from whatever branch is currently checked out (which should be the previous feature
branch's tip), never from `main` unless it's the very first branch of a session.

## Session scope decision (2026-08-04)
Full spec (`initial_spec.md`) describes a 4-milestone build (core timer, customization/
polish, Flow Mode music-reactive layer, site shell+CI/CD+deploy) — realistically 6-10hrs.
This session budget was 1-2hrs, so scope was cut to **Milestone 1 (Core Timer) only**,
per the spec's own §11 guidance to protect M1/M2 over the stretch features. See the
approved plan for full tickets breakdown (scaffold → stats-engine → scramble-gen →
timer-core → scramble-header → persistence → penalty-controls).

Deviations from the spec's stated architecture, and why:
- Skipped pnpm workspaces / multi-package monorepo (`packages/scramble-gen`,
  `packages/stats-engine`, etc.) for this session — one Next.js app with `lib/stats-engine.ts`
  and `lib/scramble-gen.ts` as plain modules. Repo was empty boilerplate going in; multi-package
  tooling is pure overhead until the app has enough surface area to need the isolation.
  Easy to extract into real packages later — spec's own rationale for the split still applies,
  just not yet.
- Deferred: 5x5-7x7 scrambles, unfolded SVG net renderer, keybind remapping UI, theming,
  sound, animations, config panel, Settings page, Flow Mode entirely, extra site pages,
  CI/CD, deploy.

## Status (updated 2026-08-05, end of session)
Milestone 1 (Core Timer) is done, as a stack of 7 branches off `main`, each branched
from the tip of the previous one (none merged yet — awaiting your review):

- [x] `feature/claude/scaffold` — Next.js 16 (App Router+TS+Tailwind 4) at repo root,
  `npm run dev`/`build`/`test` all work. Vitest added for unit tests.
- [x] `feature/claude/stats-engine` — `lib/stats-engine.ts`: bestSingle, bestOfN (Bo5),
  ao5/ao12 (WCA trimmed mean, single-DNF-counts-as-worst, 2+ DNF = DNF average),
  allTimeMean, effectiveTimeMs. 19 unit tests, hand-computed expected values.
- [x] `feature/claude/scramble-gen` — `lib/scramble-gen.ts`: random-move (not
  random-state — documented why in-file) scrambles for all of 2x2-7x7, wide-move
  notation for 4x4+, no-same-face/no-same-axis-thrice legality rules. 24 tests.
- [x] `feature/claude/timer-core` — `lib/useHoldReadyState.ts`: the shared hold-ready
  state machine for Mode A (inspection, hold-ramp scaled to remaining inspection time
  at hold-start, force-start at 0 remaining, WCA penalty bands 0-15/15-17/>17s) and
  Mode B (fixed ~400ms threshold, no penalty). Wired into `app/page.tsx` with a Space
  keybind. `next.config.ts` sets `agentRules: false` to stop Next regenerating a root
  CLAUDE.md/AGENTS.md on every dev run (collides with this file's convention).
- [x] `feature/claude/scramble-header` — pinned scramble **text notation only** above
  the timer (no unfolded SVG net yet — deferred, see below), cube-size pill selector
  2x2-7x7, Tab regenerates on demand, guarded off during inspecting/solving.
- [x] `feature/claude/persistence` — `lib/db.ts` (idb wrapper, `solves` store keyed by
  UUID, indexed by cubeSize+timestamp). Timer page persists every completed solve,
  reloads on cube-size change, shows a live best/Ao5/Ao12/mean/count stats row and a
  recent-solves list, all reading real stored data via stats-engine.
- [x] `feature/claude/penalty-controls` — hover +2/DNF/delete on any row in the recent
  solves list, persisted via `updateSolve`/`deleteSolve`, stats recalc automatically.

All branches: `npx vitest run` (46/46 passing) and `npm run build` verified green
before each commit. Manual keyboard interaction (hold-to-ready, force-start, +2/DNF
bands) was reasoned through carefully but **not visually browser-tested this session**
— Chrome automation wasn't available. Please manually verify the hold/release timing
feel once you're at your machine (`npm run dev`, http://localhost:3000).

### What's explicitly NOT built yet (still spec-only)
- Unfolded net SVG scramble diagram (text notation is currently a stand-in)
- Keybind remapping UI (Space/Tab are hardcoded)
- "Reset all-time stats" confirm dialog, solve comments/annotations
- Everything in M2 (themes, sound, animations, config slide-over, Settings page),
  M3 (Flow Mode entirely: tiers, music, BPM visuals, XP/decay), M4 (extra site pages,
  CI/CD, Vercel deploy)
- pnpm workspaces / separate `packages/*` — still one Next.js app with `lib/` modules

### Next session should start by
1. Reviewing/merging the 7 stacked branches above (in order) once you're satisfied.
2. Re-reading this file + `initial_spec.md` before picking up M1 polish or starting M2.
