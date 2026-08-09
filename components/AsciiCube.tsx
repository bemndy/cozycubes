"use client";

import { useEffect, useRef, useState } from "react";
import { createCubeState, CUBE_TICK_MS, stepCube } from "@/lib/asciiCube";

/**
 * Renders the rotating ASCII cube. All the geometry lives in lib/asciiCube.ts;
 * this component just owns the interval and the current frame.
 *
 * The counters sit in a ref rather than state — they change every tick but
 * nothing renders from them directly, so putting them in state would mean four
 * extra re-renders per frame for no visual difference.
 */
export function AsciiCube({ className = "" }: { className?: string }) {
  const stateRef = useRef(createCubeState());
  const [frame, setFrame] = useState(() => stepCube(createCubeState()));

  useEffect(() => {
    const state = stateRef.current;
    const id = setInterval(() => setFrame(stepCube(state)), CUBE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <pre
      aria-hidden="true"
      className={`m-0 text-left font-mono text-[15px] leading-[1.05] ${className}`}
      style={{ color: "var(--ink-dim)" }}
    >
      {frame}
    </pre>
  );
}
