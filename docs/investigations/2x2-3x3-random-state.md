# Investigation: 2x2/3x3 random-state scrambles

**Status:** **3x3 done, 2x2 still open.** Branched off
`feature/claude/scramble-depth-notation` per `../reviews/REVIEW_M1.md`
finding #5.

3x3 now generates genuine random-state scrambles via `cubejs`, wired up in
`lib/scrambler.ts` — see [Decision](#decision) for the reasoning and
[Outcome](#outcome) for what shipped. 2x2 remains random-move, waiting on its
own engine. `lib/scramble-gen.ts` is unchanged and still backs every size
except 3x3.

## The problem

`lib/scramble-gen.ts` generates 2x2/3x3 scrambles via random-move + legality
filtering (no immediate same-face repeat, no 3-in-a-row same axis). This is
legal and fair for practice, but it is **not** what WCA competitions use.
Official WCA scrambles for 2x2/3x3 are random-state: a uniformly-random legal
cube permutation is chosen, then a solver finds a path back to solved — the
scramble is the inverse of that solution. Random-state and random-move
scrambles are not statistically identical (random-move scrambles can be
biased toward certain sub-cases, and length varies from true random-state's
optimal-ish output), which matters if the goal is genuinely competition-grade
practice.

Confirmed via TNoodle/cubing.js docs during the M1 review pass: random-state
is the WCA-mandated method for 2x2/3x3 (and most other events) but explicitly
*not* for big cubes/Megaminx, which are random-move — so this gap is specific
to 2x2/3x3, not a general pattern across all sizes (`../reviews/REVIEW_M1.md` finding #4
already closed the big-cube gap without needing random-state).

## What other cubing tools actually do

| Tool | 2x2/3x3 method | Notes |
|---|---|---|
| **csTimer** (cs0x7f) | Random-state | Uses `min2phase.js`, a JS port of a two-phase (Kociemba-style) solver. The most popular community timer. |
| **TNoodle** (official WCA) | Random-state | Also uses min2phase internally for 3x3. |
| **CubeDesk.io** | Random-move | Explicitly documented as a deliberate difference from csTimer, not an oversight — a full-featured competitor (1v1, leaderboards, alg trainer) shipping random-move by choice. |

Takeaway: the community is genuinely split. Random-move isn't disqualifying
for a practice timer (CubeDesk proves that), but random-state is the more
"serious"/competition-aligned choice and is what the most-used community
timer (csTimer) does.

## Implementation options, if we decide to close this gap

1. **`cubejs` (npm: `cubejs`, by ldez)** — MIT licensed, ~100KB unpacked, one
   dependency. `Cube.scramble()` does exactly this: random state → solve →
   invert. Downside: **3x3 only**, no 2x2 support. Cleanest license fit
   (matches this project's own MIT choice) and lightest footprint of the
   three options here.

   **Correction (an earlier revision of this doc got this wrong).** This was
   described as "synchronous, no web worker needed — a straightforward
   drop-in for the current synchronous `generateScramble()` call site." That
   is not accurate. Per cubejs's own README, `Cube.initSolver()` builds
   pruning tables and "takes 4-5 seconds on a modern computer", and the
   README explicitly documents `async.js`/`worker.js` for offloading it.
   Individual solves after init are fast (0.01-0.4s, rarely up to 2s), but
   the one-time init cost means this is *not* a drop-in — it needs an async
   init and a loading state. That cost is inherent to any real random-state
   solver, so it doesn't distinguish the options below; it just has to be
   designed for.

2. **`min2phase` (npm: `min2phase`, cubing org)** — the actual library
   csTimer and TNoodle use. GPL-3.0-or-later, ~344KB unpacked, depends on
   `alg`/`kpuzzle` (lightweight puzzle-representation libs, not the full
   `cubing` package — no three.js pulled in). Using a GPL-licensed npm
   package as an unmodified dependency doesn't obligate this project's own
   code to be GPL (standard dependency use, not distributing modified/
   combined source) — worth a real license check before committing, not
   just this note, but not a hard blocker on its face.

3. **Full `cubing` npm package** (already ruled out for routine use in
   `../reviews/REVIEW_M1.md`'s original scramble-gen discussion) — genuine WCA parity
   for *all* sizes including 2x2, but bundles three.js (8.9MB unpacked),
   dual MPL-2.0/GPL-3.0 licensed, and runs generation in a Web Worker
   (needs an async "generating..." loading state). Only worth it if 2x2
   random-state specifically turns out to matter enough to justify the
   weight — option 1 or 2 don't cover 2x2 at all.

4. **Hand-roll it** — 2x2's state space is much smaller than 3x3's (corner
   pieces only, no edges/centers; ~3.6M reachable states), so a from-scratch
   random-state 2x2 solver is a meaningfully smaller undertaking than 3x3 and
   could pair with option 1 or 2 for 3x3 to get both sizes without a heavy
   dependency. Not scoped further here — flagged as a real, boundable option
   worth estimating before ruling out.

## Decision

**Option 1 (`cubejs`) for 3x3.** MIT matches this project's own license, it's
the lightest of the candidates, and it's purpose-built for exactly this rather
than being a general cubing toolkit we'd use 5% of.

**2x2 is out of scope for this doc.** A separate 2x2 engine is planned, so
option 1 covering only 3x3 stops being a downside — that was the sole reason
options 2 and 4 were still in play. Options 2, 3, and 4 are recorded above for
history; none are being taken.

4x4-7x7 stay exactly as they are — already correct per
`../reviews/REVIEW_M1.md` finding #4, and random-move is what TNoodle itself
uses at those sizes.

### How to integrate it

- **Main thread — not a Web Worker.** A worker would keep the main thread
  smooth during init, but it costs a worker file, message passing, and
  serialization. Nothing else needs the thread during a one-time init that
  happens before the user has a scramble to solve, so the simpler path wins.
  Revisit only if the block actually hurts in practice. (Planned as
  `async`/`await`; on implementation `initSolver()` turned out to be
  synchronous, so there is nothing to await — see [Outcome](#outcome).)
- **Init eagerly on mount**, since 3x3 is the default cube size — the warm-up
  overlaps with the user arriving on the page rather than blocking their first
  scramble.
- **Cache the initialized solver for the session** so only the first scramble
  pays anything.
- **Show `components/ColorfulLoader.tsx` while it warms.** Shipped full-screen
  rather than the originally-sketched `fullScreen={false}` slot: 3x3 is the
  default size, so on a cold load there is no scramble to time against anyway.

### Known gap, deliberately not handled

Once init completes on mount, the only way a user sees the spinner again is by
arriving directly at a non-3x3 cube size before init finished. No routing or
per-size deep-linking exists yet — cube size is component state, not a route —
so this is unreachable today. Noted here so it isn't rediscovered as a bug if
per-size routes are added later.

## Outcome

Shipped for 3x3. `lib/scrambler.ts` is the app's scramble source and routes by
cube size: 3x3 to `Cube.scramble()`, everything else to the existing
random-move generator. `lib/scramble-gen.ts` was deliberately left untouched
and dependency-free so it stays unit-testable in isolation — the cubejs import
lives only in `scrambler.ts`.

Measured, rather than taken from the README:

- `Cube.initSolver()` blocks for **~1.2s**, not the 4-5s the README quotes.
  It is genuinely synchronous, so `async`/`await` around it would not free the
  main thread — the only real alternatives were a Web Worker or accepting the
  block. At ~1.2s the block was judged acceptable.
- `Cube.scramble()` costs ~13ms afterwards, so only the first load pays.
- Output is 22 moves, versus the 20 the random-move generator produced.
- Correctness spot-check: 5/5 generated scrambles left the cube unsolved and
  were solvable, with the returned solution verified to restore a solved state.

`app/page.tsx` waits for a painted frame before calling `initScrambler()`, so
the full-screen `ColorfulLoader` is actually on screen for the block instead of
the browser going white. Keyboard handlers and the first scramble are both
gated on the solver being ready.

Known rough edge, deferred to the UI work: the handoff from loader to timer is
an instant swap with no fade or staggered reveal. That belongs with M2.3
(micro-animations), not here.

### Still open

2x2 is unchanged — still random-move, still an 11-move sequence rather than a
true random-state scramble. cubejs cannot help; it is 3x3 only. A dedicated 2x2
engine is the planned route.
