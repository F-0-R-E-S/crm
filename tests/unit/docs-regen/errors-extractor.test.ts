import { extractErrors } from "@/../scripts/docs-regen/extractors/errors";
import { describe, expect, it } from "vitest";

describe("errors extractor", () => {
  it("finds TRPCError throws and assigns them to the block that owns the file", async () => {
    const map = await extractErrors({ srcDir: "src" });
    const billing = map.get("billing-subscription") ?? [];
    expect(billing.some((s) => s.heading === "stripe_not_configured")).toBe(true);
  });

  it("records filename:line for each throw", async () => {
    const map = await extractErrors({ srcDir: "src" });
    const intake = map.get("intake") ?? [];
    expect(intake.length).toBeGreaterThan(0);
    expect(intake[0].body).toMatch(/\.ts:\d+/);
  });

  it("distinguishes TRPCError code vs plain Error message", async () => {
    const map = await extractErrors({ srcDir: "src" });
    const flat = [...map.values()].flat();
    expect(flat.some((s) => s.body.includes("TRPCError"))).toBe(true);
    expect(flat.some((s) => s.body.includes("Error:"))).toBe(true);
  });
});
