/**
 * v2.0 S2.0-2 — tenant registry tests (DB-backed).
 */
import { prisma } from "@/server/db";
import { DEFAULT_TENANT_ID } from "@/server/tenant-context";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../tests/helpers/db";
import {
  _cacheSize,
  clearTenantCache,
  tenantIdFromDomain,
  tenantIdFromSlug,
} from "./tenant-registry";

describe("tenant-registry", () => {
  beforeEach(async () => {
    await resetDb();
    clearTenantCache();
    await prisma.tenant.createMany({
      data: [
        {
          id: "tenant-alpha",
          slug: "alpha",
          name: "Alpha",
          displayName: "Alpha Tenant",
          domains: ["network.alpha.example.com", "api.alpha.example.com"],
        },
        {
          id: "tenant-beta",
          slug: "beta",
          name: "Beta",
          displayName: "Beta Tenant",
          domains: [],
        },
        {
          id: "tenant-off",
          slug: "off",
          name: "Off",
          displayName: "Inactive",
          isActive: false,
        },
      ],
      skipDuplicates: true,
    });
  });

  it("empty / 'default' slug → DEFAULT_TENANT_ID", async () => {
    expect(await tenantIdFromSlug("")).toBe(DEFAULT_TENANT_ID);
    expect(await tenantIdFromSlug(null)).toBe(DEFAULT_TENANT_ID);
    expect(await tenantIdFromSlug("default")).toBe(DEFAULT_TENANT_ID);
  });

  it("known slug resolves", async () => {
    expect(await tenantIdFromSlug("alpha")).toBe("tenant-alpha");
    expect(await tenantIdFromSlug("beta")).toBe("tenant-beta");
  });

  it("unknown slug → null", async () => {
    expect(await tenantIdFromSlug("ghost")).toBeNull();
  });

  it("inactive tenant → null (even if slug exists)", async () => {
    expect(await tenantIdFromSlug("off")).toBeNull();
  });

  it("caches per-slug resolution (2nd call has 0 DB round-trips)", async () => {
    clearTenantCache();
    expect(_cacheSize()).toBe(0);
    await tenantIdFromSlug("alpha");
    expect(_cacheSize()).toBe(1);
    await tenantIdFromSlug("alpha");
    expect(_cacheSize()).toBe(1);
  });

  it("tenantIdFromDomain matches explicit Tenant.domains[]", async () => {
    expect(await tenantIdFromDomain("network.alpha.example.com")).toBe("tenant-alpha");
    expect(await tenantIdFromDomain("api.alpha.example.com")).toBe("tenant-alpha");
    expect(await tenantIdFromDomain("unknown.example.com")).toBeNull();
  });
});
