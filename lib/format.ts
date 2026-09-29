export function formatTimeMs(ms: number): string {
  const totalCentiseconds = Math.round(ms / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  const secondsStr = minutes > 0 ? String(seconds).padStart(2, "0") : String(seconds);
  const centisStr = String(centiseconds).padStart(2, "0");

  return minutes > 0 ? `${minutes}:${secondsStr}.${centisStr}` : `${secondsStr}.${centisStr}`;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long ago a solve happened, in the coarsest unit that still reads as
 * useful mid-session: seconds are noise once a solve scrolls out of view, and
 * anything past a week is better read as a date than as "23d ago".
 *
 * `now` is a parameter rather than a Date.now() call so this stays pure and
 * testable; callers pass the render's own clock reading.
 */
export function formatRelativeAge(timestamp: number, now: number): string {
  const elapsed = now - timestamp;

  // Clock skew or a solve stored a moment ahead of this render reads as fresh
  // rather than as a negative age.
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  if (elapsed < 7 * DAY_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Tooltip text for one solve in the history: which solve it was, the clock time
 * it was set at, and how long ago that was.
 *
 * The history is ordered but undated, so a solve's position alone says nothing
 * about whether it came from this session or last week. The timestamp is
 * already stored on every solve — this is the only place it surfaces.
 */
export function formatSolveWhen(index: number, timestamp: number, now: number): string {
  const clockTime = new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return `Solve ${index} · ${clockTime} · ${formatRelativeAge(timestamp, now)}`;
}
