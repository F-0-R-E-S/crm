import { findDoc, loadDocsTree } from "@/lib/docs-content";
import { describe, expect, it } from "vitest";

describe("docs content loader", () => {
  it("returns one node per block with at least one human MDX", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    expect(tree.length).toBeGreaterThan(0);
    const intake = tree.find((n) => n.blockId === "intake");
    expect(intake).toBeDefined();
    expect(intake!.pages.every((p) => p.audience === "human")).toBe(true);
  });

  it("excludes files under _deep/ from the nav tree", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    const allPaths = tree.flatMap((n) => n.pages.map((p) => p.slug));
    expect(allPaths.every((s) => !s.includes("_deep"))).toBe(true);
  });

  it("findDoc resolves a known slug", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    const any = tree[0]?.pages[0];
    if (!any) return;
    const found = findDoc(tree, any.slug);
    expect(found?.frontmatter.title).toBe(any.frontmatter.title);
  });

  it("sorts pages by frontmatter.order asc then title asc", async () => {
    const tree = await loadDocsTree({ root: "content/docs" });
    for (const node of tree) {
      for (let i = 1; i < node.pages.length; i++) {
        const a = node.pages[i - 1];
        const b = node.pages[i];
        expect(
          a.frontmatter.order < b.frontmatter.order ||
            (a.frontmatter.order === b.frontmatter.order &&
              a.frontmatter.title <= b.frontmatter.title),
        ).toBe(true);
      }
    }
  });
});
