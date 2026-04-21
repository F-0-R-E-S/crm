/**
 * v2.0 S2.0-1 — Tenant isolation integration smoke.
 *
 * Notes on test scope:
 *   In vitest's worker pool `$use`-middleware sees `AsyncLocalStorage` as
 *   empty due to how vitest hands off across async microtasks (see standalone
 *   tsx reproduction — middleware filter works in prod / Node). These tests
 *   therefore focus on:
 *     - `withTenant` slot round-trip
 *     - Explicit tenantId on write (Lead.tenantId = apiKey.tenantId pattern)
 *     - Default tenant bootstrap + seeded rows carry tenantId
 *   Full Prisma middleware behavior is covered by `src/server/db-tenant.test.ts`
 *   (fake client) and will be re-exercised in S2.0-2 pentest with real middleware.
 */
import { prisma } from "@/server/db";
import { getActiveTenantId, withTenant } from "@/server/db-tenant";
import type { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("v2.0 tenant isolation (S2.0-1)", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.tenant.createMany({
      data: [
        {
          id: "tenant-alpha",
          slug: "alpha",
          name: "Alpha",
          displayName: "Alpha Tenant",
        },
        {
          id: "tenant-beta",
          slug: "beta",
          name: "Beta",
          displayName: "Beta Tenant",
        },
      ],
      skipDuplicates: true,
    });
  });

  it("withTenant slot is visible inside callback", async () => {
    await withTenant("tenant-alpha", async () => {
      expect(getActiveTenantId()).toBe("tenant-alpha");
    });
    expect(getActiveTenantId()).toBeNull();
  });

  it("explicit Lead.tenantId write persists (intake pattern)", async () => {
    await prisma.affiliate.create({
      data: { id: "aff-int", tenantId: "tenant-alpha", name: "alpha-aff" },
    });
    const lead = await withTenant("tenant-alpha", async () =>
      prisma.lead.create({
        data: {
          tenantId: "tenant-alpha",
          affiliateId: "aff-int",
          geo: "US",
          ip: "1.1.1.1",
          eventTs: new Date(),
          traceId: `trace-${Date.now()}-${Math.random()}`,
        },
      }),
    );
    expect(lead.tenantId).toBe("tenant-alpha");
    // Verify the stored row matches
    const fetched = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(fetched?.tenantId).toBe("tenant-alpha");
  });

  it("two tenants coexist with independent Affiliates", async () => {
    await prisma.affiliate.create({
      data: { id: "aff-co-alpha", tenantId: "tenant-alpha", name: "alpha-aff" },
    });
    await prisma.affiliate.create({
      data: { id: "aff-co-beta", tenantId: "tenant-beta", name: "beta-aff" },
    });
    const alphaAff = await prisma.affiliate.findUnique({ where: { id: "aff-co-alpha" } });
    const betaAff = await prisma.affiliate.findUnique({ where: { id: "aff-co-beta" } });
    expect(alphaAff?.tenantId).toBe("tenant-alpha");
    expect(betaAff?.tenantId).toBe("tenant-beta");
  });

  it("super-admin role exists in enum", async () => {
    const roles: UserRole[] = ["SUPER_ADMIN", "ADMIN", "OPERATOR"];
    // Prisma enum available at runtime via @prisma/client — simply check the
    // type-level value round-trips through a User.role field.
    const u = await prisma.user.create({
      data: {
        email: `sa-${Date.now()}@t.io`,
        passwordHash: "x",
        role: "SUPER_ADMIN",
        tenantId: "tenant-alpha",
      },
    });
    expect(roles.includes(u.role)).toBe(true);
    expect(u.role).toBe("SUPER_ADMIN");
  });

  it("api-key → tenantId pattern (intake resolves tenant from key)", async () => {
    await prisma.affiliate.create({
      data: { id: "aff-key-a", tenantId: "tenant-alpha", name: "alpha-aff" },
    });
    const key = await prisma.apiKey.create({
      data: {
        tenantId: "tenant-alpha",
        affiliateId: "aff-key-a",
        keyHash: `hash-${Date.now()}`,
        keyPrefix: "ak_a",
        label: "test",
      },
    });
    // Simulating verifyApiKey(): it returns tenantId from the row.
    const row = await prisma.apiKey.findUnique({ where: { id: key.id } });
    expect(row?.tenantId).toBe("tenant-alpha");
  });
});
