import { parseDocsFrontmatter } from "@/lib/docs-frontmatter";
import { describe, expect, it } from "vitest";

describe("docs frontmatter", () => {
  it("accepts a valid human-audience page", () => {
    const fm = parseDocsFrontmatter({
      audience: "human",
      block: "intake",
      source: "hand",
      title: "Lead intake overview",
      description: "What the intake pipeline does and when to use it.",
      order: 1,
    });
    expect(fm.audience).toBe("human");
  });

  it("rejects unknown audience value", () => {
    expect(() =>
      parseDocsFrontmatter({
        audience: "robots",
        block: "intake",
        source: "hand",
        title: "X",
      } as any),
    ).toThrow();
  });

  it("rejects block id not in the catalog", () => {
    expect(() =>
      parseDocsFrontmatter({
        audience: "human",
        block: "not-a-real-block",
        source: "hand",
        title: "X",
      } as any),
    ).toThrow(/block/i);
  });

  it("accepts ai-deep with kind discriminator", () => {
    const fm = parseDocsFrontmatter({
      audience: "ai-deep",
      block: "intake",
      source: "auto-gen",
      kind: "prisma",
      title: "DB Schema — intake",
    });
    expect(fm.kind).toBe("prisma");
  });

  it("defaults order to 9999 when missing", () => {
    const fm = parseDocsFrontmatter({
      audience: "human",
      block: "intake",
      source: "hand",
      title: "X",
    });
    expect(fm.order).toBe(9999);
  });
});
