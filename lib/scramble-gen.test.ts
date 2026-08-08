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

function faceOf(move: string): string {
  return move[0];
}

const SIZES: SupportedCubeSize[] = [2, 3, 4, 5, 6, 7];
const EXPECTED_LENGTH: Record<SupportedCubeSize, number> = {
  2: 9,
  3: 20,
  4: 40,
  5: 60,
  6: 80,
  7: 100,
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

  it("only uses legal faces and modifiers", () => {
    const moves = generateScramble(cubeSize);
    const pattern = cubeSize >= 4 ? /^[UDLRFB]w?['2]?$/ : /^[UDLRFB]['2]?$/;
    for (const move of moves) {
      expect(move).toMatch(pattern);
    }
  });
});
