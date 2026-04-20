export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const reason = String(p.reason ?? p.rejectReason ?? "—");
  return `*Declined* \`${leadId}\`\nBroker: ${broker}\nReason: ${reason}`;
}
