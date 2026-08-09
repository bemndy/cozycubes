/**
 * Theme identity and persistence key.
 *
 * Every visual value lives in CSS custom properties under `[data-theme="…"]`
 * in globals.css — this module only knows the *names*. Components read tokens
 * and never branch on the active theme, which is what lets the two thick-border
 * contrast themes exist without touching a single component.
 *
 * Persistence is localStorage for now. Spec M2.1 moves theme into the shared
 * IndexedDB settings store alongside sound and keybindings; when that lands,
 * ThemeProvider is the only file that has to change.
 */

export const THEME_IDS = [
  "dark",
  "light",
  "contrast-dark",
  "contrast-light",
  "loader",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "dark";

export const THEME_STORAGE_KEY = "cozycubes:theme";

/** Short labels for the footer's theme control. */
export const THEME_LABELS: Record<ThemeId, string> = {
  dark: "dark",
  light: "light",
  "contrast-dark": "mono dark",
  "contrast-light": "mono light",
  loader: "loader",
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/** Next theme in the cycle — the footer glyph steps through all five. */
export function nextTheme(current: ThemeId): ThemeId {
  const index = THEME_IDS.indexOf(current);
  return THEME_IDS[(index + 1) % THEME_IDS.length];
}
