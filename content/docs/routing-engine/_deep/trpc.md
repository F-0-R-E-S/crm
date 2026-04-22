---
audience: ai-deep
block: routing-engine
source: auto-gen
kind: trpc
title: "tRPC Surface — routing-engine"
---
# routing.archive
<a id="trpc-routing-archive"></a>

Procedure `routing.archive` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/routing.ts`

---

# routing.byId
<a id="trpc-routing-byid"></a>

Procedure `routing.byId` — authn: protected, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/routing.ts`

---

# routing.create
<a id="trpc-routing-create"></a>

Procedure `routing.create` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/routing.ts`

---

# routing.list
<a id="trpc-routing-list"></a>

Procedure `routing.list` — authn: protected, kind: query.

input: z.object({ status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional() }).optional()

Source: `src/server/routers/routing.ts`

---

# routing.listAlgoConfigs
<a id="trpc-routing-listalgoconfigs"></a>

Procedure `routing.listAlgoConfigs` — authn: protected, kind: query.

input: z.object({ flowId: z.string() })

Source: `src/server/routers/routing.ts`

---

# routing.listBrokersForFlow
<a id="trpc-routing-listbrokersforflow"></a>

Procedure `routing.listBrokersForFlow` — authn: protected, kind: query.

input: —

Source: `src/server/routers/routing.ts`

---

# routing.listCaps
<a id="trpc-routing-listcaps"></a>

Procedure `routing.listCaps` — authn: protected, kind: query.

input: z.object({ flowId: z.string() })

Source: `src/server/routers/routing.ts`

---

# routing.overview
<a id="trpc-routing-overview"></a>

Procedure `routing.overview` — authn: protected, kind: query.

input: —

Source: `src/server/routers/routing.ts`

---

# routing.publish
<a id="trpc-routing-publish"></a>

Procedure `routing.publish` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/routing.ts`

---

# routing.update
<a id="trpc-routing-update"></a>

Procedure `routing.update` — authn: admin, kind: mutation.

input: z.object({ id: z.string(), graph: FlowGraphSchema })

Source: `src/server/routers/routing.ts`

---

# routing.updateCaps
<a id="trpc-routing-updatecaps"></a>

Procedure `routing.updateCaps` — authn: admin, kind: mutation.

input: z.object({
        flowId: z.string(),
        caps: z.array(CapDefinitionInputSchema),
      }),

Source: `src/server/routers/routing.ts`

---

# routing.upsertAlgoConfig
<a id="trpc-routing-upsertalgoconfig"></a>

Procedure `routing.upsertAlgoConfig` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/routing.ts`

