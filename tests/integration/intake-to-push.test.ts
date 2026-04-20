import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { handlePushLead } from "@/server/jobs/push-lead";
import { JOB_NAMES, startBossOnce } from "@/server/jobs/queue";
import { redis } from "@/server/redis";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { type MockBroker, startMockBroker } from "../helpers/mock-broker";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("intake → worker", () => {
  let mb: MockBroker;
  const rawKey = "ak_flow_" + "x".repeat(40);

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    mb = await startMockBroker();
    const aff = await prisma.affiliate.create({ data: { name: "flow-aff" } });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "f",
      },
    });
    const broker = await prisma.broker.create({
      data: {
        name: "flow-broker",
        endpointUrl: `http://127.0.0.1:${mb.port}/push`,
        fieldMapping: { firstName: "first_name" },
        postbackSecret: "s",
        postbackLeadIdPath: "id",
        postbackStatusPath: "status",
        responseIdPath: "id",
      },
    });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: broker.id, priority: 1 } });
  });
  afterEach(() => mb.stop());
  afterAll(async () => {
    const boss = await startBossOnce();
    await boss.stop({ graceful: true, timeout: 1000 });
  });

  it("end-to-end PUSHED state", async () => {
    mb.respondWith(200, { id: "e2e-ext-1", status: "accepted" });
    const res = await POST(
      new Request("http://x/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          geo: "UA",
          ip: "1.1.1.1",
          first_name: "E2E",
          email: "e2e@x.com",
          event_ts: new Date().toISOString(),
        }),
      }),
    );
    const body = await res.json();
    expect(body.status).toBe("received");
    // worker not running in test; invoke handler directly
    await handlePushLead({ leadId: body.lead_id, traceId: body.trace_id });
    const lead = await prisma.lead.findUnique({ where: { id: body.lead_id } });
    expect(lead?.state).toBe("PUSHED");
    expect(lead?.brokerExternalId).toBe("e2e-ext-1");
  });
});
