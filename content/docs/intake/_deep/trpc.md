---
audience: ai-deep
block: intake
source: auto-gen
kind: trpc
title: "tRPC Surface — intake"
---
# affiliate.byId
<a id="trpc-affiliate-byid"></a>

Procedure `affiliate.byId` — authn: protected, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/affiliate.ts`

---

# affiliate.create
<a id="trpc-affiliate-create"></a>

Procedure `affiliate.create` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/affiliate.ts`

---

# affiliate.generateApiKey
<a id="trpc-affiliate-generateapikey"></a>

Procedure `affiliate.generateApiKey` — authn: admin, kind: mutation.

input: z.object({ affiliateId: z.string(), label: z.string().min(1) })

Source: `src/server/routers/affiliate.ts`

---

# affiliate.list
<a id="trpc-affiliate-list"></a>

Procedure `affiliate.list` — authn: protected, kind: query.

input: —

Source: `src/server/routers/affiliate.ts`

---

# affiliate.qualitySparklines
<a id="trpc-affiliate-qualitysparklines"></a>

Procedure `affiliate.qualitySparklines` — authn: protected, kind: query.

input: —

Source: `src/server/routers/affiliate.ts`

---

# affiliate.qualityTrend
<a id="trpc-affiliate-qualitytrend"></a>

Procedure `affiliate.qualityTrend` — authn: protected, kind: query.

input: z.object({ affiliateId: z.string(), days: z.number().int().min(7).max(90).default(30) })

Source: `src/server/routers/affiliate.ts`

---

# affiliate.revokeApiKey
<a id="trpc-affiliate-revokeapikey"></a>

Procedure `affiliate.revokeApiKey` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/affiliate.ts`

---

# affiliate.stats
<a id="trpc-affiliate-stats"></a>

Procedure `affiliate.stats` — authn: protected, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/affiliate.ts`

---

# affiliate.update
<a id="trpc-affiliate-update"></a>

Procedure `affiliate.update` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/affiliate.ts`

---

# lead.brokerPerformance
<a id="trpc-lead-brokerperformance"></a>

Procedure `lead.brokerPerformance` — authn: protected, kind: query.

input: —

Source: `src/server/routers/lead.ts`

---

# lead.byId
<a id="trpc-lead-byid"></a>

Procedure `lead.byId` — authn: protected, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/lead.ts`

---

# lead.counters
<a id="trpc-lead-counters"></a>

Procedure `lead.counters` — authn: protected, kind: query.

input: —

Source: `src/server/routers/lead.ts`

---

# lead.funnelCounts
<a id="trpc-lead-funnelcounts"></a>

Procedure `lead.funnelCounts` — authn: protected, kind: query.

input: —

Source: `src/server/routers/lead.ts`

---

# lead.list
<a id="trpc-lead-list"></a>

Procedure `lead.list` — authn: protected, kind: query.

input: ListInput

Source: `src/server/routers/lead.ts`

---

# lead.repush
<a id="trpc-lead-repush"></a>

Procedure `lead.repush` — authn: protected, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/lead.ts`

---

# lead.resendOutboundPostback
<a id="trpc-lead-resendoutboundpostback"></a>

Procedure `lead.resendOutboundPostback` — authn: protected, kind: mutation.

input: z.object({ outboundId: z.string() })

Source: `src/server/routers/lead.ts`

---

# lead.setState
<a id="trpc-lead-setstate"></a>

Procedure `lead.setState` — authn: protected, kind: mutation.

input: z.object({…

Source: `src/server/routers/lead.ts`

---

# lead.topGeos
<a id="trpc-lead-topgeos"></a>

Procedure `lead.topGeos` — authn: protected, kind: query.

input: —

Source: `src/server/routers/lead.ts`

