export function render(p: Record<string, unknown>): string {
  const pool = String(p.poolId ?? "?");
  const healthy = String(p.healthy ?? "?");
  const total = String(p.total ?? "?");
  const deg = String(p.degradationPercent ?? "?");
  return `*Proxy pool degraded* ${pool}\nHealthy: ${healthy}/${total}\nDegradation: ${deg}%`;
}
