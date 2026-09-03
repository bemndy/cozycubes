import { formatTimeMs } from "@/lib/format";
import { allTimeMean, ao100, ao12, ao5, bestSingle, type Solve } from "@/lib/stats-engine";

function formatStat(ms: number | null): string {
  return ms === null ? "—" : formatTimeMs(ms);
}

/** Best / Ao5 / Ao12 / Ao100 / mean / count, sitting below the hero digits. */
export function StatsRow({ solves }: { solves: Solve[] }) {
  const stats = [
    { label: "BEST", value: formatStat(bestSingle(solves)) },
    { label: "AO5", value: formatStat(ao5(solves)) },
    { label: "AO12", value: formatStat(ao12(solves)) },
    { label: "AO100", value: formatStat(ao100(solves)) },
    { label: "MEAN", value: formatStat(allTimeMean(solves)) },
    { label: "SOLVES", value: String(solves.length) },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
      {stats.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <span
            className="text-[10px] tracking-[.12em]"
            style={{ color: "var(--ink-dimmer)" }}
          >
            {label}
          </span>
          <span className="font-mono text-[17px]" style={{ color: "var(--ink-dim)" }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
