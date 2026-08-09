import { scrambleToString } from "@/lib/scramble-gen";

/**
 * The pinned scramble. Accent-coloured `>` prompt, notation in muted ink, both
 * in the mono technical face.
 */
export function ScrambleLine({ scramble }: { scramble: string[] }) {
  return (
    <p className="text-center font-mono text-base tracking-wide sm:text-[19px]">
      <span aria-hidden="true" style={{ color: "var(--accent-soft)", marginRight: 10 }}>
        &gt;
      </span>
      <span style={{ color: "var(--ink-dim)" }}>{scrambleToString(scramble)}</span>
    </p>
  );
}
