/**
 * NxN cube state, for rendering the unfolded scramble diagram.
 *
 * Stickers are identified by the face they started on, so a sticker's value is
 * also its colour. State is [row][col] per face, always as seen looking at that
 * face from outside the cube, row 0 at the top, col 0 at the left.
 *
 * That single convention is what keeps the move tables readable: because every
 * side face is indexed as seen from outside, the four side faces' rows chain
 * continuously around the cube, so U and D cycle their bands with no reversals
 * at all. The reversals that do appear (in R, L, F, B) are real — they're the
 * places where two faces genuinely meet in opposite directions.
 *
 * Face row/col meanings that follow from the convention, and that the move
 * tables below depend on:
 *   U  row 0 = back,  row n-1 = front
 *   D  row 0 = front, row n-1 = back
 *   L  col 0 = back,  col n-1 = front
 *   R  col 0 = front, col n-1 = back
 *   B  col 0 = cube's right, col n-1 = cube's left
 */

export type FaceKey = "U" | "R" | "F" | "D" | "L" | "B";

export type CubeState = Record<FaceKey, FaceKey[][]>;

/** A single sticker position. */
type Coord = [FaceKey, number, number];

/**
 * Four bands in flow order: the contents of bands[i] move to bands[i+1], and
 * the last wraps to the first. Index j within a band maps to index j in the
 * next, so any reversal is baked into how the coordinates are listed.
 */
type Bands = [Coord[], Coord[], Coord[], Coord[]];

const FACES: FaceKey[] = ["U", "R", "F", "D", "L", "B"];

export function solvedCube(n: number): CubeState {
  const state = {} as CubeState;
  for (const face of FACES) {
    state[face] = Array.from({ length: n }, () => Array.from({ length: n }, () => face));
  }
  return state;
}

/** 0..n-1 */
function seq(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** n-1..0 */
function rseq(n: number): number[] {
  return seq(n).reverse();
}

/**
 * The four bands cycled by a clockwise turn of `face` at `layer` (0 = the
 * outermost layer on that face).
 */
function bandsFor(face: FaceKey, n: number, layer: number): Bands {
  const last = n - 1;
  const near = layer; // depth measured from the turning face
  const far = last - layer; // the mirrored index

  switch (face) {
    // Content flows B -> R -> F -> L. Rows chain with no reversal.
    case "U":
      return [
        seq(n).map((c) => ["B", near, c] as Coord),
        seq(n).map((c) => ["R", near, c] as Coord),
        seq(n).map((c) => ["F", near, c] as Coord),
        seq(n).map((c) => ["L", near, c] as Coord),
      ];

    // The opposite direction: F -> R -> B -> L.
    case "D":
      return [
        seq(n).map((c) => ["F", far, c] as Coord),
        seq(n).map((c) => ["R", far, c] as Coord),
        seq(n).map((c) => ["B", far, c] as Coord),
        seq(n).map((c) => ["L", far, c] as Coord),
      ];

    // F -> U -> B -> D. B is listed bottom-to-top: U's back edge meets B's top
    // edge, so the two run in opposite directions.
    case "R":
      return [
        seq(n).map((r) => ["F", r, far] as Coord),
        seq(n).map((r) => ["U", r, far] as Coord),
        rseq(n).map((r) => ["B", r, near] as Coord),
        seq(n).map((r) => ["D", r, far] as Coord),
      ];

    // Mirror of R: F -> D -> B -> U.
    case "L":
      return [
        seq(n).map((r) => ["F", r, near] as Coord),
        seq(n).map((r) => ["D", r, near] as Coord),
        rseq(n).map((r) => ["B", r, far] as Coord),
        seq(n).map((r) => ["U", r, near] as Coord),
      ];

    // U -> R -> D -> L.
    case "F":
      return [
        seq(n).map((c) => ["U", far, c] as Coord),
        seq(n).map((r) => ["R", r, near] as Coord),
        rseq(n).map((c) => ["D", near, c] as Coord),
        rseq(n).map((r) => ["L", r, far] as Coord),
      ];

    // Mirror of F: U -> L -> D -> R.
    case "B":
      return [
        rseq(n).map((c) => ["U", near, c] as Coord),
        seq(n).map((r) => ["L", r, near] as Coord),
        seq(n).map((c) => ["D", far, c] as Coord),
        rseq(n).map((r) => ["R", r, far] as Coord),
      ];
  }
}

/** Rotates a face's own stickers a quarter turn clockwise, in place. */
function rotateFaceClockwise(state: CubeState, face: FaceKey, n: number): void {
  const src = state[face].map((row) => row.slice());
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      state[face][c][n - 1 - r] = src[r][c];
    }
  }
}

/** Advances one band-cycle by a single quarter turn. */
function cycleBands(state: CubeState, bands: Bands): void {
  const values = bands.map((band) => band.map(([f, r, c]) => state[f][r][c]));
  for (let b = 0; b < 4; b++) {
    const target = bands[(b + 1) % 4];
    const source = values[b];
    target.forEach(([f, r, c], j) => {
      state[f][r][c] = source[j];
    });
  }
}

export interface ParsedMove {
  face: FaceKey;
  /** Layers turned, counted from the face. 1 = a plain outer turn. */
  depth: number;
  /** Quarter turns clockwise, 1..3. */
  quarters: number;
}

/**
 * Parses WCA notation as produced by lib/scramble-gen: `R`, `R'`, `R2`, `Rw`,
 * `Rw'`, `3Rw`, `3Rw2`, and so on. Returns null for anything unrecognised.
 */
export function parseMove(move: string): ParsedMove | null {
  const match = /^(\d*)([UDLRFB])(w?)(['2]?)$/.exec(move);
  if (!match) return null;

  const [, depthPrefix, face, wide, modifier] = match;
  // A bare face is one layer; `Rw` is two; `3Rw` states its own depth.
  const depth = wide ? (depthPrefix ? Number(depthPrefix) : 2) : 1;
  const quarters = modifier === "2" ? 2 : modifier === "'" ? 3 : 1;

  return { face: face as FaceKey, depth, quarters };
}

export function applyMove(state: CubeState, move: string, n: number): void {
  const parsed = parseMove(move);
  if (!parsed) return;

  const { face, depth, quarters } = parsed;
  const layers = Math.min(depth, n);

  for (let q = 0; q < quarters; q++) {
    // Only the outermost layer carries the face's own stickers around.
    rotateFaceClockwise(state, face, n);
    for (let layer = 0; layer < layers; layer++) {
      cycleBands(state, bandsFor(face, n, layer));
    }
  }
}

/** A solved cube with the scramble applied. */
export function scrambledCube(n: number, moves: string[]): CubeState {
  const state = solvedCube(n);
  for (const move of moves) applyMove(state, move, n);
  return state;
}

/** Standard WCA colour scheme, keyed by a sticker's home face. */
export const FACE_COLORS: Record<FaceKey, string> = {
  U: "#f2f2f2", // white
  D: "#ffd500", // yellow
  F: "#009b48", // green
  B: "#0046ad", // blue
  R: "#b71234", // red
  L: "#ff5800", // orange
};
