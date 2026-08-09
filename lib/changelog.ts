/**
 * Release notes shown in the footer's changelog dialog.
 *
 * The types below mirror the subset of GitHub's Releases API this app cares
 * about (`GET /repos/{owner}/{repo}/releases`), so wiring the real thing later
 * is a fetch and a map, not a reshape of every consumer.
 *
 * Nothing here goes over the network yet — see `getReleases()`.
 */

export interface ReleaseNote {
  /** Free text. One bullet in the dialog. */
  text: string;
  /** Groups the bullet under a heading. */
  kind: "added" | "changed" | "fixed";
}

export interface Release {
  /** GitHub `tag_name`, e.g. "v0.2.0". */
  tag: string;
  /** GitHub `name` — the human title of the release. */
  title: string;
  /** GitHub `published_at`, ISO 8601. */
  publishedAt: string;
  notes: ReleaseNote[];
}

export const KIND_LABELS: Record<ReleaseNote["kind"], string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
};

/**
 * Placeholder release history.
 *
 * Deliberately hand-written rather than fetched: wiring this to the live GitHub
 * API means deciding on caching, rate limits (60 req/hr unauthenticated, shared
 * across everyone behind a NAT), and what the dialog shows when the request
 * fails — none of which is settled yet. The shape is real, so that decision can
 * be made later without touching the dialog.
 */
const PLACEHOLDER_RELEASES: Release[] = [
  {
    tag: "v0.3.0",
    title: "Visual refresh",
    publishedAt: "2026-08-09T00:00:00Z",
    notes: [
      { kind: "added", text: "ASCII boot screen with a rotating 3x3x3 wireframe cube." },
      { kind: "added", text: "Five themes: dark, light, two mono pairs, and a loader-derived palette." },
      { kind: "added", text: "Solve quality squares in the all-time list." },
      { kind: "changed", text: "Timer digits now render in a pixel face." },
      { kind: "changed", text: "Solve history reads left-to-right as a column-flow grid." },
      { kind: "fixed", text: "Inspection no longer runs behind the boot screen." },
    ],
  },
  {
    tag: "v0.2.0",
    title: "Penalties and persistence",
    publishedAt: "2026-08-08T00:00:00Z",
    notes: [
      { kind: "added", text: "+2 and DNF penalties, applied per WCA inspection rules." },
      { kind: "added", text: "Solve history persisted to IndexedDB, per cube size." },
      { kind: "fixed", text: "Cube size can no longer be switched mid-solve." },
    ],
  },
  {
    tag: "v0.1.0",
    title: "Core timer",
    publishedAt: "2026-08-07T00:00:00Z",
    notes: [
      { kind: "added", text: "Hold-to-ready timer with millisecond precision." },
      { kind: "added", text: "Scramble generation for 2x2 through 7x7." },
      { kind: "added", text: "Ao5, Ao12, best single, and session mean." },
    ],
  },
];

/**
 * Returns the release history, newest first.
 *
 * Async today so the eventual GitHub-backed implementation is a drop-in and
 * callers already handle the pending state.
 */
export async function getReleases(): Promise<Release[]> {
  return PLACEHOLDER_RELEASES;
}

/** Formats a release's ISO timestamp for display. */
export function formatReleaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
