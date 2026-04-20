export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const ext = String(p.brokerExternalId ?? "—");
  return `*Accepted* \`${leadId}\`\nBroker: ${broker}\nExternal id: ${ext}`;
}
