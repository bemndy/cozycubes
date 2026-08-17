import { effectiveTimeMs, type Solve } from "./stats-engine";

const CSV_HEADER = "timestamp,cube_size,time_ms,penalty,effective_time_ms";

/** Solve history as CSV, oldest first. `effective_time_ms` is blank for DNFs. */
export function solvesToCsv(solves: Solve[]): string {
  const rows = solves.map((solve) => {
    const effective = effectiveTimeMs(solve);
    return [
      new Date(solve.timestamp).toISOString(),
      solve.cubeSize,
      solve.timeMs,
      solve.penalty,
      effective === null ? "" : effective,
    ].join(",");
  });
  return [CSV_HEADER, ...rows].join("\n");
}

/** Triggers a browser download of `content` as a file named `filename`. */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
