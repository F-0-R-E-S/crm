export function render(p: Record<string, unknown>): string {
  const target = String(p.targetUptime ?? "?");
  const actual = String(p.actualUptime ?? "?");
  const window = String(p.windowSize ?? "?");
  return `*Autologin SLA breached*\nTarget: ${target}\nActual: ${actual}\nWindow: ${window}`;
}
