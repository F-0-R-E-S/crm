export function render(p: Record<string, unknown>): string {
  const tenant = String(p.tenantSlug ?? p.tenantId ?? "?");
  const plan = String(p.plan ?? "?").toUpperCase();
  const periodEnd = p.currentPeriodEnd
    ? new Date(String(p.currentPeriodEnd)).toISOString().slice(0, 10)
    : "?";
  return `*Subscription renewed* ${tenant}\nPlan: ${plan}\nNext period ends: ${periodEnd}`;
}
