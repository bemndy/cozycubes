"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, type ThemeId } from "./theme";

/**
 * Theme state, read from `<html data-theme>`.
 *
 * The attribute is the source of truth, not React: the inline script in
 * layout.tsx stamps it before first paint so the stored theme is already
 * applied when the page paints. That makes this an external system React
 * subscribes to — hence useSyncExternalStore rather than state synced from an
 * effect, which would both re-render after hydration and trip the
 * set-state-in-effect rule.
 *
 * M2.1 seam: when the IndexedDB settings store lands, applyTheme() and the
 * initial read below are the only places that touch persistence.
 */

const listeners = new Set<() => void>();
let cached: ThemeId | null = null;

function readAttribute(): ThemeId {
  const attr = document.documentElement.getAttribute("data-theme");
  return isThemeId(attr) ? attr : DEFAULT_THEME;
}

function getSnapshot(): ThemeId {
  // Cached so the snapshot is referentially stable between notifications —
  // useSyncExternalStore re-renders in a loop if the value keeps changing.
  if (cached === null) cached = readAttribute();
  return cached;
}

/** SSR has no DOM to read; the client re-reads immediately after hydration. */
function getServerSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Keep other tabs in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY || !isThemeId(e.newValue)) return;
    cached = e.newValue;
    document.documentElement.setAttribute("data-theme", e.newValue);
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function applyTheme(next: ThemeId): void {
  cached = next;
  document.documentElement.setAttribute("data-theme", next);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage — the preference just won't survive a
    // reload. Not worth surfacing to the user.
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme: applyTheme };
}
