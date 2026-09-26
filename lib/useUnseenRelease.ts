"use client";

import { useSyncExternalStore } from "react";
import { CHANGELOG_SEEN_KEY, hasUnseenRelease, LATEST_RELEASE_TAG } from "./changelog";

/**
 * Whether the changelog holds a release the visitor hasn't opened yet.
 *
 * localStorage is an external system rather than React state, so this follows
 * useTheme: useSyncExternalStore over the stored tag, not state synced from an
 * effect. Same reasoning as there — the store renders on the server, where
 * there's nothing to read, and seeding from storage after hydration would both
 * be a second render and trip the set-state-in-effect rule.
 */

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function readSeenTag(): string | null {
  try {
    return window.localStorage.getItem(CHANGELOG_SEEN_KEY);
  } catch {
    // Private mode or blocked storage. Indistinguishable from a first visit,
    // and treated as one: no dot, and the write below fails just as quietly.
    return null;
  }
}

function writeSeenTag(tag: string): void {
  try {
    window.localStorage.setItem(CHANGELOG_SEEN_KEY, tag);
  } catch {
    // Nothing to recover. The dot stays cleared for this session and the next
    // load is another first visit — not worth surfacing to the user.
  }
}

function getSnapshot(): boolean {
  // Cached so the snapshot is referentially stable between notifications, and
  // so this isn't a localStorage read on every render.
  if (cached === null) cached = hasUnseenRelease(readSeenTag(), LATEST_RELEASE_TAG);
  return cached;
}

/** SSR has no storage to read; the client re-reads immediately after hydration. */
function getServerSnapshot(): boolean {
  return false;
}

function emit(next: boolean): void {
  cached = next;
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);

  // A first visit records the current tag here rather than during the
  // snapshot read: subscribe runs after commit, which is where a write
  // belongs. It doesn't change what's on screen — hasUnseenRelease already
  // reads an absent tag as "nothing new" — it's what makes the *next* release
  // register as unread instead of looking like another first visit.
  if (readSeenTag() === null) writeSeenTag(LATEST_RELEASE_TAG);

  // Keep other tabs in step, same as the theme store.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== CHANGELOG_SEEN_KEY) return;
    emit(hasUnseenRelease(e.newValue, LATEST_RELEASE_TAG));
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Records the current release as read and clears the dot. */
export function markReleaseSeen(): void {
  writeSeenTag(LATEST_RELEASE_TAG);
  emit(false);
}

export function useUnseenRelease(): { unseen: boolean; markSeen: () => void } {
  const unseen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { unseen, markSeen: markReleaseSeen };
}
