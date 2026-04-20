"use client";

export function QualityBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span className="font-mono text-[10px] text-muted">—</span>;
  }
  const bucket = score <= 40 ? "red" : score <= 70 ? "amber" : "green";
  const cls = {
    red: "bg-[oklch(0.25_0.10_25)] text-[oklch(0.85_0.15_25)]",
    amber: "bg-[oklch(0.28_0.08_85)] text-[oklch(0.88_0.14_85)]",
    green: "bg-[oklch(0.25_0.09_150)] text-[oklch(0.82_0.14_150)]",
  }[bucket];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${cls}`}
      title={`Q-Leads score: ${score}/100`}
    >
      Q {score}
    </span>
  );
}
