export function render(p: Record<string, unknown>): string {
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const id = String(p.brokerId ?? "?");
  const streak = String(p.errorStreak ?? "?");
  const last = String(p.lastError ?? "—").slice(0, 300);
  return `*Broker down* ${broker}\nId: \`${id}\`\nStreak: ${streak}\nLast error: ${last}`;
}
