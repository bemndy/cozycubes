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

/**
 * Rows in the column-flow grid. Constant in both states on purpose: expanding
 * widens the panel and never changes its height, so the timer above it cannot
 * be pushed around by opening the list.
 */
const ROWS = 4;

/**
 * Cap on rendered cells. Every solve is still stored and still counts toward
 * the stats — this only bounds how many DOM nodes the panel builds, so a user
 * with thousands of solves doesn't pay for all of them on every render.
 */
const MAX_RENDERED = 120;

/**
 * All-time solve list.
 *
 * Laid out as a column-flow grid rather than a vertical scroller: solves fill
 * top-to-bottom then start a new column, so history reads left-to-right and
 * overflows sideways. That keeps the panel short — it no longer competes
 * vertically with the timer — and makes "how did the session go" legible at a
 * glance instead of requiring a scroll through twenty rows.
 *
 * Its outer height is fixed and identical whether there are zero solves or a
 * hundred, and whether it is collapsed or expanded. Nothing this component does
 * can move the timer.
 *
 * Behaviour is unchanged from the original list: same +2/DNF/delete handlers,
 * same semantics, just revealed on hover per cell.
 */
export function SolveHistory({ solves, onTogglePenalty, onDelete }: SolveHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  // One baseline for the whole list rather than one per cell.
  const baseline = useMemo(() => tierBaselineMs(solves), [solves]);
  // Newest first, bounded.
  const ordered = useMemo(() => solves.slice(-MAX_RENDERED).reverse(), [solves]);

  return (
    <section
      className="flex flex-col gap-2 transition-[width] duration-500 ease-out"
      style={{ width: expanded ? "min(40rem, 100%)" : "min(22rem, 100%)" }}
      aria-label="All-time solves"
    >
      <div className="flex items-baseline gap-3">
        <span
          className="font-mono text-[10px] tracking-[.18em]"
          style={{ color: "var(--ink-dimmer)" }}
        >
          ALL-TIME
        </span>
        <span className="font-mono text-[10px]" style={{ color: "var(--ink-faint)" }}>
          {solves.length}
        </span>
        {solves.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="ml-auto font-mono text-[10px] tracking-[.12em] opacity-40 transition-opacity hover:opacity-100"
            style={{ color: "var(--ink)" }}
          >
            {expanded ? "COLLAPSE" : "EXPAND"}
          </button>
        )}
      </div>

      {/* Fixed height, always. The empty state occupies exactly the same box as
          a full one so the stack above never reflows. */}
      <div className="h-[6.5rem]">
        {ordered.length === 0 ? (
          <p className="font-mono text-[11px]" style={{ color: "var(--ink-faint)" }}>
            no solves yet
          </p>
        ) : (
          <div className="scroll-thin h-full overflow-x-auto">
            <div
              className="grid grid-flow-col gap-x-4 gap-y-0.5"
              style={{
                gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
                gridAutoColumns: "9.5rem",
              }}
            >
              {ordered.map((solve, index) => {
                const effective = effectiveTimeMs(solve);
                const tier = solveTier(solve, baseline);
                return (
                  <div
                    key={solve.id}
                    className="group flex items-center gap-2 rounded px-1.5 font-mono text-[12px] transition-colors hover:bg-[var(--hover-tint)]"
                  >
                    <span
                      aria-hidden="true"
                      className="block size-2 shrink-0"
                      style={{ background: TIER_COLOR_VAR[tier] }}
                    />
                    <span
                      className="w-6 shrink-0 tabular-nums text-[10px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {solves.length - index}
                    </span>
                    <span
                      className="tabular-nums group-hover:hidden"
                      style={{ color: "var(--ink-dim)" }}
                    >
                      {effective === null ? "DNF" : formatTimeMs(effective)}
                      {solve.penalty === "+2" ? " +2" : ""}
                    </span>

                    <span className="hidden gap-1.5 text-[9px] uppercase tracking-wide group-hover:flex">
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
                        aria-label="Delete solve"
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
          </div>
        )}
      </div>
    </section>
  );
}
