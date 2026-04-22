import { prisma } from "@/server/db";
import { indexDocs } from "@/server/docs/indexer";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Redis for rateLimit calls
vi.mock("@/server/redis", () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

const { appRouter } = await import("@/server/routers/_app");

function makeCtx() {
  return {
    session: null,
    prisma,
    tenantId: "tenant_default",
    hostTenantId: "tenant_default",
    sessionTenantId: null,
  } as unknown as Parameters<typeof appRouter.createCaller>[0];
}

describe("trpc docs.search", () => {
  beforeAll(async () => {
    await prisma.$executeRaw`TRUNCATE "DocSearchEvent" CASCADE`;
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

  it("returns hits + logs a DocSearchEvent", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const before: any[] =
      await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocSearchEvent"`;

    const hits = await caller.docs.search({
      q: "intake dedup",
      k: 5,
      audiences: ["human"],
      boostAiDeep: false,
      mode: "cmdk",
    });

    expect(Array.isArray(hits)).toBe(true);

    const after: any[] =
      await prisma.$queryRaw`SELECT COUNT(*)::int AS n FROM "DocSearchEvent"`;
    expect(after[0].n).toBe(before[0].n + 1);
  });

  it("filters by audience — ai-deep query does not return human rows", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const hits = await caller.docs.search({
      q: "schema",
      k: 10,
      audiences: ["ai-deep"],
      boostAiDeep: false,
      mode: "cmdk",
    });
    expect(hits.every((h) => h.audience === "ai-deep")).toBe(true);
  });
});
