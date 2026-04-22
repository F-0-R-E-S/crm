---
audience: ai-deep
block: broker-push
source: auto-gen
kind: trpc
title: "tRPC Surface — broker-push"
---
# broker.byId
<a id="trpc-broker-byid"></a>

Procedure `broker.byId` — authn: protected, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/broker.ts`

---

# broker.clone
<a id="trpc-broker-clone"></a>

Procedure `broker.clone` — authn: admin, kind: mutation.

input: z.object({ sourceId: z.string().min(1), newName: z.string().min(1).max(200) })

Source: `src/server/routers/broker.ts`

---

# broker.create
<a id="trpc-broker-create"></a>

Procedure `broker.create` — authn: admin, kind: mutation.

input: BrokerInput

Source: `src/server/routers/broker.ts`

---

# broker.list
<a id="trpc-broker-list"></a>

Procedure `broker.list` — authn: protected, kind: query.

input: —

Source: `src/server/routers/broker.ts`

---

# broker.listClones
<a id="trpc-broker-listclones"></a>

Procedure `broker.listClones` — authn: protected, kind: query.

input: z.object({ sourceId: z.string() })

Source: `src/server/routers/broker.ts`

---

# broker.testSend
<a id="trpc-broker-testsend"></a>

Procedure `broker.testSend` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/broker.ts`

---

# broker.update
<a id="trpc-broker-update"></a>

Procedure `broker.update` — authn: admin, kind: mutation.

input: z.object({ id: z.string() }).merge(BrokerInput.partial())

Source: `src/server/routers/broker.ts`

