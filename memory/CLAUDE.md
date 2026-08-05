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

## Status (update as work progresses)
- [ ] `feature/claude/scaffold` — Next.js (App Router+TS+Tailwind) scaffolded at repo root
- [ ] `feature/claude/stats-engine` — Ao5/Ao12/Bo5/mean/DNF/+2 pure functions + tests
- [ ] `feature/claude/scramble-gen` — 3x3 scramble generator (2x2/4x4 stretch)
- [ ] `feature/claude/timer-core` — useHoldReadyState hook, Mode A/B, Space keybind
- [ ] `feature/claude/scramble-header` — pinned scramble text display
- [ ] `feature/claude/persistence` — IndexedDB solves store + minimal stats view
- [ ] `feature/claude/penalty-controls` — +2/DNF/delete on solves

Update the checkboxes and add new bullets as branches land, so a future session can see
at a glance what's actually built vs. what's still spec-only.
