import { renderInventory } from "@/../scripts/docs-regen/inventory";
import { describe, expect, it } from "vitest";

describe("inventory renderer", () => {
  it("renders one H2 per block in order, with counts + links", () => {
    const md = renderInventory([
      {
        id: "intake",
        title: "Lead Intake",
        counts: { prisma: 8, trpc: 12, rest: 4, env: 1, errors: 9, telegram: 2, jobs: 0 },
      },
      {
        id: "fraud-score",
        title: "Fraud Score",
        counts: { prisma: 2, trpc: 2, rest: 0, env: 0, errors: 1, telegram: 1, jobs: 0 },
      },
    ]);
    expect(md).toMatch(/## Lead Intake/);
    expect(md).toMatch(/\| Source \| Count \| Link \|/);
    expect(md).toMatch(/\[db-schema\.md\]\(\.\.\/content\/docs\/intake\/_deep\/db-schema\.md\)/);
    expect(md.indexOf("Lead Intake")).toBeLessThan(md.indexOf("Fraud Score"));
  });
});
