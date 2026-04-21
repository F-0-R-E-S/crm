import { describe, expect, it } from "vitest";
import { isPathAllowedForRole, resolveDomain } from "./domain-role";

describe("resolveDomain — hostname → { tenantSlug, domainRole }", () => {
  const ROOT = "gambchamp.io";

  it("falls back to default tenant on missing hostname", () => {
    expect(resolveDomain(undefined, ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
    expect(resolveDomain(null, ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("returns default for localhost / 127.0.0.1", () => {
    expect(resolveDomain("localhost", ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
    expect(resolveDomain("localhost:3000", ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
    expect(resolveDomain("127.0.0.1", ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("returns default for the prod fly host", () => {
    expect(resolveDomain("crm-node.fly.dev", ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("returns default on exact root domain", () => {
    expect(resolveDomain(ROOT, ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("parses network.<slug>.<root> → network role", () => {
    expect(resolveDomain("network.acme.gambchamp.io", ROOT)).toEqual({
      tenantSlug: "acme",
      domainRole: "network",
    });
  });

  it("parses autologin.<slug>.<root> → autologin role", () => {
    expect(resolveDomain("autologin.acme.gambchamp.io", ROOT)).toEqual({
      tenantSlug: "acme",
      domainRole: "autologin",
    });
  });

  it("parses api.<slug>.<root> → api role", () => {
    expect(resolveDomain("api.acme.gambchamp.io", ROOT)).toEqual({
      tenantSlug: "acme",
      domainRole: "api",
    });
  });

  it("bare <slug>.<root> is treated as network", () => {
    expect(resolveDomain("acme.gambchamp.io", ROOT)).toEqual({
      tenantSlug: "acme",
      domainRole: "network",
    });
  });

  it("unknown role prefix → default (conservative)", () => {
    expect(resolveDomain("www.acme.gambchamp.io", ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("host outside root domain → default", () => {
    expect(resolveDomain("network.acme.example.com", ROOT)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("empty / missing root domain → every host becomes default", () => {
    expect(resolveDomain("network.acme.gambchamp.io", null)).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
    expect(resolveDomain("network.acme.gambchamp.io", "")).toEqual({
      tenantSlug: "default",
      domainRole: "any",
    });
  });

  it("strips port correctly", () => {
    expect(resolveDomain("api.acme.gambchamp.io:4443", ROOT)).toEqual({
      tenantSlug: "acme",
      domainRole: "api",
    });
  });
});

describe("isPathAllowedForRole", () => {
  it("api.* only serves /api/v1/*", () => {
    expect(isPathAllowedForRole("/api/v1/leads", "api")).toBe(true);
    expect(isPathAllowedForRole("/api/v1/postbacks/xyz", "api")).toBe(true);
    expect(isPathAllowedForRole("/api/v1/health", "api")).toBe(true);
    expect(isPathAllowedForRole("/dashboard", "api")).toBe(false);
    expect(isPathAllowedForRole("/", "api")).toBe(false);
    expect(isPathAllowedForRole("/api/auth/session", "api")).toBe(false);
    expect(isPathAllowedForRole("/api/trpc/lead.list", "api")).toBe(false);
  });

  it("autologin.* serves autologin endpoints + auth + health", () => {
    expect(isPathAllowedForRole("/autologin/session", "autologin")).toBe(true);
    expect(isPathAllowedForRole("/api/v1/autologin/start", "autologin")).toBe(true);
    expect(isPathAllowedForRole("/api/auth/session", "autologin")).toBe(true);
    expect(isPathAllowedForRole("/api/v1/health", "autologin")).toBe(true);
    expect(isPathAllowedForRole("/dashboard", "autologin")).toBe(false);
    expect(isPathAllowedForRole("/api/v1/leads", "autologin")).toBe(false);
  });

  it("network.* serves everything except /api/v1/*", () => {
    expect(isPathAllowedForRole("/dashboard", "network")).toBe(true);
    expect(isPathAllowedForRole("/super-admin/tenants", "network")).toBe(true);
    expect(isPathAllowedForRole("/login", "network")).toBe(true);
    expect(isPathAllowedForRole("/", "network")).toBe(true);
    expect(isPathAllowedForRole("/api/auth/session", "network")).toBe(true);
    expect(isPathAllowedForRole("/api/trpc/lead.list", "network")).toBe(true);
    expect(isPathAllowedForRole("/api/v1/leads", "network")).toBe(false);
    expect(isPathAllowedForRole("/api/v1/health", "network")).toBe(false);
  });
});
