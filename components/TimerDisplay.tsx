import type { TimerPhase } from "@/lib/useHoldReadyState";

/**
 * Hold-ramp colour. Carried across from the pre-refresh implementation
 * unchanged — these are behavioural cues (neutral -> red as the hold builds,
 * green while solving) that the spec pins in section 2.1, so they stay fixed
 * rather than following the theme accent.
 */
const HOLD_RED = "#ef4444";
const READY_GREEN = "#22c55e";

/**
 * Hold colour, following the convention every cubing timer uses: red the whole
 * time you're holding, flipping to green the moment releasing would actually
 * start the timer.
 *
 * There used to be a gradient here, interpolating blue to red across the hold.
 * It read as grey, and for a good reason: the midpoint of blue-to-red in RGB is
 * a desaturated purple, and with a 400ms threshold that muddy middle is most of
 * what you ever see. Two flat states carry the same information and are legible
 * at a glance, which is the only thing this colour has to do.
 *
 * holdIntensity reaches exactly 1 at the ready threshold, so it doubles as the
 * ready signal and no extra state is needed.
 *
 * Solving is deliberately plain ink rather than green. Green means "release and
 * it starts"; leaving the running timer green would make the release — the one
 * transition that matters — invisible.
 */
function phaseColor(phase: TimerPhase, holdIntensity: number, isHolding: boolean): string {
  if (isHolding) return holdIntensity >= 1 ? READY_GREEN : HOLD_RED;
  if (phase === "solving") return "var(--ink)";
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
