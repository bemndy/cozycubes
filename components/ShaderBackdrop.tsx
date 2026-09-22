"use client";

import { useEffect, useRef, useState } from "react";
import { createShaderBackdrop, type ShaderHandle } from "@/lib/shaderBackdrop";
import { useTheme } from "@/lib/useTheme";

/** Matches the CSS fade below. */
const FADE_MS = 900;

/**
 * Ambient noise field behind the timer.
 *
 * Animates only while `active` — which the page ties to pointer idle *and* not
 * solving. That pairing is the point: the effect appears when the app is just
 * sitting there being looked at, and there is provably zero GPU work during a
 * solve, which is the only time frame budget actually matters here.
 *
 * The WebGL context is created once and kept for the component's lifetime;
 * only the animation loop starts and stops. Tearing the context down on
 * deactivate would clear the drawing buffer instantly and the canvas would
 * vanish mid-fade instead of dissolving.
 */
export function ShaderBackdrop({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ShaderHandle | null>(null);
  const [supported, setSupported] = useState(true);
  const { theme } = useTheme();

  // Context lifetime.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handle = createShaderBackdrop(canvas);
    if (!handle) {
      setSupported(false);
      return;
    }
    handleRef.current = handle;

    const resize = () => handle.resize(window.innerWidth, window.innerHeight);
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      handle.dispose();
      handleRef.current = null;
    };
  }, []);

  // Animation lifetime. `theme` is a dependency rather than a stored palette:
  // the colours live in CSS variables, so they're read straight off the
  // document here. Keeping them in state would mean syncing DOM values into
  // React just to hand them back to the DOM a frame later.
  useEffect(() => {
    const handle = handleRef.current;
    if (!active || !handle) return;

    const styles = getComputedStyle(document.documentElement);
    const palette = {
      bg: styles.getPropertyValue("--shader-bg"),
      // The palette vars directly, not the semantic aliases: these are plain
      // hex that hexToRgb can parse, where an alias risks arriving as an
      // unresolved var() token.
      a: styles.getPropertyValue("--p1"),
      b: styles.getPropertyValue("--p2"),
      c: styles.getPropertyValue("--p3"),
    };
    // Per-theme radial-fade window (see globals.css) — most themes don't set
    // one, so the fallback lives here in JS rather than as a "default" rule
    // in globals.css's DERIVED block: that block's `:root, [data-theme]`
    // selector has the same specificity as every per-theme `[data-theme="…"]`
    // rule, and being later in the file, a hard default there would win the
    // cascade and silently clobber a theme's own override (which is exactly
    // what happened to the mono pair's --edge, fixed alongside this).
    const rawInner = styles.getPropertyValue("--shader-falloff-inner");
    const rawOuter = styles.getPropertyValue("--shader-falloff-outer");
    const falloff = {
      inner: rawInner ? parseFloat(rawInner) : 0.25,
      outer: rawOuter ? parseFloat(rawOuter) : 0.85,
    };
    // Same reasoning, same fallback location — see --shader-intensity.
    const rawIntensity = styles.getPropertyValue("--shader-intensity");
    const intensity = rawIntensity ? parseFloat(rawIntensity) : 1;

    // Reduced motion still gets the field, held on one frame — the colour is
    // the point, the drift is the flourish.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      handle.render(0, palette, falloff, intensity);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      handle.render((now - start) / 1000, palette, falloff, intensity);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame);
  }, [active, theme]);

  if (!supported) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ opacity: active ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}
    />
  );
}
