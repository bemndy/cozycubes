"use client";

import { Dropdown, type DropdownOption } from "./ui/Dropdown";
import { IconButton } from "./ui/IconButton";
import { InspectionGlyph } from "./ui/Glyphs";
import { useTheme } from "@/lib/useTheme";
import { THEME_IDS, THEME_LABELS, type ThemeId } from "@/lib/theme";
import type { SupportedCubeSize } from "@/lib/scramble-gen";

const THEME_OPTIONS: readonly DropdownOption<ThemeId>[] = THEME_IDS.map((id) => ({
  value: id,
  label: THEME_LABELS[id],
}));

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

  return (
    <header
      // inert rather than aria-hidden alone: these controls stay in the tab
      // order when merely transparent, so a keyboard user would tab into
      // invisible buttons. inert removes them from focus, hit-testing, and the
      // accessibility tree together.
      inert={dimmed}
      className="fixed inset-x-0 top-0 z-30 flex h-20 items-center transition-opacity duration-500"
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
          <div className="group flex items-center gap-2.5 text-[17px] tracking-tight">
            {/*
              Both marks are always in the DOM; CSS shows whichever suits the
              active theme's background (see globals.css). Plain <img> rather
              than next/image: these are fixed-size local SVGs, so the image
              optimiser has nothing to do, and it refuses SVG sources without
              dangerouslyAllowSVG anyway.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cozycube_light.svg"
              alt=""
              width={24}
              height={24}
              className="logo-for-dark size-6 transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cozycube_dark.svg"
              alt=""
              width={24}
              height={24}
              className="logo-for-light size-6 transition-transform duration-300 group-hover:-translate-y-0.5"
            />
            <span style={{ color: "var(--ink)" }}>cozycubes</span>
          </div>

          <div className="flex items-center gap-6">
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

            {/* Same control as cube size. Cycling through five themes with a
                single button meant up to four clicks to reach one, and no way
                to see what the options were. */}
            <Dropdown
              ariaLabel="Theme"
              options={THEME_OPTIONS}
              value={theme}
              onChange={setTheme}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
