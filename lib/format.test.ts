import { describe, expect, it } from "vitest";
import { formatRelativeAge, formatSolveWhen, formatTimeMs } from "./format";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Fixed reference point so the clock-time assertions below don't drift. */
const NOW = new Date("2026-03-14T15:30:00Z").getTime();

describe("formatTimeMs", () => {
  it("pads centiseconds and drops the minute field under a minute", () => {
    expect(formatTimeMs(9_040)).toBe("9.04");
  });

  it("zero-pads seconds once minutes are shown", () => {
    expect(formatTimeMs(65_120)).toBe("1:05.12");
  });
});

describe("formatRelativeAge", () => {
  it("reads anything under a minute as just now", () => {
    expect(formatRelativeAge(NOW - 59_999, NOW)).toBe("just now");
  });

  it("treats a solve timestamped ahead of now as fresh rather than negative", () => {
    expect(formatRelativeAge(NOW + 5_000, NOW)).toBe("just now");
  });

  it("counts whole minutes up to an hour", () => {
    expect(formatRelativeAge(NOW - MINUTE_MS, NOW)).toBe("1m ago");
    expect(formatRelativeAge(NOW - 59 * MINUTE_MS, NOW)).toBe("59m ago");
  });

  it("counts whole hours up to a day", () => {
    expect(formatRelativeAge(NOW - HOUR_MS, NOW)).toBe("1h ago");
    expect(formatRelativeAge(NOW - 23 * HOUR_MS, NOW)).toBe("23h ago");
  });

  it("counts whole days up to a week", () => {
    expect(formatRelativeAge(NOW - DAY_MS, NOW)).toBe("1d ago");
    expect(formatRelativeAge(NOW - 6 * DAY_MS, NOW)).toBe("6d ago");
  });

  it("falls back to a date once a week has passed", () => {
    const older = formatRelativeAge(NOW - 7 * DAY_MS, NOW);
    expect(older).not.toMatch(/ago|just now/);
    expect(older).toBe(
      new Date(NOW - 7 * DAY_MS).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    );
  });
});

describe("formatSolveWhen", () => {
  it("carries the solve number, its clock time, and its age", () => {
    const expectedClock = new Date(NOW - 5 * MINUTE_MS).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    expect(formatSolveWhen(12, NOW - 5 * MINUTE_MS, NOW)).toBe(
      `Solve 12 · ${expectedClock} · 5m ago`
    );
  });
});
