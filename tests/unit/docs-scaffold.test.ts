import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { scaffoldBlock } from "@/../scripts/docs-maintenance/scaffold";
import { beforeEach, describe, expect, it } from "vitest";

describe("scaffoldBlock", () => {
  const root = resolve(process.cwd(), "content/docs/__scaffold-test__");
  beforeEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates three MDX files with the right frontmatter", async () => {
    const created = await scaffoldBlock({
      id: "__scaffold-test__",
      title: "Scaffold Test",
      order: 999,
      oneLineDescription: "Temp block for unit test.",
    });
    expect(created.length).toBe(3);
    const idx = readFileSync(resolve(root, "index.mdx"), "utf8");
    expect(idx).toMatch(/block: __scaffold-test__/);
    expect(idx).toMatch(/audience: human/);
    expect(idx).toMatch(/title: "Scaffold Test — overview"/);
  });

  it("is idempotent — re-running does not overwrite existing files", async () => {
    await scaffoldBlock({ id: "__scaffold-test__", title: "Scaffold Test", order: 999 });
    const before = readFileSync(resolve(root, "index.mdx"), "utf8");
    await scaffoldBlock({ id: "__scaffold-test__", title: "Scaffold Test", order: 999 });
    const after = readFileSync(resolve(root, "index.mdx"), "utf8");
    expect(after).toBe(before);
  });
});
