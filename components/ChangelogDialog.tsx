"use client";

import { useEffect, useState } from "react";
import { Dialog } from "./ui/Dialog";
import {
  formatReleaseDate,
  getReleases,
  KIND_LABELS,
  type Release,
  type ReleaseNote,
} from "@/lib/changelog";

/**
 * Changelog dialog. Leads with the latest release expanded, with earlier ones
 * listed beneath it.
 *
 * Loads on open rather than on mount so the placeholder — and later the real
 * network call — costs nothing for the overwhelming majority of sessions where
 * nobody opens it.
 */
export function ChangelogDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [releases, setReleases] = useState<Release[] | null>(null);

  useEffect(() => {
    if (!open || releases) return;
    let cancelled = false;
    getReleases().then((loaded) => {
      if (!cancelled) setReleases(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [open, releases]);

  const latest = releases?.[0];
  const earlier = releases?.slice(1) ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="📝 Changelog"
      subtitle={
        latest ? `${latest.tag} · ${formatReleaseDate(latest.publishedAt)}` : undefined
      }
    >
      {!releases ? (
        <p style={{ color: "var(--ink-dimmer)" }}>Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {latest && <ReleaseBody release={latest} />}

          {earlier.length > 0 && (
            <div className="flex flex-col gap-4">
              <h3
                className="font-mono text-[10px] tracking-[.18em]"
                style={{ color: "var(--ink-dimmer)" }}
              >
                EARLIER
              </h3>
              {earlier.map((release) => (
                <details key={release.tag} className="group">
                  <summary
                    className="flex cursor-pointer items-baseline gap-2 text-[13px] marker:content-none"
                    style={{ color: "var(--ink-dim)" }}
                  >
                    <span className="font-mono text-[11px]" style={{ color: "var(--accent)" }}>
                      {release.tag}
                    </span>
                    {release.title}
                    <span
                      className="ml-auto font-mono text-[10px]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      {formatReleaseDate(release.publishedAt)}
                    </span>
                  </summary>
                  <div className="pt-3">
                    <ReleaseBody release={release} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** A release's notes, grouped by kind, skipping groups with nothing in them. */
function ReleaseBody({ release }: { release: Release }) {
  const kinds: ReleaseNote["kind"][] = ["added", "changed", "fixed"];

  return (
    <div className="flex flex-col gap-3">
      {kinds.map((kind) => {
        const notes = release.notes.filter((n) => n.kind === kind);
        if (notes.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-1.5">
            <h4
              className="font-mono text-[10px] tracking-[.14em]"
              style={{ color: "var(--ink-dimmer)" }}
            >
              {KIND_LABELS[kind].toUpperCase()}
            </h4>
            <ul className="flex flex-col gap-1">
              {notes.map((note) => (
                <li key={note.text} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] block size-1 shrink-0"
                    style={{ background: "var(--accent)" }}
                  />
                  <span style={{ color: "var(--ink-dim)" }}>{note.text}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
