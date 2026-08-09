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
  className?: string;
}

/**
 * The pulsing-diamond loader from brandonemartinez.com's colorful mode.
 * Re-theme by overriding --bg-color-a/b and --symbol-color-a/b.
 */
export function ColorfulLoader({
  fullScreen = true,
  label = "Loading",
  className,
}: ColorfulLoaderProps) {
  const classes = [
    styles.loader,
    fullScreen ? styles.fullScreen : styles.contained,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="status" aria-live="polite" className={classes}>
      <div className={styles.symbol} />
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}

export default ColorfulLoader;
