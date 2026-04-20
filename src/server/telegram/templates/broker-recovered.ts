export function render(p: Record<string, unknown>): string {
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const id = String(p.brokerId ?? "?");
  const downtime = String(p.downtimeMinutes ?? "?");
  return `*Broker recovered* ${broker}\nId: \`${id}\`\nDowntime: ${downtime} min`;
}
