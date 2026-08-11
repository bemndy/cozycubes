"use client";

import { useCallback, useEffect, useState } from "react";
import { addSolve, deleteSolve, getSolvesByCubeSize, updateSolve } from "@/lib/db";
import { formatTimeMs } from "@/lib/format";
import { scrambleToString, type SupportedCubeSize } from "@/lib/scramble-gen";
import { generateScrambleForSize, initScrambler } from "@/lib/scrambler";
import { ColorfulLoader, LOADER_EXIT_MS } from "@/components/ColorfulLoader";
import {
  allTimeMean,
  ao12,
  ao5,
  bestSingle,
  effectiveTimeMs,
  type Penalty,
  type Solve,
} from "@/lib/stats-engine";
import { useHoldReadyState } from "@/lib/useHoldReadyState";

const TIMER_KEY = "Space";
const NEW_SCRAMBLE_KEY = "Tab";
const CUBE_SIZES: SupportedCubeSize[] = [2, 3, 4, 5, 6, 7];

function formatStat(ms: number | null): string {
  return ms === null ? "—" : formatTimeMs(ms);
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
  const [inspectionEnabled, setInspectionEnabled] = useState(false);
  const [lastSolve, setLastSolve] = useState<Solve | null>(null);
  const [cubeSize, setCubeSize] = useState<SupportedCubeSize>(3);
  const [scramble, setScramble] = useState<string[]>([]);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [scramblerReady, setScramblerReady] = useState(false);
  const [loaderMounted, setLoaderMounted] = useState(true);

  const regenerateScramble = useCallback((size: SupportedCubeSize) => {
    setScramble(generateScrambleForSize(size));
  }, []);

  // Unmount the loader only once its fade has finished, so it cross-fades over
  // the timer instead of being cut away.
  useEffect(() => {
    if (!scramblerReady) return;
    const timeout = setTimeout(() => setLoaderMounted(false), LOADER_EXIT_MS);
    return () => clearTimeout(timeout);
  }, [scramblerReady]);

  // Reload the persisted solve history whenever the active cube size changes.
  useEffect(() => {
    let cancelled = false;
    getSolvesByCubeSize(cubeSize).then((loaded) => {
      if (!cancelled) setSolves(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [cubeSize]);

  const onSolveComplete = useCallback(
    (rawTimeMs: number, penalty: Penalty) => {
      const solve: Solve = {
        id: crypto.randomUUID(),
        cubeSize,
        timeMs: rawTimeMs,
        penalty,
        timestamp: Date.now(),
      };
      setLastSolve(solve);
      setSolves((prev) => [...prev, solve]);
      void addSolve(solve);
      regenerateScramble(cubeSize);
    },
    [regenerateScramble, cubeSize]
  );

  const togglePenalty = useCallback(
    (id: string, target: "+2" | "DNF") => {
      const current = solves.find((s) => s.id === id);
      if (!current) return;
      const nextPenalty: Penalty = current.penalty === target ? "none" : target;
      const updated: Solve = { ...current, penalty: nextPenalty };
      setSolves((prev) => prev.map((s) => (s.id === id ? updated : s)));
      void updateSolve(updated);
    },
    [solves]
  );

  const removeSolve = useCallback((id: string) => {
    setSolves((prev) => prev.filter((s) => s.id !== id));
    void deleteSolve(id);
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

  // 3x3 is the default size and needs cubejs's pruning tables, which take
  // 1-2s to build and block the main thread while they do. Wait for an actual
  // painted frame before starting so the loader is on screen for it, rather
  // than the browser going white — a passive effect alone doesn't guarantee
  // the paint has happened.
  //
  // The first scramble is generated here too, before the reveal, so the timer
  // underneath is fully populated when it fades in rather than showing an
  // empty scramble line for a frame.
  //
  // The guard is `scramblerReady` — the work having *finished* — and not a ref
  // latched on start: the cleanup cancels the pending frame, so a start-latched
  // guard makes any cleanup that lands before the frame fires (StrictMode's
  // mount/unmount/remount, or a `prepareNextSolve` identity change when the
  // mode flips) permanent, leaving the loader up forever.
  useEffect(() => {
    if (scramblerReady) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        try {
          initScrambler();
          regenerateScramble(cubeSize);
          prepareNextSolve();
        } catch (err) {
          // A solver that fails to build must not strand the app behind the
          // loader; reveal the timer and let Tab retry the scramble.
          console.error("Scrambler init failed", err);
        } finally {
          setScramblerReady(true);
        }
      }, 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [scramblerReady, cubeSize, regenerateScramble, prepareNextSolve]);

  function handleCubeSizeChange(size: SupportedCubeSize) {
    // Same guard as the Tab new-scramble keybind: switching cube size mid-solve
    // would change what onSolveComplete records the in-flight solve as (it
    // closes over cubeSize), silently corrupting which cube size's stats the
    // solve lands in. Block it while a solve/inspection is in progress.
    if (phase === "inspecting" || phase === "solving") return;
    setCubeSize(size);
    regenerateScramble(size);
  }

  useEffect(() => {
    // Nothing to drive while the loader is up, and a keypress landing before
    // the first scramble exists would start a solve against a blank scramble.
    if (!scramblerReady) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === TIMER_KEY) {
        if (e.repeat) return;
        e.preventDefault();
        // Inspection mode: this press starts the next countdown, flipping the
        // display from the last time to 15. Standard mode: the press instead
        // begins the next ready-hold, so one continuous hold-and-release goes
        // from "showing your last time" to "timing" without spending a
        // separate press just to reset the display.
        if (phase === "stopped" && inspectionEnabled) {
          prepareNextSolve();
          return;
        }
        keyDown();
        return;
      }
      if (e.code === NEW_SCRAMBLE_KEY) {
        // Guard against changing the scramble mid-inspection/solve, per spec §2.2.
        if (phase === "inspecting" || phase === "solving") return;
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
  }, [
    scramblerReady,
    keyDown,
    keyUp,
    phase,
    prepareNextSolve,
    regenerateScramble,
    cubeSize,
    inspectionEnabled,
  ]);

  const color = phaseColor(phase, holdIntensity, isHolding);

  let display: string;
  if (phase === "solving") {
    display = formatTimeMs(solvingElapsedMs);
  } else if (phase === "stopped" && lastSolve) {
    const effective = effectiveTimeMs(lastSolve);
    display =
      effective === null ? "DNF" : `${formatTimeMs(effective)}${lastSolve.penalty === "+2" ? " +2" : ""}`;
  } else if (phase === "inspecting" && inspectionRemainingMs !== null) {
    display = String(Math.ceil(inspectionRemainingMs / 1000));
  } else {
    display = "0.00";
  }

  const cubeSizeLocked = phase === "inspecting" || phase === "solving";

  // A new PB only counts once there's a prior best to beat, and only for the
  // solve that was actually just displayed — recomputing bestSingle after a
  // penalty edit shouldn't retroactively badge an older solve.
  const lastEffectiveMs = lastSolve ? effectiveTimeMs(lastSolve) : null;
  const isNewPersonalBest =
    phase === "stopped" &&
    solves.length > 1 &&
    lastEffectiveMs !== null &&
    lastEffectiveMs === bestSingle(solves);

  return (
    <>
      {/* Kept mounted through the fade so the loader dissolves into a timer
          that is already rendered underneath, rather than cutting to it. */}
      {loaderMounted && (
        <ColorfulLoader label="Warming up scrambler" exiting={scramblerReady} />
      )}
      <main
        className={`flex flex-col items-center min-h-screen gap-8 bg-black text-white px-4 pt-8 transition-opacity duration-500 ease-out ${
          scramblerReady ? "opacity-100" : "opacity-0"
        }`}
      >
      <div className="flex flex-col items-center gap-3 w-full max-w-3xl">
        <div className="flex gap-1 rounded-full border border-slate-800 p-1">
          {CUBE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              disabled={cubeSizeLocked}
              onClick={() => handleCubeSizeChange(size)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                cubeSizeLocked ? "cursor-not-allowed opacity-40" : ""
              } ${
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

      {isNewPersonalBest && (
        <p className="text-xs font-semibold text-amber-400 -mt-4">
          🏆 new personal best
        </p>
      )}

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

      <div className="flex-1" />

      <div className="w-full max-w-3xl border-t border-slate-900 pt-4 pb-8 flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <Stat label="best" value={formatStat(bestSingle(solves))} />
          <Stat label="ao5" value={formatStat(ao5(solves))} />
          <Stat label="ao12" value={formatStat(ao12(solves))} />
          <Stat label="mean" value={formatStat(allTimeMean(solves))} />
          <Stat label="solves" value={String(solves.length)} />
        </div>

        <div className="flex flex-col-reverse gap-1 max-h-40 overflow-y-auto text-xs font-mono text-slate-400">
          {solves
            .slice(-20)
            .reverse()
            .map((solve) => {
              const effective = effectiveTimeMs(solve);
              return (
                <div
                  key={solve.id}
                  className="group flex items-center justify-between px-2 py-0.5 rounded hover:bg-slate-900"
                >
                  <span>
                    {effective === null ? "DNF" : formatTimeMs(effective)}
                    {solve.penalty === "+2" ? " +2" : ""}
                  </span>
                  <span className="hidden group-hover:flex gap-2 text-[10px] uppercase tracking-wide">
                    <button
                      type="button"
                      onClick={() => togglePenalty(solve.id, "+2")}
                      className={solve.penalty === "+2" ? "text-amber-400" : "text-slate-500 hover:text-amber-400"}
                    >
                      +2
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePenalty(solve.id, "DNF")}
                      className={solve.penalty === "DNF" ? "text-red-400" : "text-slate-500 hover:text-red-400"}
                    >
                      dnf
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSolve(solve.id)}
                      className="text-slate-500 hover:text-slate-200"
                    >
                      del
                    </button>
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-600">{label}</span>
      <span className="font-mono text-sm text-slate-200">{value}</span>
    </div>
  );
}
