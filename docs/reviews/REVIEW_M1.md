# Milestone 1 Review

Fresh-eyes review pass across all 7 stacked `feature/claude/*` branches for M1
(core timer), done after the initial build session. Findings below, ordered
logic-errors-first per the review priority in `../../initial_spec.md` §8.

## Fixed

1. **Inspection force-start ignored *when* the hold began (`feature/claude/timer-core`,
   `lib/useHoldReadyState.ts`).** The auto force-start condition was
   `elapsed >= inspectionDurationMs && isHolding`, with no check on when the hold
   actually started. A hold beginning *after* the 15s mark (during the 15-17s +2
   grace window) satisfied both on the very next animation frame, force-starting
   the solve with a hardcoded `"none"` penalty instead of the WCA-correct `"+2"`
   (or eventual DNF). Fixed by gating force-start on `holdStartedBeforeExpiry`,
   and retargeting the hold-intensity ramp basis to whichever boundary (15s or
   17s) is actually next, so a late hold ramps toward the DNF cutoff instead of
   uselessly ramping against the already-passed 15s mark. Commit `04fe810`.

2. **Cube-size switch had no mid-solve guard (`feature/claude/scramble-header`,
   `app/page.tsx`).** The Tab new-scramble keybind was correctly guarded against
   firing during inspecting/solving, but the cube-size pill selector right next
   to it wasn't. Since `onSolveComplete` closes over `cubeSize`, switching sizes
   mid-solve meant the eventually-completed solve got persisted under the *new*
   cube size, corrupting that size's stats bucket. Fixed with the same guard,
   plus visually disabling the pills while locked. Commit `1e74be6`.

3. **`togglePenalty` side effect inside a `setState` updater
   (`feature/claude/penalty-controls`, `app/page.tsx`).** The DB write
   (`updateSolve`) ran inside the `setSolves` functional updater, which React
   Strict Mode can invoke twice in dev to catch exactly this. Practical impact
   was limited to a harmless duplicate idempotent write (not data corruption),
   but reworked to match the already-correct pattern `removeSolve` uses:
   compute the new value once, then update state and persist as separate,
   non-nested steps. Commit `1e74be6`.

4. **Scramble generator didn't reach the inner layers of 5x5/6x6/7x7
   (`feature/claude/scramble-gen`, `lib/scramble-gen.ts`).** The generator only
   emitted single-layer (`R`) and 2-layer-wide (`Rw`) moves regardless of cube
   size. Verified against WCA Regulation 12a2 (wide-move depth `n` must satisfy
   `1 < n < N`) and real official scramble examples (which use `3Rw`, `4Lw`,
   etc.) that big-cube scrambles legally range up to depth `N-1`, and that
   TNoodle's own big-cube scrambler is random-move (not random-state) — the
   right approach was already in use here, just with an incomplete move
   vocabulary. Fixed on `feature/claude/scramble-depth-notation` (branched off
   this stack's tip) by picking depth uniformly from `1..N-1` per move.
   Existing move counts (40/60/80/100 for 4x4-7x7) were independently
   confirmed to already match TNoodle's published lengths. Commit `ea3225a`.

## Open — needs investigation (see `feature/claude/2x2-3x3-random-state-investigation`)

5. **2x2/3x3 use random-move, not WCA's true random-state.** Confirmed (via
   TNoodle docs and cubing.js docs) that official WCA 2x2/3x3 scrambles are
   genuine random-state: a uniformly-random legal cube permutation is chosen,
   then solved back to get the scramble sequence (typically via a two-phase /
   Kociemba-style solver). Our scramble-gen instead does random-move with
   legality filtering for these two sizes — legal and fair for practice, but
   not distributionally identical to competition scrambles. Matching it
   exactly means either porting a real solver or taking a dependency (the
   `cubing` npm package provides genuine WCA-parity scrambles for all sizes,
   but pulls in three.js as a transitive dependency — in tension with this
   project's explicit no-Three.js decision — and runs generation in a Web
   Worker, requiring an async "generating..." UI state instead of the current
   synchronous generation). Branched off for dedicated investigation rather
   than decided inline; see that branch for findings on what other cubing
   timers (csTimer, cubedesk, etc.) actually ship for these two sizes.

## Noted, not fixed (low severity / out of scope for a patch)

- `stats-engine.ts`'s `average()` has an unreachable dead branch
  (`trimmed.some(t => t === null)`) — harmless, the `dnfCount >= 2` early return
  already guarantees it can't fire. Not worth removing defensive code that costs
  nothing.
- `lib/db.ts`: if `openDB()` ever rejects (IndexedDB unavailable/blocked), the
  memoized promise stays rejected for the rest of the page load with no retry.
  Edge case, not fixed — matches "don't add handling for scenarios that can't
  happen" for supported browsers.
- Minor theoretical race in `app/page.tsx` between the cube-size reload effect
  and a same-tick solve completion — practically unhittable since IndexedDB
  reads resolve in milliseconds and a solve takes seconds at minimum.
- Stats (`bestSingle`/`ao5`/`ao12`/`allTimeMean`) recompute from the full
  `solves` array on every render, including the ~60fps re-renders while a solve
  is in progress. Not memoized. At realistic solve-history sizes this is well
  under the frame budget; flagged only in case history ever grows very large.
- `lib/useHoldReadyState.ts` has no integration-level tests (only the pure
  `penaltyForInspectionElapsed` helper is tested) — would need jsdom +
  `@testing-library/react` added to the project, which is a real infra addition,
  not a quick add. Worth doing in a future session if the hook grows more edge
  cases.

## Not reviewed this pass

`feature/claude/scaffold` — pure `create-next-app` output plus the deletion of
the old boilerplate; nothing hand-written to review.
