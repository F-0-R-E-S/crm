import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { executeFlow } from "./engine";
import { publishFlow } from "./flow/publish";
import { createDraftFlow } from "./flow/repository";

function mkBroker(id: string) {
  return prisma.broker.create({
    data: {
      name: id,
      endpointUrl: "http://x",
      fieldMapping: {},
      postbackSecret: "s",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
    },
  });
}

const baseGraph = (b1Id: string, b2Id: string) => ({
  nodes: [
    { id: "e", kind: "Entry" as const },
    {
      id: "f",
      kind: "Filter" as const,
      rules: [
        {
          field: "geo" as const,
          sign: "eq" as const,
          value: "UA",
          caseSensitive: false,
        },
      ],
      logic: "AND" as const,
    },
    { id: "a", kind: "Algorithm" as const, mode: "WEIGHTED_ROUND_ROBIN" as const },
    { id: "t1", kind: "BrokerTarget" as const, brokerId: b1Id, weight: 50 },
    { id: "t2", kind: "BrokerTarget" as const, brokerId: b2Id, weight: 50 },
    { id: "x", kind: "Exit" as const },
  ],
  edges: [
    { from: "e", to: "f", condition: "default" as const },
    { from: "f", to: "a", condition: "default" as const },
    { from: "a", to: "t1", condition: "default" as const },
    { from: "a", to: "t2", condition: "default" as const },
    { from: "t1", to: "x", condition: "default" as const },
    { from: "t2", to: "x", condition: "default" as const },
  ],
});

describe("engine.executeFlow", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("selects BrokerTarget по WRR", async () => {
    const b1 = await mkBroker("B1");
    const b2 = await mkBroker("B2");
    const f = await createDraftFlow({
      name: "T",
      timezone: "UTC",
      graph: baseGraph(b1.id, b2.id),
    });
    await publishFlow(f.id, "sys");
    const dec = await executeFlow({
      flowId: f.id,
      lead: { id: "L1", geo: "UA", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec.outcome).toBe("selected");
    expect([b1.id, b2.id]).toContain(dec.selectedBrokerId);
    expect(dec.trace.stepsApplied.length).toBeGreaterThan(0);
  });

  it("filter reject → outcome=no_route, reason=entry_filter", async () => {
    const b1 = await mkBroker("B1");
    const b2 = await mkBroker("B2");
    const f = await createDraftFlow({
      name: "T",
      timezone: "UTC",
      graph: baseGraph(b1.id, b2.id),
    });
    await publishFlow(f.id, "sys");
    const dec = await executeFlow({
      flowId: f.id,
      lead: { id: "L1", geo: "DE", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec.outcome).toBe("no_route");
    expect(dec.reason).toBe("entry_filter");
  });

  it("SmartPool: picks the first-rank child regardless of WRR weights", async () => {
    const b1 = await mkBroker("B1");
    const b2 = await mkBroker("B2");
    const b3 = await mkBroker("B3");
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
        { id: "t1", kind: "BrokerTarget" as const, brokerId: b1.id, weight: 1 },
        { id: "t2", kind: "BrokerTarget" as const, brokerId: b2.id, weight: 1000 },
        { id: "t3", kind: "BrokerTarget" as const, brokerId: b3.id, weight: 1000 },
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
    const dec = await executeFlow({
      flowId: f.id,
      lead: { id: "L1", geo: "UA", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec.outcome).toBe("selected");
    expect(dec.algorithmUsed).toBe("smart_pool");
    expect(dec.selectedBrokerId).toBe(b1.id);
    expect(dec.selectedSmartPoolId).toBe("sp");
  });

  it("BrokerTarget pqlGate: mismatch excludes target from selection", async () => {
    const b1 = await mkBroker("B1");
    const b2 = await mkBroker("B2");
    const gatedGraph = {
      nodes: [
        { id: "e", kind: "Entry" as const },
        { id: "a", kind: "Algorithm" as const, mode: "WEIGHTED_ROUND_ROBIN" as const },
        {
          id: "t1",
          kind: "BrokerTarget" as const,
          brokerId: b1.id,
          weight: 100,
          // Only accept UA — lead geo=PL will miss the gate.
          pqlGate: {
            rules: [
              {
                field: "geo" as const,
                sign: "eq" as const,
                value: "UA",
                caseSensitive: false,
              },
            ],
            logic: "AND" as const,
          },
        },
        { id: "t2", kind: "BrokerTarget" as const, brokerId: b2.id, weight: 100 },
        { id: "x", kind: "Exit" as const },
      ],
      edges: [
        { from: "e", to: "a", condition: "default" as const },
        { from: "a", to: "t1", condition: "default" as const },
        { from: "a", to: "t2", condition: "default" as const },
        { from: "t1", to: "x", condition: "default" as const },
        { from: "t2", to: "x", condition: "default" as const },
      ],
    };
    const f = await createDraftFlow({ name: "G", timezone: "UTC", graph: gatedGraph });
    await publishFlow(f.id, "sys");
    const dec = await executeFlow({
      flowId: f.id,
      lead: { id: "L1", geo: "PL", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec.outcome).toBe("selected");
    expect(dec.selectedBrokerId).toBe(b2.id);
    const gateStep = dec.trace.stepsApplied.find((s) => s.step === "pql_gate" && s.nodeId === "t1");
    expect(gateStep?.ok).toBe(false);
  });

  it("dryRun не инкрементит caps", async () => {
    const b1 = await mkBroker("B1");
    const b2 = await mkBroker("B2");
    const f = await createDraftFlow({
      name: "T",
      timezone: "UTC",
      graph: baseGraph(b1.id, b2.id),
    });
    const latest = f.versions[0];
    await prisma.capDefinition.create({
      data: {
        flowVersionId: latest.id,
        scope: "BROKER",
        scopeRefId: b1.id,
        window: "DAILY",
        limit: 1,
        timezone: "UTC",
      },
    });
    await publishFlow(f.id, "sys");
    for (let i = 0; i < 3; i++)
      await executeFlow({
        flowId: f.id,
        lead: { id: `L${i}`, geo: "UA", affiliateId: "A1" },
        mode: "dryRun",
      });
    const row = await prisma.capCounter.findFirst();
    expect(row).toBeNull();
  });
});
