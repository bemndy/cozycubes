/**
 * The app's scramble source: picks the right generator per cube size.
 *
 * 3x3 uses cubejs for genuine random-state scrambles — a uniformly random cube
 * state is solved with a two-phase (Kociemba) solver and the solution
 * inverted, which is how official WCA scrambles are produced. Every other size
 * stays on the random-move generator in `scramble-gen.ts`: correct for
 * 4x4-7x7 (TNoodle is random-move there too), and a known gap for 2x2, which
 * is waiting on its own engine. See
 * `docs/investigations/2x2-3x3-random-state.md`.
 *
 * `scramble-gen.ts` is deliberately left pure and dependency-free so it stays
 * unit-testable in isolation; the cubejs dependency lives only here.
 */
import Cube from "cubejs";
import { generateScramble, type SupportedCubeSize } from "./scramble-gen";

/** The cube size backed by cubejs; every other size skips the solver entirely. */
const RANDOM_STATE_SIZE: SupportedCubeSize = 3;

let solverReady = false;

/**
 * Builds cubejs's pruning tables. Blocks the main thread for roughly 1-2s on
 * the first call and is a no-op afterwards, so callers should make sure
 * something has painted before invoking it.
 */
export function initScrambler(): void {
  if (solverReady) return;
  Cube.initSolver();
  solverReady = true;
}

export function isScramblerReady(): boolean {
  return solverReady;
}

/** Whether this size needs `initScrambler()` before it can be generated. */
export function needsSolver(cubeSize: SupportedCubeSize): boolean {
  return cubeSize === RANDOM_STATE_SIZE;
}

export function generateScrambleForSize(cubeSize: SupportedCubeSize): string[] {
  if (cubeSize !== RANDOM_STATE_SIZE) return generateScramble(cubeSize);
  initScrambler();
  return Cube.scramble().trim().split(/\s+/);
}
