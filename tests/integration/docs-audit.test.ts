import { runAudit } from "@/../scripts/docs-maintenance/audit";
import { describe, expect, it } from "vitest";

describe("docs:audit", () => {
  it("returns empty report when no code files changed", async () => {
    const report = await runAudit({ compareAgainst: "HEAD", changedPathsOverride: [] });
    expect(report.violations).toEqual([]);
  });

  it("flags a block whose code changed but docs did not", async () => {
    const report = await runAudit({
      compareAgainst: "HEAD",
      changedPathsOverride: ["src/server/intake/fraud-score.ts"],
    });
    const violation = report.violations.find((v) => v.block === "fraud-score");
    expect(violation).toBeDefined();
    expect(violation!.reason).toMatch(/code changed/);
  });

  it("suppresses violation when the block's human MDX was also changed", async () => {
    const report = await runAudit({
      compareAgainst: "HEAD",
      changedPathsOverride: [
        "src/server/intake/fraud-score.ts",
        "content/docs/fraud-score/concepts.mdx",
      ],
    });
    expect(report.violations.find((v) => v.block === "fraud-score")).toBeUndefined();
  });

  it("accepts a skip declaration via skipBlocks param", async () => {
    const report = await runAudit({
      compareAgainst: "HEAD",
      changedPathsOverride: ["src/server/intake/fraud-score.ts"],
      skipBlocks: ["fraud-score"],
    });
    expect(report.violations).toEqual([]);
    expect(report.skipped).toContain("fraud-score");
  });
});
