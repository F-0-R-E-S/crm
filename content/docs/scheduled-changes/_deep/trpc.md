---
audience: ai-deep
block: scheduled-changes
source: auto-gen
kind: trpc
title: "tRPC Surface — scheduled-changes"
---
# scheduledChange.allowedFields
<a id="trpc-scheduledchange-allowedfields"></a>

Procedure `scheduledChange.allowedFields` — authn: admin, kind: query.

input: —

Source: `src/server/routers/scheduledChange.ts`

---

# scheduledChange.applyNow
<a id="trpc-scheduledchange-applynow"></a>

Procedure `scheduledChange.applyNow` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/scheduledChange.ts`

---

# scheduledChange.byId
<a id="trpc-scheduledchange-byid"></a>

Procedure `scheduledChange.byId` — authn: admin, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/scheduledChange.ts`

---

# scheduledChange.cancel
<a id="trpc-scheduledchange-cancel"></a>

Procedure `scheduledChange.cancel` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/scheduledChange.ts`

---

# scheduledChange.create
<a id="trpc-scheduledchange-create"></a>

Procedure `scheduledChange.create` — authn: admin, kind: mutation.

input: z.object({…

Source: `src/server/routers/scheduledChange.ts`

---

# scheduledChange.list
<a id="trpc-scheduledchange-list"></a>

Procedure `scheduledChange.list` — authn: admin, kind: query.

input: z…

Source: `src/server/routers/scheduledChange.ts`

---

# scheduledChange.retry
<a id="trpc-scheduledchange-retry"></a>

Procedure `scheduledChange.retry` — authn: admin, kind: mutation.

input: z.object({ id: z.string() })

Source: `src/server/routers/scheduledChange.ts`

