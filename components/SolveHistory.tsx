"use client";

import { useMemo, useState } from "react";
import { formatTimeMs } from "@/lib/format";
import { solveTier, tierBaselineMs, TIER_COLOR_VAR } from "@/lib/solveTier";
import { effectiveTimeMs, type Solve } from "@/lib/stats-engine";

interface SolveHistoryProps {
  solves: Solve[];
  onTogglePenalty: (id: string, target: "+2" | "DNF") => void;
  onDelete: (id: string) => void;
}

/** Solves per row. Five, so a row is also an Ao5 window. */
const PER_ROW = 5;

/**
 * Width of the leading colour column: five 8px squares plus their 4px gaps,
 * held constant so short rows still line up with full ones.
 */
const COLOR_COLUMN = "4rem";

/** Rows visible before expanding. */
const COLLAPSED_ROWS = 5;

/**
 * Height the scroll area grows to when expanded.
 *
 * Chosen to keep the whole panel inside the centre column's fixed height: the
 * three columns are vertically centred against each other, so a solve list that
 * grew taller than the timer stack would re-centre the row and drag the timer
 * off the page's middle. Expanding scrolls here instead of growing.
 */
const EXPANDED_MAX_HEIGHT = "20rem";

/**
 * Cap on rendered solves. Every solve is still stored and still counts toward
 * the stats — this only bounds how many DOM nodes the list builds.
 */
const MAX_RENDERED = 250;

/**
 * All-time solves, five to a row, newest first.
 *
 * Each row opens with a colour column carrying one square per solve in that
 * row, so the row reads as a unit: five squares is a glanceable shape for how
 * that group of five went, which is the same window an Ao5 covers. Rows near
 * the end of the history can hold fewer than five, and the column shrinks to
 * match rather than padding with blanks.
 *
 * Each solve reserves the height of its hover controls at all times, visible or
 * not. Revealing them on hover without reserved space would either overlap the
 * neighbouring solve or reflow the whole grid under the pointer.
 */
export function SolveHistory({ solves, onTogglePenalty, onDelete }: SolveHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  const baseline = useMemo(() => tierBaselineMs(solves), [solves]);

  // Newest first, bounded, then grouped into rows of five.
  const rows = useMemo(() => {
    const start = Math.max(0, solves.length - MAX_RENDERED);
    const ordered = solves
      .slice(start)
      .map((solve, i) => ({ solve, index: start + i + 1 }))
      .reverse();

    const grouped: (typeof ordered)[] = [];
    for (let i = 0; i < ordered.length; i += PER_ROW) {
      grouped.push(ordered.slice(i, i + PER_ROW));
    }
    return grouped;
  }, [solves]);

  if (rows.length === 0) {
    return (
      <p className="font-mono text-[12px]" style={{ color: "var(--ink-faint)" }}>
        no solves yet
      </p>
    );
  }

  const hasMore = rows.length > COLLAPSED_ROWS;
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <section aria-label="All-time solves" className="flex w-full flex-col gap-3">
      <div
        className={expanded ? "scroll-thin overflow-y-auto" : undefined}
        style={expanded ? { maxHeight: EXPANDED_MAX_HEIGHT } : undefined}
      >
        <div className="flex flex-col gap-2">
          {visible.map((row) => (
            <div
              key={row[0].solve.id}
              className="grid items-start gap-x-2"
              style={{
                // Fixed, not auto: a final row holding fewer than five solves
                // would otherwise shrink its colour column and knock every time
                // in that row out of line with the rows above it.
                gridTemplateColumns: `${COLOR_COLUMN} repeat(${PER_ROW}, minmax(0, 1fr))`,
              }}
            >
              {/* Column one: this row's solves, as colour alone. */}
              <div className="flex items-center gap-1 pt-0.5">
                {row.map(({ solve }) => (
                  <span
                    key={solve.id}
                    aria-hidden="true"
                    className="block size-2"
                    style={{ background: TIER_COLOR_VAR[solveTier(solve, baseline)] }}
                  />
                ))}
              </div>

              {row.map(({ solve, index }) => {
                const effective = effectiveTimeMs(solve);
                return (
                  <div key={solve.id} className="group flex flex-col items-start">
                    <span
                      className="font-mono text-[12px] tabular-nums"
                      style={{ color: "var(--ink-dim)" }}
                      title={`Solve ${index}`}
                    >
                      {effective === null ? "DNF" : formatTimeMs(effective)}
                      {solve.penalty === "+2" ? " +2" : ""}
                    </span>

                    {/* Always occupies its line, so hovering never reflows. */}
                    <span className="invisible flex gap-1.5 font-mono text-[8px] uppercase tracking-wide group-hover:visible">
                      <button
                        type="button"
                        onClick={() => onTogglePenalty(solve.id, "+2")}
                        className="transition-opacity hover:opacity-100"
                        style={{
                          color:
                            solve.penalty === "+2" ? "var(--accent)" : "var(--ink-dimmer)",
                        }}
                      >
                        +2
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePenalty(solve.id, "DNF")}
                        className="transition-opacity hover:opacity-100"
                        style={{
                          color:
                            solve.penalty === "DNF"
                              ? "var(--quality-warn)"
                              : "var(--ink-dimmer)",
                        }}
                      >
                        dnf
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(solve.id)}
                        aria-label={`Delete solve ${index}`}
                        className="transition-opacity hover:opacity-100"
                        style={{ color: "var(--ink-dimmer)" }}
                      >
                        del
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="font-mono text-[10px] tracking-[.14em] opacity-40 transition-opacity hover:opacity-100"
            style={{ color: "var(--ink)" }}
          >
            {expanded ? "COLLAPSE" : "EXPAND"}
          </button>
        </div>
      )}
    </section>
  );
}
