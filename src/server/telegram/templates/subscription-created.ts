export function render(p: Record<string, unknown>): string {
  const tenant = String(p.tenantSlug ?? p.tenantId ?? "?");
  const plan = String(p.plan ?? "?").toUpperCase();
  const status = String(p.status ?? "?").toUpperCase();
  return `*Subscription created* ${tenant}\nPlan: ${plan}\nStatus: ${status}`;
}
