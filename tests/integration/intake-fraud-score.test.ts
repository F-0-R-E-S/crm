import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { invalidateFraudPolicyCache } from "@/server/intake/fraud-policy-cache";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function req(body: object, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3000/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/v1/leads — fraud score (W2.1)", () => {
  const rawKey = `ak_frd_${"y".repeat(40)}`;
  let affId = "";

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    invalidateFraudPolicyCache();
    await prisma.fraudPolicy.upsert({
      where: { name: "global" },
      create: { name: "global" },
      update: {
        weightBlacklist: 40,
        weightGeoMismatch: 15,
        weightVoip: 20,
        weightDedupHit: 10,
        weightPatternHit: 15,
      },
    });
    const aff = await prisma.affiliate.create({ data: { name: "frd-aff" } });
    affId = aff.id;
    await prisma.apiKey.create({
      data: {
        affiliateId: affId,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "frd",
      },
    });
  });

  it("clean lead → score=0, no signals, FRAUD_SCORED event emitted", async () => {
    const r = await req(
      {
        external_lead_id: "frd-clean",
        first_name: "Clean",
        last_name: "L",
        email: "clean@example.com",
        phone: "+491701234501",
        geo: "DE",
        ip: "8.8.8.8",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(202);
    const body = await r.json();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.fraudScore).toBe(0);
    expect(lead.fraudSignals).toEqual([]);
    const events = await prisma.leadEvent.findMany({
      where: { leadId: lead.id, kind: "FRAUD_SCORED" },
    });
    expect(events).toHaveLength(1);
    expect(events[0].meta).toMatchObject({ score: 0 });
  });

  it("blacklisted IP → score=40, signal blacklist fired", async () => {
    await prisma.blacklist.create({
      data: { kind: "IP_EXACT", value: "6.6.6.6", reason: "test" },
    });
    const r = await req(
      {
        external_lead_id: "frd-bl",
        first_name: "Bl",
        last_name: "L",
        email: "bl@example.com",
        phone: "+491701234502",
        geo: "DE",
        ip: "6.6.6.6",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(202);
    const body = await r.json();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.fraudScore).toBe(40);
    expect(lead.state).toBe("REJECTED");
    expect(lead.rejectReason).toBe("ip_blocked");
    const signals = lead.fraudSignals as unknown as Array<{ kind: string; weight: number }>;
    expect(signals).toHaveLength(1);
    expect(signals[0].kind).toBe("blacklist");
    expect(signals[0].weight).toBe(40);
  });

  it("phone from foreign country → geo_mismatch signal (score=15)", async () => {
    // DE phone but geo=FR
    const r = await req(
      {
        external_lead_id: "frd-geo",
        first_name: "Gm",
        last_name: "L",
        email: "geo@example.com",
        phone: "+491701234503",
        geo: "FR",
        ip: "1.2.3.4",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(202);
    const body = await r.json();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.fraudScore).toBe(15);
    const signals = lead.fraudSignals as unknown as Array<{ kind: string; weight: number }>;
    expect(signals.map((s) => s.kind)).toEqual(["geo_mismatch"]);
  });

  it("blacklist + geo_mismatch → summed score=55", async () => {
    await prisma.blacklist.create({
      data: { kind: "EMAIL_DOMAIN", value: "spam.test", reason: "test" },
    });
    const r = await req(
      {
        external_lead_id: "frd-sum",
        first_name: "S",
        last_name: "L",
        email: "bad@spam.test",
        phone: "+491701234504",
        geo: "FR",
        ip: "1.2.3.5",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(202);
    const body = await r.json();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.fraudScore).toBe(55);
  });

  it("custom policy weights respected", async () => {
    await prisma.fraudPolicy.update({
      where: { name: "global" },
      data: { weightBlacklist: 77 },
    });
    invalidateFraudPolicyCache();
    await prisma.blacklist.create({
      data: { kind: "IP_EXACT", value: "9.9.9.9", reason: "test" },
    });
    const r = await req(
      {
        external_lead_id: "frd-pol",
        first_name: "P",
        last_name: "L",
        email: "p@example.com",
        phone: "+491701234505",
        geo: "DE",
        ip: "9.9.9.9",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    const body = await r.json();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.fraudScore).toBe(77);
  });
});
