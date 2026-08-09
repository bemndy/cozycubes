"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A sticky "the user has done this once" flag, persisted to localStorage.
 *
 * Built on useSyncExternalStore for the same reason as useTheme: localStorage
 * is an external system, and syncing it into state from a mount effect both
 * causes a second render and trips the set-state-in-effect rule.
 *
 * Used for one-shot hints — show the tip until the user demonstrates they've
 * learned it, then never again, on this device.
 *
 * M2.1 seam: these flags belong in the settings store once it exists.
 */

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, boolean>();

function listenersFor(key: string): Set<() => void> {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  return set;
}

function getSnapshot(key: string): boolean {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let value = false;
  try {
    value = window.localStorage.getItem(key) === "1";
  } catch {
    // Blocked storage — treat as unset; the hint just shows every session.
  }
  cache.set(key, value);
  return value;
}

export function useOnceFlag(key: string): [boolean, () => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const set = listenersFor(key);
      set.add(onChange);
      return () => {
        set.delete(onChange);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(
    subscribe,
    () => getSnapshot(key),
    // SSR has no storage; the client re-reads right after hydration. Defaulting
    // to false means a hint renders server-side and is removed on hydration if
    // already dismissed, rather than flashing into view.
    () => false
  );

  const mark = useCallback(() => {
    if (cache.get(key) === true) return;
    cache.set(key, true);
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // As above — the flag just won't survive the reload.
    }
    listenersFor(key).forEach((l) => l());
  }, [key]);

  return [value, mark];
}
