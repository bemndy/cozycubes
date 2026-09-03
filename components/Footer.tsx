"use client";

import { useEffect, useState } from "react";
import { IconButton } from "./ui/IconButton";
import {
  GitGlyph,
  ContactGlyph,
  PrivacyGlyph,
  SecurityGlyph,
  TermsGlyph,
} from "./ui/Glyphs";
import { ChangelogDialog } from "./ChangelogDialog";
import { InfoDialog, type InfoTopic } from "./InfoDialog";
import type { ComponentType } from "react";

interface FooterProps {
  solveCount: number;
  /** Focus mode — the chrome recedes while the pointer is at rest. */
  dimmed: boolean;
}

type OpenPanel = "changelog" | InfoTopic | null;

const INFO_ITEMS: {
  topic: InfoTopic;
  label: string;
  Glyph: ComponentType<{ className?: string }>;
}[] = [
  { topic: "contact", label: "contact", Glyph: ContactGlyph },
  { topic: "terms", label: "terms", Glyph: TermsGlyph },
  { topic: "privacy", label: "privacy", Glyph: PrivacyGlyph },
  { topic: "security", label: "security", Glyph: SecurityGlyph },
];

/**
 * Bottom bar: the informational surfaces on the left, session telemetry on the
 * right.
 *
 * Every item here is glyph *and* text — these are read-once destinations, and a
 * row of unlabelled glyphs would make the user hover each one to find out what
 * it is. The header's controls take the opposite treatment for the opposite
 * reason.
 *
 * They open dialogs rather than navigating. Keeping the user on the timer is
 * the point, and the alternative today would be four links to routes that don't
 * exist yet.
 */
export function Footer({ solveCount, dimmed }: FooterProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const close = () => setOpenPanel(null);

  return (
    <>
      <footer
        // See Header: inert keeps hidden controls out of the tab order.
        inert={dimmed}
        className="fixed inset-x-0 bottom-0 z-30 flex h-24 items-center transition-opacity duration-500"
        style={{ opacity: dimmed ? 0 : 1 }}
      >
        {/* Same measure as the header. Links pinned left, session pinned right,
            the gap between them carrying whatever width is left over. */}
        <div className="bar-inner">
          <div className="flex items-center justify-between gap-6">
            <nav className="flex items-center gap-3 lg:gap-6">
              <IconButton
                label="changelog"
                showText
                onClick={() => setOpenPanel("changelog")}
                expanded={openPanel === "changelog"}
              >
                <GitGlyph />
              </IconButton>

              {INFO_ITEMS.map(({ topic, label, Glyph }) => (
                <IconButton
                  key={topic}
                  label={label}
                  showText
                  onClick={() => setOpenPanel(topic)}
                  expanded={openPanel === topic}
                >
                  <Glyph />
                </IconButton>
              ))}
            </nav>

            <SessionReadout solveCount={solveCount} />
          </div>
        </div>
      </footer>

      <ChangelogDialog open={openPanel === "changelog"} onClose={close} />
      {INFO_ITEMS.map(({ topic }) => (
        <InfoDialog
          key={topic}
          topic={topic}
          open={openPanel === topic}
          onClose={close}
        />
      ))}
    </>
  );
}

/**
 * Isolated so its per-second tick re-renders only this line rather than the
 * whole footer and every icon button in it.
 */
function SessionReadout({ solveCount }: { solveCount: number }) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="flex shrink-0 items-center gap-3 font-mono text-[13px] lg:text-[15px]">
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: "var(--accent)" }}
      />
      {/* tabular-nums keeps the counter from reflowing as digits change. */}
      <span className="tabular-nums" style={{ color: "var(--ink-dim)" }}>
        {solveCount} solves
      </span>
      <span aria-hidden="true" style={{ color: "var(--ink-faint)" }}>
        /
      </span>
      <span className="tabular-nums" style={{ color: "var(--ink-dim)" }}>
        {hh}:{mm}:{ss}
      </span>
    </div>
  );
}
