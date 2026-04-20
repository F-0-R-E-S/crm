export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const until = String(p.holdUntil ?? "—");
  return `*Pending hold* \`${leadId}\`\nHold until: ${until}`;
}
