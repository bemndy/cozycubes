/**
 * Random-move scramble generator (not random-state). WCA's official
 * scrambler uses random-state generation with a full cube-state model,
 * which is significant extra work for marginal payoff in a scoped
 * session — random-move scrambles are what most non-WCA-affiliated
 * timers (and WCA scramblers historically) ship, and they're legal/fair
 * for practice as long as trivial redundancy is filtered out. Documented
 * here per the spec's ask to record which approach was used and why.
 *
 * Legality rules enforced:
 * - never repeat the same face as the immediately preceding move
 *   (e.g. "R R2" is redundant/illegal)
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
  /** whether wide moves (e.g. "Rw") are used for inner-layer turns */
  wide: boolean;
}

// 2x2/3x3 have no meaningful wide moves; 4x4+ need them to reach inner
// layers. Lengths are conservative random-move defaults, roughly in line
// with common non-WCA timer scramble lengths for each size.
const CUBE_CONFIG: Record<SupportedCubeSize, CubeSizeConfig> = {
  2: { length: 9, wide: false },
  3: { length: 20, wide: false },
  4: { length: 40, wide: true },
  5: { length: 60, wide: true },
  6: { length: 80, wide: true },
  7: { length: 100, wide: true },
};

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomModifier(): string {
  return MODIFIERS[randomInt(MODIFIERS.length)];
}

/**
 * Picks the next face given the last two faces used, respecting both
 * legality rules above. `wide` scrambles roll a 50/50 chance per move of
 * using the wide-layer variant of the chosen face (only meaningful for
 * cubes 4x4 and up).
 */
function pickMove(lastFace: Face | null, lastTwoAxes: string[], wide: boolean): string {
  const candidates = FACES.filter((face) => {
    if (face === lastFace) return false;
    if (lastTwoAxes.length === 2 && lastTwoAxes.every((axis) => axis === AXIS[face])) {
      return false;
    }
    return true;
  });
  const face = candidates[randomInt(candidates.length)];
  const useWide = wide && Math.random() < 0.5;
  const notation = useWide ? `${face}w` : face;
  return `${notation}${randomModifier()}`;
}

export function generateScramble(cubeSize: SupportedCubeSize): string[] {
  const config = CUBE_CONFIG[cubeSize];
  const moves: string[] = [];
  let lastFace: Face | null = null;
  const lastTwoAxes: string[] = [];

  for (let i = 0; i < config.length; i++) {
    const move = pickMove(lastFace, lastTwoAxes, config.wide);
    moves.push(move);

    const face = move[0] as Face;
    lastFace = face;
    lastTwoAxes.push(AXIS[face]);
    if (lastTwoAxes.length > 2) lastTwoAxes.shift();
  }

  return moves;
}

export function scrambleToString(moves: string[]): string {
  return moves.join(" ");
}
