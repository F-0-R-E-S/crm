import { writeAuditLog } from "@/server/audit";
/**
 * v2.0 S2.0-2 — super-admin tenant CRUD.
 *
 * Every procedure is `superAdminProcedure` (cross-tenant — runs outside
 * `withTenant`). Writes flush the tenant registry cache so the new tenant
 * becomes routable without waiting 60s.
 */
import { prisma } from "@/server/db";
import { clearTenantCache } from "@/server/tenant-registry";
import { TenantThemeSchema, clearBrandingCache } from "@/server/tenant/branding";
import { adminProcedure, router, superAdminProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const SlugSchema = z
  .string()
  .min(2)
  .max(40)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "slug must be lower-kebab-case");

const DomainsSchema = z
  .array(
    z
      .string()
      .min(3)
      .max(253)
      .regex(
        /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i,
        "invalid domain",
      ),
  )
  .max(12)
  .default([]);

const CreateInput = z.object({
  slug: SlugSchema,
  name: z.string().min(1).max(80),
  displayName: z.string().min(1).max(120),
  domains: DomainsSchema,
  theme: TenantThemeSchema.optional(),
  featureFlags: z.record(z.boolean()).default({}),
});

const UpdateInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(80).optional(),
  displayName: z.string().min(1).max(120).optional(),
  domains: DomainsSchema.optional(),
  theme: TenantThemeSchema.optional(),
  featureFlags: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

export const tenantRouter = router({
  list: superAdminProcedure.query(async () => {
    const rows = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Counts are approximate (no join) — fine for the list view.
    const ids = rows.map((r) => r.id);
    const [users, brokers, leads] = await Promise.all([
      prisma.user.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.broker.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: ids } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ["tenantId"],
        where: { tenantId: { in: ids } },
        _count: { _all: true },
      }),
    ]);
    const userMap = new Map(users.map((u) => [u.tenantId, u._count._all]));
    const brokerMap = new Map(brokers.map((b) => [b.tenantId, b._count._all]));
    const leadMap = new Map(leads.map((l) => [l.tenantId ?? "", l._count._all]));

    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      displayName: r.displayName,
      domains: r.domains,
      isActive: r.isActive,
      createdAt: r.createdAt,
      userCount: userMap.get(r.id) ?? 0,
      brokerCount: brokerMap.get(r.id) ?? 0,
      leadCount: leadMap.get(r.id) ?? 0,
    }));
  }),

  byId: superAdminProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const row = await prisma.tenant.findUnique({ where: { id: input.id } });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  create: superAdminProcedure.input(CreateInput).mutation(async ({ ctx, input }) => {
    const dup = await prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (dup) throw new TRPCError({ code: "CONFLICT", message: "slug already in use" });

    const row = await prisma.tenant.create({
      data: {
        slug: input.slug,
        name: input.name,
        displayName: input.displayName,
        domains: input.domains,
        theme: input.theme ?? {},
        featureFlags: input.featureFlags ?? {},
      },
    });
    clearTenantCache();
    clearBrandingCache();
    await writeAuditLog({
      userId: ctx.userId,
      action: "tenant.create",
      entity: "Tenant",
      entityId: row.id,
      diff: { slug: row.slug, displayName: row.displayName },
    });
    return { id: row.id, slug: row.slug };
  }),

  update: superAdminProcedure.input(UpdateInput).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(rest.name !== undefined ? { name: rest.name } : {}),
        ...(rest.displayName !== undefined ? { displayName: rest.displayName } : {}),
        ...(rest.domains !== undefined ? { domains: rest.domains } : {}),
        ...(rest.theme !== undefined ? { theme: rest.theme } : {}),
        ...(rest.featureFlags !== undefined ? { featureFlags: rest.featureFlags } : {}),
        ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
      },
    });
    clearTenantCache();
    clearBrandingCache();
    await writeAuditLog({
      userId: ctx.userId,
      action: "tenant.update",
      entity: "Tenant",
      entityId: id,
      diff: rest,
    });
    return { id: updated.id };
  }),

  remove: superAdminProcedure
    .input(z.object({ id: z.string(), force: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.tenant.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.id === "tenant_default") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "cannot delete default tenant" });
      }
      const [userCount, brokerCount, leadCount] = await Promise.all([
        prisma.user.count({ where: { tenantId: input.id } }),
        prisma.broker.count({ where: { tenantId: input.id } }),
        prisma.lead.count({ where: { tenantId: input.id } }),
      ]);
      if ((userCount > 0 || brokerCount > 0 || leadCount > 0) && !input.force) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `tenant not empty: users=${userCount} brokers=${brokerCount} leads=${leadCount}`,
        });
      }
      if (input.force) {
        // Force delete: null-out the tenantId on any remaining dependent rows
        // where the column is nullable. Primary tables (User, Broker, Affiliate,
        // ApiKey, BrokerTemplate) NOT NULL — caller must empty them first.
        if (userCount > 0 || brokerCount > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "tenant still has hard-referenced rows (users/brokers). Delete those first.",
          });
        }
      }
      await prisma.tenant.delete({ where: { id: input.id } });
      clearTenantCache();
      clearBrandingCache();
      await writeAuditLog({
        userId: ctx.userId,
        action: "tenant.delete",
        entity: "Tenant",
        entityId: input.id,
        diff: { force: input.force, userCount, brokerCount, leadCount },
      });
      return { id: input.id };
    }),

  /**
   * Tenant-admin scope: load your own tenant's public branding bits.
   */
  myBranding: adminProcedure.query(async ({ ctx }) => {
    const row = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: {
        id: true,
        slug: true,
        displayName: true,
        theme: true,
      },
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    return row;
  }),

  /**
   * Tenant-admin scope: update your own tenant's branding.
   * Cannot change slug/domains/isActive — that's super-admin territory.
   */
  updateMyBranding: adminProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(120).optional(),
        theme: TenantThemeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await prisma.tenant.update({
        where: { id: ctx.tenantId },
        data: {
          ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
          theme: input.theme,
        },
      });
      clearBrandingCache();
      await writeAuditLog({
        userId: ctx.userId,
        action: "tenant.updateMyBranding",
        entity: "Tenant",
        entityId: updated.id,
        diff: input,
      });
      return { id: updated.id };
    }),

  promoteUser: superAdminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(["ADMIN", "OPERATOR"]) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
      await writeAuditLog({
        userId: ctx.userId,
        action: "tenant.promoteUser",
        entity: "User",
        entityId: input.userId,
        diff: { role: input.role, tenantId: updated.tenantId },
      });
      return { id: updated.id, role: updated.role };
    }),
});
