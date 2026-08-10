import type { TimerPhase } from "@/lib/useHoldReadyState";

/**
 * Hold-ramp colour. Carried across from the pre-refresh implementation
 * unchanged — these are behavioural cues (neutral -> red as the hold builds,
 * green while solving) that the spec pins in section 2.1, so they stay fixed
 * rather than following the theme accent.
 */
function phaseColor(phase: TimerPhase, holdIntensity: number, isHolding: boolean): string {
  if (phase === "solving") return "#22c55e"; // green while solving
  if (isHolding) {
    // ramp neutral blue -> red as holdIntensity goes 0 -> 1
    const r = Math.round(59 + (239 - 59) * holdIntensity);
    const g = Math.round(130 + (68 - 130) * holdIntensity);
    const b = Math.round(246 + (68 - 246) * holdIntensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "var(--ink)";
}

interface TimerDisplayProps {
  display: string;
  phase: TimerPhase;
  holdIntensity: number;
  isHolding: boolean;
}

/**
 * The hero digits, and nothing else. The keybind hints moved out to their own
 * component so they can hide in focus mode while the digits stay.
 */
export function TimerDisplay({
  display,
  phase,
  holdIntensity,
  isHolding,
}: TimerDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      {/*
        Pixel face for the hero digits. No negative tracking here — pixel
        letterforms are built on a grid, and pulling them together collapses the
        gaps the glyphs are drawn around. A little positive tracking instead.
      */}
      <div
        role="timer"
        aria-live="off"
        className="font-pixel text-[clamp(52px,9vw,132px)] leading-none font-normal tabular-nums tracking-[.02em] transition-colors duration-150"
        style={{ color: phaseColor(phase, holdIntensity, isHolding) }}
      >
        {display}
      </div>
    </div>
  );
}
