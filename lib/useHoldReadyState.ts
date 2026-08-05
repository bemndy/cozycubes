"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Penalty } from "./stats-engine";

export type TimerMode = "inspection" | "standard";
export type TimerPhase = "idle" | "inspecting" | "solving" | "stopped";

export interface UseHoldReadyStateOptions {
  mode: TimerMode;
  /** Mode A only. Default 15000ms (WCA default). */
  inspectionDurationMs?: number;
  /** Mode B only. Default 400ms hold-to-ready threshold. */
  standardReadyThresholdMs?: number;
  onSolveComplete?: (rawTimeMs: number, penalty: Penalty) => void;
}

export interface HoldReadyState {
  phase: TimerPhase;
  /** 0..1 color-ramp progress, shared by both modes. */
  holdIntensity: number;
  /** WCA-style countdown display while inspecting; null otherwise. */
  inspectionRemainingMs: number | null;
  /** Live elapsed time while solving, for display. */
  solvingElapsedMs: number;
  isHolding: boolean;
  /** Call when a new scramble is ready — arms inspection (Mode A) or idle-ready (Mode B). */
  prepareNextSolve: () => void;
  keyDown: () => void;
  keyUp: () => void;
}

const DEFAULT_INSPECTION_MS = 15000;
const DEFAULT_STANDARD_THRESHOLD_MS = 400;
export const PLUS_TWO_CUTOFF_MS = 15000;
export const DNF_CUTOFF_MS = 17000;

/** WCA-style inspection penalty bands: 0-15s none, 15-17s +2, >17s DNF. */
export function penaltyForInspectionElapsed(elapsedMs: number): Penalty {
  if (elapsedMs <= PLUS_TWO_CUTOFF_MS) return "none";
  if (elapsedMs <= DNF_CUTOFF_MS) return "+2";
  return "DNF";
}

