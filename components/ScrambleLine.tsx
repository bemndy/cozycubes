"use client";

import { scrambleToString } from "@/lib/scramble-gen";
import { RefreshGlyph } from "./ui/Glyphs";

interface ScrambleLineProps {
  scramble: string[];
  onRefresh: () => void;
  /** True during inspection/solve, when rerolling is blocked. */
  locked: boolean;
}

/**
 * The pinned scramble, with a reroll button beside it.
 *
 * The measure is deliberately narrower than the shell so a 3x3 scramble breaks
 * over two lines. One long line forces the eye to track sideways across the
 * whole viewport mid-glance, and 4x4 and up would run off regardless — two
 * lines is the shape the block should always have.
 *
 * The button is the pointer equivalent of the Tab keybind and shares its guard,
 * so neither route can change the scramble mid-solve.
 */
export function ScrambleLine({ scramble, onRefresh, locked }: ScrambleLineProps) {
  return (
    <div className="flex w-full items-start justify-center gap-3">
      <p className="max-w-[30rem] text-center font-mono text-[15px] leading-[1.8] tracking-wide sm:text-[17px]">
        <span aria-hidden="true" style={{ color: "var(--accent-soft)", marginRight: 10 }}>
          &gt;
        </span>
        <span style={{ color: "var(--ink-dim)" }}>{scrambleToString(scramble)}</span>
      </p>

      <button
        type="button"
        onClick={onRefresh}
        disabled={locked}
        aria-label="New scramble"
        title="New scramble"
        className={`mt-1 shrink-0 transition-opacity duration-200 ${
          locked ? "cursor-not-allowed opacity-20" : "opacity-40 hover:opacity-100"
        }`}
        style={{ color: "var(--ink)" }}
      >
        <RefreshGlyph />
      </button>
    </div>
  );
}
