import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
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

describe("POST /api/v1/leads — auth & rate limit", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("401 without Authorization", async () => {
    const r = await req({
      geo: "XX",
      ip: "1.1.1.1",
      email: "a@a.com",
      event_ts: new Date().toISOString(),
    });
    expect(r.status).toBe(401);
    const body = await r.json();
    expect(body.error.code).toBe("unauthorized");
  });

  it("401 with bogus key", async () => {
    const r = await req({}, { authorization: "Bearer bogus" });
    expect(r.status).toBe(401);
  });

  it("accepts with valid key (validation error because payload is empty)", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "aff" } });
    const key = `ak_valid_${"x".repeat(40)}`;
    await prisma.apiKey.create({
      data: { affiliateId: aff.id, keyHash: sha(key), keyPrefix: key.slice(0, 12), label: "l" },
    });
    const r = await req({}, { authorization: `Bearer ${key}` });
    expect(r.status).toBe(422);
  });
});

describe("POST /api/v1/leads — full pipeline", () => {
  const rawKey = `ak_full_${"x".repeat(40)}`;
  let affId = "";

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "intake-aff", totalDailyCap: 3 } });
    affId = aff.id;
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "x",
      },
    });
  });

  const randPhone = () => `067${Math.floor(1000000 + Math.random() * 8999999)}`;
  const payload = () => ({
    geo: "UA",
    ip: "8.8.8.8",
    email: `lead-${Math.random()}@ok.com`,
    phone: randPhone(),
    event_ts: new Date().toISOString(),
  });

  it("accepts valid lead with 202 + status=received", async () => {
    const r = await req(payload(), { authorization: `Bearer ${rawKey}` });
    expect(r.status).toBe(202);
    const b = await r.json();
    expect(b.status).toBe("received");
    expect(b.lead_id).toBeTruthy();
  });

  it("rejects duplicate as status=rejected reason=duplicate", async () => {
    const p = { ...payload(), email: "dup@ok.com" };
    const first = await req(p, { authorization: `Bearer ${rawKey}` });
    expect(first.status).toBe(202);
    const second = await req(p, { authorization: `Bearer ${rawKey}` });
    const b = await second.json();
    expect(b.status).toBe("rejected");
    expect(b.reject_reason).toBe("duplicate");
  });

  it("rejects when IP blacklisted", async () => {
    await prisma.blacklist.create({ data: { kind: "IP_EXACT", value: "8.8.8.8" } });
    const r = await req(payload(), { authorization: `Bearer ${rawKey}` });
    const b = await r.json();
    expect(b.reject_reason).toBe("ip_blocked");
  });

  it("rejects when affiliate cap hit", async () => {
    for (let i = 0; i < 3; i++)
      await req({ ...payload(), email: `u${i}@ok.com` }, { authorization: `Bearer ${rawKey}` });
    const r = await req(
      { ...payload(), email: "over@ok.com" },
      { authorization: `Bearer ${rawKey}` },
    );
    const b = await r.json();
    expect(b.reject_reason).toBe("affiliate_cap_full");
  });

  it("returns cached body on repeat idempotency key", async () => {
    const key = "idem-123";
    const p = { ...payload(), email: "idem@ok.com" };
    const first = await req(p, { authorization: `Bearer ${rawKey}`, "x-idempotency-key": key });
    const firstBody = await first.json();
    const second = await req(
      { ...p, email: "different@ok.com" },
      { authorization: `Bearer ${rawKey}`, "x-idempotency-key": key },
    );
    const secondBody = await second.json();
    expect(secondBody.lead_id).toBe(firstBody.lead_id);
  });
});
