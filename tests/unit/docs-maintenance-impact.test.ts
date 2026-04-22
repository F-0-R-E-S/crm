import { analyzeImpact } from "@/../scripts/docs-maintenance/impact";
import { describe, expect, it } from "vitest";

describe("analyzeImpact", () => {
  it("maps src/server/intake/fraud-score.ts → fraud-score block", () => {
    const r = analyzeImpact({ changedPaths: ["src/server/intake/fraud-score.ts"] });
    expect(r.affectedBlocks).toContain("fraud-score");
  });

  it("a single Prisma model edit spreads to every block that references it", () => {
    const r = analyzeImpact({
      changedPaths: ["prisma/schema.prisma"],
      prismaChangedModels: ["Lead", "FlowVersion"],
    });
    expect(new Set(r.affectedBlocks)).toEqual(new Set(["intake", "routing-engine"]));
  });

  it("ignores test files, markdown, and lockfiles", () => {
    const r = analyzeImpact({
      changedPaths: [
        "tests/integration/intake.test.ts",
        "README.md",
        "pnpm-lock.yaml",
        "src/server/intake/route.ts",
      ],
    });
    expect(r.affectedBlocks).toEqual(["intake"]);
  });

  it("detects human-layer edits per block", () => {
    const r = analyzeImpact({
      changedPaths: ["src/server/intake/fraud-score.ts", "content/docs/fraud-score/concepts.mdx"],
    });
    expect(r.affectedBlocks).toEqual(["fraud-score"]);
    expect(r.humanDocsChangedByBlock["fraud-score"]).toEqual([
      "content/docs/fraud-score/concepts.mdx",
    ]);
  });
});
