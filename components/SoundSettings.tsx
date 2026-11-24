"use client";

import { Dialog } from "./ui/Dialog";
import { playTimerStop } from "@/lib/sounds";

interface SoundSettingsProps {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  onToggleEnabled: () => void;
  /** Master level as a whole percentage, 0-100. */
  volume: number;
  onVolumeChange: (volume: number) => void;
}

/** Cells in the ASCII level meter. Ten so one cell is exactly ten percent. */
const METER_CELLS = 10;

/**
 * The level as blocks, in the mono face — the same register as the ASCII cube
 * and the solve-history colour column, and readable at a glance in a way a
 * two-digit number beside a native slider is not.
 *
 * Hidden from assistive tech: the slider it sits beside already announces the
 * same value, and a row of block characters read aloud is noise.
 */
function Meter({ level, muted }: { level: number; muted: boolean }) {
  const filled = Math.round((level / 100) * METER_CELLS);
  return (
    <span
      aria-hidden="true"
      className="font-mono text-mini"
      // Block glyphs butt together into one solid rectangle at full level,
      // which reads as a bar rather than as ten cells. A little tracking keeps
      // the cells legible as cells.
      style={{
        letterSpacing: "0.12em",
        color: muted ? "var(--ink-faint)" : "var(--accent)",
      }}
    >
      {"█".repeat(filled)}
      <span style={{ color: "var(--ink-faint)" }}>
        {"░".repeat(METER_CELLS - filled)}
      </span>
    </span>
  );
}

/**
 * Sound settings, as an overlay over the timer.
 *
 * An overlay rather than a settings page on purpose: the only way to judge a
 * volume is to hear it against the thing that makes the noise, and a route
 * change would unmount the timer and throw away the session's solves. It also
 * keeps the one-page shape the whole app is built on — every other surface
 * here (themes, changelog, clear-session) is a dialog for the same reason.
 *
 * Reached from the header's existing sound glyph, which stays lit while sound
 * is on, so the state is still legible without opening anything.
 */
export function SoundSettings({
  open,
  onClose,
  enabled,
  onToggleEnabled,
  volume,
  onVolumeChange,
}: SoundSettingsProps) {
  /**
   * Hear the level you just set. Fired on release rather than on change —
   * `onChange` runs for every pixel of a drag, which would stack a tone per
   * step into one long rasp.
   */
  function preview() {
    if (enabled) playTimerStop();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Sound" subtitle="timer start and stop">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-6">
          <span style={{ color: "var(--ink-dim)" }}>Timer tones</span>
          <button
            type="button"
            onClick={() => {
              // Reads the value before the toggle, so this previews the state
              // being switched *into* rather than out of.
              if (!enabled) playTimerStop();
              onToggleEnabled();
            }}
            aria-pressed={enabled}
            className="font-mono text-mini uppercase tracking-label transition-opacity hover:opacity-80"
            style={{ color: enabled ? "var(--accent)" : "var(--ink-dimmer)" }}
          >
            {enabled ? "on" : "off"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-6">
            <label
              htmlFor="sound-volume"
              style={{ color: enabled ? "var(--ink-dim)" : "var(--ink-faint)" }}
            >
              Volume
            </label>
            <div className="flex items-center gap-3">
              <Meter level={volume} muted={!enabled} />
              <span
                className="w-8 text-right font-mono text-mini tabular-nums"
                style={{ color: enabled ? "var(--ink-dim)" : "var(--ink-faint)" }}
              >
                {volume}
              </span>
            </div>
          </div>
          <input
            id="sound-volume"
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            disabled={!enabled}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            // Release, not change — see preview().
            onPointerUp={preview}
            onKeyUp={preview}
            // Hairline track, accent thumb — see .volume-slider in globals.css
            // for why this isn't just accent-color.
            className="volume-slider"
          />
        </div>

        <p className="font-mono text-micro" style={{ color: "var(--ink-faint)" }}>
          100 is the level the tones were tuned at. Selectable sound packs and
          per-sound switches come next.
        </p>
      </div>
    </Dialog>
  );
}
