import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";

describe("OpenAPI indexing", () => {
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

  it("one chunk per (path, method) from openapi.yaml", async () => {
    const rows: Array<{ title: string; slug: string; kind: string; audience: string }> =
      await prisma.$queryRaw`SELECT title, slug, kind, audience FROM "DocChunk" WHERE kind = 'openapi'`;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.audience === "ai-deep")).toBe(true);
    // At minimum we expect POST /api/v1/leads from the intake block.
    expect(rows.some((r) => r.title === "POST /api/v1/leads")).toBe(true);
  });

  it("OpenAPI chunks carry slug=api and an operation-* anchor", async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT slug, anchor FROM "DocChunk"
      WHERE kind = 'openapi' AND title = 'POST /api/v1/leads'
    `;
    expect(rows[0].slug).toBe("api");
    expect(rows[0].anchor).toMatch(/^operation-/);
  });
});
