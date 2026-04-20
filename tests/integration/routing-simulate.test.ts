import { GET as getJob } from "@/app/api/v1/routing/simulate/[jobId]/route";
import { POST as postSim } from "@/app/api/v1/routing/simulate/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { publishFlow } from "@/server/routing/flow/publish";
import { createDraftFlow } from "@/server/routing/flow/repository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "u", role: "ADMIN" } }),
}));

async function mkFlow() {
  const b = await prisma.broker.create({
    data: {
      name: "B",
      endpointUrl: "http://x",
      fieldMapping: {},
      postbackSecret: "s",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
    },
  });
  const f = await createDraftFlow({
    name: "S",
    timezone: "UTC",
    graph: {
      nodes: [
        { id: "e", kind: "Entry" },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        { id: "t", kind: "BrokerTarget", brokerId: b.id, weight: 100 },
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" },
        { from: "a", to: "t", condition: "default" },
        { from: "t", to: "x", condition: "default" },
      ],
    },
  });
  await publishFlow(f.id, "sys");
  return f;
}

describe("POST /api/v1/routing/simulate", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("single simulate — 200 + explain", async () => {
    const f = await mkFlow();
    const r = await postSim(
      new Request("http://x/api/v1/routing/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flow_id: f.id, lead: { geo: "UA", affiliate_id: "aff-1" } }),
      }),
    );
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.outcome).toBe("selected");
    expect(b.algorithm_used).toBe("weighted_round_robin");
  });

  it("batch >1000 → 400 too_many_leads", async () => {
    const f = await mkFlow();
    const r = await postSim(
      new Request("http://x/api/v1/routing/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow_id: f.id,
          leads: Array.from({ length: 1001 }, (_, i) => ({
            geo: "UA",
            affiliate_id: `a${i}`,
          })),
        }),
      }),
    );
    expect(r.status).toBe(400);
    const b = await r.json();
    expect(b.error.code).toBe("too_many_leads");
  });

  it("batch ≤1000 → 202 + job_id", async () => {
    const f = await mkFlow();
    const r = await postSim(
      new Request("http://x/api/v1/routing/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow_id: f.id,
          leads: [
            { geo: "UA", affiliate_id: "a1" },
            { geo: "UA", affiliate_id: "a2" },
          ],
        }),
      }),
    );
    expect(r.status).toBe(202);
    const b = await r.json();
    expect(b.job_id).toBeTruthy();
  });

  it("GET /{jobId} → 404 на неизвестный job", async () => {
    const r = await getJob(new Request("http://x/api/v1/routing/simulate/missing"), {
      params: Promise.resolve({ jobId: "missing" }),
    });
    expect(r.status).toBe(404);
  });
});
