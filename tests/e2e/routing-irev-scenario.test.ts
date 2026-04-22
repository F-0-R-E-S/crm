// End-to-end verification of the user's UA → 3 brokers sequential-accept
// scenario. Creates a SmartPool flow via createDraftFlow, publishes it
// (compiling FallbackStep rows), then runs simulateBatch with the
// probability tuple (0, 0, 1). Every one of 100 synthetic leads MUST
// land on broker 3 via a 3-hop trace (b1✗ → b2✗ → b3✓).
//
// If this test passes, the minimum iREV-parity contract is satisfied:
// "Traffic comes in → goes to N brokers, whoever accepts takes it;
//  otherwise polls them in turn."

import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { publishFlow } from "@/server/routing/flow/publish";
import { createDraftFlow } from "@/server/routing/flow/repository";
import { simulateBatch } from "@/server/routing/simulator";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

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

describe("iREV parity scenario — UA → 3 brokers sequential accept", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("SmartPool with probs [0,0,1] → 100 leads all land on broker 3 via 3-hop trace", async () => {
    const b1 = await mkBroker("Broker-1");
    const b2 = await mkBroker("Broker-2");
    const b3 = await mkBroker("Broker-3");

    // Author the canonical "UA traffic → three brokers, sequential" flow.
    const graph = {
      nodes: [
        { id: "entry", kind: "Entry" as const },
        {
          id: "f_ua",
          kind: "Filter" as const,
          rules: [
            { field: "geo" as const, sign: "eq" as const, value: "UA", caseSensitive: false },
          ],
          logic: "AND" as const,
        },
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
        { id: "bt1", kind: "BrokerTarget" as const, brokerId: b1.id, weight: 100 },
        { id: "bt2", kind: "BrokerTarget" as const, brokerId: b2.id, weight: 100 },
        { id: "bt3", kind: "BrokerTarget" as const, brokerId: b3.id, weight: 100 },
        { id: "exit", kind: "Exit" as const },
      ],
      edges: [
        { from: "entry", to: "f_ua", condition: "default" as const },
        { from: "f_ua", to: "sp", condition: "default" as const },
        { from: "sp", to: "bt1", condition: "default" as const },
        { from: "sp", to: "bt2", condition: "default" as const },
        { from: "sp", to: "bt3", condition: "default" as const },
        { from: "bt1", to: "exit", condition: "default" as const },
        { from: "bt2", to: "exit", condition: "default" as const },
        { from: "bt3", to: "exit", condition: "default" as const },
      ],
    };
    const flow = await createDraftFlow({ name: "UA Scenario", timezone: "UTC", graph });
    await publishFlow(flow.id, "sys");

    // Verify the SmartPool compiled to a 2-hop chain (bt1→bt2, bt2→bt3).
    const steps = await prisma.fallbackStep.findMany({
      where: { flowVersionId: flow.versions[0].id },
      orderBy: [{ fromNodeId: "asc" }, { hopOrder: "asc" }],
    });
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ fromNodeId: "bt1", toNodeId: "bt2" });
    expect(steps[1]).toMatchObject({ fromNodeId: "bt2", toNodeId: "bt3" });

    // Simulate 100 leads with the critical probability tuple.
    const r = await simulateBatch({
      flowId: flow.id,
      count: 100,
      leadTemplate: { geo: "UA", affiliateId: "aff-e2e" },
      brokerAcceptProbabilities: {
        [b1.id]: 0,
        [b2.id]: 0,
        [b3.id]: 1,
      },
    });

    expect(r.count).toBe(100);
    expect(r.exhausted).toBe(0);
    expect(r.noRoute).toBe(0);
    expect(r.perBrokerAccepts[b3.id]).toBe(100);
    expect(r.perBrokerAccepts[b1.id] ?? 0).toBe(0);
    expect(r.perBrokerAccepts[b2.id] ?? 0).toBe(0);
    expect(r.perBrokerRejects[b1.id]).toBe(100);
    expect(r.perBrokerRejects[b2.id]).toBe(100);

    // Sample trace must be exactly: try b1 (reject) → try b2 (reject) → try b3 (accept)
    const first = r.sampleTraces[0];
    expect(first?.attempts).toHaveLength(3);
    expect(first?.attempts[0]?.brokerId).toBe(b1.id);
    expect(first?.attempts[0]?.accepted).toBe(false);
    expect(first?.attempts[1]?.brokerId).toBe(b2.id);
    expect(first?.attempts[1]?.accepted).toBe(false);
    expect(first?.attempts[2]?.brokerId).toBe(b3.id);
    expect(first?.attempts[2]?.accepted).toBe(true);
    expect(first?.outcome).toBe("accepted");
    expect(first?.landedBrokerId).toBe(b3.id);
  });

  it("SmartPool with probs [1,0,0] → 100 leads all land on broker 1 via 1-hop trace", async () => {
    const b1 = await mkBroker("Broker-A");
    const b2 = await mkBroker("Broker-B");
    const b3 = await mkBroker("Broker-C");

    const graph = {
      nodes: [
        { id: "entry", kind: "Entry" as const },
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
        { id: "bt1", kind: "BrokerTarget" as const, brokerId: b1.id, weight: 1 },
        { id: "bt2", kind: "BrokerTarget" as const, brokerId: b2.id, weight: 1 },
        { id: "bt3", kind: "BrokerTarget" as const, brokerId: b3.id, weight: 1 },
        { id: "exit", kind: "Exit" as const },
      ],
      edges: [
        { from: "entry", to: "sp", condition: "default" as const },
        { from: "sp", to: "bt1", condition: "default" as const },
        { from: "sp", to: "bt2", condition: "default" as const },
        { from: "sp", to: "bt3", condition: "default" as const },
        { from: "bt1", to: "exit", condition: "default" as const },
        { from: "bt2", to: "exit", condition: "default" as const },
        { from: "bt3", to: "exit", condition: "default" as const },
      ],
    };
    const flow = await createDraftFlow({ name: "First Broker Accepts", timezone: "UTC", graph });
    await publishFlow(flow.id, "sys");

    const r = await simulateBatch({
      flowId: flow.id,
      count: 100,
      leadTemplate: { geo: "UA", affiliateId: "aff-e2e-2" },
      brokerAcceptProbabilities: { [b1.id]: 1, [b2.id]: 1, [b3.id]: 1 },
    });
    expect(r.perBrokerAccepts[b1.id]).toBe(100);
    expect(r.perBrokerAccepts[b2.id] ?? 0).toBe(0);
    expect(r.perBrokerAccepts[b3.id] ?? 0).toBe(0);
    const first = r.sampleTraces[0];
    expect(first?.attempts).toHaveLength(1);
  });
});
