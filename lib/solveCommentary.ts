/**
 * Small, occasional commentary under the timer digits — the personal-best
 * badge's more casual sibling. The PB message always fires on an actual PB;
 * everything else here is a low-odds, no-reason-in-particular aside meant to
 * read like someone half-watching over your shoulder, not a coaching tool.
 */

export const PERSONAL_BEST_MESSAGE = "🏆 NEW PERSONAL BEST!";

/**
 * Deliberately not all about the result — half of these don't even mention
 * the time. Every line ends in ? if it's actually asking something, . or !
 * otherwise — no bare sentence fragments left hanging.
 *
 * Case is baked into each string rather than left to CSS — every line is
 * either fully lowercase or fully UPPERCASE, deliberately inconsistent
 * from one line to the next rather than one text-transform applied
 * uniformly to all of them.
 */
const COMMENTARY = [
  "lowered that average!",
  "TOUGH ONE THERE, HUH?",
  "last layer skip?",
  "IS THAT YOU BEHIND THE SCREEN STILL?",
  "🔥 that one was fast!",
  "PLL SKIP ENERGY ✨!",
  "🎯 dialed in!",
  "OKAY, SHOW OFF!",
];

/** ~1-in-7.5 solves, so it reads as occasional rather than every-other-solve. */
const COMMENTARY_CHANCE = 1 / 7.5;

/** null most of the time — only sometimes returns a line, and never the same call twice. */
export function rollCommentary(): string | null {
  if (Math.random() > COMMENTARY_CHANCE) return null;
  return COMMENTARY[Math.floor(Math.random() * COMMENTARY.length)];
}
