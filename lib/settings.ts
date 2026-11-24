/**
 * Persistence for the session settings in the header — inspection mode, the
 * shader backdrop, the idle-visible net, the timer's sound and its volume,
 * and the active cube size.
 *
 * Until now these reset on every reload: a cuber who works on 4x4 with
 * inspection on had to set both again on each visit, which the app otherwise
 * never asks for (solves and theme already survive).
 *
 * localStorage, matching `theme.ts` — same `cozycubes:` key namespace, and the
 * same M2.1 seam: when the IndexedDB settings store lands, read/write below
 * are the only two functions that touch storage.
 *
 * Every stored value is validated on the way back in. A key can hold anything
 * (a hand-edited value, a leftover from an older build), and a cube size of
 * "9" or a string where a boolean belongs would reach the timer's state
 * otherwise.
 */

import { type SupportedCubeSize } from "./scramble-gen";

export const INSPECTION_STORAGE_KEY = "cozycubes:inspection-enabled";
export const SHADER_STORAGE_KEY = "cozycubes:shader-enabled";
export const NET_ON_IDLE_STORAGE_KEY = "cozycubes:net-visible-on-idle";
export const CUBE_SIZE_STORAGE_KEY = "cozycubes:cube-size";
export const SOUND_STORAGE_KEY = "cozycubes:sound-enabled";
export const SOUND_VOLUME_STORAGE_KEY = "cozycubes:sound-volume";

/**
 * The slice of the Storage interface this module uses, so the functions can be
 * exercised against a stand-in (including one that throws) without a DOM.
 */
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * A decoder turns the raw stored string into a usable value, or returns
 * undefined when the string isn't one this setting accepts.
 */
export type SettingDecoder<T> = (raw: string) => T | undefined;

export const decodeBoolean: SettingDecoder<boolean> = (raw) => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
};

/**
 * Volume as a whole percentage, 0-100, where 100 is the level the tones were
 * tuned at. Stored as a percentage rather than the 0-1 gain multiplier the
 * audio graph wants: a hand-edited "0.7" and a stray "70" are impossible to
 * tell apart otherwise, and a percentage is what the slider and its readout
 * both show.
 *
 * Anything that isn't one of those is rejected rather than coerced or
 * clamped. A stored 400 is not a user asking for four times the volume, and an
 * empty value is not a user asking for silence — neither is a value this app
 * ever wrote, and falling back to the default is kinder than honouring them.
 */
export const decodeVolume: SettingDecoder<number> = (raw) => {
  // Matched as digits before being converted, not converted and then
  // range-checked. `Number("")` is 0 and `Number(" 70 ")` is 70, so a key
  // holding an empty string would decode to a valid, silent zero and mute the
  // app instead of falling back to the default.
  if (!/^\d{1,3}$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return parsed <= 100 ? parsed : undefined;
};

const CUBE_SIZES: readonly SupportedCubeSize[] = [2, 3, 4, 5, 6, 7];

export const decodeCubeSize: SettingDecoder<SupportedCubeSize> = (raw) => {
  const parsed = Number(raw);
  return CUBE_SIZES.find((size) => size === parsed);
};

/**
 * Read a stored setting, or undefined when there is nothing usable there.
 *
 * Reads are wrapped because `getItem` itself throws in a browser with site
 * data blocked — not just when the key is missing.
 */
export function readSetting<T>(
  storage: SettingsStorage | undefined,
  key: string,
  decode: SettingDecoder<T>
): T | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(key);
    return raw === null ? undefined : decode(raw);
  } catch {
    return undefined;
  }
}

/**
 * Store a setting, ignoring failures — private mode and blocked storage both
 * throw here, and a preference that won't survive a reload isn't worth
 * interrupting a session over (same call the theme writer makes).
 */
export function writeSetting(
  storage: SettingsStorage | undefined,
  key: string,
  value: boolean | number
): void {
  if (!storage) return;
  try {
    storage.setItem(key, String(value));
  } catch {
    // Preference just won't persist.
  }
}
