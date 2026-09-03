import { describe, expect, it } from "vitest";
import { solveTier, tierBaselineMs } from "./solveTier";
import type { Solve } from "./stats-engine";

function solve(
  timeMs: number,
  penalty: Solve["penalty"] = "none",
  overrides: Partial<Solve> = {}
): Solve {
  return {
    id: crypto.randomUUID(),
    cubeSize: 3,
    timeMs,
    penalty,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("tierBaselineMs", () => {
  it("is the mean of non-DNF solves", () => {
    const solves = [solve(10000), solve(12000), solve(14000)];
    expect(tierBaselineMs(solves)).toBe(12000);
  });

  it("is null with no ratable solves", () => {
    expect(tierBaselineMs([])).toBeNull();
    expect(tierBaselineMs([solve(10000, "DNF")])).toBeNull();
  });
});

describe("solveTier", () => {
  const baseline = 12000;

  it("flags any penalty regardless of raw speed", () => {
    // Fast enough to be "good" on raw time, but penalised.
    expect(solveTier(solve(5000, "+2"), baseline)).toBe("penalty");
    expect(solveTier(solve(5000, "DNF"), baseline)).toBe("penalty");
  });

  it("rates comfortably under the baseline as good", () => {
    expect(solveTier(solve(9000), baseline)).toBe("good");
  });

  it("rates within the band as average", () => {
    expect(solveTier(solve(12000), baseline)).toBe("average");
    expect(solveTier(solve(11800), baseline)).toBe("average");
    expect(solveTier(solve(12500), baseline)).toBe("average");
  });

  it("rates comfortably over the baseline as slow", () => {
    expect(solveTier(solve(15000), baseline)).toBe("slow");
  });

  it("treats the band edges as inclusive", () => {
    expect(solveTier(solve(baseline * 0.95), baseline)).toBe("good");
    expect(solveTier(solve(baseline * 1.05), baseline)).toBe("average");
  });

  it("falls back to average without a usable baseline", () => {
    expect(solveTier(solve(9000), null)).toBe("average");
    expect(solveTier(solve(9000), 0)).toBe("average");
  });
});
