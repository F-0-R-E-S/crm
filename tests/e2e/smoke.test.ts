import { createHash } from "node:crypto";
import { POST as INTAKE } from "@/app/api/v1/leads/route";
import { POST as POSTBACK } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { handleNotifyAffiliate } from "@/server/jobs/notify-affiliate";
import { handlePushLead } from "@/server/jobs/push-lead";
import { signHmac } from "@/server/postback/hmac";
import { redis } from "@/server/redis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { type MockTracker, startMockTracker } from "../helpers/mock-affiliate-tracker";
import { type MockBroker, startMockBroker } from "../helpers/mock-broker";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("E2E smoke — happy path", () => {
  let mb: MockBroker;
  let tr: MockTracker;
  const rawKey = `ak_e2e_${"x".repeat(40)}`;
  let brokerId = "";
  const brokerSecret = "e2e-broker-secret";

  beforeAll(async () => {
    await resetDb();
    await redis.flushdb();
    mb = await startMockBroker();
    tr = await startMockTracker();
    const aff = await prisma.affiliate.create({
      data: {
        name: "e2e-aff",
        postbackUrl: `http://127.0.0.1:${tr.port}/?click={sub_id}&s={status}`,
        postbackEvents: ["lead_pushed", "ftd"],
      },
    });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "e2e",
      },
    });
    const broker = await prisma.broker.create({
      data: {
        name: "e2e-broker",
        endpointUrl: `http://127.0.0.1:${mb.port}/push`,
        fieldMapping: {
          firstName: "first_name",
          lastName: "last_name",
          email: "email",
          phone: "phone",
          geo: "country",
        },
        postbackSecret: brokerSecret,
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: { accepted: "ACCEPTED", ftd: "FTD" },
        responseIdPath: "id",
      },
    });
    brokerId = broker.id;
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId, priority: 1 } });
  });
  afterAll(async () => {
    await mb.stop();
    await tr.stop();
  });

  it("intake → push → FTD via postback → outbound tracker", async () => {
    // 1. intake
    mb.respondWith(200, { id: "e2e-ext-1", status: "accepted" });
    const intakeRes = await INTAKE(
      new Request("http://x/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          geo: "UA",
          ip: "1.1.1.1",
          first_name: "E2E",
          email: "e2e@x.com",
          phone: "0671234567",
          sub_id: "sub-e2e",
          event_ts: new Date().toISOString(),
        }),
      }),
    );
    const body = await intakeRes.json();
    expect(intakeRes.status).toBe(202);
    expect(body.status).toBe("received");

    // 2. push-lead
    await handlePushLead({ leadId: body.lead_id, traceId: body.trace_id });
    let lead = await prisma.lead.findUnique({ where: { id: body.lead_id } });
    expect(lead?.state).toBe("PUSHED");
    expect(lead?.brokerExternalId).toBe("e2e-ext-1");

    // 3. outbound postback for lead_pushed
    await handleNotifyAffiliate({ leadId: body.lead_id, event: "lead_pushed" });
    expect(
      tr.hits.some((h) => h.url.includes("click=sub-e2e") && h.url.includes("s=lead_pushed")),
    ).toBe(true);

    // 4. inbound postback: FTD
    const pbBody = { lead_id: "e2e-ext-1", status: "ftd" };
    const pbSig = signHmac(brokerSecret, JSON.stringify(pbBody));
    const pbRes = await POSTBACK(
      new Request(`http://x/api/v1/postbacks/${brokerId}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": pbSig },
        body: JSON.stringify(pbBody),
      }),
      { params: Promise.resolve({ brokerId }) },
    );
    expect(pbRes.status).toBe(200);

    // 5. outbound postback for FTD
    await handleNotifyAffiliate({ leadId: body.lead_id, event: "ftd" });
    expect(tr.hits.some((h) => h.url.includes("s=ftd"))).toBe(true);

    lead = await prisma.lead.findUnique({ where: { id: body.lead_id } });
    expect(lead?.state).toBe("FTD");
    expect(lead?.ftdAt).not.toBeNull();
  });
});
