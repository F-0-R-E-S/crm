export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.newBrokerName ?? p.brokerName ?? "—");
  return `*Pending hold released* \`${leadId}\`\nNew broker: ${broker}`;
}
