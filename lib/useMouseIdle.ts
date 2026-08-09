"use client";

import { useEffect, useState } from "react";

/**
 * True once the pointer has been still for `delayMs`.
 *
 * Drives the focus mode: with the mouse at rest the chrome recedes and only the
 * scramble, timer, and solve list remain, which is the state you're actually in
 * while cubing. Any pointer movement brings it all back.
 *
 * Listens for pointermove rather than mousemove so pens and trackpads count,
 * and for touchstart so touch devices — which never fire a move event at rest —
 * have some way to summon the chrome back.
 *
 * Keyboard input deliberately does not count as activity. The timer is driven
 * by the spacebar, so treating keys as movement would flash the whole interface
 * back on at the exact moment the user starts a solve.
 */
export function useMouseIdle(delayMs = 2500): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function schedule() {
      clearTimeout(timeout);
      timeout = setTimeout(() => setIdle(true), delayMs);
    }

    function onActivity() {
      // Cheap guard: this fires on every pointer move, and calling setState
      // unconditionally would re-render the tree on each one.
      setIdle((wasIdle) => (wasIdle ? false : wasIdle));
      schedule();
    }

    schedule();
    window.addEventListener("pointermove", onActivity, { passive: true });
    window.addEventListener("touchstart", onActivity, { passive: true });
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("pointermove", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [delayMs]);

  return idle;
}
