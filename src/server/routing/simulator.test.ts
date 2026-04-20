import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { publishFlow } from "./flow/publish";
import { createDraftFlow } from "./flow/repository";
import { type SimulateInput, simulateRoute } from "./simulator";

async function mkBroker(name: string) {
  return prisma.broker.create({
    data: {
      name,
      endpointUrl: "http://x",
      fieldMapping: {},
      postbackSecret: "s",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
    },
  });
}

const graph = (bId: string) => ({
  nodes: [
    { id: "e", kind: "Entry" as const },
    { id: "a", kind: "Algorithm" as const, mode: "WEIGHTED_ROUND_ROBIN" as const },
    { id: "t", kind: "BrokerTarget" as const, brokerId: bId, weight: 100 },
    { id: "x", kind: "Exit" as const },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" as const },
    { from: "a", to: "t", condition: "default" as const },
    { from: "t", to: "x", condition: "default" as const },
  ],
});

describe("simulateRoute", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("возвращает explain payload + не инкрементит counters", async () => {
    const b = await mkBroker("BX");
    const f = await createDraftFlow({ name: "S", timezone: "UTC", graph: graph(b.id) });
    await publishFlow(f.id, "sys");
    const input: SimulateInput = {
      flowId: f.id,
      leadPayload: { geo: "UA", affiliateId: "aff-x" },
    };
    const out = await simulateRoute(input);
    expect(out.selected_target).toBeTruthy();
    expect(out.algorithm_used).toBe("weighted_round_robin");
    expect(Array.isArray(out.filters_applied)).toBe(true);
    expect(out.decision_time_ms).toBeGreaterThan(0);
    expect(await prisma.capCounter.count()).toBe(0);
  });

  it("SIMULATE_DECISION event НЕ пишется в LeadEvent", async () => {
    const b = await mkBroker("B");
    const f = await createDraftFlow({ name: "S", timezone: "UTC", graph: graph(b.id) });
    await publishFlow(f.id, "sys");
    await simulateRoute({ flowId: f.id, leadPayload: { geo: "UA", affiliateId: "aff-x" } });
    expect(await prisma.leadEvent.count()).toBe(0);
  });
});
