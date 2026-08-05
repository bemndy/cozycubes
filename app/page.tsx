"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatTimeMs } from "@/lib/format";
import { generateScramble, scrambleToString, type SupportedCubeSize } from "@/lib/scramble-gen";
import type { Penalty } from "@/lib/stats-engine";
import { useHoldReadyState } from "@/lib/useHoldReadyState";

const TIMER_KEY = "Space";
const NEW_SCRAMBLE_KEY = "Tab";
const CUBE_SIZES: SupportedCubeSize[] = [2, 3, 4, 5, 6, 7];

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
  const [cubeSize, setCubeSize] = useState<SupportedCubeSize>(3);
  const [scramble, setScramble] = useState<string[]>(() => generateScramble(3));
  const startedRef = useRef(false);

  const regenerateScramble = useCallback((size: SupportedCubeSize) => {
    setScramble(generateScramble(size));
  }, []);

  const onSolveComplete = useCallback(
    (rawTimeMs: number, penalty: Penalty) => {
      setLastSolve({ rawTimeMs, penalty });
      regenerateScramble(cubeSize);
    },
    [regenerateScramble, cubeSize]
  );

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

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Arm the first attempt, and re-arm automatically after each completed solve.
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      prepareNextSolve();
    }
  }, [prepareNextSolve]);

  function handleCubeSizeChange(size: SupportedCubeSize) {
    setCubeSize(size);
    regenerateScramble(size);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === TIMER_KEY) {
        if (e.repeat) return;
        e.preventDefault();
        if (phase === "stopped") {
          prepareNextSolve();
          return;
        }
        keyDown();
        return;
      }
      if (e.code === NEW_SCRAMBLE_KEY) {
        // Guard against changing the scramble mid-inspection/solve, per spec §2.2.
        if (phaseRef.current === "inspecting" || phaseRef.current === "solving") return;
        e.preventDefault();
        regenerateScramble(cubeSize);
      }
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
  }, [keyDown, keyUp, phase, prepareNextSolve, regenerateScramble, cubeSize]);

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
    <main className="flex flex-col items-center min-h-screen gap-8 bg-black text-white px-4 pt-8">
      <div className="flex flex-col items-center gap-3 w-full max-w-3xl">
        <div className="flex gap-1 rounded-full border border-slate-800 p-1">
          {CUBE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => handleCubeSizeChange(size)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                size === cubeSize
                  ? "bg-slate-100 text-black"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {size}×{size}
            </button>
          ))}
        </div>

        <p className="font-mono text-center text-lg md:text-xl tracking-wide text-slate-100">
          {scrambleToString(scramble)}
        </p>
        <p className="text-[11px] text-slate-600">
          press <kbd className="px-1 border border-slate-700 rounded">tab</kbd> for a new scramble
          {inspectionEnabled ? " (disabled during inspection/solve)" : " (disabled while solving)"}
        </p>
      </div>

      <div className="flex-1" />

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
