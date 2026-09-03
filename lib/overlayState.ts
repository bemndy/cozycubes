"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Tracks whether any overlay (dropdown, dialog) is currently open.
 *
 * This exists for a correctness reason, not a cosmetic one. The timer listens
 * for Space and Tab on `window`, and those are exactly the keys an open
 * dropdown or dialog needs: Space activates the focused option, Tab moves
 * between controls. Without this guard, choosing a cube size with the keyboard
 * would also start a solve, and tabbing inside a dialog would reroll the
 * scramble underneath it.
 *
 * A counter rather than a boolean so nested or overlapping overlays can't have
 * the inner one's close re-arm the timer while the outer is still up.
 */

let openCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** True while at least one overlay is open. */
export function useAnyOverlayOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => openCount > 0,
    () => false
  );
}

/**
 * Registers an overlay as open for as long as `open` is true. Balancing the
 * counter in the effect's cleanup means an overlay that unmounts while still
 * open — a route change, a parent collapsing — can't strand the count above
 * zero and leave the timer permanently deaf.
 */
export function useRegisterOverlay(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    openCount += 1;
    emit();
    return () => {
      openCount = Math.max(0, openCount - 1);
      emit();
    };
  }, [open]);
}
