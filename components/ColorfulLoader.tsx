import styles from "./ColorfulLoader.module.css";

export interface ColorfulLoaderProps {
  /**
   * Cover the viewport, as the original does. Set false to fill the parent
   * box instead — the form the cubejs "warming up scrambler" state wants,
   * since the rest of the timer stays usable while the solver initializes.
   */
  fullScreen?: boolean;
  /** Announced to screen readers. Never painted, so the visual stays exact. */
  label?: string;
  /**
   * Fades the loader out over whatever is rendered beneath it. The consumer
   * still owns unmounting — flip this on, then remove the component once
   * `exitDurationMs` has passed.
   */
  exiting?: boolean;
  /** Fade length; must match the timeout the consumer unmounts on. */
  exitDurationMs?: number;
  className?: string;
}

/**
 * The pulsing-diamond loader from brandonemartinez.com's colorful mode.
 * Re-theme by overriding --bg-color-a/b and --symbol-color-a/b.
 */
export const LOADER_EXIT_MS = 500;

export function ColorfulLoader({
  fullScreen = true,
  label = "Loading",
  exiting = false,
  exitDurationMs = LOADER_EXIT_MS,
  className,
}: ColorfulLoaderProps) {
  const classes = [
    styles.loader,
    fullScreen ? styles.fullScreen : styles.contained,
    exiting ? styles.exiting : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="status"
      aria-live="polite"
      className={classes}
      style={{ "--exit-duration": `${exitDurationMs}ms` } as React.CSSProperties}
    >
      <div className={styles.symbol} />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}

export default ColorfulLoader;
