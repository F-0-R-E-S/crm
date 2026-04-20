import { POST as postbackPOST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { handlePushLead } from "@/server/jobs/push-lead";
import { handleResolvePendingHold } from "@/server/jobs/resolve-pending-hold";
import { signHmac } from "@/server/postback/hmac";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { type MockBroker, startMockBroker } from "../helpers/mock-broker";

async function setup(opts: { pendingHoldMinutes: number | null }) {
  const mb = await startMockBroker();
  const aff = await prisma.affiliate.create({ data: { name: "ph-aff" } });
  const broker = await prisma.broker.create({
    data: {
      name: "ph-broker",
      endpointUrl: `http://127.0.0.1:${mb.port}/push`,
      fieldMapping: { firstName: "first_name", geo: "country" },
      postbackSecret: "ph-sec",
      postbackLeadIdPath: "id",
      postbackStatusPath: "status",
      responseIdPath: "id",
      statusMapping: { accepted: "ACCEPTED", declined: "DECLINED", ftd: "FTD" },
      pendingHoldMinutes: opts.pendingHoldMinutes,
    },
  });
  await prisma.rotationRule.create({ data: { geo: "DE", brokerId: broker.id, priority: 1 } });
  const lead = await prisma.lead.create({
    data: {
      affiliateId: aff.id,
      firstName: "X",
      geo: "DE",
      ip: "1.1.1.1",
      eventTs: new Date(),
      traceId: `ph-${Math.random()}`,
    },
  });
  mb.respondWith(200, { id: "ext-ph-1", status: "accepted" });
  return { mb, leadId: lead.id, brokerId: broker.id };
}

async function sendPostback(
  brokerId: string,
  body: { id: string; status: string },
  secret = "ph-sec",
) {
  const raw = JSON.stringify(body);
  const sig = signHmac(secret, raw);
  return postbackPOST(
    new Request(`http://x/api/v1/postbacks/${brokerId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body: raw,
    }),
    { params: Promise.resolve({ brokerId }) },
  );
}

describe("pending hold end-to-end", () => {
  let mb: MockBroker | null = null;
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(async () => {
    if (mb) {
      await mb.stop();
      mb = null;
    }
  });

  it("broker без hold — лид сразу PUSHED, ACCEPTED при postback", async () => {
    const s = await setup({ pendingHoldMinutes: null });
    mb = s.mb;

    await handlePushLead({ leadId: s.leadId, traceId: "ph-t1" });
    const pushed = await prisma.lead.findUnique({ where: { id: s.leadId } });
    expect(pushed?.state).toBe("PUSHED");
    expect(pushed?.pendingHoldUntil).toBeNull();

    const body = { id: "ext-ph-1", status: "accepted" };
    const r = await sendPostback(s.brokerId, body);
    expect(r.status).toBe(200);
    const after = await prisma.lead.findUnique({ where: { id: s.leadId } });
    expect(after?.state).toBe("ACCEPTED");
    expect(after?.shaveSuspected).toBe(false);
  });

  it("broker с hold=5min — лид PENDING_HOLD, resolver переводит в ACCEPTED", async () => {
    const s = await setup({ pendingHoldMinutes: 5 });
    mb = s.mb;

    await handlePushLead({ leadId: s.leadId, traceId: "ph-t2" });
    const mid = await prisma.lead.findUnique({ where: { id: s.leadId } });
    expect(mid?.state).toBe("PENDING_HOLD");
    expect(mid?.pendingHoldUntil).not.toBeNull();

    const startedEvent = await prisma.leadEvent.findMany({
      where: { leadId: s.leadId, kind: "PENDING_HOLD_STARTED" },
    });
    expect(startedEvent).toHaveLength(1);

    await handleResolvePendingHold({ leadId: s.leadId });
    const after = await prisma.lead.findUnique({ where: { id: s.leadId } });
    expect(after?.state).toBe("ACCEPTED");
    expect(after?.shaveSuspected).toBe(false);
    expect(after?.pendingHoldUntil).toBeNull();
    const released = await prisma.leadEvent.findMany({
      where: { leadId: s.leadId, kind: "PENDING_HOLD_RELEASED" },
    });
    expect(released).toHaveLength(1);
  });

  it("broker с hold=5min + DECLINED postback — shaveSuspected=true, state=DECLINED", async () => {
    const s = await setup({ pendingHoldMinutes: 5 });
    mb = s.mb;

    await handlePushLead({ leadId: s.leadId, traceId: "ph-t3" });
    const mid = await prisma.lead.findUnique({ where: { id: s.leadId } });
    expect(mid?.state).toBe("PENDING_HOLD");

    const body = { id: "ext-ph-1", status: "declined" };
    const r = await sendPostback(s.brokerId, body);
    expect(r.status).toBe(200);

    const after = await prisma.lead.findUnique({ where: { id: s.leadId } });
    expect(after?.state).toBe("DECLINED");
    expect(after?.shaveSuspected).toBe(true);
    expect(after?.pendingHoldUntil).toBeNull();
    const shave = await prisma.leadEvent.findMany({
      where: { leadId: s.leadId, kind: "SHAVE_SUSPECTED" },
    });
    expect(shave).toHaveLength(1);
  });
});
