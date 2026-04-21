/**
 * Unit tests for v2.0 S2.0-1 tenant isolation helper.
 *
 * Covers:
 *  - `withTenant` slot round-trip via AsyncLocalStorage
 *  - Nested `withTenant` inherits inner scope
 *  - `getActiveTenantId` returns null outside scope
 *  - Prisma middleware auto-filters reads when scope active
 *  - Create falls back to DEFAULT_TENANT_ID when no scope
 *  - Reads outside scope are not filtered
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TENANT_ID,
  TENANT_SCOPED_MODELS,
  attachTenantMiddleware,
  getActiveTenantId,
  withTenant,
} from "./db-tenant";

describe("withTenant slot", () => {
  it("returns null outside scope", () => {
    expect(getActiveTenantId()).toBeNull();
  });

  it("sets tenantId inside scope", async () => {
    const got = await withTenant("t-alpha", async () => getActiveTenantId());
    expect(got).toBe("t-alpha");
    expect(getActiveTenantId()).toBeNull();
  });

  it("nested scope takes precedence", async () => {
    const got = await withTenant("outer", async () => {
      const inner = await withTenant("inner", async () => getActiveTenantId());
      return { inner, after: getActiveTenantId() };
    });
    expect(got.inner).toBe("inner");
    expect(got.after).toBe("outer");
  });

  it("TENANT_SCOPED_MODELS includes core entities", () => {
    expect(TENANT_SCOPED_MODELS.has("Lead")).toBe(true);
    expect(TENANT_SCOPED_MODELS.has("Affiliate")).toBe(true);
    expect(TENANT_SCOPED_MODELS.has("User")).toBe(true);
    expect(TENANT_SCOPED_MODELS.has("Broker")).toBe(true);
    expect(TENANT_SCOPED_MODELS.has("ApiKey")).toBe(true);
    expect(TENANT_SCOPED_MODELS.has("FraudPolicy")).toBe(false);
    expect(TENANT_SCOPED_MODELS.has("Tenant")).toBe(false);
  });

  it("DEFAULT_TENANT_ID is the fixed seed id", () => {
    expect(DEFAULT_TENANT_ID).toBe("tenant_default");
  });
});

describe("Prisma middleware behavior (fake client)", () => {
  type MiddlewareFn = (
    params: { model?: string; action: string; args: unknown },
    next: (params: { model?: string; action: string; args: unknown }) => Promise<unknown>,
  ) => Promise<unknown>;

  function makeFakeClient() {
    const calls: Array<{ action: string; args: unknown; model: string }> = [];
    let middleware: MiddlewareFn | null = null;
    const fake = {
      $use(fn: MiddlewareFn) {
        middleware = fn;
      },
      lead: {
        findMany: (args: unknown) => run("Lead", "findMany", args),
        findUnique: (args: unknown) => run("Lead", "findUnique", args),
        create: (args: unknown) => run("Lead", "create", args),
      },
      fraudPolicy: {
        findFirst: (args: unknown) => run("FraudPolicy", "findFirst", args),
      },
    };
    async function run(model: string, action: string, args: unknown) {
      const next = async (p: { action: string; args: unknown; model?: string }) => {
        calls.push({ action: p.action, args: p.args, model });
        // For findUnique: simulate a row with tenantId=tenant-alpha
        if (p.action === "findUnique") return { id: "1", tenantId: "tenant-alpha" };
        return [];
      };
      if (!middleware) return next({ action, args, model });
      return middleware({ action, args, model }, next);
    }
    // biome-ignore lint/suspicious/noExplicitAny: minimal structural fake for test
    attachTenantMiddleware(fake as any);
    return { client: fake, calls };
  }

  it("auto-adds tenantId to findMany.where inside withTenant", async () => {
    const { client, calls } = makeFakeClient();
    await withTenant("t-alpha", async () => {
      await client.lead.findMany({ where: { geo: "US" } });
    });
    expect(calls).toHaveLength(1);
    const w = (calls[0].args as { where: Record<string, unknown> }).where;
    expect(w.tenantId).toBe("t-alpha");
    expect(w.geo).toBe("US");
  });

  it("does NOT auto-filter when outside withTenant", async () => {
    const { client, calls } = makeFakeClient();
    await client.lead.findMany({ where: { geo: "US" } });
    expect(calls).toHaveLength(1);
    const w = (calls[0].args as { where: Record<string, unknown> }).where;
    expect(w.tenantId).toBeUndefined();
    expect(w.geo).toBe("US");
  });

  it("does NOT auto-filter non-scoped models (e.g. FraudPolicy)", async () => {
    const { client, calls } = makeFakeClient();
    await withTenant("t-alpha", async () => {
      await client.fraudPolicy.findFirst({ where: { name: "global" } });
    });
    const w = (calls[0].args as { where: Record<string, unknown> }).where;
    expect(w.tenantId).toBeUndefined();
  });

  it("auto-fills tenantId on create when missing + scope active", async () => {
    const { client, calls } = makeFakeClient();
    await withTenant("t-beta", async () => {
      await client.lead.create({ data: { geo: "DE" } });
    });
    const d = (calls[0].args as { data: Record<string, unknown> }).data;
    expect(d.tenantId).toBe("t-beta");
  });

  it("preserves explicit tenantId on create", async () => {
    const { client, calls } = makeFakeClient();
    await withTenant("t-beta", async () => {
      await client.lead.create({ data: { geo: "DE", tenantId: "explicit-id" } });
    });
    const d = (calls[0].args as { data: Record<string, unknown> }).data;
    expect(d.tenantId).toBe("explicit-id");
  });

  it("falls back to DEFAULT_TENANT_ID when no scope", async () => {
    const { client, calls } = makeFakeClient();
    await client.lead.create({ data: { geo: "FR" } });
    const d = (calls[0].args as { data: Record<string, unknown> }).data;
    expect(d.tenantId).toBe(DEFAULT_TENANT_ID);
  });

  it("findUnique returns null when cross-tenant", async () => {
    const { client } = makeFakeClient();
    // Fake returns tenantId=tenant-alpha; we scope to beta → should null
    const res = await withTenant("tenant-beta", async () =>
      client.lead.findUnique({ where: { id: "1" } }),
    );
    expect(res).toBeNull();
  });

  it("findUnique returns row when same tenant", async () => {
    const { client } = makeFakeClient();
    const res = await withTenant("tenant-alpha", async () =>
      client.lead.findUnique({ where: { id: "1" } }),
    );
    expect(res).not.toBeNull();
  });
});
