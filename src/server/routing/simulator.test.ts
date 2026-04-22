import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { publishFlow } from "./flow/publish";
import { createDraftFlow } from "./flow/repository";
import { type SimulateInput, simulateBatch, simulateRoute } from "./simulator";

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

describe("simulateBatch — SmartPool sequential accept scenario", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("UA → 3 brokers with probs [0, 0, 1] lands every lead on broker 3", async () => {
    const b1 = await mkBroker("SP-B1");
    const b2 = await mkBroker("SP-B2");
    const b3 = await mkBroker("SP-B3");
    const smartGraph = {
      nodes: [
        { id: "e", kind: "Entry" as const },
        {
          id: "sp",
          kind: "SmartPool" as const,
          maxHop: 5,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503, 504],
            connectionError: true,
            explicitReject: true,
          },
        },
        { id: "t1", kind: "BrokerTarget" as const, brokerId: b1.id, weight: 100 },
        { id: "t2", kind: "BrokerTarget" as const, brokerId: b2.id, weight: 100 },
        { id: "t3", kind: "BrokerTarget" as const, brokerId: b3.id, weight: 100 },
        { id: "x", kind: "Exit" as const },
      ],
      edges: [
        { from: "e", to: "sp", condition: "default" as const },
        { from: "sp", to: "t1", condition: "default" as const },
        { from: "sp", to: "t2", condition: "default" as const },
        { from: "sp", to: "t3", condition: "default" as const },
        { from: "t1", to: "x", condition: "default" as const },
        { from: "t2", to: "x", condition: "default" as const },
        { from: "t3", to: "x", condition: "default" as const },
      ],
    };
    const f = await createDraftFlow({ name: "SP", timezone: "UTC", graph: smartGraph });
    await publishFlow(f.id, "sys");

    const r = await simulateBatch({
      flowId: f.id,
      count: 50,
      leadTemplate: { geo: "UA", affiliateId: "aff-test" },
      brokerAcceptProbabilities: {
        [b1.id]: 0,
        [b2.id]: 0,
        [b3.id]: 1,
      },
    });
    expect(r.count).toBe(50);
    expect(r.perBrokerAccepts[b3.id]).toBe(50);
    expect(r.perBrokerAccepts[b1.id]).toBeUndefined();
    expect(r.perBrokerAccepts[b2.id]).toBeUndefined();
    expect(r.perBrokerRejects[b1.id]).toBe(50);
    expect(r.perBrokerRejects[b2.id]).toBe(50);
    expect(r.exhausted).toBe(0);
    // Sample trace should show 3 sequential attempts ending in accept at t3.
    const first = r.sampleTraces[0];
    expect(first?.attempts).toHaveLength(3);
    expect(first?.attempts[0]?.accepted).toBe(false);
    expect(first?.attempts[1]?.accepted).toBe(false);
    expect(first?.attempts[2]?.accepted).toBe(true);
    expect(first?.landedBrokerId).toBe(b3.id);
  });

  it("UA → 3 brokers with all probs 0 leads every trace to exhaustion", async () => {
    const b1 = await mkBroker("E1");
    const b2 = await mkBroker("E2");
    const b3 = await mkBroker("E3");
    const smartGraph = {
      nodes: [
        { id: "e", kind: "Entry" as const },
        {
          id: "sp",
          kind: "SmartPool" as const,
          maxHop: 5,
          triggers: {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503, 504],
            connectionError: true,
            explicitReject: true,
          },
        },
        { id: "t1", kind: "BrokerTarget" as const, brokerId: b1.id, weight: 100 },
        { id: "t2", kind: "BrokerTarget" as const, brokerId: b2.id, weight: 100 },
        { id: "t3", kind: "BrokerTarget" as const, brokerId: b3.id, weight: 100 },
        { id: "x", kind: "Exit" as const },
      ],
      edges: [
        { from: "e", to: "sp", condition: "default" as const },
        { from: "sp", to: "t1", condition: "default" as const },
        { from: "sp", to: "t2", condition: "default" as const },
        { from: "sp", to: "t3", condition: "default" as const },
        { from: "t1", to: "x", condition: "default" as const },
        { from: "t2", to: "x", condition: "default" as const },
        { from: "t3", to: "x", condition: "default" as const },
      ],
    };
    const f = await createDraftFlow({ name: "SP2", timezone: "UTC", graph: smartGraph });
    await publishFlow(f.id, "sys");

    const r = await simulateBatch({
      flowId: f.id,
      count: 10,
      leadTemplate: { geo: "UA", affiliateId: "aff-x" },
      brokerAcceptProbabilities: { [b1.id]: 0, [b2.id]: 0, [b3.id]: 0 },
    });
    expect(r.exhausted).toBe(10);
    expect(Object.values(r.perBrokerAccepts).reduce((a, b) => a + b, 0)).toBe(0);
  });
});
