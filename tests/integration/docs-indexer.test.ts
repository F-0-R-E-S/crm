import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("docs indexer", () => {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ embeddings: Array(200).fill(Array(1024).fill(0.01)) }),
      }),
    );
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
  });

  it(
    "indexes every file under content/docs — human + ai-deep — and persists rows",
    async () => {
      const manifest = await indexDocs({ root: "content/docs" });
      expect(manifest.chunkCount).toBeGreaterThan(0);
      const counts: any[] = await prisma.$queryRaw`
        SELECT audience, COUNT(*)::int AS n FROM "DocChunk" GROUP BY audience
      `;
      const byAudience = Object.fromEntries(counts.map((r: any) => [r.audience, r.n]));
      expect(byAudience.human).toBeGreaterThan(0);
      expect(byAudience["ai-deep"]).toBeGreaterThan(0);
    },
    60_000,
  );

  it(
    "is idempotent — running twice produces the same final row count",
    async () => {
      await indexDocs({ root: "content/docs" });
      const first: any[] =
        await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocChunk"`;
      await indexDocs({ root: "content/docs" });
      const second: any[] =
        await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocChunk"`;
      expect(second[0].n).toBe(first[0].n);
    },
    60_000,
  );
});
