export function render(p: Record<string, unknown>): string {
  const actor = String(p.actor ?? p.userId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const fields = Array.isArray(p.changedFields) ? (p.changedFields as unknown[]).map(String) : [];
  const list = fields.length ? fields.join(", ") : "—";
  return `*Broker config changed* ${broker}\nActor: ${actor}\nChanged fields: ${list}`;
}
