import { describe, expect, it } from "vitest";
import {
  allTimeMean,
  ao100,
  ao12,
  ao5,
  bestOfN,
  bestSingle,
  effectiveTimeMs,
  worstSingle,
  type Solve,
} from "./stats-engine";

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

describe("effectiveTimeMs", () => {
  it("returns raw time with no penalty", () => {
    expect(effectiveTimeMs(solve(10000))).toBe(10000);
  });
  it("adds 2000ms for a +2 penalty", () => {
    expect(effectiveTimeMs(solve(10000, "+2"))).toBe(12000);
  });
  it("returns null for DNF", () => {
    expect(effectiveTimeMs(solve(10000, "DNF"))).toBeNull();
  });
});

describe("bestSingle", () => {
  it("picks the lowest effective time", () => {
    const solves = [solve(15000), solve(9000), solve(20000, "+2")]; // 15000, 9000, 22000
    expect(bestSingle(solves)).toBe(9000);
  });
  it("ignores DNFs", () => {
    const solves = [solve(9000, "DNF"), solve(11000)];
    expect(bestSingle(solves)).toBe(11000);
  });
  it("returns null when every solve is DNF", () => {
    expect(bestSingle([solve(9000, "DNF")])).toBeNull();
  });
  it("returns null for an empty list", () => {
    expect(bestSingle([])).toBeNull();
  });
});

describe("worstSingle", () => {
  it("picks the highest effective time", () => {
    const solves = [solve(15000), solve(9000), solve(20000, "+2")]; // 15000, 9000, 22000
    expect(worstSingle(solves)).toBe(22000);
  });
  it("ignores DNFs", () => {
    const solves = [solve(9000, "DNF"), solve(11000)];
    expect(worstSingle(solves)).toBe(11000);
  });
  it("returns null when every solve is DNF", () => {
    expect(worstSingle([solve(9000, "DNF")])).toBeNull();
  });
  it("returns null for an empty list", () => {
    expect(worstSingle([])).toBeNull();
  });
});

describe("bestOfN", () => {
  it("returns null when fewer than n solves exist", () => {
    expect(bestOfN([solve(9000), solve(10000)], 5)).toBeNull();
  });
  it("returns the best single within the most recent n solves", () => {
    const solves = [
      solve(5000), // outside the window of 5
      solve(15000),
      solve(9000),
      solve(20000),
      solve(11000),
      solve(13000),
    ];
    expect(bestOfN(solves, 5)).toBe(9000);
  });
});

describe("ao5 (WCA trimmed mean)", () => {
  it("drops best and worst, averages remaining 3", () => {
    // times: 10000, 11000, 12000, 13000, 14000 -> drop 10000 & 14000 -> avg(11000,12000,13000) = 12000
    const solves = [10000, 11000, 12000, 13000, 14000].map((t) => solve(t));
    expect(ao5(solves)).toBe(12000);
  });

  it("returns null with fewer than 5 solves", () => {
    const solves = [10000, 11000].map((t) => solve(t));
    expect(ao5(solves)).toBeNull();
  });

  it("treats a single DNF as the dropped worst value", () => {
    // 10000, 11000, 12000, 13000, DNF -> DNF is worst & dropped, 10000 is best & dropped
    // remaining: 11000, 12000, 13000 -> avg = 12000
    const solves = [
      solve(10000),
      solve(11000),
      solve(12000),
      solve(13000),
      solve(9999, "DNF"),
    ];
    expect(ao5(solves)).toBe(12000);
  });

  it("returns null (DNF average) when 2+ DNFs are in the window", () => {
    const solves = [
      solve(10000),
      solve(11000),
      solve(12000),
      solve(1, "DNF"),
      solve(2, "DNF"),
    ];
    expect(ao5(solves)).toBeNull();
  });

  it("only considers the most recent 5 solves", () => {
    const solves = [
      solve(99999), // older, outside the window of 5
      solve(10000),
      solve(11000),
      solve(12000),
      solve(13000),
      solve(14000),
    ];
    expect(ao5(solves)).toBe(12000);
  });
});

describe("ao12", () => {
  it("drops best and worst, averages remaining 10", () => {
    const times = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => n * 1000);
    // drop 1000 and 12000, average of 2000..11000 = 6500
    const solves = times.map((t) => solve(t));
    expect(ao12(solves)).toBe(6500);
  });

  it("returns null with fewer than 12 solves", () => {
    const solves = Array.from({ length: 11 }, (_, i) => solve((i + 1) * 1000));
    expect(ao12(solves)).toBeNull();
  });
});

describe("ao100", () => {
  it("drops best and worst, averages remaining 98", () => {
    const times = Array.from({ length: 100 }, (_, i) => (i + 1) * 1000);
    // drop 1000 and 100000, average of 2000..99000 = 50500
    const solves = times.map((t) => solve(t));
    expect(ao100(solves)).toBe(50500);
  });

  it("returns null with fewer than 100 solves", () => {
    const solves = Array.from({ length: 99 }, (_, i) => solve((i + 1) * 1000));
    expect(ao100(solves)).toBeNull();
  });
});

describe("allTimeMean", () => {
  it("averages all non-DNF solves regardless of count", () => {
    const solves = [solve(10000), solve(20000), solve(9000, "DNF")];
    expect(allTimeMean(solves)).toBe(15000);
  });

  it("applies +2 penalties before averaging", () => {
    const solves = [solve(10000, "+2"), solve(10000)];
    expect(allTimeMean(solves)).toBe(11000);
  });

  it("returns null when there are no valid solves", () => {
    expect(allTimeMean([solve(1, "DNF")])).toBeNull();
  });
});
