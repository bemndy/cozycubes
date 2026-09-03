interface SolveBadgeProps {
  /** The personal-best message, an occasional bit of commentary, or null for
   *  neither. Case is part of the message itself (see solveCommentary.ts) —
   *  PB is always written in caps, commentary lines are each individually
   *  upper or lower, deliberately inconsistent line to line. This component
   *  never transforms case itself. */
  message: string | null;
  /** Distinguishes the PB message from a commentary line for colour: a real
   *  achievement (--accent) vs. a casual aside (plain --ink-dim). Both are
   *  the same size and weight either way. */
  isNewPersonalBest: boolean;
}

/**
 * Sits in the gap between the timer and the hint/stats block below it,
 * centred in whatever room that gap has rather than hugging either edge —
 * see its wrapper in app/page.tsx, a flex-1 slot that always exists so the
 * hint/stats block never shifts when the badge appears or disappears.
 *
 * font-sans (the system UI face) rather than font-mono — this is
 * conversational text, not a data label.
 */
export function SolveBadge({ message, isNewPersonalBest }: SolveBadgeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="font-sans text-[13px] transition-opacity duration-300"
      style={{
        color: isNewPersonalBest ? "var(--accent)" : "var(--ink-dim)",
        opacity: message ? 1 : 0,
      }}
    >
      {message ?? ""}
    </div>
  );
}
