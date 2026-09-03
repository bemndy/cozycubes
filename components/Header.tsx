"use client";

import { useState } from "react";
import { Dropdown, type DropdownOption } from "./ui/Dropdown";
import { IconButton } from "./ui/IconButton";
import { InspectionGlyph } from "./ui/Glyphs";
import { ThemePicker } from "./ThemePicker";
import { useTheme } from "@/lib/useTheme";
import { THEME_LABELS } from "@/lib/theme";
import type { SupportedCubeSize } from "@/lib/scramble-gen";

const CUBE_OPTIONS: readonly DropdownOption<SupportedCubeSize>[] = [
  { value: 2, label: "2x2" },
  { value: 3, label: "3x3" },
  { value: 4, label: "4x4" },
  { value: 5, label: "5x5" },
  { value: 6, label: "6x6" },
  { value: 7, label: "7x7" },
];

interface HeaderProps {
  cubeSize: SupportedCubeSize;
  /** True during inspection/solve — switching size mid-solve is blocked. */
  locked: boolean;
  onCubeSizeChange: (size: SupportedCubeSize) => void;
  inspectionEnabled: boolean;
  onToggleInspection: () => void;
  /** Focus mode — the chrome recedes while the pointer is at rest. */
  dimmed: boolean;
}

/**
 * Top bar: wordmark, then the controls that change how a solve behaves —
 * cube size, inspection, theme.
 *
 * Controls here are glyph-only with hover tooltips, against the footer's
 * icon-and-text treatment. The split is intentional: these three get reached
 * for mid-session and benefit from being small and quiet, while the footer's
 * are read-once links that need naming.
 *
 * The cube-size control keeps its value visible rather than going glyph-only.
 * A selector that doesn't show what's selected isn't a selector, and which cube
 * you're on changes the meaning of every number on the page.
 */
export function Header({
  cubeSize,
  locked,
  onCubeSizeChange,
  inspectionEnabled,
  onToggleInspection,
  dimmed,
}: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  return (
    <header
      // inert rather than aria-hidden alone: these controls stay in the tab
      // order when merely transparent, so a keyboard user would tab into
      // invisible buttons. inert removes them from focus, hit-testing, and the
      // accessibility tree together.
      inert={dimmed}
      className="fixed inset-x-0 top-0 z-30 flex h-24 items-center transition-opacity duration-500"
      style={{ opacity: dimmed ? 0 : 1 }}
    >
      {/* The bar's own measure, wider than the timer column it sits above. The
          few rem of difference on each side is what the net and the solve list
          spread into. */}
      <div className="bar-inner">
        <div className="flex items-center justify-between">
          {/* Not a link. The timer is the only page, so a wordmark pointing at
              "/" would navigate to itself, remounting the tree and discarding
              the session's in-memory solves and timer phase. */}
          <div className="group flex items-center gap-3 text-[23px] tracking-tight opacity-85 transition-opacity duration-200 hover:opacity-100">
            {/*
              Both marks are always in the DOM; CSS shows whichever suits the
              active theme's background (see globals.css). Plain <img> rather
              than next/image: these are fixed-size local SVGs, so the image
              optimiser has nothing to do, and it refuses SVG sources without
              dangerouslyAllowSVG anyway.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cozycube_ascii_dark.svg"
              alt=""
              width={40}
              height={40}
              className="logo-for-dark size-10 transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cozycube_ascii_light.svg"
              alt=""
              width={40}
              height={40}
              className="logo-for-light size-10 transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            {/* A text line-box is taller than its glyphs and, depending on the
                font's own vertical metrics, not evenly split above/below the
                cap-height — so items-center'ing a span next to a fixed-height
                image doesn't actually line up their visible content, only
                their boxes. Giving the span the same fixed height as the logo
                (size-10 = 2.5rem) and centering *within* that box makes both
                center against the same 40px reference instead. */}
            <span
              className="flex h-10 items-center leading-none"
              style={{ color: "var(--ink)" }}
            >
              CozyCubes
            </span>
          </div>

          <div className="flex items-center gap-8">
            <Dropdown
              ariaLabel="Cube size"
              options={CUBE_OPTIONS}
              value={cubeSize}
              onChange={onCubeSizeChange}
              disabled={locked}
            />

            <IconButton
              label={`inspection ${inspectionEnabled ? "on" : "off"}`}
              onClick={onToggleInspection}
              active={inspectionEnabled}
              pressed={inspectionEnabled}
            >
              <InspectionGlyph />
            </IconButton>

            {/* Twenty themes is too many for the small listbox the cube-size
                control uses — a fullscreen grid with a live-colour swatch per
                theme (ThemePicker) makes picking one a glance instead of a
                scroll through plain text. */}
            <button
              type="button"
              onClick={() => setThemePickerOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={themePickerOpen}
              className="flex items-center gap-1.5 py-1 font-mono text-[16px] opacity-80 transition-opacity hover:opacity-100"
              style={{ color: "var(--ink)" }}
            >
              {THEME_LABELS[theme]}
              <svg
                aria-hidden="true"
                viewBox="0 0 10 6"
                className="size-2.5"
                style={{ color: "var(--ink-dimmer)" }}
              >
                <path
                  d="M1 1L5 5L9 1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ThemePicker
        open={themePickerOpen}
        onClose={() => setThemePickerOpen(false)}
        value={theme}
        onChange={setTheme}
      />
    </header>
  );
}
