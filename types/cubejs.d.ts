/**
 * cubejs ships no TypeScript types (and no @types package exists), so this
 * declares the surface we actually use. See node_modules/cubejs/README.md.
 */
declare module "cubejs" {
  class Cube {
    constructor(state?: Cube | object);
    /** Applies an algorithm in standard notation, e.g. "R U R' U'". */
    move(algorithm: string): Cube;
    /** Two-phase (Kociemba) solve. Requires initSolver() to have run. */
    solve(maxDepth?: number): string;
    isSolved(): boolean;
    randomize(): void;

    /**
     * Builds the solver's move and pruning tables. Synchronous and blocking —
     * roughly 1-2s — and required before solve() or scramble() will work.
     * Safe to call repeatedly; subsequent calls are cheap.
     */
    static initSolver(): void;

    /**
     * A random-state scramble: a uniformly random cube state is solved and the
     * solution inverted, which is how WCA scrambles are produced. Returns
     * space-separated standard notation.
     */
    static scramble(): string;

    static random(): Cube;
  }

  export default Cube;
}
