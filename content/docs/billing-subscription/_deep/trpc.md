---
audience: ai-deep
block: billing-subscription
source: auto-gen
kind: trpc
title: "tRPC Surface — billing-subscription"
---
# billing.cancel
<a id="trpc-billing-cancel"></a>

Procedure `billing.cancel` — authn: admin, kind: mutation.

input: z.object({ atPeriodEnd: z.boolean().default(true) }).default({ atPeriodEnd: true })

Source: `src/server/routers/billing.ts`

---

# billing.getSubscription
<a id="trpc-billing-getsubscription"></a>

Procedure `billing.getSubscription` — authn: protected, kind: query.

input: —

Source: `src/server/routers/billing.ts`

---

# billing.getUsage
<a id="trpc-billing-getusage"></a>

Procedure `billing.getUsage` — authn: protected, kind: query.

input: —

Source: `src/server/routers/billing.ts`

---

# billing.listInvoices
<a id="trpc-billing-listinvoices"></a>

Procedure `billing.listInvoices` — authn: protected, kind: query.

input: z.object({ limit: z.number().int().min(1).max(100).default(25) }).default({ limit: 25 })

Source: `src/server/routers/billing.ts`

---

# billing.openPortal
<a id="trpc-billing-openportal"></a>

Procedure `billing.openPortal` — authn: admin, kind: mutation.

input: —

Source: `src/server/routers/billing.ts`

---

# billing.reactivate
<a id="trpc-billing-reactivate"></a>

Procedure `billing.reactivate` — authn: admin, kind: mutation.

input: —

Source: `src/server/routers/billing.ts`

---

# billing.startCheckout
<a id="trpc-billing-startcheckout"></a>

Procedure `billing.startCheckout` — authn: admin, kind: mutation.

input: z.object({ plan: PlanInput })

Source: `src/server/routers/billing.ts`

