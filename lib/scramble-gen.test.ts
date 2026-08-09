import { describe, expect, it } from "vitest";
import { generateScramble, type SupportedCubeSize } from "./scramble-gen";

const AXIS: Record<string, string> = {
  U: "UD",
  D: "UD",
  L: "LR",
  R: "LR",
  F: "FB",
  B: "FB",
};

// depth 1 -> "R", depth 2 -> "Rw", depth >=3 -> "<depth>Rw", per WCA Reg 12a2.
const MOVE_PATTERN = /^(\d*)([UDLRFB])(w?)(['2]?)$/;

function parseMove(move: string): { depth: number; face: string; modifier: string } {
  const match = move.match(MOVE_PATTERN);
  if (!match) throw new Error(`move "${move}" doesn't match expected notation shape`);
  const [, digits, face, wide, modifier] = match;
  const depth = digits ? Number(digits) : wide ? 2 : 1;
  return { depth, face, modifier };
}

function faceOf(move: string): string {
  return parseMove(move).face;
}

const SIZES: SupportedCubeSize[] = [2, 3, 4, 5, 6, 7];
const EXPECTED_LENGTH: Record<SupportedCubeSize, number> = {
  2: 11,
  3: 20,
  4: 40,
  5: 60,
  6: 80,
  7: 100,
};
// maxDepth = N - 1, per WCA Regulation 12a2 (1 < n < N).
const EXPECTED_MAX_DEPTH: Record<SupportedCubeSize, number> = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
};

describe.each(SIZES)("generateScramble(%i)", (cubeSize) => {
  it(`produces ${EXPECTED_LENGTH[cubeSize]} moves`, () => {
    expect(generateScramble(cubeSize)).toHaveLength(EXPECTED_LENGTH[cubeSize]);
  });

  it("never repeats the same face on consecutive moves", () => {
    // run several times since generation is random
    for (let trial = 0; trial < 25; trial++) {
      const moves = generateScramble(cubeSize);
      for (let i = 1; i < moves.length; i++) {
        expect(faceOf(moves[i])).not.toBe(faceOf(moves[i - 1]));
      }
    }
  });

  it("never uses the same axis for three consecutive moves", () => {
    for (let trial = 0; trial < 25; trial++) {
      const moves = generateScramble(cubeSize);
      for (let i = 2; i < moves.length; i++) {
        const axes = [moves[i - 2], moves[i - 1], moves[i]].map((m) => AXIS[faceOf(m)]);
        const allSame = axes.every((a) => a === axes[0]);
        expect(allSame).toBe(false);
      }
    }
  });

  it("only uses legal notation shapes and depths within 1..maxDepth (Reg 12a2)", () => {
    const maxDepth = EXPECTED_MAX_DEPTH[cubeSize];
    const moves = generateScramble(cubeSize);
    for (const move of moves) {
      const { depth, modifier } = parseMove(move);
      expect(depth).toBeGreaterThanOrEqual(1);
      expect(depth).toBeLessThanOrEqual(maxDepth);
      expect(["", "'", "2"]).toContain(modifier);
      // depth 1 must never carry a "w"; depth >=2 always must.
      const hasWide = /w/.test(move);
      expect(hasWide).toBe(depth >= 2);
      // depth >=3 must carry an explicit numeric prefix equal to its depth;
      // depth 1-2 must not (Reg 12a2: "1Rw" invalid, "2Rw"/"Rw" both valid
      // but this generator always emits the bare "Rw" form for depth 2).
      const prefixMatch = move.match(/^(\d*)/);
      const prefix = prefixMatch ? prefixMatch[1] : "";
      if (depth >= 3) {
        expect(prefix).toBe(String(depth));
      } else {
        expect(prefix).toBe("");
      }
    }
  });

  if (EXPECTED_MAX_DEPTH[cubeSize] >= 3) {
    it("uses depths beyond 2 somewhere across many scrambles (reaches inner layers)", () => {
      let sawDeepMove = false;
      for (let trial = 0; trial < 25 && !sawDeepMove; trial++) {
        const moves = generateScramble(cubeSize);
        sawDeepMove = moves.some((m) => parseMove(m).depth >= 3);
      }
      expect(sawDeepMove).toBe(true);
    });
  }
});
