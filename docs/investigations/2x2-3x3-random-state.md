# Investigation: 2x2/3x3 random-state scrambles

**Status:** open investigation, not implemented. Branched off
`feature/claude/scramble-depth-notation` per `REVIEW_M1.md` finding #5.

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
to 2x2/3x3, not a general pattern across all sizes (`REVIEW_M1.md` finding #4
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
   invert. **Synchronous**, no web worker needed, so no async "generating..."
   UI state required — straightforward drop-in for the current synchronous
   `generateScramble()` call site. Downside: **3x3 only**, no 2x2 support.
   Cleanest license fit (matches this project's own MIT choice) and lightest
   footprint of the three options here.

2. **`min2phase` (npm: `min2phase`, cubing org)** — the actual library
   csTimer and TNoodle use. GPL-3.0-or-later, ~344KB unpacked, depends on
   `alg`/`kpuzzle` (lightweight puzzle-representation libs, not the full
   `cubing` package — no three.js pulled in). Using a GPL-licensed npm
   package as an unmodified dependency doesn't obligate this project's own
   code to be GPL (standard dependency use, not distributing modified/
   combined source) — worth a real license check before committing, not
   just this note, but not a hard blocker on its face.

3. **Full `cubing` npm package** (already ruled out for routine use in
   `REVIEW_M1.md`'s original scramble-gen discussion) — genuine WCA parity
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

## Recommendation shape (not a decision — needs your call)

Likely best fit given the constraints already established this session (MIT
license, no Three.js, synchronous/no-worker scramble generation to match the
current instant UX): **option 1 (`cubejs`) for 3x3**, paired with **either
option 2 (`min2phase`) or option 4 (hand-rolled) for 2x2** since option 1
doesn't cover it. This keeps 4x4-7x7 exactly as-is (already fixed, already
correct per REVIEW_M1.md finding #4) and only touches the two sizes that
actually have a gap.

Not implemented in this pass — this doc exists to make the next session's
decision fast, not to make the decision itself.
