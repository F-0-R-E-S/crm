import { buildUpdatePrompt } from "@/../scripts/docs-maintenance/update-prompt";
import { describe, expect, it } from "vitest";

describe("update-prompt", () => {
  it("assembles prompt with diff, current docs, and deep summary sections", async () => {
    const prompt = await buildUpdatePrompt({
      block: "intake",
      diffText: "diff --git a/x b/x\n+new\n",
    });
    expect(prompt).toMatch(/## Block: intake/);
    expect(prompt).toMatch(/## Code diff/);
    expect(prompt).toMatch(/## Current human docs/);
    expect(prompt).toMatch(/## Current deep references/);
    expect(prompt).toMatch(/Output format/);
  });

  it("refuses unknown block id", async () => {
    await expect(buildUpdatePrompt({ block: "not-a-block", diffText: "" })).rejects.toThrow();
  });
});
