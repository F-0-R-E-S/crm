import { describe, it, expect } from "vitest";
import { runDocsRegen } from "@/../scripts/docs-regen";

describe("docs-regen smoke", () => {
  it("runs in dry mode without throwing and returns a manifest", async () => {
    const manifest = await runDocsRegen({ mode: "dry", cwd: process.cwd() });
    expect(manifest).toHaveProperty("blocks");
    expect(manifest).toHaveProperty("generatedAt");
    expect(Array.isArray(manifest.blocks)).toBe(true);
  });
});
