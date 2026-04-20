export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const latency = String(p.latencyMs ?? "?");
  return `*Pushed* \`${leadId}\`\nBroker: ${broker}\nLatency: ${latency}ms`;
}
