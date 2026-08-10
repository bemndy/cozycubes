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
import { CubeNet } from "@/components/CubeNet";
import { ScrambleHint, TimerHint } from "@/components/Hints";
import { ScrambleLine } from "@/components/ScrambleLine";
import { SolveHistory } from "@/components/SolveHistory";
import { StatsRow } from "@/components/StatsRow";
import { TimerDisplay } from "@/components/TimerDisplay";
import { effectiveTimeMs, type Penalty, type Solve } from "@/lib/stats-engine";
import { useHoldReadyState } from "@/lib/useHoldReadyState";
import { useMouseIdle } from "@/lib/useMouseIdle";
import { useAnyOverlayOpen } from "@/lib/overlayState";

const TIMER_KEY = "Space";
const NEW_SCRAMBLE_KEY = "Tab";

/**
 * Elements that own their own click. A pointer press landing on one of these
 * must not also arm the timer, or picking a theme would start a solve.
 */
const INTERACTIVE = 'button, a, select, input, [role="listbox"], [role="dialog"]';

/**
 * Composition root for the timer.
 *
 * All state and every effect that drives behaviour stay here on purpose — the
 * components below are presentational and take props. Moving useHoldReadyState
 * or the input listeners into a child would change when they mount and remount,
 * and so change the timer's behaviour.
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

  const cubeSizeLocked = phase === "inspecting" || phase === "solving";

  // 3x3 is the default size and needs cubejs's pruning tables, which take
  // 1-2s to build and block the main thread while they do. Wait for an actual
  // painted frame before starting so the boot screen is on screen for it,
  // rather than the browser going white — a passive effect alone doesn't
  // guarantee the paint has happened.
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
    // Same guard as the new-scramble binding: switching cube size mid-solve
    // would change what onSolveComplete records the in-flight solve as (it
    // closes over cubeSize), silently corrupting which cube size's stats the
    // solve lands in.
    if (cubeSizeLocked) return;
    setCubeSize(size);
    regenerateScramble(size);
  }

  /** Shared by the Tab keybind and the reroll button. */
  const newScramble = useCallback(() => {
    // Guard against changing the scramble mid-inspection/solve, per spec 2.2.
    if (phase === "inspecting" || phase === "solving") return;
    regenerateScramble(cubeSize);
  }, [phase, cubeSize, regenerateScramble]);

  // Press and release, shared verbatim by the spacebar and the pointer so the
  // two bindings cannot drift apart.
  const handlePress = useCallback(() => {
    // Inspection mode: this press starts the next countdown, flipping the
    // display from the last time to 15. Standard mode: the press instead
    // begins the next ready-hold, so one continuous hold-and-release goes from
    // "showing your last time" to "timing" without spending a separate press
    // just to reset the display.
    if (phase === "stopped" && inspectionEnabled) {
      prepareNextSolve();
      return;
    }
    keyDown();
  }, [phase, inspectionEnabled, prepareNextSolve, keyDown]);

  useEffect(() => {
    // Gating on `booted` subsumes the old `scramblerReady` guard — the boot
    // screen only accepts a keypress once the scrambler is warm. It also means
    // no Space handler is registered at the moment the dismissing keypress
    // fires, so that keypress cannot also start a solve.
    //
    // `overlayOpen` covers the dropdowns and the footer dialogs, which need the
    // same two keys this handler claims: Space activates the focused option and
    // Tab moves between controls.
    if (!booted || overlayOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === TIMER_KEY) {
        if (e.repeat) return;
        e.preventDefault();
        handlePress();
        return;
      }
      if (e.code === NEW_SCRAMBLE_KEY) {
        e.preventDefault();
        newScramble();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== TIMER_KEY) return;
      e.preventDefault();
      keyUp();
    }
    // The pointer is bound on window, exactly like the spacebar, and runs the
    // same handlePress/keyUp pair. Anything narrower — binding press to the
    // timer surface only — makes the two behave differently depending on where
    // the cursor happens to be, which is the one thing they must not do.
    function onPointerDown(e: PointerEvent) {
      // Primary button only: right-click opens a context menu, and a middle
      // click has no business starting a solve.
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
      // Stops a hold from turning into a text-selection drag across the page.
      e.preventDefault();
      handlePress();
    }
    // Release is unconditional: a press that starts on the page and releases
    // off it — or over the header — must still register, or the timer stays
    // stuck holding. keyUp already no-ops when nothing is held.
    function onPointerUp() {
      keyUp();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [booted, overlayOpen, handlePress, newScramble, keyUp]);

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

  // Focus mode: the chrome, the hints, the net, and the solve list recede when
  // the pointer is at rest, and outright while inspecting or solving — the
  // "serious state". What survives is the scramble text, the digits, and the
  // summary stats.
  //
  // An open overlay always wins: fading the footer out from under a dialog the
  // user just opened would strand it.
  const dimmed = !overlayOpen && (pointerIdle || cubeSizeLocked);

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
          dimmed={dimmed}
        />

        {/*
          Rows are laid out from the top rather than centred, and every row above
          the solves has a fixed height. That is what pins the digits: a scramble
          that wraps, a hidden hint, an empty solve list and a full one all
          resolve inside their own box.

          The solve list is the one row that grows, because expanding it is a
          direct response to a click. It pushes the page taller downward and
          leaves everything above it exactly where it was.
        */}
        {/*
          Three columns on wide screens: the net claims the left margin, the
          solve list the right, the scramble and timer keep the middle. Both
          flanks are fixed widths and the centre is the remainder, so the timer
          holds the page's centre line whatever either side is doing.

          Every column is centred against the others, and the centre column is
          built symmetrically — the blocks above and below the digits are the
          same fixed height — so the digits land exactly halfway down the stack.
          The net and the solve list then centre onto that same line. Below lg
          it stacks to one column, timer block first.
        */}
        <main className="grid min-h-screen w-full content-center items-center gap-x-10 gap-y-12 px-6 py-24 lg:grid-cols-[15rem_minmax(0,1fr)_24rem]">
          <aside
            className="order-2 flex h-40 items-center justify-center transition-opacity duration-500 lg:order-1"
            style={{ opacity: dimmed ? 0 : 1 }}
            aria-hidden={dimmed}
          >
            <CubeNet cubeSize={cubeSize} scramble={scramble} />
          </aside>

          <div className="order-1 flex flex-col items-center lg:order-2">
            {/* Fixed height. The hint hugs the scramble; the rest of the block
                is the gap down to the digits. */}
            <div className="flex h-36 w-full flex-col items-center justify-start gap-2">
              <div className="scroll-thin flex max-h-[6.5rem] w-full justify-center overflow-y-auto">
                <ScrambleLine
                  scramble={scramble}
                  onRefresh={newScramble}
                  locked={cubeSizeLocked}
                />
              </div>
              <ScrambleHint hidden={dimmed} />
            </div>

            <div className="flex h-32 items-center justify-center">
              <TimerDisplay
                display={display}
                phase={phase}
                holdIntensity={holdIntensity}
                isHolding={isHolding}
              />
            </div>

            {/* Mirrors the block above: same height, contents pushed to the far
                edge, so the hint hugs the stats and the gap lands by the digits. */}
            <div className="flex h-36 w-full flex-col items-center justify-end gap-2">
              <TimerHint hidden={dimmed} />
              <StatsRow solves={solves} />
            </div>
          </div>

          <aside
            className="order-3 flex items-center justify-center transition-opacity duration-500"
            style={{ opacity: dimmed ? 0 : 1, pointerEvents: dimmed ? "none" : "auto" }}
            aria-hidden={dimmed}
          >
            <SolveHistory
              solves={solves}
              onTogglePenalty={togglePenalty}
              onDelete={removeSolve}
            />
          </aside>
        </main>

        <Footer solveCount={solves.length} dimmed={dimmed} />
      </div>
    </>
  );
}
