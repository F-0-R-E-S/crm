import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";
import { searchDocs } from "@/server/docs/search";
import { beforeAll, describe, expect, it, vi } from "vitest";

describe("searchDocs", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          embeddings: Array(500).fill(Array(1024).fill(0.01)),
          embedding: Array(1024).fill(0.01),
        }),
      }),
    );
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    await indexDocs({ root: "content/docs" });
  }, 120_000);

  it("returns hits with title + snippet + slug + score", async () => {
    const hits = await searchDocs({ q: "lead intake dedup", audiences: ["human"], k: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toHaveProperty("title");
    expect(hits[0]).toHaveProperty("snippet");
    expect(hits[0]).toHaveProperty("slug");
    expect(hits[0]).toHaveProperty("score");
  });

  it("human-only mode never returns ai-deep rows", async () => {
    const hits = await searchDocs({ q: "schema", audiences: ["human"], k: 20 });
    expect(hits.every((h) => h.audience === "human")).toBe(true);
  });
});
