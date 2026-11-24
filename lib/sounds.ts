"use client";

/**
 * The timer's sound.
 *
 * The app has billed itself as "sound-rich" in its own metadata since v1.0 and
 * has never made a noise. This is the first piece of that: a tone when the
 * timer starts and one when it stops.
 *
 * Synthesised through WebAudio rather than shipped as audio files, for three
 * reasons. There is no sample to license — the one asset in the repo that
 * carries a licence caveat (Chonky Bits) is already one more than this project
 * wants. There is nothing to download, so the first solve of a session never
 * waits on a fetch to make its noise. And a tone described as numbers is a
 * tone the next sound pack can vary by changing those numbers, which is where
 * this is going (selectable packs) rather than by adding more files. The
 * master volume below is the first of those numbers to become a setting.
 *
 * Every entry point is a no-op when the browser has no WebAudio, so a caller
 * never has to guard.
 */

/**
 * Created on the first sound rather than at module load. A context constructed
 * outside a user gesture starts suspended in every current browser, and Chrome
 * logs a warning for one built on a page that has not been interacted with —
 * by the time anything here is called, the user has pressed a key.
 */
let ctx: AudioContext | null = null;
let unavailable = false;

function context(): AudioContext | null {
  if (unavailable) return null;
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;

  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    unavailable = true;
    return null;
  }

  try {
    ctx = new Ctor();
  } catch {
    // Some privacy modes refuse to construct one at all. Stay silent for the
    // rest of the session rather than throwing on every keypress.
    unavailable = true;
    return null;
  }
  return ctx;
}

/**
 * Master level, 0-1, applied on top of each tone's own tuned peak gain. 1 is
 * the level the tones were designed at, so the default is a no-op and nothing
 * sounds different until the user moves the slider.
 *
 * Module state rather than a parameter on every play function: the volume is a
 * property of the app's audio, not of a single tone, and threading it through
 * every call site would mean every future sound has to remember to read it.
 */
let masterVolume = 1;

/**
 * Set the master level. Values outside 0-1 are clamped rather than rejected —
 * this is the audio graph's edge of the seam, and a caller that computed 1.2
 * should get full volume, not an exception mid-solve. Validation of *stored*
 * values belongs in `settings.decodeVolume`, which runs before this.
 */
export function setMasterVolume(level: number): void {
  masterVolume = Math.min(1, Math.max(0, level));
}

/**
 * One soft blip.
 *
 * A sine, because the harmonics of a square or saw read as a UI error sound at
 * these short durations, and the brief is ASMR rather than arcade. The gain
 * ramps up over a few milliseconds and decays exponentially: stepping a gain
 * straight to its value puts a discontinuity in the waveform, which is audible
 * as a click on top of the note — the one artefact a calm sound cannot have.
 *
 * Exponential ramps cannot reach zero, hence the small floor before the stop.
 */
function blip(frequencyHz: number, durationSeconds: number, peakGain: number): void {
  // Nothing to play, and more than an optimisation: the gain envelope below
  // is built from exponential ramps, which are undefined for a target of zero
  // and throw on a non-finite one. Silence has to short-circuit, not scale.
  const gainTarget = peakGain * masterVolume;
  if (gainTarget <= 0) return;

  const audio = context();
  if (!audio) return;

  // A context can be suspended by the browser after a background tab or a
  // media-session interruption, and stays that way until something resumes it.
  if (audio.state === "suspended") void audio.resume().catch(() => {});

  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequencyHz, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainTarget, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + durationSeconds);
  // Nodes are single-use and are garbage collected once they finish, but only
  // after their connections drop — an oscillator left wired to the destination
  // keeps the whole chain alive for the life of the context.
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
}

/**
 * Timer start: higher and shorter than the stop, so the pair reads as a rising
 * "go" and a settling "done" without either needing to be loud.
 */
export function playTimerStart(): void {
  blip(784, 0.07, 0.12);
}

/** Timer stop — lower, and allowed to ring slightly longer. */
export function playTimerStop(): void {
  blip(523.25, 0.14, 0.14);
}

/** Test/HMR escape hatch: drop the cached context so the next call rebuilds it. */
export function resetAudioContextForTests(): void {
  ctx = null;
  unavailable = false;
  masterVolume = 1;
}
