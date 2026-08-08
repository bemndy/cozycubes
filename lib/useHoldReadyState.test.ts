import { describe, expect, it } from "vitest";
import { penaltyForInspectionElapsed } from "./useHoldReadyState";

describe("penaltyForInspectionElapsed", () => {
  it("no penalty from 0 up to and including 15000ms", () => {
    expect(penaltyForInspectionElapsed(0)).toBe("none");
    expect(penaltyForInspectionElapsed(14999)).toBe("none");
    expect(penaltyForInspectionElapsed(15000)).toBe("none");
  });

  it("+2 penalty between 15000ms (exclusive) and 17000ms (inclusive)", () => {
    expect(penaltyForInspectionElapsed(15001)).toBe("+2");
    expect(penaltyForInspectionElapsed(16000)).toBe("+2");
    expect(penaltyForInspectionElapsed(17000)).toBe("+2");
  });

  it("DNF past 17000ms", () => {
    expect(penaltyForInspectionElapsed(17001)).toBe("DNF");
    expect(penaltyForInspectionElapsed(30000)).toBe("DNF");
  });
});
