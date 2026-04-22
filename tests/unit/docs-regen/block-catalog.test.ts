import { BLOCK_CATALOG, resolveBlock } from "@/../scripts/docs-regen/block-catalog";
import { describe, expect, it } from "vitest";

describe("block catalog", () => {
  it("declares every logical block with stable id, title, order", () => {
    const ids = BLOCK_CATALOG.map((b) => b.id).sort();
    expect(ids).toEqual([
      "alerts",
      "analytics",
      "anti-shave",
      "api-docs",
      "architecture",
      "auth-rbac",
      "autologin",
      "billing-subscription",
      "broker-clone",
      "broker-push",
      "conversions-crg",
      "fraud-score",
      "getting-started",
      "glossary",
      "intake",
      "manual-review",
      "multi-tenancy",
      "observability",
      "onboarding",
      "postback-status-groups",
      "quality-score",
      "rate-limiting",
      "routing-engine",
      "routing-ui",
      "scheduled-changes",
      "telegram-bot",
      "webhooks-outbound",
    ]);
  });

  it("resolves prisma model Lead to intake", () => {
    expect(resolveBlock({ kind: "prisma-model", name: "Lead" })).toBe("intake");
  });

  it("resolves prisma model FlowVersion to routing-engine", () => {
    expect(resolveBlock({ kind: "prisma-model", name: "FlowVersion" })).toBe("routing-engine");
  });

  it("resolves REST /api/v1/leads to intake", () => {
    expect(resolveBlock({ kind: "rest-path", name: "/api/v1/leads" })).toBe("intake");
  });

  it("resolves tRPC router finance to conversions-crg", () => {
    expect(resolveBlock({ kind: "trpc-router", name: "finance" })).toBe("conversions-crg");
  });

  it("returns null for unknown input (caller decides what to do)", () => {
    expect(resolveBlock({ kind: "prisma-model", name: "DoesNotExist" })).toBe(null);
  });
});
