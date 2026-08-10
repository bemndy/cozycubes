import { describe, expect, it } from "vitest";
import {
  applyMove,
  parseMove,
  scrambledCube,
  solvedCube,
  type CubeState,
  type FaceKey,
} from "./cubeNet";

const FACES: FaceKey[] = ["U", "R", "F", "D", "L", "B"];

function clone(state: CubeState): CubeState {
  const copy = {} as CubeState;
  for (const face of FACES) copy[face] = state[face].map((row) => row.slice());
  return copy;
}

function apply(n: number, moves: string[]): CubeState {
  const state = solvedCube(n);
  for (const move of moves) applyMove(state, move, n);
  return state;
}

function stickerCounts(state: CubeState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const face of FACES) {
    for (const row of state[face]) {
      for (const sticker of row) counts[sticker] = (counts[sticker] ?? 0) + 1;
    }
  }
  return counts;
}

describe("parseMove", () => {
  it("reads plain, prime, and double turns", () => {
    expect(parseMove("R")).toEqual({ face: "R", depth: 1, quarters: 1 });
    expect(parseMove("R'")).toEqual({ face: "R", depth: 1, quarters: 3 });
    expect(parseMove("R2")).toEqual({ face: "R", depth: 1, quarters: 2 });
  });

  it("reads wide turns and explicit depths", () => {
    expect(parseMove("Rw")).toEqual({ face: "R", depth: 2, quarters: 1 });
    expect(parseMove("Rw'")).toEqual({ face: "R", depth: 2, quarters: 3 });
    expect(parseMove("3Rw")).toEqual({ face: "R", depth: 3, quarters: 1 });
    expect(parseMove("3Rw2")).toEqual({ face: "R", depth: 3, quarters: 2 });
  });

  it("rejects nonsense", () => {
    expect(parseMove("X")).toBeNull();
    expect(parseMove("")).toBeNull();
    expect(parseMove("R3")).toBeNull();
  });
});

/**
 * These three pin the orientation conventions. Every other test here would pass
 * just as happily on a self-consistent but wrongly-wired cube; only checking a
 * known turn against a real cube catches that.
 */
describe("orientation", () => {
  it("U brings the right face's colour onto the front's top row", () => {
    const state = apply(3, ["U"]);
    expect(state.F[0]).toEqual(["R", "R", "R"]);
  });

  it("R brings the bottom face's colour onto the front's right column", () => {
    const state = apply(3, ["R"]);
    expect(state.F.map((row) => row[2])).toEqual(["D", "D", "D"]);
  });

  it("F brings the left face's colour onto the top's front row", () => {
    const state = apply(3, ["F"]);
    expect(state.U[2]).toEqual(["L", "L", "L"]);
  });

  it("leaves the turning face's own colour intact", () => {
    const state = apply(3, ["U"]);
    expect(state.U.flat().every((s) => s === "U")).toBe(true);
  });
});

describe("applyMove", () => {
  it.each(["U", "D", "L", "R", "F", "B"])(
    "returns to solved after four quarter turns of %s",
    (face) => {
      expect(apply(3, [face, face, face, face])).toEqual(solvedCube(3));
    }
  );

  it.each([
    ["R", "R'"],
    ["U", "U'"],
    ["Rw", "Rw'"],
    ["3Rw", "3Rw'"],
  ])("undoes %s with %s", (move, inverse) => {
    expect(apply(5, [move, inverse])).toEqual(solvedCube(5));
  });

  it("treats a double turn as two quarter turns", () => {
    expect(apply(4, ["R2"])).toEqual(apply(4, ["R", "R"]));
  });

  it("leaves inner layers alone on a plain outer turn", () => {
    const before = solvedCube(5);
    const after = apply(5, ["R"]);
    // Column 0 of F is four layers away from R and must be untouched.
    expect(after.F.map((row) => row[0])).toEqual(before.F.map((row) => row[0]));
  });

  it("turns two layers for a wide move", () => {
    const after = apply(5, ["Rw"]);
    expect(after.F.map((row) => row[4])).toEqual(["D", "D", "D", "D", "D"]);
    expect(after.F.map((row) => row[3])).toEqual(["D", "D", "D", "D", "D"]);
    expect(after.F.map((row) => row[2])).toEqual(["F", "F", "F", "F", "F"]);
  });

  it("ignores unparseable moves rather than corrupting the cube", () => {
    const state = solvedCube(3);
    const before = clone(state);
    applyMove(state, "not-a-move", 3);
    expect(state).toEqual(before);
  });
});

describe("scrambledCube", () => {
  it.each([2, 3, 4, 5, 6, 7])("conserves 9 stickers per colour on %ix%i", (n) => {
    const moves = ["R", "U'", "F2", "Lw", "B", "D'", "Rw2", "U"];
    const counts = stickerCounts(scrambledCube(n, moves));
    for (const face of FACES) expect(counts[face]).toBe(n * n);
  });

  it("is deterministic", () => {
    const moves = ["R", "U", "F'", "L2"];
    expect(scrambledCube(3, moves)).toEqual(scrambledCube(3, moves));
  });

  it("actually changes the cube", () => {
    expect(scrambledCube(3, ["R", "U"])).not.toEqual(solvedCube(3));
  });
});
