import { POST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { signPostback } from "../helpers/postback-signature";
import { seedBroker, seedLead } from "../helpers/seed";

describe("postback → conversion emission", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("emits an FTD conversion when canonical status is FTD", async () => {
    const broker = await seedBroker({
      statusMapping: { dep_1: "FTD" },
      postbackSecret: "s3cret",
      postbackLeadIdPath: "broker_lead_id",
      postbackStatusPath: "status",
    });
    const lead = await seedLead({ brokerId: broker.id, brokerExternalId: "brx-1" });

    const body = JSON.stringify({
      broker_lead_id: "brx-1",
      status: "dep_1",
      deposit_amount: "250.00",
    });
    const sig = signPostback(body, broker.postbackSecret);

    const req = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body,
    });
    await POST(req, { params: Promise.resolve({ brokerId: broker.id }) });

    const conv = await prisma.conversion.findFirst({
      where: { leadId: lead.id, kind: "FTD" },
    });
    expect(conv).not.toBeNull();
    expect(conv?.amount.toString()).toBe("250");
  });

  it("is idempotent on FTD re-post (no duplicate row)", async () => {
    const broker = await seedBroker({
      statusMapping: { dep_1: "FTD" },
      postbackSecret: "s3cret",
      postbackLeadIdPath: "broker_lead_id",
      postbackStatusPath: "status",
    });
    const lead = await seedLead({ brokerId: broker.id, brokerExternalId: "brx-2" });

    const body = JSON.stringify({
      broker_lead_id: "brx-2",
      status: "dep_1",
      deposit_amount: "100.00",
    });
    const sig = signPostback(body, broker.postbackSecret);
    const req1 = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body,
    });
    const req2 = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body,
    });
    await POST(req1, { params: Promise.resolve({ brokerId: broker.id }) });
    await POST(req2, { params: Promise.resolve({ brokerId: broker.id }) });

    const count = await prisma.conversion.count({
      where: { leadId: lead.id, kind: "FTD" },
    });
    expect(count).toBe(1);
  });

  it("allows multiple REDEPOSIT rows on the same lead", async () => {
    const broker = await seedBroker({
      statusMapping: { redep: "REDEPOSIT" },
      postbackSecret: "s3cret",
      postbackLeadIdPath: "broker_lead_id",
      postbackStatusPath: "status",
    });
    const lead = await seedLead({ brokerId: broker.id, brokerExternalId: "brx-3" });

    for (const amount of ["50.00", "75.00", "100.00"]) {
      const body = JSON.stringify({
        broker_lead_id: "brx-3",
        status: "redep",
        deposit_amount: amount,
      });
      const sig = signPostback(body, broker.postbackSecret);
      const req = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": sig },
        body,
      });
      await POST(req, { params: Promise.resolve({ brokerId: broker.id }) });
    }

    const count = await prisma.conversion.count({
      where: { leadId: lead.id, kind: "REDEPOSIT" },
    });
    expect(count).toBe(3);
  });
});
