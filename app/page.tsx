"use client";

import { useCallback, useEffect, useState } from "react";
import { addSolve, deleteSolve, getSolvesByCubeSize, updateSolve } from "@/lib/db";
import { formatTimeMs } from "@/lib/format";
import { type SupportedCubeSize } from "@/lib/scramble-gen";
import { generateScrambleForSize, initScrambler } from "@/lib/scrambler";
import { Backdrop } from "@/components/Backdrop";
import { BootScreen, BOOT_EXIT_MS } from "@/components/BootScreen";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ScrambleLine } from "@/components/ScrambleLine";
import { SolveHistory } from "@/components/SolveHistory";
import { StatsRow } from "@/components/StatsRow";
import { TimerDisplay } from "@/components/TimerDisplay";
import { effectiveTimeMs, type Penalty, type Solve } from "@/lib/stats-engine";
import { useHoldReadyState } from "@/lib/useHoldReadyState";
import { useOnceFlag } from "@/lib/useOnceFlag";
import { useMouseIdle } from "@/lib/useMouseIdle";
import { useAnyOverlayOpen } from "@/lib/overlayState";

const TIMER_KEY = "Space";
const NEW_SCRAMBLE_KEY = "Tab";
const TAB_HINT_FLAG = "cozycubes:tab-used";

/**
 * Composition root for the timer.
 *
 * All state and both effects that drive behaviour (keyboard handling, scrambler
 * warm-up) stay here on purpose — the components below are presentational and
 * take props. Moving useHoldReadyState or the key listeners into a child would
 * change when they mount and remount, and so change the timer's behaviour.
 */
