---
audience: ai-deep
block: multi-tenancy
source: auto-gen
kind: trpc
title: "tRPC Surface — multi-tenancy"
---
# tenant.byId
<a id="trpc-tenant-byid"></a>

Procedure `tenant.byId` — authn: superAdmin, kind: query.

input: z.object({ id: z.string() })

Source: `src/server/routers/tenant.ts`

---

# tenant.create
<a id="trpc-tenant-create"></a>

Procedure `tenant.create` — authn: superAdmin, kind: mutation.

input: CreateInput

Source: `src/server/routers/tenant.ts`

---

# tenant.list
<a id="trpc-tenant-list"></a>

Procedure `tenant.list` — authn: superAdmin, kind: query.

input: —

Source: `src/server/routers/tenant.ts`

---

# tenant.myBranding
<a id="trpc-tenant-mybranding"></a>

Procedure `tenant.myBranding` — authn: admin, kind: query.

input: —

Source: `src/server/routers/tenant.ts`

---

# tenant.promoteUser
<a id="trpc-tenant-promoteuser"></a>

Procedure `tenant.promoteUser` — authn: superAdmin, kind: mutation.

input: z.object({ userId: z.string(), role: z.enum(["ADMIN", "OPERATOR"]) })

Source: `src/server/routers/tenant.ts`

---

# tenant.remove
<a id="trpc-tenant-remove"></a>

Procedure `tenant.remove` — authn: superAdmin, kind: mutation.

input: z.object({ id: z.string(), force: z.boolean().default(false) })

Source: `src/server/routers/tenant.ts`

---

# tenant.update
<a id="trpc-tenant-update"></a>

Procedure `tenant.update` — authn: superAdmin, kind: mutation.

input: UpdateInput

Source: `src/server/routers/tenant.ts`

---

# tenant.updateMyBranding
<a id="trpc-tenant-updatemybranding"></a>

Procedure `tenant.updateMyBranding` — authn: admin, kind: mutation.

input: z.object({
        displayName: z.string().min(1).max(120).optional(),
        theme: TenantThemeSchema,
      }),

Source: `src/server/routers/tenant.ts`

