export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const affiliate = String(p.affiliateName ?? p.affiliateId ?? "?");
  const geo = String(p.geo ?? "?");
  return `*New lead* \`${leadId}\`\nAffiliate: ${affiliate}\nGEO: ${geo}`;
}
