import { describe, expect, it } from "vitest";
import { solvesToCsv } from "./export";
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
    timestamp: 0,
    ...overrides,
  };
}

describe("solvesToCsv", () => {
  it("returns just the header for an empty list", () => {
    expect(solvesToCsv([])).toBe("timestamp,cube_size,time_ms,penalty,effective_time_ms");
  });

  it("writes one row per solve with the effective time", () => {
    const csv = solvesToCsv([solve(10000, "none", { timestamp: 0, cubeSize: 3 })]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("timestamp,cube_size,time_ms,penalty,effective_time_ms");
    expect(row).toBe("1970-01-01T00:00:00.000Z,3,10000,none,10000");
  });

  it("applies the +2 penalty to effective_time_ms", () => {
    const [, row] = solvesToCsv([solve(10000, "+2")]).split("\n");
    expect(row).toBe("1970-01-01T00:00:00.000Z,3,10000,+2,12000");
  });

  it("leaves effective_time_ms blank for DNF", () => {
    const [, row] = solvesToCsv([solve(10000, "DNF")]).split("\n");
    expect(row).toBe("1970-01-01T00:00:00.000Z,3,10000,DNF,");
  });

  it("preserves solve order", () => {
    const csv = solvesToCsv([solve(1000, "none", { timestamp: 1 }), solve(2000, "none", { timestamp: 2 })]);
    const rows = csv.split("\n").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(",1000,");
    expect(rows[1]).toContain(",2000,");
  });
});
