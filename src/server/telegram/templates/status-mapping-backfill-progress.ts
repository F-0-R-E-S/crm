export function render(p: Record<string, unknown>): string {
  const brokerId = String(p.brokerId ?? "?");
  const brokerName = p.brokerName ? String(p.brokerName) : brokerId.slice(0, 10);
  const phase = String(p.phase ?? "progress"); // start | progress | finish
  const processed = typeof p.processed === "number" ? (p.processed as number) : 0;
  const total = typeof p.total === "number" ? (p.total as number) : 0;
  const updated = typeof p.updated === "number" ? (p.updated as number) : 0;
  const unmapped = typeof p.unmapped === "number" ? (p.unmapped as number) : 0;
  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const header =
    phase === "start"
      ? "*Status mapping backfill started*"
      : phase === "finish"
        ? "*Status mapping backfill complete*"
        : "*Status mapping backfill progress*";
  return `${header}\nBroker: ${brokerName}\nProgress: ${processed.toLocaleString()}/${total.toLocaleString()} (${pct}%)\nUpdated: ${updated.toLocaleString()}  Unmapped: ${unmapped.toLocaleString()}`;
}
