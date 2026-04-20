export function render(p: Record<string, unknown>): string {
  const metric = String(p.metric ?? "?");
  const prior = String(p.priorHour ?? "?");
  const curr = String(p.currentHour ?? "?");
  const pct = String(p.dropPercent ?? "?");
  const win = String(p.windowStart ?? "?");
  return `*Anomaly detected* ${metric}\nPrior hour: ${prior} | Current: ${curr}\nDrop: ${pct}% since ${win}`;
}
