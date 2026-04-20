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

describe("POST /api/v1/leads — fraud auto-reject (W2.2)", () => {
  const rawKey = `ak_ar_${"z".repeat(41)}`;
  let affId = "";

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    invalidateFraudPolicyCache();
    const aff = await prisma.affiliate.create({ data: { name: "ar-aff" } });
    affId = aff.id;
    await prisma.apiKey.create({
      data: {
        affiliateId: affId,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "ar",
      },
    });
  });

  async function setPolicy(
    overrides: Partial<{
      weightBlacklist: number;
      weightGeoMismatch: number;
      weightVoip: number;
      weightDedupHit: number;
      weightPatternHit: number;
      autoRejectThreshold: number;
      borderlineMin: number;
    }>,
  ) {
    await prisma.fraudPolicy.upsert({
      where: { name: "global" },
      create: { name: "global", ...overrides },
      update: overrides,
    });
    invalidateFraudPolicyCache();
  }

  it("score >= threshold → REJECTED_FRAUD + reason_codes (no weights exposed)", async () => {
    // Boost geo_mismatch alone to cross threshold.
    await setPolicy({ weightGeoMismatch: 85, autoRejectThreshold: 80, borderlineMin: 60 });

    const r = await req(
      {
        external_lead_id: "ar-high",
        first_name: "H",
        last_name: "L",
        email: "high@example.com",
        phone: "+491701234777", // DE phone
        geo: "FR", // mismatch
        ip: "1.2.3.4",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(202);
    const body = await r.json();
    expect(body.status).toBe("rejected_fraud");
    expect(body.reject_reason).toBe("fraud_auto");
    expect(body.reason_codes).toEqual(["geo_mismatch"]);
    expect(JSON.stringify(body)).not.toMatch(/"weight"/);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.state).toBe("REJECTED_FRAUD");
    expect(lead.fraudScore).toBe(85);
    expect(lead.rejectReason).toBe("fraud_auto");
    expect(lead.needsReview).toBe(false);
  });

  it("borderline (min <= score < threshold) → NEW + needs_review=true", async () => {
    await setPolicy({ weightGeoMismatch: 65, autoRejectThreshold: 80, borderlineMin: 60 });

    const r = await req(
      {
        external_lead_id: "ar-bord",
        first_name: "B",
        last_name: "L",
        email: "b@example.com",
        phone: "+491701234778",
        geo: "FR",
        ip: "1.2.3.5",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    const body = await r.json();
    expect(body.status).toBe("received");
    expect(body.needs_review).toBe(true);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.state).toBe("NEW");
    expect(lead.needsReview).toBe(true);
    expect(lead.fraudScore).toBe(65);
  });

  it("score below borderline → NEW, needs_review=false", async () => {
    await setPolicy({ weightGeoMismatch: 15, autoRejectThreshold: 80, borderlineMin: 60 });
    const r = await req(
      {
        external_lead_id: "ar-clean",
        first_name: "C",
        last_name: "L",
        email: "c@example.com",
        phone: "+491701234781",
        geo: "FR", // mismatch still fires but weight 15
        ip: "1.2.3.6",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    const body = await r.json();
    expect(body.status).toBe("received");
    expect(body.needs_review).toBeUndefined();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.state).toBe("NEW");
    expect(lead.needsReview).toBe(false);
    expect(lead.fraudScore).toBe(15);
  });

  it("perfectly clean lead → score=0, NEW", async () => {
    await setPolicy({ autoRejectThreshold: 80, borderlineMin: 60 });
    const r = await req(
      {
        external_lead_id: "ar-zero",
        first_name: "Z",
        last_name: "L",
        email: "z@example.com",
        phone: "+491701234782",
        geo: "DE",
        ip: "1.2.3.7",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    const body = await r.json();
    expect(body.status).toBe("received");
    expect(body.needs_review).toBeUndefined();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.fraudScore).toBe(0);
    expect(lead.state).toBe("NEW");
  });

  it("auto-rejected lead skips push-lead routing (no BROKER_PUSH_ATTEMPT events)", async () => {
    await setPolicy({ weightGeoMismatch: 85, autoRejectThreshold: 80, borderlineMin: 60 });
    const r = await req(
      {
        external_lead_id: "ar-skip",
        first_name: "S",
        last_name: "L",
        email: "skip@example.com",
        phone: "+491701234783",
        geo: "FR",
        ip: "1.2.3.8",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    const body = await r.json();
    expect(body.status).toBe("rejected_fraud");
    const events = await prisma.leadEvent.findMany({
      where: { leadId: body.lead_id },
      select: { kind: true },
    });
    expect(events.some((e) => e.kind === "BROKER_PUSH_ATTEMPT")).toBe(false);
    expect(events.some((e) => e.kind === "FRAUD_SCORED")).toBe(true);
    expect(events.some((e) => e.kind === "REJECTED_ANTIFRAUD")).toBe(true);
  });

  it("blacklist hit retains hard-reject semantics (state=REJECTED, not REJECTED_FRAUD)", async () => {
    await setPolicy({ autoRejectThreshold: 80, borderlineMin: 60 });
    await prisma.blacklist.create({
      data: { kind: "IP_EXACT", value: "6.6.6.9", reason: "t" },
    });
    const r = await req(
      {
        external_lead_id: "ar-bl",
        first_name: "B",
        last_name: "L",
        email: "bl@example.com",
        phone: "+491701234785",
        geo: "DE",
        ip: "6.6.6.9",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    const body = await r.json();
    expect(body.status).toBe("rejected");
    expect(body.reject_reason).toBe("ip_blocked");
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    expect(lead.state).toBe("REJECTED");
    expect(lead.fraudScore).toBe(40); // score still computed
  });
});
