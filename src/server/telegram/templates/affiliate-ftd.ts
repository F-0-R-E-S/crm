export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const when = String(p.at ?? p.ftdAt ?? new Date().toISOString());
  return `*FTD* \`${leadId}\`\nBroker: ${broker}\nAt: ${when}`;
}
