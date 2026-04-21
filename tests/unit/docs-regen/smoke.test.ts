import { runDocsRegen } from "@/../scripts/docs-regen";
import { describe, expect, it } from "vitest";

describe("docs-regen smoke", () => {
  it("runs in dry mode without throwing and returns a manifest", async () => {
    const manifest = await runDocsRegen({ mode: "dry", cwd: process.cwd() });
    expect(manifest).toHaveProperty("blocks");
    expect(manifest).toHaveProperty("generatedAt");
    expect(Array.isArray(manifest.blocks)).toBe(true);
  });
});
