export function formatTimeMs(ms: number): string {
  const totalCentiseconds = Math.round(ms / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  const secondsStr = minutes > 0 ? String(seconds).padStart(2, "0") : String(seconds);
  const centisStr = String(centiseconds).padStart(2, "0");

  return minutes > 0 ? `${minutes}:${secondsStr}.${centisStr}` : `${secondsStr}.${centisStr}`;
}
