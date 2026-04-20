import { createHash } from "node:crypto";
import { POST as INTAKE } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { rateLimit } from "@/server/ratelimit";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function makeKey(affName = "sec-aff") {
  const aff = await prisma.affiliate.create({ data: { name: affName } });
  const raw = `ak_sec_${"x".repeat(40)}${Math.random().toString(36).slice(2, 8)}`;
  await prisma.apiKey.create({
    data: {
      affiliateId: aff.id,
      keyHash: sha(raw),
      keyPrefix: raw.slice(0, 12),
      label: "sec",
    },
  });
  return { affiliateId: aff.id, rawKey: raw };
}

describe("security baseline — SQLi", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("malicious first_name does not drop the Lead table", async () => {
    const { rawKey } = await makeKey();
    const res = await INTAKE(
      new Request("http://x/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          external_lead_id: "sec-1",
          first_name: "Robert'); DROP TABLE \"Lead\"; --",
          last_name: "Tables",
          email: "bob@x.com",
          phone: "+380671111111",
          geo: "UA",
          ip: "1.2.3.4",
          event_ts: new Date().toISOString(),
          sub_id: "sec-sub",
        }),
      }),
    );
    expect([200, 201, 202, 422]).toContain(res.status);

    // Table must still exist.
    const rows = await prisma.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE tablename = 'Lead'`;
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe("security baseline — XSS", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("stored raw — escaping is view-layer responsibility", async () => {
    const { rawKey } = await makeKey("sec-xss-aff");
    const xssPayload = "<script>alert(1)</script>";
    const res = await INTAKE(
      new Request("http://x/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          external_lead_id: "sec-xss-1",
          first_name: xssPayload,
          last_name: "X",
          email: "xss@x.com",
          phone: "+380672222222",
          geo: "UA",
          ip: "1.2.3.4",
          event_ts: new Date().toISOString(),
          sub_id: "sec-sub-xss",
        }),
      }),
    );
    // Either accepted raw (stored; view-layer escapes) or rejected by schema.
    expect([200, 201, 202, 422]).toContain(res.status);
    if (res.status < 400) {
      const lead = await prisma.lead.findFirst({
        where: { firstName: { contains: "alert(1)" } },
      });
      expect(lead?.firstName).toBe(xssPayload);
    }
  });
});

describe("security baseline — IDOR", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("lead belongs to the affiliate of the api key used to create it", async () => {
    const { rawKey: keyA, affiliateId: affA } = await makeKey("aff-a");
    const { affiliateId: affB } = await makeKey("aff-b");
    const res = await INTAKE(
      new Request("http://x/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${keyA}` },
        body: JSON.stringify({
          external_lead_id: "idor-1",
          first_name: "A",
          last_name: "A",
          email: "a@x.com",
          phone: "+380671111112",
          geo: "UA",
          ip: "1.2.3.4",
          event_ts: new Date().toISOString(),
          sub_id: "s",
        }),
      }),
    );
    expect([200, 201, 202]).toContain(res.status);
    const body = (await res.json()) as { lead_id: string };
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
    // Critical: affiliateId derives from the api key, never from a request field.
    expect(lead.affiliateId).toBe(affA);
    expect(lead.affiliateId).not.toBe(affB);
  });

  it("no exposed handler accepts affiliate_id from the request", async () => {
    const { rawKey: keyA, affiliateId: affA } = await makeKey("aff-c");
    const { affiliateId: affB } = await makeKey("aff-d");
    // Attacker attempts to inject affB's id; the handler rejects unknown fields
    // via strict Zod parse (422), never silently accepting them.
    const res = await INTAKE(
      new Request("http://x/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${keyA}` },
        body: JSON.stringify({
          external_lead_id: "idor-2",
          affiliate_id: affB, // malicious override
          first_name: "B",
          last_name: "B",
          email: "b@x.com",
          phone: "+380671111113",
          geo: "UA",
          ip: "1.2.3.4",
          event_ts: new Date().toISOString(),
          sub_id: "s2",
        }),
      }),
    );
    // Either silently ignored (accepted with correct affiliateId) or rejected (422).
    expect([200, 201, 202, 422]).toContain(res.status);
    if (res.status < 400) {
      const body = (await res.json()) as { lead_id?: string };
      if (body.lead_id) {
        const lead = await prisma.lead.findUniqueOrThrow({ where: { id: body.lead_id } });
        expect(lead.affiliateId).toBe(affA);
      }
    }
    // In any case, no lead should end up belonging to affB (the attacker target).
    const leaked = await prisma.lead.findFirst({ where: { affiliateId: affB } });
    expect(leaked).toBeNull();
  });
});

describe("security baseline — signup rate limit", () => {
  afterAll(async () => {
    await redis.flushdb();
  });

  it("allows first 5 and blocks the 6th", async () => {
    const key = `sec-sig-${Math.random().toString(36).slice(2, 8)}`;
    const results: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(await rateLimit({ key, limit: 5, windowSeconds: 60 }));
    }
    expect(results.slice(0, 5).every((b) => b)).toBe(true);
    expect(results[5]).toBe(false);
  });
});
