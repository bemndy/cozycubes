/**
 * Theme identity and persistence key.
 *
 * Twenty-four themes. Every visual value lives in CSS custom properties under
 * `[data-theme="…"]` in globals.css — this module only knows the *names*.
 * Components read tokens and never branch on the active theme, which is what
 * lets the mono pair carry borders nothing else has without a single component
 * conditional.
 *
 * Each theme except the mono pair defines a five-colour palette (--p1..--p5).
 * The semantic tokens — accent, solve-quality colours, the shader's three
 * mixing colours — are derived from those five once, globally, so a new theme
 * is a palette and an ink/surface pair rather than thirty hand-set values.
 *
 * Persistence is localStorage for now. Spec M2.1 moves theme into the shared
 * IndexedDB settings store; when that lands, useTheme is the only file to
 * change.
 */

export const THEME_IDS = [
  // Dark
  "ember",
  "nocturne",
  "kelp",
  "dusk",
  "copper",
  "moss",
  "slate",
  "plum",
  "royale",
  "flamingo",
  // Light
  "linen",
  "seaglass",
  "blossom",
  "glacier",
  "orchid",
  "citrus",
  "coral",
  "sprout",
  "peach",
  // Light, but deliberately not white
  "light",
  "terra",
  // Special
  "loader",
  "mono-dark",
  "mono-light",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

/** Kept as the default because it's the palette the app was designed against. */
export const DEFAULT_THEME: ThemeId = "ember";

export const THEME_STORAGE_KEY = "cozycubes:theme";

/** Short labels for the theme dropdown. */
export const THEME_LABELS: Record<ThemeId, string> = {
  ember: "ember",
  nocturne: "nocturne",
  kelp: "kelp",
  dusk: "dusk",
  copper: "copper",
  moss: "moss",
  slate: "slate",
  plum: "plum",
  royale: "royale",
  flamingo: "flamingo",
  linen: "linen",
  seaglass: "seaglass",
  blossom: "blossom",
  glacier: "glacier",
  orchid: "orchid",
  citrus: "citrus",
  coral: "coral",
  sprout: "sprout",
  peach: "peach",
  light: "light",
  terra: "terra",
  loader: "loader",
  "mono-dark": "mono dark",
  "mono-light": "mono light",
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
