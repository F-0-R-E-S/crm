export function render(p: Record<string, unknown>): string {
  const tenant = String(p.tenantSlug ?? p.tenantId ?? "?");
  const plan = String(p.plan ?? "?").toUpperCase();
  const atPeriodEnd = Boolean(p.cancelAtPeriodEnd);
  const when = atPeriodEnd ? "will end at period close" : "ended immediately";
  return `*Subscription canceled* ${tenant}\nPlan: ${plan}\nCancellation: ${when}`;
}
