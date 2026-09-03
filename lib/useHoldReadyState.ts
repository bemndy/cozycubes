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

/**
 * Phases a Mode B ready-hold may begin from: a freshly armed timer, or one
 * still showing the previous result. Allowing "stopped" is what lets a single
 * uninterrupted hold-and-release restart the timer — the last time stays on
 * screen and ramps under the hold, and only the release clears it and starts
 * timing, instead of burning one press purely to reset the display.
 */
function canHoldFrom(phase: TimerPhase): boolean {
  return phase === "idle" || phase === "stopped";
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
  const modeRef = useRef<TimerMode>(mode);
  const isHoldingRef = useRef(false);
  const inspectionStartRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const solveStartRef = useRef<number | null>(null);
  const pendingPenaltyRef = useRef<Penalty>("none");
  const forcedStartFiredRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<() => void>(() => {});

  // The single writer for phase: updates the ref that the rAF loop and the key
  // handlers read, in lockstep with the state the UI renders from. Writing a
  // ref from a callback is allowed — only writes during render are not — and
  // doing it here rather than in an effect keeps the update synchronous.
  // That matters: a passive effect can flush after the animation frame it was
  // meant to inform, and the tick loop only reschedules itself from inside a
  // matching branch, so one tick reading a stale phase would kill the loop and
  // freeze the running timer display.
  const commitPhase = useCallback((next: TimerPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

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
      commitPhase("solving");
      runTick();
    },
    [commitPhase, runTick]
  );

  // Rebuilt every render so the rAF loop always sees fresh options/closures
  // without needing a brittle useCallback dependency chain against itself,
  // then published to the ref in the effect below. Building the closure during
  // render is fine; only the ref write has to wait for commit.
  const tick = () => {
    const now = performance.now();
    const currentPhase = phaseRef.current;

    if (currentPhase === "inspecting") {
      const elapsed = now - (inspectionStartRef.current ?? now);
      const remaining = Math.max(0, inspectionDurationMs - elapsed);
      setInspectionRemainingMs(remaining);

      // Whether this hold was already in progress before the 15s mark passed —
      // only holds that started before expiry are eligible to auto force-start.
      // A hold that begins during the 15-17s grace window should ramp toward
      // the 17s DNF cutoff instead, and resolve normally via release (+2) or
      // the DNF-cutoff branch below, not via an instant "none"-penalty start.
      let holdStartedBeforeExpiry = false;
      if (isHoldingRef.current && holdStartRef.current !== null) {
        const holdElapsed = now - holdStartRef.current;
        const holdStartElapsed = holdStartRef.current - (inspectionStartRef.current ?? holdStartRef.current);
        holdStartedBeforeExpiry = holdStartElapsed < inspectionDurationMs;
        const targetElapsed = holdStartedBeforeExpiry ? inspectionDurationMs : DNF_CUTOFF_MS;
        const basis = Math.max(targetElapsed - holdStartElapsed, 1);
        setHoldIntensity(Math.min(1, holdElapsed / basis));
      }

      if (
        !forcedStartFiredRef.current &&
        isHoldingRef.current &&
        holdStartedBeforeExpiry &&
        elapsed >= inspectionDurationMs
      ) {
        forcedStartFiredRef.current = true;
        beginSolving("none");
        return;
      }

      if (elapsed >= DNF_CUTOFF_MS) {
        commitPhase("stopped");
        setInspectionRemainingMs(0);
        onSolveComplete?.(0, "DNF");
        return;
      }

      runTick();
      return;
    }

    if (
      canHoldFrom(currentPhase) &&
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

  // No dependency array on purpose: the loop must always call the newest
  // closure, and a rAF callback can only fire after the commit that stored it.
  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => stopRaf, [stopRaf]);

  const prepareNextSolve = useCallback(() => {
    stopRaf();
    isHoldingRef.current = false;
    holdStartRef.current = null;
    solveStartRef.current = null;
    forcedStartFiredRef.current = false;
    setIsHolding(false);
    setHoldIntensity(0);
    setSolvingElapsedMs(0);

    if (mode === "inspection") {
      inspectionStartRef.current = performance.now();
      setInspectionRemainingMs(inspectionDurationMs);
      commitPhase("inspecting");
      runTick();
    } else {
      setInspectionRemainingMs(null);
      commitPhase("idle");
    }
  }, [mode, inspectionDurationMs, commitPhase, stopRaf, runTick]);

  // Re-arm on a mode switch only to cancel a countdown that's actually
  // running. Toggling inspection off mid-countdown must not leave a stale
  // inspection clock behind for the next keyUp to score a penalty against.
  //
  // Deliberately *not* re-armed from "idle": that would have the toggle
  // itself start the 15s countdown before the user has pressed anything.
  // "idle" and "stopped" are both handled by keyDown/handlePress the same
  // way (see canHoldFrom and page.tsx's handlePress), so the phase already
  // matches whichever mode is active next time a press arms it.
  useEffect(() => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;
    if (phaseRef.current === "inspecting") {
      prepareNextSolve();
    }
  }, [mode, prepareNextSolve]);

  const keyDown = useCallback(() => {
    const currentPhase = phaseRef.current;

    if (currentPhase === "solving") {
      const raw = performance.now() - (solveStartRef.current ?? performance.now());
      stopRaf();
      commitPhase("stopped");
      setSolvingElapsedMs(raw);
      onSolveComplete?.(Math.round(raw), pendingPenaltyRef.current);
      return;
    }

    if (isHoldingRef.current) return; // ignore key-repeat while already held

    if (canHoldFrom(currentPhase) && mode === "standard") {
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
    }
  }, [mode, commitPhase, onSolveComplete, runTick, stopRaf]);

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

    if (canHoldFrom(currentPhase) && mode === "standard") {
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
