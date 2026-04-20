import { prisma } from "@/server/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { normalizeBrokerStatus, pollBrokerStatuses } from "./status-poll";

async function seed() {
  const aff = await prisma.affiliate.create({ data: { name: "a" } });
  const b = await prisma.broker.create({
    data: {
      name: "p",
      endpointUrl: "https://example.com/leads",
      statusPollPath: "/status",
      statusPollIdsParam: "ids",
      syncMode: "polling",
      pollIntervalMin: 5,
      fieldMapping: {} as object,
      postbackSecret: "s".repeat(32),
      postbackLeadIdPath: "$.lead_id",
      postbackStatusPath: "$.status",
      statusMapping: { received: "ACCEPTED", ftd: "FTD", declined: "DECLINED" } as object,
    },
  });
  const lead = await prisma.lead.create({
    data: {
      affiliateId: aff.id,
      brokerId: b.id,
      brokerExternalId: "ext-1",
      state: "PUSHED",
      geo: "UA",
      ip: "1.1.1.1",
      eventTs: new Date(),
      traceId: "t-1",
    },
  });
  return { broker: b, lead };
}

describe("normalizeBrokerStatus", () => {
  it("мапит raw → internal enum", () => {
    expect(normalizeBrokerStatus("received", { received: "ACCEPTED", ftd: "FTD" })).toBe(
      "ACCEPTED",
    );
  });
  it("unknown raw → null", () => {
    expect(normalizeBrokerStatus("unknown", { received: "ACCEPTED" })).toBeNull();
  });
});

describe("pollBrokerStatuses", () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("polls, применяет mapping и обновляет Lead.state", async () => {
    const { broker, lead } = await seed();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ lead_id: "ext-1", status: "ftd" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await pollBrokerStatuses(broker.id);
    expect(res.polled).toBe(1);
    expect(res.updated).toBe(1);
    const fresh = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(fresh?.state).toBe("FTD");
    expect(fresh?.ftdAt).toBeInstanceOf(Date);
    const events = await prisma.leadEvent.findMany({ where: { leadId: lead.id } });
    expect(events.some((e) => e.kind === "STATE_TRANSITION")).toBe(true);
  });

  it("идемпотентен: второй poll тем же статусом не создаёт дубль transition", async () => {
    const { broker, lead } = await seed();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ lead_id: "ext-1", status: "received" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await pollBrokerStatuses(broker.id);
    await pollBrokerStatuses(broker.id);
    const events = await prisma.leadEvent.findMany({
      where: { leadId: lead.id, kind: "STATE_TRANSITION" },
    });
    expect(events).toHaveLength(1);
  });

  it("unknown status → lead не обновляется, event с unmapped=true", async () => {
    const { broker, lead } = await seed();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ lead_id: "ext-1", status: "weird" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    await pollBrokerStatuses(broker.id);
    const fresh = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(fresh?.state).toBe("PUSHED");
    const ev = await prisma.leadEvent.findFirst({
      where: { leadId: lead.id, kind: "POSTBACK_RECEIVED" },
    });
    expect((ev?.meta as { unmapped?: boolean }).unmapped).toBe(true);
  });
});
