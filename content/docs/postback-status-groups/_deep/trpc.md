---
audience: ai-deep
block: postback-status-groups
source: auto-gen
kind: trpc
title: "tRPC Surface — postback-status-groups"
---
# statusMapping.backfillLeads
<a id="trpc-statusmapping-backfillleads"></a>

Procedure `statusMapping.backfillLeads` — authn: admin, kind: mutation.

input: z.object({ brokerId: z.string() })

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.bulkUpsert
<a id="trpc-statusmapping-bulkupsert"></a>

Procedure `statusMapping.bulkUpsert` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.coverageForBroker
<a id="trpc-statusmapping-coverageforbroker"></a>

Procedure `statusMapping.coverageForBroker` — authn: protected, kind: query.

input: z.object({ brokerId: z.string(), days: z.number().int().min(1).max(90).default(30) })

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.listCanonical
<a id="trpc-statusmapping-listcanonical"></a>

Procedure `statusMapping.listCanonical` — authn: protected, kind: query.

input: —

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.listForBroker
<a id="trpc-statusmapping-listforbroker"></a>

Procedure `statusMapping.listForBroker` — authn: protected, kind: query.

input: z.object({ brokerId: z.string() })

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.observedRawStatuses
<a id="trpc-statusmapping-observedrawstatuses"></a>

Procedure `statusMapping.observedRawStatuses` — authn: protected, kind: query.

input: z.object({
        brokerId: z.string(),
        days: z.number().int().min(1).max(90).default(30),
      }),

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.remove
<a id="trpc-statusmapping-remove"></a>

Procedure `statusMapping.remove` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.suggestFor
<a id="trpc-statusmapping-suggestfor"></a>

Procedure `statusMapping.suggestFor` — authn: admin, kind: query.

input: z.object({ brokerId: z.string(), days: z.number().int().min(1).max(90).default(30) })

Source: `src/server/routers/statusMapping.ts`

---

# statusMapping.upsert
<a id="trpc-statusmapping-upsert"></a>

Procedure `statusMapping.upsert` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/statusMapping.ts`

