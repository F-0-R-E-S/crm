export function render(p: Record<string, unknown>): string {
  const stage = String(p.stage ?? "?");
  const err = String(p.lastError ?? "—").slice(0, 300);
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  return `*Autologin down* stage=${stage}\nBroker: ${broker}\nLast error: ${err}`;
}
