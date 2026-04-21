import { POST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { signHmac } from "@/server/postback/hmac";
import { invalidateStatusMappingCache } from "@/server/status-groups/classify";
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

async function seedCanonical(
  code: string,
  category: "NEW" | "QUALIFIED" | "REJECTED" | "CONVERTED",
) {
  return prisma.canonicalStatus.upsert({
    where: { code },
    update: {},
    create: { code, label: code, category, sortOrder: 100 },
  });
}

describe("postback → canonicalStatus denormalization (EPIC-18)", () => {
  let brokerId = "";
  const secret = "pb-can-secret";

  beforeEach(async () => {
    await resetDb();
    invalidateStatusMappingCache();
    const aff = await prisma.affiliate.create({ data: { name: "pb-can-aff" } });
    const broker = await prisma.broker.create({
      data: {
        name: "pb-can-broker",
        endpointUrl: "http://x",
        fieldMapping: {},
        postbackSecret: secret,
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: { accepted: "ACCEPTED", declined: "DECLINED", ftd: "FTD" },
      },
    });
    brokerId = broker.id;
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "DE",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "pb-can-t1",
        state: "PUSHED",
        brokerId,
        brokerExternalId: "ext-can-1",
      },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "DE",
        ip: "1.1.1.1",
        eventTs: new Date(),
        traceId: "pb-can-t2",
        state: "PUSHED",
        brokerId,
        brokerExternalId: "ext-can-2",
      },
    });
  });

  it("sets both lastBrokerStatus AND canonicalStatus when mapped", async () => {
    const canon = await seedCanonical("ftd", "CONVERTED");
    await prisma.statusMapping.create({
      data: { brokerId, rawStatus: "ftd", canonicalStatusId: canon.id },
    });
    invalidateStatusMappingCache(brokerId);

    const body = { lead_id: "ext-can-1", status: "ftd" };
    const sig = signHmac(secret, JSON.stringify(body));
    const r = await call(brokerId, body, sig);
    expect(r.status).toBe(200);

    const lead = await prisma.lead.findFirstOrThrow({
      where: { brokerId, brokerExternalId: "ext-can-1" },
    });
    expect(lead.lastBrokerStatus).toBe("ftd");
    expect(lead.canonicalStatus).toBe("ftd");
    expect(lead.state).toBe("FTD");
  });

  it("sets canonicalStatus='unmapped' when raw has no mapping", async () => {
    // No mapping seeded → unmapped
    const body = { lead_id: "ext-can-2", status: "accepted" };
    const sig = signHmac(secret, JSON.stringify(body));
    const r = await call(brokerId, body, sig);
    expect(r.status).toBe(200);

    const lead = await prisma.lead.findFirstOrThrow({
      where: { brokerId, brokerExternalId: "ext-can-2" },
    });
    expect(lead.lastBrokerStatus).toBe("accepted");
    expect(lead.canonicalStatus).toBe("unmapped");
    expect(lead.state).toBe("ACCEPTED");
  });
});
