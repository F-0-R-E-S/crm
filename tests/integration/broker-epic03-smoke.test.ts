import {
  type TestConnectionBroker,
  testBrokerConnection,
} from "@/server/broker-adapter/test-connection";
import { pollBrokerStatuses } from "@/server/broker-adapter/status-poll";
import { aggregateBrokerErrors, computeSla } from "@/server/broker-errors/aggregator";
import { recordHealthCheck } from "@/server/broker-health/check";
import { createBrokerFromTemplate } from "@/server/broker-template/from-template";
import { seedBrokerTemplates } from "@/server/broker-template/seed";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

describe("EPIC-03 smoke", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("end-to-end: template → broker → health → poll → errors", async () => {
    const n = await seedBrokerTemplates();
    expect(n).toBe(20);
    const tpl = await prisma.brokerTemplate.findFirstOrThrow({
      where: { vertical: "forex" },
    });

    const broker = await createBrokerFromTemplate({
      templateId: tpl.id,
      name: "Smoke Broker",
      endpointUrl: "https://example.com/leads",
      authConfig: { token: "t".repeat(32) },
    });
    expect(broker.templateId).toBe(tpl.id);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ lead_id: "ext-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const testInput: TestConnectionBroker = {
      id: broker.id,
      endpointUrl: broker.endpointUrl,
      httpMethod: broker.httpMethod,
      authType: broker.authType,
      authConfig: broker.authConfig as Record<string, unknown>,
      headers: (broker.headers as Record<string, string>) ?? {},
      fieldMapping: broker.fieldMapping as unknown as TestConnectionBroker["fieldMapping"],
      staticPayload: (broker.staticPayload as Record<string, unknown>) ?? {},
    };
    const tc = await testBrokerConnection(testInput, { timeoutMs: 5000 });
    expect(tc.auth_status).toBe("ok");
    await recordHealthCheck(broker.id, tc);
    const fresh = await prisma.broker.findUniqueOrThrow({ where: { id: broker.id } });
    expect(fresh.lastHealthStatus).toBe("healthy");

    await prisma.broker.update({
      where: { id: broker.id },
      data: {
        syncMode: "polling",
        pollIntervalMin: 5,
        statusPollPath: "/status",
        statusPollIdsParam: "ids",
      },
    });
    const aff = await prisma.affiliate.create({ data: { name: "smk" } });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        brokerId: broker.id,
        brokerExternalId: "ext-1",
        state: "PUSHED",
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "smk-1",
      },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ lead_id: "ext-1", status: "ftd" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const pollRes = await pollBrokerStatuses(broker.id);
    expect(pollRes.updated).toBe(1);
    const freshLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(freshLead.state).toBe("FTD");

    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        kind: "BROKER_PUSH_SUCCESS",
        meta: { httpStatus: 200, durationMs: 100 } as object,
      },
    });
    const errs = await aggregateBrokerErrors({
      brokerId: broker.id,
      from: new Date(Date.now() - 3600_000),
      to: new Date(Date.now() + 3600_000),
    });
    expect(errs.total_pushes).toBeGreaterThanOrEqual(1);
    expect(computeSla(errs).error_rate_alert).toBe(false);
  });
});
