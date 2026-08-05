"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimeMs } from "@/lib/format";
import type { Penalty } from "@/lib/stats-engine";
import { useHoldReadyState } from "@/lib/useHoldReadyState";

const TIMER_KEY = "Space";

interface CompletedSolve {
  rawTimeMs: number;
  penalty: Penalty;
}

function phaseColor(phase: string, holdIntensity: number, isHolding: boolean): string {
  if (phase === "solving") return "#22c55e"; // green while solving
  if (isHolding) {
    // ramp neutral blue -> red as holdIntensity goes 0 -> 1
    const r = Math.round(59 + (239 - 59) * holdIntensity);
    const g = Math.round(130 + (68 - 130) * holdIntensity);
    const b = Math.round(246 + (68 - 246) * holdIntensity);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "#64748b"; // neutral slate
}

export default function TimerPage() {
  const [inspectionEnabled, setInspectionEnabled] = useState(true);
  const [lastSolve, setLastSolve] = useState<CompletedSolve | null>(null);
  const startedRef = useRef(false);

  const onSolveComplete = useCallback((rawTimeMs: number, penalty: Penalty) => {
    setLastSolve({ rawTimeMs, penalty });
  }, []);

  const {
    phase,
    holdIntensity,
    inspectionRemainingMs,
    solvingElapsedMs,
    isHolding,
    prepareNextSolve,
    keyDown,
    keyUp,
  } = useHoldReadyState({
    mode: inspectionEnabled ? "inspection" : "standard",
    onSolveComplete,
  });

  // Arm the first attempt, and re-arm automatically after each completed solve.
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      prepareNextSolve();
    }
  }, [prepareNextSolve]);

  useEffect(() => {
    if (phase === "stopped") {
      const timeout = setTimeout(() => prepareNextSolve(), 1200);
      return () => clearTimeout(timeout);
    }
  }, [phase, prepareNextSolve]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== TIMER_KEY) return;
      if (e.repeat) return;
      e.preventDefault();
      keyDown();
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== TIMER_KEY) return;
      e.preventDefault();
      keyUp();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [keyDown, keyUp]);

  const color = phaseColor(phase, holdIntensity, isHolding);

  let display: string;
  if (phase === "solving") {
    display = formatTimeMs(solvingElapsedMs);
  } else if (phase === "stopped" && lastSolve) {
    display =
      lastSolve.penalty === "DNF"
        ? "DNF"
        : `${formatTimeMs(
            lastSolve.penalty === "+2" ? lastSolve.rawTimeMs + 2000 : lastSolve.rawTimeMs
          )}${lastSolve.penalty === "+2" ? " +2" : ""}`;
  } else if (phase === "inspecting" && inspectionRemainingMs !== null) {
    display = String(Math.ceil(inspectionRemainingMs / 1000));
  } else {
    display = "0.00";
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 bg-black text-white px-4">
      <div className="text-center text-sm text-slate-400 tracking-wide">
        scramble diagram + notation — coming in the next branch
      </div>

      <div
        className="font-mono text-7xl md:text-8xl font-bold tabular-nums transition-colors duration-150"
        style={{ color }}
      >
        {display}
      </div>

      <button
        type="button"
        onClick={() => setInspectionEnabled((v) => !v)}
        className="text-xs text-slate-500 hover:text-slate-300 border border-slate-800 rounded-full px-3 py-1"
      >
        inspection: {inspectionEnabled ? "on" : "off"} (click to toggle)
      </button>

      <p className="text-xs text-slate-600">
        hold <kbd className="px-1 border border-slate-700 rounded">space</kbd> to
        {inspectionEnabled ? " ready up during inspection" : " ready up"}, release to start,
        press again to stop
      </p>
    </main>
  );
}
