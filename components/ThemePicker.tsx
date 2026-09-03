"use client";

import { Dialog } from "./ui/Dialog";
import { THEME_IDS, THEME_LABELS, type ThemeId } from "@/lib/theme";

interface ThemePickerProps {
  open: boolean;
  onClose: () => void;
  value: ThemeId;
  onChange: (id: ThemeId) => void;
}

/**
 * Full-screen theme picker, replacing what used to be a small listbox.
 *
 * Each swatch carries its own `data-theme`, which is enough on its own —
 * [data-theme="…"] in globals.css matches any element with the attribute, not
 * just <html>, so nesting it here re-triggers the same CSS custom properties
 * scoped to that button. No JS colour table to keep in sync with the themes
 * defined in CSS.
 */
export function ThemePicker({ open, onClose, value, onChange }: ThemePickerProps) {
  return (
    <Dialog open={open} onClose={onClose} title="theme" fullBleed>
      <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {THEME_IDS.map((id) => {
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              data-theme={id}
              aria-pressed={selected}
              onClick={() => {
                onChange(id);
                onClose();
              }}
              className="group flex flex-col items-center justify-center gap-3 rounded-[10px] p-4 font-mono text-[14px] tracking-tight opacity-80 transition-opacity duration-200 hover:opacity-100"
              style={{
                background: "var(--surface)",
                color: "var(--ink)",
                border: `2px solid ${selected ? "var(--accent)" : "var(--edge)"}`,
              }}
            >
              {/* The five-colour palette itself, so the swatch previews what
                  the theme actually looks like rather than just naming it. */}
              <span className="flex items-center gap-1">
                {(["--p1", "--p2", "--p3", "--p4", "--p5"] as const).map((token) => (
                  <span
                    key={token}
                    aria-hidden="true"
                    className="size-4 rounded-full"
                    style={{ background: `var(${token})` }}
                  />
                ))}
              </span>
              <span className="capitalize">{THEME_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
