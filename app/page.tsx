"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addSolve,
  clearSolvesByCubeSize,
  deleteSolve,
  getSolvesByCubeSize,
  updateSolve,
} from "@/lib/db";
import { formatTimeMs } from "@/lib/format";
import { type SupportedCubeSize } from "@/lib/scramble-gen";
import { generateScrambleForSize, initScrambler } from "@/lib/scrambler";
import { Backdrop } from "@/components/Backdrop";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import { BootScreen, BOOT_EXIT_MS } from "@/components/BootScreen";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CubeNet } from "@/components/CubeNet";
import { ScrambleHint, TimerHint } from "@/components/Hints";
import { ScrambleLine } from "@/components/ScrambleLine";
import { SolveHistory } from "@/components/SolveHistory";
import { StatsRow } from "@/components/StatsRow";
import { TimerDisplay } from "@/components/TimerDisplay";
import { bestSingle, effectiveTimeMs, type Penalty, type Solve } from "@/lib/stats-engine";
import { useHoldReadyState } from "@/lib/useHoldReadyState";
import { useMouseIdle } from "@/lib/useMouseIdle";
import { useAnyOverlayOpen } from "@/lib/overlayState";

const TIMER_KEY = "Space";
const NEW_SCRAMBLE_KEY = "Tab";

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

  // Only starts counting once the app is actually on screen.
  const pointerIdle = useMouseIdle(2500, booted);
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

  // Confirmation lives in the footer's ClearSessionConfirm dialog, not here —
  // by the time this runs the user has already agreed.
  const clearSession = useCallback(() => {
    setSolves([]);
    setLastSolve(null);
    void clearSolvesByCubeSize(cubeSize);
  }, [cubeSize]);

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
    if ((phase === "stopped" || phase === "idle") && inspectionEnabled) {
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
    // Only the release is global. The press is bound to the timer's own box
    // (see onTimerPointerDown) so clicking the scramble, the hints, or the
    // stats doesn't start a solve — but a press that starts on the timer and
    // releases anywhere else must still register, or the timer stays stuck
    // holding. keyUp already no-ops when nothing is held.
    function onPointerUp() {
      keyUp();
    }
    // Stopping is unrestricted: once a solve is running, a click anywhere ends
    // it. Starting stays pinned to the timer's own surface (onTimerPointerDown)
    // so clicking the scramble or the solve list can't begin a solve.
    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || phase !== "solving") return;
      e.preventDefault();
      handlePress();
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
  }, [booted, overlayOpen, handlePress, newScramble, keyUp, phase]);

  /**
   * Starting is restricted to the timer's own surface; stopping is not.
   *
   * A running solve is stopped by a click anywhere (see the window listener
   * above) — mid-solve your hand is not necessarily over the digits, and
   * hunting for a target to end a solve is the worst possible moment to make
   * someone aim. This handler bows out while solving so the two don't both
   * fire on a click that lands here: a second press would stop the timer and
   * then immediately begin a fresh hold.
   */
  function onTimerPointerDown(e: React.PointerEvent) {
    if (!booted || overlayOpen) return;
    if (phase === "solving") return;
    // Primary button only: right-click opens a context menu, and a middle click
    // has no business starting a solve.
    if (e.button !== 0) return;
    // Stops a hold from turning into a text-selection drag.
    e.preventDefault();
    handlePress();
  }

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

  // A new PB only counts once there's a prior best to beat, and only for the
  // solve that was actually just displayed — recomputing bestSingle after a
  // penalty edit shouldn't retroactively badge an older solve.
  const lastEffectiveMs = lastSolve ? effectiveTimeMs(lastSolve) : null;
  const isNewPersonalBest =
    phase === "stopped" &&
    solves.length > 1 &&
    lastEffectiveMs !== null &&
    lastEffectiveMs === bestSingle(solves);

  // Focus mode: the chrome, the hints, the net, and the solve list recede when
  // the pointer is at rest, and outright while inspecting or solving — the
  // "serious state". What survives is the scramble text, the digits, and the
  // summary stats.
  //
  // An open overlay always wins: fading the footer out from under a dialog the
  // user just opened would strand it.
  const dimmed = !overlayOpen && (pointerIdle || cubeSizeLocked);

  return (
    // Everything the overlays sit on top of lives inside .app-content, which is
    // what gets blurred while one is open. The overlays portal to <body>, so
    // they are siblings of this element rather than descendants, and stay sharp.
    <div className="app-content" data-blurred={overlayOpen}>
      {/*
        Rendered before Backdrop so the vignette layers on top of the field and
        keeps the UI legible over it. Active only once booted, while the pointer
        is idle, and never during inspection or a solve.
      */}
      <ShaderBackdrop active={booted && pointerIdle && !cubeSizeLocked} />
      <Backdrop />

      {bootMounted && (
        <BootScreen ready={scramblerReady} booted={booted} onBoot={handleBoot} />
      )}

      {/*
        Opacity only — no transform here. Header and Footer are position:fixed
        and both live inside this wrapper; a `transform` on any ancestor of a
        fixed element (even a no-op translateY(0)) makes CSS treat that
        ancestor as the fixed element's containing block instead of the
        viewport. That silently turned the boot-dismiss animation into
        dragging the header and footer along with this wrapper's own
        slide-up — the whole bar visibly sliding rather than staying pinned —
        and, since a fixed element's extent then counts toward its
        (now non-viewport) containing block's box instead of being excluded
        from the document entirely, document.scrollHeight measurably
        wobbled mid-transition too.
      */}
      <div
        className="relative z-10 flex min-h-screen flex-col"
        style={{
          opacity: booted ? 1 : 0,
          pointerEvents: booted ? "auto" : "none",
          transition: "opacity .8s ease .1s",
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
          Three sections: net left, scramble and timer middle, solves right.

          The columns come from .page-grid, which the header and footer use too.
          That shared definition is what keeps the bars aligned with the timer at
          every width — a fixed max-width on the bars could only ever match a
          fractional middle column at one specific viewport size.

          Every column is centred against the others, and the centre column is
          built symmetrically: the blocks above and below the digits are the same
          fixed height, so the digits land exactly halfway down the stack and the
          net and solve list centre onto that same line. Fixed block heights also
          pin the digits against content changes — a scramble that wraps, a
          hidden hint, an empty solve list or a full one all resolve inside their
          own box. Below lg it stacks to one column, timer block first.
        */}
        <main className="page-grid min-h-screen items-stretch gap-y-12 py-24">
          {/* min-w-0: a grid item's default min-width is its content's
              min-content size, not 0, even though the track itself is
              minmax(0, 1fr) — without this override the item refuses to
              shrink below the net's natural width and pushes the page wider
              than the viewport on the desktop widths where the flank is
              narrowest.

              The translate is capped at 1.25rem/20px, not the 2.5rem it used
              to be: .page-grid only ever has 1.5rem/24px of padding outside
              the grid itself, so anything past ~24px pushes the aside past
              the true viewport edge and forces a horizontal scrollbar on
              exactly the desktop widths (1024–1503px) where the flank is
              tight. 20px leaves a hair of margin rather than sitting flush
              on the boundary. */}
          <aside
            className="order-2 grid h-52 min-w-0 place-items-center self-center transition-opacity duration-500 lg:order-1 lg:-translate-x-5"
            style={{ opacity: dimmed ? 0 : 1 }}
            inert={dimmed}
          >
            <CubeNet cubeSize={cubeSize} scramble={scramble} />
          </aside>

          <div className="order-1 flex h-full flex-col items-center justify-center lg:order-2">
            {/*
              This block and its mirror below the digits both take flex-1, so
              they always split whatever height the digits leave, equally. Two
              things fall out of that: the scramble and the stats push toward
              the bars at any viewport height rather than only at one size, and
              the digits stay exactly centred because the space above and below
              them is equal by construction.

              The max-height caps how far that push can go. Uncapped, a tall
              display drove the two apart much harder than a laptop did — the
              spread scaled with the screen. With the cap they stop growing past
              26rem and the whole group centres instead, so the spacing looks
              the same at 900px of viewport as at 1400px.
            */}
            <div className="flex max-h-[26rem] w-full min-h-0 flex-1 flex-col items-center justify-start gap-3">
              <div className="scroll-thin flex max-h-[10rem] w-full justify-center overflow-y-auto">
                <ScrambleLine
                  scramble={scramble}
                  onRefresh={newScramble}
                  locked={cubeSizeLocked}
                />
              </div>
              <ScrambleHint hidden={dimmed} />
            </div>

            {/* The click target. Spans the column at the digits' height and
                stops there, so the scramble, hints, and stats stay clickable
                as ordinary content. h-40 rather than the digits' own h-32:
                TimerDisplay always reserves a line for the personal-best
                badge under the digits, so the box has to be tall enough to
                hold that reserved line too — otherwise the badge would
                either get clipped or push the digits off-centre exactly
                when it appears, which is the one thing this fixed height
                exists to prevent. */}
            <div
              onPointerDown={onTimerPointerDown}
              className="flex h-40 w-full cursor-pointer select-none items-center justify-center"
            >
              <TimerDisplay
                display={display}
                phase={phase}
                holdIntensity={holdIntensity}
                isHolding={isHolding}
                isNewPersonalBest={isNewPersonalBest}
              />
            </div>

            {/* Mirrors the block above: same height, contents pushed to the far
                edge, so the hint hugs the stats and the gap lands by the digits. */}
            <div className="flex max-h-[26rem] w-full min-h-0 flex-1 flex-col items-center justify-end gap-3">
              <TimerHint hidden={dimmed} />
              <StatsRow solves={solves} />
            </div>
          </div>

          {/* Same min-w-0 and translate cap as the net's aside above. */}
          <aside
            className="order-3 grid min-w-0 place-items-center self-center transition-opacity duration-500 lg:translate-x-5"
            style={{ opacity: dimmed ? 0 : 1 }}
            // The list's +2/DNF/delete buttons would otherwise stay tabbable
            // while invisible.
            inert={dimmed}
          >
            {/* Capped and centred, so the list sits in the middle of its
                section rather than stretching to fill it. */}
            <div className="w-full max-w-[26rem]">
              <SolveHistory
                solves={solves}
                onTogglePenalty={togglePenalty}
                onDelete={removeSolve}
              />
            </div>
          </aside>
        </main>

        <Footer
          cubeSize={cubeSize}
          solveCount={solves.length}
          onClearSession={clearSession}
          dimmed={dimmed}
        />
      </div>
    </div>
  );
}
