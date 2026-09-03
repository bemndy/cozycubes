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
 * The measure is deliberately narrower than its column so a 3x3 scramble breaks
 * over two lines. One long line forces the eye to track sideways across the
 * whole viewport mid-glance, and 4x4 and up would run off regardless — two
 * lines is the shape the block should always have.
 *
 * The button is the pointer equivalent of the Tab keybind and shares its guard,
 * so neither route can change the scramble mid-solve.
 */
export function ScrambleLine({ scramble, onRefresh, locked }: ScrambleLineProps) {
  return (
    // The inner wrapper shrinks to the text, so the button anchors just off the
    // scramble's own right edge rather than the column's — a full-width anchor
    // parked it out in the margin, far from the thing it acts on.
    //
    // The button stays out of flow either way: sharing a flex row with the text
    // would centre the pair, pushing the scramble left of the page's centre
    // line by half the button's width.
    <div className="flex w-full justify-center">
      <div className="relative max-w-[26rem]">
        <p className="text-center font-mono text-[17px] leading-[2.15] tracking-wide sm:text-[19px]">
          <span
            aria-hidden="true"
            style={{ color: "var(--accent-soft)", marginRight: 10 }}
          >
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
          className={`absolute -right-7 top-1 transition-opacity duration-200 ${
            locked ? "cursor-not-allowed opacity-20" : "opacity-40 hover:opacity-100"
          }`}
          style={{ color: "var(--ink)" }}
        >
          <RefreshGlyph />
        </button>
      </div>
    </div>
  );
}
