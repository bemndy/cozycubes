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
      a: styles.getPropertyValue("--shader-a"),
      b: styles.getPropertyValue("--shader-b"),
    };

    // Reduced motion still gets the field, held on one frame — the colour is
    // the point, the drift is the flourish.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      handle.render(0, palette);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const loop = (now: number) => {
      handle.render((now - start) / 1000, palette);
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
