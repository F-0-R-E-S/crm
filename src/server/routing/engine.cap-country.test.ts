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

function singleBrokerGraph(brokerId: string) {
  return {
    nodes: [
      { id: "e", kind: "Entry" as const },
      { id: "a", kind: "Algorithm" as const, mode: "WEIGHTED_ROUND_ROBIN" as const },
      { id: "t1", kind: "BrokerTarget" as const, brokerId, weight: 100 },
      { id: "x", kind: "Exit" as const },
    ],
    edges: [
      { from: "e", to: "a", condition: "default" as const },
      { from: "a", to: "t1", condition: "default" as const },
      { from: "t1", to: "x", condition: "default" as const },
    ],
  };
}

describe("engine — per-country cap", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("DE budget isolation: DE cap exhausted after 2, UK still routes", async () => {
    const broker = await mkBroker("B-iso");
    const flow = await createDraftFlow({
      name: "PerCountryIso",
      timezone: "UTC",
      graph: singleBrokerGraph(broker.id),
    });
    const fv = flow.versions[0];

    const capDef = await prisma.capDefinition.create({
      data: {
        flowVersionId: fv.id,
        scope: "BROKER",
        scopeRefId: broker.id,
        window: "DAILY",
        limit: 999, // global limit high; country limits are enforced per-country
        timezone: "UTC",
        perCountry: true,
        countryLimits: {
          create: [
            { country: "DE", limit: 2 },
            { country: "UK", limit: 5 },
          ],
        },
      },
    });

    await publishFlow(flow.id, "sys");

    // Lead 1 DE → routed
    const dec1 = await executeFlow({
      flowId: flow.id,
      lead: { id: "L1", geo: "DE", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec1.outcome).toBe("selected");

    // Lead 2 DE → routed
    const dec2 = await executeFlow({
      flowId: flow.id,
      lead: { id: "L2", geo: "DE", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec2.outcome).toBe("selected");

    // Lead 3 DE → cap exhausted
    const dec3 = await executeFlow({
      flowId: flow.id,
      lead: { id: "L3", geo: "DE", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec3.outcome).toBe("no_route");
    expect(dec3.reason).toBe("cap_exhausted");

    // Lead 4 UK → still routes (separate country bucket)
    const dec4 = await executeFlow({
      flowId: flow.id,
      lead: { id: "L4", geo: "UK", affiliateId: "A1" },
      mode: "execute",
    });
    expect(dec4.outcome).toBe("selected");

    // Assert CapCounter rows: DE count=2, UK count=1
    const deRow = await prisma.capCounter.findFirst({
      where: { scopeId: broker.id, country: "DE" },
    });
    expect(deRow).not.toBeNull();
    expect(deRow!.count).toBe(2);

    const ukRow = await prisma.capCounter.findFirst({
      where: { scopeId: broker.id, country: "UK" },
    });
    expect(ukRow).not.toBeNull();
    expect(ukRow!.count).toBe(1);

    void capDef; // referenced to satisfy linter
  });

  it("missing geo: outcome=no_route with reason missing_country_for_per_country_cap", async () => {
    const broker = await mkBroker("B-nogeo");
    const flow = await createDraftFlow({
      name: "PerCountryNoGeo",
      timezone: "UTC",
      graph: singleBrokerGraph(broker.id),
    });
    const fv = flow.versions[0];

    await prisma.capDefinition.create({
      data: {
        flowVersionId: fv.id,
        scope: "BROKER",
        scopeRefId: broker.id,
        window: "DAILY",
        limit: 999,
        timezone: "UTC",
        perCountry: true,
        countryLimits: {
          create: [{ country: "DE", limit: 10 }],
        },
      },
    });

    await publishFlow(flow.id, "sys");

    const dec = await executeFlow({
      flowId: flow.id,
      lead: { id: "L-nogeo", geo: "", affiliateId: "A1" },
      mode: "execute",
    });

    expect(dec.outcome).toBe("no_route");

    const capCheckStep = dec.trace.stepsApplied.find((s) => s.step === "cap_check");
    expect(capCheckStep).toBeDefined();
    expect(capCheckStep!.ok).toBe(false);
    expect(capCheckStep!.detail?.reason).toBe("missing_country_for_per_country_cap");
  });

  it("unmapped country FR: outcome=no_route with reason no_limit_for_country and detail.country=FR", async () => {
    const broker = await mkBroker("B-unmapped");
    const flow = await createDraftFlow({
      name: "PerCountryUnmapped",
      timezone: "UTC",
      graph: singleBrokerGraph(broker.id),
    });
    const fv = flow.versions[0];

    await prisma.capDefinition.create({
      data: {
        flowVersionId: fv.id,
        scope: "BROKER",
        scopeRefId: broker.id,
        window: "DAILY",
        limit: 999,
        timezone: "UTC",
        perCountry: true,
        countryLimits: {
          create: [{ country: "DE", limit: 5 }],
        },
      },
    });

    await publishFlow(flow.id, "sys");

    const dec = await executeFlow({
      flowId: flow.id,
      lead: { id: "L-fr", geo: "FR", affiliateId: "A1" },
      mode: "execute",
    });

    expect(dec.outcome).toBe("no_route");

    const capCheckStep = dec.trace.stepsApplied.find((s) => s.step === "cap_check");
    expect(capCheckStep).toBeDefined();
    expect(capCheckStep!.ok).toBe(false);
    expect(capCheckStep!.detail?.reason).toBe("no_limit_for_country");
    expect(capCheckStep!.detail?.country).toBe("FR");
  });
});
