import { extractPrisma } from "@/../scripts/docs-regen/extractors/prisma";
import { describe, expect, it } from "vitest";

describe("prisma extractor", () => {
  it("emits a section for the intake block covering Lead + LeadEvent", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    const intake = out.get("intake");
    expect(intake).toBeDefined();
    expect(intake!.some((s) => s.heading.includes("Lead"))).toBe(true);
    expect(intake!.some((s) => s.heading.includes("LeadEvent"))).toBe(true);
  });

  it("renders field-granular blocks (one H3 per model, one bullet per field)", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    const leadSection = out.get("intake")?.find((s) => s.heading === "Lead");
    expect(leadSection).toBeDefined();
    expect(leadSection!.body).toMatch(/- \*\*id\*\*/);
    expect(leadSection!.body).toMatch(/- \*\*state\*\* `LeadState`/);
    expect(leadSection!.body).toMatch(/- \*\*fraudScore\*\*/);
  });

  it("emits sections for enums referenced by tracked models", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    const flat = [...out.values()].flat();
    const leadStateEnum = flat.find((s) => s.heading === "enum LeadState");
    expect(leadStateEnum).toBeDefined();
    expect(leadStateEnum!.body).toMatch(/- NEW/);
    expect(leadStateEnum!.body).toMatch(/- REJECTED_FRAUD/);
  });

  it("groups unknown models under __unassigned__ instead of dropping", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    expect(out.has("__unassigned__")).toBe(true);
  });
});
