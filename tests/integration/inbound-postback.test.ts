import { POST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { signHmac } from "@/server/postback/hmac";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function call(brokerId: string, body: object, sig: string) {
  return POST(
    new Request(`http://x/api/v1/postbacks/${brokerId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ brokerId }) },
  );
}

describe("POST /api/v1/postbacks/[brokerId]", () => {
  let brokerId = "";
  let leadId = "";
  const secret = "pb-secret";

  beforeEach(async () => {
    await resetDb();
    const aff = await prisma.affiliate.create({ data: { name: "pb-aff" } });
    const broker = await prisma.broker.create({
      data: {
        name: "pb-broker",
        endpointUrl: "http://x",
        fieldMapping: {},
        postbackSecret: secret,
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: { accepted: "ACCEPTED", ftd: "FTD" },
      },
    });
    brokerId = broker.id;
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "UA",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "pb-t",
        state: "PUSHED",
        brokerId,
        brokerExternalId: "ext-42",
      },
    });
    leadId = lead.id;
  });

  it("401 on bad signature", async () => {
    const r = await call(brokerId, { lead_id: "ext-42", status: "accepted" }, "badsig");
    expect(r.status).toBe(401);
  });

  it("flips to ACCEPTED on valid postback", async () => {
    const body = { lead_id: "ext-42", status: "accepted" };
    const sig = signHmac(secret, JSON.stringify(body));
    const r = await call(brokerId, body, sig);
    expect(r.status).toBe(200);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.state).toBe("ACCEPTED");
    expect(lead?.acceptedAt).not.toBeNull();
  });

  it("flips to FTD and sets ftdAt", async () => {
    const body = { lead_id: "ext-42", status: "ftd" };
    const sig = signHmac(secret, JSON.stringify(body));
    await call(brokerId, body, sig);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.state).toBe("FTD");
    expect(lead?.ftdAt).not.toBeNull();
  });

  it("unmapped status → DECLINED + LeadEvent unmapped=true", async () => {
    const body = { lead_id: "ext-42", status: "weird_status" };
    const sig = signHmac(secret, JSON.stringify(body));
    await call(brokerId, body, sig);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.state).toBe("DECLINED");
    const events = await prisma.leadEvent.findMany({
      where: { leadId, kind: "POSTBACK_RECEIVED" },
    });
    expect(events[0].meta).toMatchObject({ unmapped: true });
  });

  it("404 on unknown ext id", async () => {
    const body = { lead_id: "nope", status: "accepted" };
    const sig = signHmac(secret, JSON.stringify(body));
    const r = await call(brokerId, body, sig);
    expect(r.status).toBe(404);
  });
});
