export function render(p: Record<string, unknown>): string {
  const brokerName = String(p.brokerName ?? p.brokerId ?? "?");
  const streak = Number(p.streak ?? 0);
  const threshold = Number(p.threshold ?? 0);
  return [
    "🚨 *Broker auto-paused*",
    `Broker: \`${brokerName}\``,
    `Rejections in a row: *${streak}* (threshold ${threshold})`,
    "",
    "Reactivate via /resume_broker or the broker detail page.",
  ].join("\n");
}
