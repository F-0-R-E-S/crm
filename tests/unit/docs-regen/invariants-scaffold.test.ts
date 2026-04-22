import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BLOCK_CATALOG } from "@/../scripts/docs-regen/block-catalog";
import { describe, expect, it } from "vitest";

describe("invariants stubs", () => {
  for (const b of BLOCK_CATALOG) {
    it(`${b.id} has _deep/invariants.md with the right frontmatter`, async () => {
      const content = await readFile(
        resolve(process.cwd(), `content/docs/${b.id}/_deep/invariants.md`),
        "utf8",
      );
      expect(content).toMatch(/audience: ai-deep/);
      expect(content).toMatch(/source: hand/);
      expect(content).toMatch(new RegExp(`block: ${b.id}`));
    });
  }
});