export function useHoldReadyState(options: UseHoldReadyStateOptions): HoldReadyState {
  const { mode, onSolveComplete } = options;
  const inspectionDurationMs = options.inspectionDurationMs ?? DEFAULT_INSPECTION_MS;
  const standardReadyThresholdMs =
    options.standardReadyThresholdMs ?? DEFAULT_STANDARD_THRESHOLD_MS;

  const [phase, setPhase] = useState<TimerPhase>("idle");
  const [holdIntensity, setHoldIntensity] = useState(0);
  const [inspectionRemainingMs, setInspectionRemainingMs] = useState<number | null>(null);
  const [solvingElapsedMs, setSolvingElapsedMs] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const phaseRef = useRef<TimerPhase>("idle");
  const isHoldingRef = useRef(false);
  const inspectionStartRef = useRef<number | null>(null);
  const inspectionRemainingRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdStartRemainingRef = useRef<number | null>(null);
  const solveStartRef = useRef<number | null>(null);
  const pendingPenaltyRef = useRef<Penalty>("none");
  const forcedStartFiredRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<() => void>(() => {});

  phaseRef.current = phase;

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runTick = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      tickRef.current();
    });
  }, []);

  const beginSolving = useCallback(
    (penalty: Penalty) => {
      solveStartRef.current = performance.now();
      pendingPenaltyRef.current = penalty;
      isHoldingRef.current = false;
      holdStartRef.current = null;
      setIsHolding(false);
      setHoldIntensity(0);
      setInspectionRemainingMs(null);
      setSolvingElapsedMs(0);
      setPhase("solving");
      runTick();
    },
    [runTick]
  );

  // Reassigned every render so the rAF loop always sees fresh options/closures
  // without needing a brittle useCallback dependency chain against itself.
  tickRef.current = () => {
    const now = performance.now();
    const currentPhase = phaseRef.current;

    if (currentPhase === "inspecting") {
      const elapsed = now - (inspectionStartRef.current ?? now);
      const remaining = Math.max(0, inspectionDurationMs - elapsed);
      inspectionRemainingRef.current = remaining;
      setInspectionRemainingMs(remaining);

      if (isHoldingRef.current && holdStartRef.current !== null) {
        const holdElapsed = now - holdStartRef.current;
        const basis = holdStartRemainingRef.current || inspectionDurationMs;
        setHoldIntensity(Math.min(1, holdElapsed / basis));
      }

      if (!forcedStartFiredRef.current && isHoldingRef.current && elapsed >= inspectionDurationMs) {
        forcedStartFiredRef.current = true;
        beginSolving("none");
        return;
      }

      if (elapsed >= DNF_CUTOFF_MS) {
        setPhase("stopped");
        setInspectionRemainingMs(0);
        onSolveComplete?.(0, "DNF");
        return;
      }

      runTick();
      return;
    }

    if (
      currentPhase === "idle" &&
      mode === "standard" &&
      isHoldingRef.current &&
      holdStartRef.current !== null
    ) {
      const holdElapsed = now - holdStartRef.current;
      setHoldIntensity(Math.min(1, holdElapsed / standardReadyThresholdMs));
      runTick();
      return;
    }

    if (currentPhase === "solving" && solveStartRef.current !== null) {
      setSolvingElapsedMs(now - solveStartRef.current);
      runTick();
    }
  };

  useEffect(() => stopRaf, [stopRaf]);

  const prepareNextSolve = useCallback(() => {
    stopRaf();
    isHoldingRef.current = false;
    holdStartRef.current = null;
    holdStartRemainingRef.current = null;
    solveStartRef.current = null;
    forcedStartFiredRef.current = false;
    setIsHolding(false);
    setHoldIntensity(0);
    setSolvingElapsedMs(0);

    if (mode === "inspection") {
      inspectionStartRef.current = performance.now();
      inspectionRemainingRef.current = inspectionDurationMs;
      setInspectionRemainingMs(inspectionDurationMs);
      setPhase("inspecting");
      runTick();
    } else {
      setInspectionRemainingMs(null);
      setPhase("idle");
    }
  }, [mode, inspectionDurationMs, stopRaf, runTick]);

  const keyDown = useCallback(() => {
    const currentPhase = phaseRef.current;

    if (currentPhase === "solving") {
      const raw = performance.now() - (solveStartRef.current ?? performance.now());
      stopRaf();
      setPhase("stopped");
      setSolvingElapsedMs(raw);
      onSolveComplete?.(Math.round(raw), pendingPenaltyRef.current);
      return;
    }

    if (isHoldingRef.current) return; // ignore key-repeat while already held

    if (currentPhase === "idle" && mode === "standard") {
      isHoldingRef.current = true;
      setIsHolding(true);
      holdStartRef.current = performance.now();
      setHoldIntensity(0);
      runTick();
      return;
    }

    if (currentPhase === "inspecting") {
      isHoldingRef.current = true;
      setIsHolding(true);
      holdStartRef.current = performance.now();
      holdStartRemainingRef.current = inspectionRemainingRef.current;
    }
  }, [mode, onSolveComplete, runTick, stopRaf]);

  const keyUp = useCallback(() => {
    if (!isHoldingRef.current) return;
    const currentPhase = phaseRef.current;

    if (currentPhase === "inspecting") {
      isHoldingRef.current = false;
      setIsHolding(false);
      const elapsed = performance.now() - (inspectionStartRef.current ?? performance.now());
      beginSolving(penaltyForInspectionElapsed(elapsed));
      return;
    }

    if (currentPhase === "idle" && mode === "standard") {
      const elapsed = performance.now() - (holdStartRef.current ?? performance.now());
      isHoldingRef.current = false;
      setIsHolding(false);
      if (elapsed >= standardReadyThresholdMs) {
        beginSolving("none");
      } else {
        setHoldIntensity(0);
        holdStartRef.current = null;
        stopRaf();
      }
    }
  }, [mode, standardReadyThresholdMs, beginSolving, stopRaf]);

  return {
    phase,
    holdIntensity,
    inspectionRemainingMs,
    solvingElapsedMs,
    isHolding,
    prepareNextSolve,
    keyDown,
    keyUp,
  };
}
