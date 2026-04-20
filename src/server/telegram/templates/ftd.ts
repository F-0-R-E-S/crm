export function render(p: Record<string, unknown>): string {
  const leadId = String(p.leadId ?? "?");
  const broker = String(p.brokerName ?? p.brokerId ?? "?");
  const amount = p.amount != null ? String(p.amount) : "—";
  const affiliate = String(p.affiliateName ?? p.affiliateId ?? "?");
  return `*FTD* \`${leadId}\`\nBroker: ${broker}\nAmount: ${amount}\nAffiliate: ${affiliate}`;
}
