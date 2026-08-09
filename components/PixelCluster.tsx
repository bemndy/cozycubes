/**
 * Decorative 3x3 pixel-dot cluster from mockup 2a — a small nod to the
 * pixel-art accent language, tucked into a corner at low opacity.
 *
 * `pattern` is nine booleans, row-major, marking which cells are filled.
 */
export function PixelCluster({
  pattern,
  className = "",
}: {
  pattern: readonly boolean[];
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none grid grid-cols-3 grid-rows-3 gap-px opacity-[.18] ${className}`}
    >
      {pattern.map((filled, i) => (
        <span
          key={i}
          className="size-1"
          style={filled ? { background: "var(--accent)" } : undefined}
        />
      ))}
    </div>
  );
}

/** Corner-bracket shapes, matching CozyCubes.dc.html:470-479. */
export const PIXEL_PATTERN_BOTTOM_LEFT = [
  true, false, false,
  true, false, false,
  true, true, true,
] as const;

export const PIXEL_PATTERN_TOP_RIGHT = [
  true, true, true,
  false, false, true,
  false, false, true,
] as const;
