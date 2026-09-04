export type Penalty = "none" | "+2" | "DNF";

export interface Solve {
  id: string;
  cubeSize: number;
  /** raw solve time in milliseconds, before penalty */
  timeMs: number;
  penalty: Penalty;
  timestamp: number;
  comment?: string;
}

/** Time after penalty is applied. DNF has no numeric time. */
export function effectiveTimeMs(solve: Solve): number | null {
  if (solve.penalty === "DNF") return null;
  if (solve.penalty === "+2") return solve.timeMs + 2000;
  return solve.timeMs;
}

/** Lowest effective time across all solves. null if every solve is DNF (or list is empty). */
export function bestSingle(solves: Solve[]): number | null {
  let best: number | null = null;
  for (const solve of solves) {
    const t = effectiveTimeMs(solve);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

/** Highest effective time across all solves. null if every solve is DNF (or list is empty). */
export function worstSingle(solves: Solve[]): number | null {
  let worst: number | null = null;
  for (const solve of solves) {
    const t = effectiveTimeMs(solve);
    if (t !== null && (worst === null || t > worst)) worst = t;
  }
  return worst;
}

/**
 * "Bo5" = best single time achieved within a window of `n` (default 5)
 * most recent solves — distinct from Ao5, which averages the window
 * instead of taking its minimum.
 */
export function bestOfN(solves: Solve[], n = 5): number | null {
  if (solves.length < n) return null;
  const window = solves.slice(-n);
  return bestSingle(window);
}

/**
 * WCA trimmed-mean average of the most recent `n` solves: drop the best
 * and worst, average the remaining n-2. A single DNF in the window counts
 * as the worst (and is dropped); two or more DNFs makes the whole average
 * a DNF (returns null). Returns null if fewer than n solves exist.
 */
export function average(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null;
  const window = solves.slice(-n);

  const dnfCount = window.filter((s) => s.penalty === "DNF").length;
  if (dnfCount >= 2) return null;

  const times = window.map(effectiveTimeMs);
  // Sort with DNF (null) treated as +Infinity so it sorts as the worst value.
  const sorted = [...times].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  const trimmed = sorted.slice(1, -1);

  if (trimmed.some((t) => t === null)) return null;
  const sum = (trimmed as number[]).reduce((acc, t) => acc + t, 0);
  return sum / trimmed.length;
}

export function ao5(solves: Solve[]): number | null {
  return average(solves, 5);
}

export function ao12(solves: Solve[]): number | null {
  return average(solves, 12);
}

export function ao100(solves: Solve[]): number | null {
  return average(solves, 100);
}

/** Arithmetic mean of every non-DNF solve. null if there are no valid solves. */
export function allTimeMean(solves: Solve[]): number | null {
  const times = solves
    .map(effectiveTimeMs)
    .filter((t): t is number => t !== null);
  if (times.length === 0) return null;
  return times.reduce((acc, t) => acc + t, 0) / times.length;
}
