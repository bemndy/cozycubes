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
  hint: string;
}

/**
 * The hero digits. Arial 400 at display scale with tight tracking — per the
 * design direction, presence comes from size and spacing, not weight.
 */
export function TimerDisplay({
  display,
  phase,
  holdIntensity,
  isHolding,
  hint,
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
        className="font-pixel text-[clamp(68px,15vw,224px)] leading-none font-normal tabular-nums tracking-[.02em] transition-colors duration-150"
        style={{ color: phaseColor(phase, holdIntensity, isHolding) }}
      >
        {display}
      </div>
      <p className="mt-4 text-[13px]" style={{ color: "var(--ink-dimmer)" }}>
        {hint}
      </p>
    </div>
  );
}
