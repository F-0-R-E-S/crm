import { describe, it, expect, beforeAll, vi } from "vitest";
import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";
import { POST } from "@/app/api/docs/ask/route";

function mockReq(body: unknown): Request {
  return new Request("http://localhost:3000/api/docs/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper: read all SSE frames from a Response body into a string array.
async function readSse(res: Response): Promise<string[]> {
  const text = await res.text();
  return text.split("\n\n").filter(Boolean);
}

describe("POST /api/docs/ask (SSE)", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE "DocAskEvent" CASCADE`;
    await prisma.$executeRaw`TRUNCATE "DocChunk" CASCADE`;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        // embedding + chat mocks — multi-call
        .mockImplementation(async (url: string) => {
          if (url.includes("/api/embed")) {
            return {
              ok: true,
              json: async () => ({
                embeddings: Array(500).fill(Array(1024).fill(0.01)),
                embedding: Array(1024).fill(0.01),
              }),
            } as any;
          }
          // /api/chat — return an SSE-like streaming body
          const enc = new TextEncoder();
          const body = new ReadableStream({
            start(c) {
              c.enqueue(
                enc.encode(
                  JSON.stringify({ message: { content: "Answer." }, done: true }) + "\n",
                ),
              );
              c.close();
            },
          });
          return new Response(body, { status: 200 }) as any;
        }),
    );
    process.env.OLLAMA_BASE_URL = "http://ollama:11434";
    await indexDocs({ root: "content/docs" });
  }, 120_000);

  it("streams tokens and persists a DocAskEvent row", async () => {
    const before: any[] =
      await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocAskEvent"`;
    const res = await POST(mockReq({ question: "What is intake?" }) as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    const frames = await readSse(res);
    expect(frames.some((f) => f.startsWith("event: citations"))).toBe(true);
    expect(frames.some((f) => f.startsWith("data: "))).toBe(true);

    // telemetry row writes are fire-and-forget — allow a tiny delay
    await new Promise((r) => setTimeout(r, 200));
    const after: any[] =
      await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocAskEvent"`;
    expect(after[0].n).toBe(before[0].n + 1);
  });

  it("returns 400 on malformed body", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/docs/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }) as any,
    );
    expect(res.status).toBe(400);
  });
});
