/**
 * Solve quality tiers — a presentation-only flag, not business logic.
 *
 * Rates a solve against the session baseline so the history list can show a
 * coloured square beside each time. Deliberately simple: it reuses the existing
 * stats-engine maths and adds no new state, no schema field, and no thresholds
 * beyond a +/-5% band around the mean.
 *
 * Extension point: Flow Mode's skill tiers (spec section 6.1) want the same
 * shape of judgement — "how good was this, for this user" — driving BPM band
 * and palette intensity. When that lands it should widen this function rather
 * than introduce a second, differently-tuned notion of a good solve.
 */

import { allTimeMean, effectiveTimeMs, type Solve } from "./stats-engine";

export type SolveTier = "good" | "average" | "slow" | "penalty";

/** Faster than this share of the baseline counts as good. */
const GOOD_RATIO = 0.95;
/** Slower than this share of the baseline counts as slow. */
const SLOW_RATIO = 1.05;

/**
 * The comparison baseline for a set of solves — computed once by the caller and
 * passed to every solveTier() call, so rating a list stays linear.
 */
export function tierBaselineMs(solves: Solve[]): number | null {
  return allTimeMean(solves);
}

export function solveTier(solve: Solve, baselineMs: number | null): SolveTier {
  // DNF and +2 both read as the warning tone regardless of raw speed — a
  // penalised solve isn't a good solve.
  if (solve.penalty !== "none") return "penalty";

  const effective = effectiveTimeMs(solve);
  if (effective === null) return "penalty";

  // No baseline yet (first solve, or every prior solve was a DNF) — nothing
  // meaningful to compare against.
  if (baselineMs === null || baselineMs <= 0) return "average";

  if (effective <= baselineMs * GOOD_RATIO) return "good";
  if (effective <= baselineMs * SLOW_RATIO) return "average";
  return "slow";
}

/** CSS custom property carrying each tier's colour. */
export const TIER_COLOR_VAR: Record<SolveTier, string> = {
  good: "var(--quality-good)",
  average: "var(--quality-mid)",
  slow: "var(--quality-slow)",
  penalty: "var(--quality-warn)",
};
