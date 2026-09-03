"use client";

import type { CSSProperties, ReactNode } from "react";

interface IconButtonProps {
  /** The glyph. Kept as children so each control draws its own shape. */
  children: ReactNode;
  /** The accessible name, and the visible label when `showText` is set. */
  label: string;
  onClick: () => void;
  /**
   * Render the label inline beside the glyph — the footer's treatment. Left off
   * (the header's treatment) the button is glyph-only and the label appears in
   * a tooltip on hover instead.
   */
  showText?: boolean;
  /** Lit state — an enabled toggle sits at full opacity rather than dimmed. */
  active?: boolean;
  pressed?: boolean;
  expanded?: boolean;
}

/**
 * Icon control, in two forms.
 *
 * Either way the accessible name is the same string, so the two forms are
 * indistinguishable to a screen reader — only the visual density differs.
 *
 * Per the design direction, state is carried by opacity and colour alone. No
 * background fill, no box, ever.
 */
export function IconButton({
  children,
  label,
  onClick,
  showText = false,
  active = false,
  pressed,
  expanded,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      className="icon-btn group relative flex items-center gap-2"
      style={
        {
          "--icon-opacity": active ? 1 : 0.4,
          color: active ? "var(--accent)" : "var(--ink)",
        } as CSSProperties
      }
    >
      {children}

      {showText ? (
        <span className="font-mono text-[13px] tracking-tight lg:text-[15px]">{label}</span>
      ) : (
        <span
          role="tooltip"
          className="overlay-panel pointer-events-none absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 -translate-y-1 whitespace-nowrap px-2 py-1 font-mono text-[11px] tracking-wide opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ color: "var(--tooltip-ink)" }}
        >
          {label}
        </span>
      )}
    </button>
  );
}
