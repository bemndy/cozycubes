/**
 * Random-move scramble generator. WCA's official scrambler (TNoodle) uses
 * true random-state generation (uniformly-random cube permutation, solved
 * back to a move sequence) only for 2x2/3x3 — confirmed via TNoodle's own
 * docs that big cubes (4x4-7x7) and Megaminx are random-move ("TNoodle
 * directly generates a bunch of random moves" for these), same approach
 * used here. 2x2/3x3 random-state would require porting a real solver
 * (e.g. a two-phase/Kociemba-style algorithm) — a substantial undertaking
 * flagged separately for a future session rather than done here; 2x2/3x3
 * stay random-move for now, which is legal/fair for practice, just not
 * bit-identical to official competition scrambles.
 *
 * Move notation matches WCA Regulation 12a2: a wide move's layer depth n
 * must satisfy 1 < n < N (N = layers in the cube), e.g. 3Rw is valid
 * notation for 4x4 and up. Depth 1 = plain face move (R), depth 2 = Rw,
 * depth >=3 = "<depth>Rw" (e.g. 3Rw, 4Lw). Move counts (40/60/80/100 for
 * 4x4-7x7) match TNoodle's published scramble lengths.
 *
 * Legality rules enforced:
 * - never repeat the same face as the immediately preceding move,
 *   regardless of depth (e.g. "Rw R'" is redundant/illegal)
 * - never pick a move on the same axis as the two preceding moves
 *   (prevents "R L R" style sequences that only shuffle two faces)
 */

export type Face = "U" | "D" | "L" | "R" | "F" | "B";
const FACES: Face[] = ["U", "D", "L", "R", "F", "B"];
const AXIS: Record<Face, "UD" | "LR" | "FB"> = {
  U: "UD",
  D: "UD",
  L: "LR",
  R: "LR",
  F: "FB",
  B: "FB",
};
const MODIFIERS = ["", "'", "2"] as const;

export type SupportedCubeSize = 2 | 3 | 4 | 5 | 6 | 7;

interface CubeSizeConfig {
  /** number of moves in a generated scramble */
  length: number;
  /** deepest legal wide-move depth for this size, per WCA Reg 12a2 (n < N) */
  maxDepth: number;
}

// maxDepth = N-1 per WCA Regulation 12a2 (1 < n < N). 2x2 has no wide moves
// (maxDepth 1 = plain face turns only). Lengths match TNoodle's published
// scramble lengths for 4x4-7x7; 2x2/3x3 lengths are this project's own
// random-move defaults (see file header — those two sizes aren't
// random-state here yet).
const CUBE_CONFIG: Record<SupportedCubeSize, CubeSizeConfig> = {
  2: { length: 9, maxDepth: 1 },
  3: { length: 20, maxDepth: 2 },
  4: { length: 40, maxDepth: 3 },
  5: { length: 60, maxDepth: 4 },
  6: { length: 80, maxDepth: 5 },
  7: { length: 100, maxDepth: 6 },
};

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomModifier(): string {
  return MODIFIERS[randomInt(MODIFIERS.length)];
}

/** depth 1 -> "R", depth 2 -> "Rw", depth >=3 -> "3Rw" etc, per Reg 12a2. */
function formatDepth(face: Face, depth: number): string {
  if (depth === 1) return face;
  if (depth === 2) return `${face}w`;
  return `${depth}${face}w`;
}

interface PickedMove {
  notation: string;
  face: Face;
}

/**
 * Picks the next face given the last two faces used, respecting both
 * legality rules above, then picks a depth uniformly at random from the
 * full legal range for this cube size (1 through maxDepth).
 */
function pickMove(lastFace: Face | null, lastTwoAxes: string[], maxDepth: number): PickedMove {
  const candidates = FACES.filter((face) => {
    if (face === lastFace) return false;
    if (lastTwoAxes.length === 2 && lastTwoAxes.every((axis) => axis === AXIS[face])) {
      return false;
    }
    return true;
  });
  const face = candidates[randomInt(candidates.length)];
  const depth = 1 + randomInt(maxDepth);
  const notation = `${formatDepth(face, depth)}${randomModifier()}`;
  return { notation, face };
}

export function generateScramble(cubeSize: SupportedCubeSize): string[] {
  const config = CUBE_CONFIG[cubeSize];
  const moves: string[] = [];
  let lastFace: Face | null = null;
  const lastTwoAxes: string[] = [];

  for (let i = 0; i < config.length; i++) {
    const { notation, face } = pickMove(lastFace, lastTwoAxes, config.maxDepth);
    moves.push(notation);

    lastFace = face;
    lastTwoAxes.push(AXIS[face]);
    if (lastTwoAxes.length > 2) lastTwoAxes.shift();
  }

  return moves;
}

export function scrambleToString(moves: string[]): string {
  return moves.join(" ");
}
