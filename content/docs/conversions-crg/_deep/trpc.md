---
audience: ai-deep
block: conversions-crg
source: auto-gen
kind: trpc
title: "tRPC Surface — conversions-crg"
---
# finance.exportInvoicePdf
<a id="trpc-finance-exportinvoicepdf"></a>

Procedure `finance.exportInvoicePdf` — authn: protected, kind: query.

input: z.object({
        kind: z.enum(["broker", "affiliate"]),
        id: z.string(),
      }),

Source: `src/server/routers/finance.ts`

---

# finance.generateAffiliateInvoice
<a id="trpc-finance-generateaffiliateinvoice"></a>

Procedure `finance.generateAffiliateInvoice` — authn: protected, kind: mutation.

input: z.object({…

Source: `src/server/routers/finance.ts`

---

# finance.generateBrokerInvoice
<a id="trpc-finance-generatebrokerinvoice"></a>

Procedure `finance.generateBrokerInvoice` — authn: protected, kind: mutation.

input: z.object({…

Source: `src/server/routers/finance.ts`

---

# finance.listAffiliatePayoutRules
<a id="trpc-finance-listaffiliatepayoutrules"></a>

Procedure `finance.listAffiliatePayoutRules` — authn: protected, kind: query.

input: z.object({ affiliateId: z.string() })

Source: `src/server/routers/finance.ts`

---

# finance.listBrokerPayoutRules
<a id="trpc-finance-listbrokerpayoutrules"></a>

Procedure `finance.listBrokerPayoutRules` — authn: protected, kind: query.

input: z.object({ brokerId: z.string() })

Source: `src/server/routers/finance.ts`

---

# finance.listCrgCohorts
<a id="trpc-finance-listcrgcohorts"></a>

Procedure `finance.listCrgCohorts` — authn: protected, kind: query.

input: z.object({ brokerId: z.string().optional() })

Source: `src/server/routers/finance.ts`

---

# finance.listInvoices
<a id="trpc-finance-listinvoices"></a>

Procedure `finance.listInvoices` — authn: protected, kind: query.

input: z.object({…

Source: `src/server/routers/finance.ts`

---

# finance.markInvoicePaid
<a id="trpc-finance-markinvoicepaid"></a>

Procedure `finance.markInvoicePaid` — authn: protected, kind: mutation.

input: z.object({
        kind: z.enum(["broker", "affiliate"]),
        id: z.string(),
      }),

Source: `src/server/routers/finance.ts`

---

# finance.pnl
<a id="trpc-finance-pnl"></a>

Procedure `finance.pnl` — authn: protected, kind: query.

input: pnlParams

Source: `src/server/routers/finance.ts`

---

# finance.upsertAffiliatePayoutRule
<a id="trpc-finance-upsertaffiliatepayoutrule"></a>

Procedure `finance.upsertAffiliatePayoutRule` — authn: protected, kind: mutation.

input: affiliateRuleInput

Source: `src/server/routers/finance.ts`

---

# finance.upsertBrokerPayoutRule
<a id="trpc-finance-upsertbrokerpayoutrule"></a>

Procedure `finance.upsertBrokerPayoutRule` — authn: protected, kind: mutation.

input: brokerRuleInput

Source: `src/server/routers/finance.ts`

