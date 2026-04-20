export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const reason = String(p.reason ?? "—");
  return `*Manual review queued* \`${leadId}\`\nReason: ${reason}`;
}