export default function TimerPage() {
  const [inspectionEnabled, setInspectionEnabled] = useState(false);
  const [lastSolve, setLastSolve] = useState<Solve | null>(null);
  const [cubeSize, setCubeSize] = useState<SupportedCubeSize>(3);
  const [scramble, setScramble] = useState<string[]>([]);
  const [solves, setSolves] = useState<Solve[]>([]);
  const [scramblerReady, setScramblerReady] = useState(false);
  const [booted, setBooted] = useState(false);
  const [bootMounted, setBootMounted] = useState(true);
  // The Tab hint is a teaching aid, not permanent chrome — it retires itself
  // the first time the user actually uses Tab.
  const [tabHintUsed, markTabHintUsed] = useOnceFlag(TAB_HINT_FLAG);

  const pointerIdle = useMouseIdle();
  const overlayOpen = useAnyOverlayOpen();

  const regenerateScramble = useCallback((size: SupportedCubeSize) => {
    setScramble(generateScrambleForSize(size));
  }, []);

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
  // painted frame before starting so the boot screen is on screen for it,
  // rather than the browser going white — a passive effect alone doesn't
  // guarantee the paint has happened.
  //
  // The first scramble is generated here too, before the reveal, so the timer
  // underneath is fully populated when it fades in rather than showing an
  // empty scramble line for a frame.
  //
  // The guard is `scramblerReady` — the work having *finished* — and not a ref
  // latched on start: the cleanup cancels the pending frame, so a start-latched
  // guard makes any cleanup that lands before the frame fires (StrictMode's
  // mount/unmount/remount) permanent, leaving the boot screen up forever.
  useEffect(() => {
    if (scramblerReady) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        try {
          initScrambler();
          regenerateScramble(cubeSize);
        } catch (err) {
          // A solver that fails to build must not strand the app behind the
          // boot screen; reveal the timer and let Tab retry the scramble.
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
  }, [scramblerReady, cubeSize, regenerateScramble]);

  // Arming the timer is deliberately deferred to the boot dismissal rather than
  // done during scrambler init. In inspection mode prepareNextSolve() starts the
  // 15s countdown immediately, and starting it behind a boot screen that waits
  // on a keypress would let inspection run — and expire into a forced start —
  // before the user has even seen the timer.
  const handleBoot = useCallback(() => {
    setBooted(true);
    prepareNextSolve();
  }, [prepareNextSolve]);

  // Unmount the boot screen only once its fade has finished, so it dissolves
  // over a timer that is already rendered underneath.
  useEffect(() => {
    if (!booted) return;
    const timeout = setTimeout(() => setBootMounted(false), BOOT_EXIT_MS);
    return () => clearTimeout(timeout);
  }, [booted]);

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
    // Gating on `booted` subsumes the old `scramblerReady` guard — the boot
    // screen only accepts a keypress once the scrambler is warm. It also means
    // no Space handler is registered at the moment the dismissing keypress
    // fires, so that keypress cannot also start a solve.
    //
    // `overlayOpen` covers the dropdown and the footer dialogs, which need the
    // same two keys this handler claims: Space activates the focused option and
    // Tab moves between controls. Without detaching here, picking a cube size
    // with the keyboard would also start a solve.
    if (!booted || overlayOpen) return;

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
        // Guard against changing the scramble mid-inspection/solve, per spec 2.2.
        if (phase === "inspecting" || phase === "solving") return;
        e.preventDefault();
        regenerateScramble(cubeSize);
        markTabHintUsed();
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
    booted,
    overlayOpen,
    keyDown,
    keyUp,
    phase,
    prepareNextSolve,
    regenerateScramble,
    cubeSize,
    inspectionEnabled,
    markTabHintUsed,
  ]);

  let display: string;
  if (phase === "solving") {
    display = formatTimeMs(solvingElapsedMs);
  } else if (phase === "stopped" && lastSolve) {
    const effective = effectiveTimeMs(lastSolve);
    display =
      effective === null
        ? "DNF"
        : `${formatTimeMs(effective)}${lastSolve.penalty === "+2" ? " +2" : ""}`;
  } else if (phase === "inspecting" && inspectionRemainingMs !== null) {
    display = String(Math.ceil(inspectionRemainingMs / 1000));
  } else {
    display = "0.00";
  }

  const cubeSizeLocked = phase === "inspecting" || phase === "solving";

  // Focus mode. The chrome recedes when the pointer is at rest, and is forced
  // away outright while inspecting or solving — the "serious state", where only
  // the scramble, the digits, and the session's solves should be on screen.
  // An open overlay always wins: fading the footer out from under a dialog the
  // user just opened would strand it.
  const chromeDimmed = !overlayOpen && (pointerIdle || cubeSizeLocked);

  return (
    <>
      <Backdrop />

      {bootMounted && (
        <BootScreen ready={scramblerReady} booted={booted} onBoot={handleBoot} />
      )}

      <div
        className="relative z-10 flex min-h-screen flex-col"
        style={{
          opacity: booted ? 1 : 0,
          transform: booted ? "translateY(0)" : "translateY(16px)",
          pointerEvents: booted ? "auto" : "none",
          transition: "opacity .8s ease .1s, transform .8s ease .1s",
        }}
      >
        <Header
          cubeSize={cubeSize}
          locked={cubeSizeLocked}
          onCubeSizeChange={handleCubeSizeChange}
          inspectionEnabled={inspectionEnabled}
          onToggleInspection={() => setInspectionEnabled((v) => !v)}
          dimmed={chromeDimmed}
        />

        {/*
          Explicit grid rows rather than a flex column with spacers.

          Every row except the timer's has a fixed height, and the timer sits in
          the single 1fr row, centred. That is what makes the digits hold
          absolutely still: a scramble that wraps to three lines, a dismissed
          Tab hint, an empty solve list and a hundred-solve one all resolve
          inside their own fixed box and cannot push the timer by a pixel.

          The min-content floor on the timer row means a short viewport makes
          the page scroll rather than letting the digits overlap the stats.

          Focus mode fades the chrome rather than removing it from the layout,
          for the same reason: a reflow on every pointer idle would move the
          digits, which is exactly what these fixed rows exist to prevent.
        */}
        <main
          className="shell grid min-h-screen py-24"
          style={{ gridTemplateRows: "9rem minmax(min-content, 1fr) 5rem 11rem" }}
        >
          {/* Scrambles run from 11 moves on 2x2 to 100 on 7x7, so this row
              scrolls internally rather than growing. */}
          <div className="scroll-thin flex flex-col items-center justify-center gap-3 overflow-y-auto">
            <ScrambleLine scramble={scramble} />
            {/* Always rendered so its space stays reserved; it just fades out
                once the user has actually used Tab, on this device. */}
            <p
              aria-hidden={tabHintUsed}
              className="text-[11px] transition-opacity duration-500"
              style={{
                color: "var(--ink-dimmer)",
                opacity: tabHintUsed ? 0 : 1,
              }}
            >
              press{" "}
              <kbd className="rounded px-1 font-mono" style={{ color: "var(--ink-dim)" }}>
                tab
              </kbd>{" "}
              for a new scramble
            </p>
          </div>

          <div className="flex items-center justify-center">
            <TimerDisplay
              display={display}
              phase={phase}
              holdIntensity={holdIntensity}
              isHolding={isHolding}
              hint={
                inspectionEnabled
                  ? "hold space to ready up during inspection, release to start"
                  : "hold space to ready up, release to start"
              }
            />
          </div>

          <div className="flex items-center justify-center">
            <StatsRow solves={solves} />
          </div>

          <div className="flex justify-center">
            <SolveHistory
              solves={solves}
              onTogglePenalty={togglePenalty}
              onDelete={removeSolve}
            />
          </div>
        </main>

        <Footer solveCount={solves.length} dimmed={chromeDimmed} />
      </div>
    </>
  );
}
