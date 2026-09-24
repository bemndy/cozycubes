"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readSetting, writeSetting, type SettingDecoder } from "./settings";

/**
 * useState for a value that should survive a reload.
 *
 * Storage is the source of truth, not React, so this subscribes to it the way
 * `useTheme` subscribes to the `data-theme` attribute: state synced from an
 * effect would re-render after hydration and trip the set-state-in-effect
 * rule. During SSR there is no storage to read, so the server snapshot is the
 * default and React re-reads on the client immediately after hydration.
 *
 * `decode` is called on every uncached read; pass a module-level function.
 */

/**
 * Decoded values by key. Snapshots have to be referentially stable — returning
 * a freshly-read value on every render would re-render in a loop — and this
 * also keeps the timer's render path off localStorage, which it would
 * otherwise hit on every frame of a running solve.
 */
const cache = new Map<string, unknown>();

const listeners = new Map<string, Set<() => void>>();

function storage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function notify(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

function snapshot<T extends boolean | number>(
  key: string,
  defaultValue: T,
  decode: SettingDecoder<T>
): T {
  if (!cache.has(key)) {
    cache.set(key, readSetting(storage(), key, decode) ?? defaultValue);
  }
  return cache.get(key) as T;
}

export function usePersistedSetting<T extends boolean | number>(
  key: string,
  defaultValue: T,
  decode: SettingDecoder<T>
) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      let forKey = listeners.get(key);
      if (!forKey) {
        forKey = new Set();
        listeners.set(key, forKey);
      }
      forKey.add(onChange);

      // Keep other tabs in step, as the theme store does.
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        const decoded = e.newValue === null ? undefined : decode(e.newValue);
        cache.set(key, decoded ?? defaultValue);
        notify(key);
      };
      window.addEventListener("storage", onStorage);

      return () => {
        forKey.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key, decode, defaultValue]
  );

  const value = useSyncExternalStore(
    subscribe,
    () => snapshot(key, defaultValue, decode),
    () => defaultValue
  );

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = snapshot(key, defaultValue, decode);
      const resolved = typeof next === "function" ? next(previous) : next;
      cache.set(key, resolved);
      writeSetting(storage(), key, resolved);
      notify(key);
    },
    [key, defaultValue, decode]
  );

  return [value, setValue] as const;
}

/** Test/HMR escape hatch: forget the decoded values and re-read on next use. */
export function clearPersistedSettingCache(): void {
  cache.clear();
}
