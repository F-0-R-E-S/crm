import { extractTrpc } from "@/../scripts/docs-regen/extractors/trpc";
import { describe, expect, it } from "vitest";

describe("trpc extractor", () => {
  it("produces a section per procedure in the analytics router under block analytics", async () => {
    const out = await extractTrpc({ routersDir: "src/server/routers" });
    const analytics = out.get("analytics") ?? [];
    const procs = analytics.map((s) => s.heading);
    expect(procs).toContain("analytics.metricSeries");
    expect(procs).toContain("analytics.drillDown");
    expect(procs).toContain("analytics.savePreset");
  });

  it("tags each procedure with authn level (public/protected/admin/superAdmin)", async () => {
    const out = await extractTrpc({ routersDir: "src/server/routers" });
    const finance = out.get("conversions-crg") ?? [];
    const pnl = finance.find((s) => s.heading === "finance.pnl");
    expect(pnl).toBeDefined();
    expect(pnl!.body).toMatch(/authn: (protected|admin)/);
  });

  it("emits input schema shape when it is a ZodObject literal", async () => {
    const out = await extractTrpc({ routersDir: "src/server/routers" });
    const statusMap = out.get("postback-status-groups") ?? [];
    const suggest = statusMap.find((s) => s.heading === "statusMapping.suggestFor");
    expect(suggest).toBeDefined();
    expect(suggest!.body).toMatch(/input:/);
  });
});
