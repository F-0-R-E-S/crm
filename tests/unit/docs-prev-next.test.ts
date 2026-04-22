import { computePrevNext } from "@/components/docs/PrevNext";
import type { DocsNode } from "@/lib/docs-content";
import { describe, expect, it } from "vitest";

const tree: DocsNode[] = [
  {
    blockId: "intake",
    blockTitle: "Lead Intake",
    order: 1,
    pages: [
      {
        slug: "intake",
        audience: "human",
        filePath: "",
        rawBody: "",
        frontmatter: {
          audience: "human",
          block: "intake",
          source: "hand",
          title: "Overview",
          order: 1,
        } as any,
      },
      {
        slug: "intake/recipes",
        audience: "human",
        filePath: "",
        rawBody: "",
        frontmatter: {
          audience: "human",
          block: "intake",
          source: "hand",
          title: "Recipes",
          order: 2,
        } as any,
      },
    ],
  },
  {
    blockId: "fraud-score",
    blockTitle: "Fraud Score",
    order: 2,
    pages: [
      {
        slug: "fraud-score",
        audience: "human",
        filePath: "",
        rawBody: "",
        frontmatter: {
          audience: "human",
          block: "fraud-score",
          source: "hand",
          title: "Overview",
          order: 1,
        } as any,
      },
    ],
  },
];

describe("prev/next", () => {
  it("returns null prev for the very first page", () => {
    const { prev, next } = computePrevNext(tree, "intake");
    expect(prev).toBeNull();
    expect(next?.slug).toBe("intake/recipes");
  });

  it("wraps across blocks", () => {
    const { prev, next } = computePrevNext(tree, "intake/recipes");
    expect(prev?.slug).toBe("intake");
    expect(next?.slug).toBe("fraud-score");
  });

  it("returns null next for the very last page", () => {
    const { prev, next } = computePrevNext(tree, "fraud-score");
    expect(prev?.slug).toBe("intake/recipes");
    expect(next).toBeNull();
  });
});
