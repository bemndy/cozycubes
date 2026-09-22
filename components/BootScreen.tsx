"use client";

import { useEffect, useState } from "react";
import { AsciiCube } from "./AsciiCube";
import { ColorfulLoader, LOADER_EXIT_MS } from "./ColorfulLoader";

/** Fade/scale-out duration — the parent unmounts once this has elapsed. */
export const BOOT_EXIT_MS = 700;

interface BootScreenProps {
  /** Scrambler warm and first scramble generated. */
  ready: boolean;
  /** Flipped once the user has dismissed the screen. */
  booted: boolean;
  onBoot: () => void;
}

/**
 * Full-screen boot, in two stages.
 *
 * Stage 1 — the pulsing-diamond ColorfulLoader, covering the 1-2s cubejs spends
 * building its pruning tables. That work blocks the main thread, so the stage
 * needs to be something CSS animates on the compositor rather than anything
 * driven by JS.
 *
 * Stage 2 — the ASCII cube and "press any key". The screen deliberately blocks
 * here rather than auto-dismissing: a solve started before the first scramble
 * exists would be timing against a blank scramble.
 *
 * The two cross-fade rather than cutting. Both stages are stacked in one grid
 * cell, so the container is sized by the taller of them from the very first
 * frame and nothing shifts when the swap happens. The cube is mounted and
 * spinning throughout, so it fades in mid-rotation instead of starting cold.
 *
 * The dismissing keypress cannot leak into the timer: page.tsx only attaches
 * its keyboard listener once `booted` is true, so at the moment this event
 * fires there is no Space handler registered to receive it.
 */
export function BootScreen({ ready, booted, onBoot }: BootScreenProps) {
  const [warmStageMounted, setWarmStageMounted] = useState(true);

  useEffect(() => {
    if (!ready || booted) return;
    // "press any key" is exactly the reflex a speedcuber has for Space, and an
    // unprevented Space here scrolls the page by its default amount right as
    // the timer appears — preventDefault regardless of which key it was.
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      onBoot();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, booted, onBoot]);

  // Drop the warm stage once its fade has finished, so the ColorfulLoader's
  // animation stops rather than running invisibly behind the cube.
  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(() => setWarmStageMounted(false), LOADER_EXIT_MS);
    return () => clearTimeout(timeout);
  }, [ready]);

  return (
    <div
      onClick={ready ? onBoot : undefined}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "var(--surface)",
        opacity: booted ? 0 : 1,
        transform: booted ? "scale(1.08)" : "scale(1)",
        pointerEvents: booted ? "none" : "auto",
        transition: `opacity ${BOOT_EXIT_MS}ms ease, transform ${BOOT_EXIT_MS}ms ease`,
      }}
    >
      <div className="bg-wash" />
      <div className="bg-vignette" />

      {/* Both stages occupy the same grid cell so they overlap for the fade. */}
      <div className="relative z-10 grid place-items-center">
        {/* Stage 2. Mounted from the start — it defines the container's size, and
            the cube is already mid-rotation by the time it fades in. */}
        <div
          className="flex flex-col items-center gap-[26px]"
          style={{
            gridArea: "1 / 1",
            opacity: ready ? 1 : 0,
            transition: `opacity ${LOADER_EXIT_MS}ms ease`,
          }}
        >
          <AsciiCube />
          <div
            className="animate-soft-flash font-mono text-[13px] tracking-[.02em]"
            style={{ color: "var(--ink-dimmer)" }}
            role="status"
            aria-live="polite"
          >
            {ready ? "press any key" : ""}
          </div>
        </div>

        {/* Stage 1, painted over stage 2 by DOM order. */}
        {warmStageMounted && (
          <div
            className="pointer-events-none flex flex-col items-center gap-[26px]"
            style={{
              gridArea: "1 / 1",
              opacity: ready ? 0 : 1,
              transition: `opacity ${LOADER_EXIT_MS}ms ease`,
            }}
          >
            {/* The contained loader sizes to its parent, so it needs a definite
                box — inside an auto-sized flex column it would collapse. */}
            <div className="size-24">
              <ColorfulLoader fullScreen={false} label="Warming up scrambler" />
            </div>
            <span
              className="font-mono text-[13px] tracking-[.02em]"
              style={{ color: "var(--ink-dimmer)" }}
            >
              warming up
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
