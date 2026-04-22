import * as indexerMod from "@/server/docs/indexer";
import { handleDocsReindex } from "@/server/jobs/docs-reindex";
import { describe, expect, it, vi } from "vitest";

describe("docs-reindex job", () => {
  it("calls indexDocs once", async () => {
    const spy = vi.spyOn(indexerMod, "indexDocs").mockResolvedValue({
      chunkCount: 10,
      embeddedCount: 0,
      skippedUnchanged: 10,
      generatedAt: new Date().toISOString(),
    });
    await handleDocsReindex();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
