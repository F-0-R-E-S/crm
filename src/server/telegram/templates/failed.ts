export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const err = String(p.error ?? "—").slice(0, 300);
  return `*Push failed* \`${leadId}\`\nBroker: ${broker}\nError: ${err}`;
}
