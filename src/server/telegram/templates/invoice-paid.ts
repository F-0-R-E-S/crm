export function render(p: Record<string, unknown>): string {
  const tenant = String(p.tenantSlug ?? p.tenantId ?? "?");
  const amountCents = typeof p.amountCents === "number" ? p.amountCents : 0;
  const currency = String(p.currency ?? "usd").toUpperCase();
  const amount = `${(amountCents / 100).toFixed(2)} ${currency}`;
  const invoice = String(p.stripeInvoiceId ?? "?").slice(0, 14);
  return `*Invoice paid* ${tenant}\nAmount: ${amount}\nInvoice: ${invoice}`;
}
