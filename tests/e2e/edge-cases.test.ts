import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { POST as INTAKE } from "@/app/api/v1/leads/route";
import { handlePushLead } from "@/server/jobs/push-lead";
import { resetDb } from "../helpers/db";
import { startMockBroker, type MockBroker } from "../helpers/mock-broker";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function intake(rawKey: string, body: object) {
  return INTAKE(new Request("http://x/api/v1/leads", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
    body: JSON.stringify(body),
  }));
}

describe("E2E edge cases", () => {
  let mb: MockBroker;
  const rawKey = "ak_edge_" + "x".repeat(40);

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    mb = await startMockBroker();
    const aff = await prisma.affiliate.create({ data: { name: "edge-aff" } });
    await prisma.apiKey.create({ data: { affiliateId: aff.id, keyHash: sha(rawKey), keyPrefix: rawKey.slice(0, 12), label: "edge" } });
    const b = await prisma.broker.create({
      data: {
        name: "edge-broker",
        endpointUrl: `http://127.0.0.1:${mb.port}/push`,
        fieldMapping: {},
        postbackSecret: "s",
        postbackLeadIdPath: "id",
        postbackStatusPath: "status",
      },
    });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b.id, priority: 1 } });
  });
  afterAll(async () => { await mb.stop(); });

  it("duplicate lead is rejected", async () => {
    mb.respondWith(200, { id: "x1", status: "accepted" });
    const first = await (await intake(rawKey, { geo: "UA", ip: "1.1.1.1", email: "dup@x.com", phone: "0671234567", event_ts: new Date().toISOString() })).json();
    expect(first.status).toBe("received");
    const second = await (await intake(rawKey, { geo: "UA", ip: "1.1.1.1", email: "dup@x.com", phone: "0671234567", event_ts: new Date().toISOString() })).json();
    expect(second.status).toBe("rejected");
    expect(second.reject_reason).toBe("duplicate");
  });

  it("no broker available when all inactive", async () => {
    await prisma.broker.updateMany({ data: { isActive: false } });
    const r = await (await intake(rawKey, { geo: "UA", ip: "2.2.2.2", email: "nb@x.com", event_ts: new Date().toISOString() })).json();
    await handlePushLead({ leadId: r.lead_id, traceId: r.trace_id });
    const lead = await prisma.lead.findUnique({ where: { id: r.lead_id } });
    expect(lead?.state).toBe("FAILED");
    expect(lead?.rejectReason).toBe("no_broker_available");
  });

  it("affiliate cap rejects overflow", async () => {
    const aff = await prisma.affiliate.findFirstOrThrow();
    await prisma.affiliate.update({ where: { id: aff.id }, data: { totalDailyCap: 2 } });
    for (let i = 0; i < 2; i++) {
      await intake(rawKey, { geo: "UA", ip: `3.3.3.${i}`, email: `ok${i}@x.com`, event_ts: new Date().toISOString() });
    }
    const r = await (await intake(rawKey, { geo: "UA", ip: "3.3.3.99", email: "over@x.com", event_ts: new Date().toISOString() })).json();
    expect(r.reject_reason).toBe("affiliate_cap_full");
  });
});
