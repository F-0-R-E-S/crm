import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function mkKey(expiresAt: Date | null) {
  const aff = await prisma.affiliate.create({
    data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
  });
  const key = `ak_${randomBytes(16).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      affiliateId: aff.id,
      keyHash: sha256(key),
      keyPrefix: key.slice(0, 12),
      label: "t",
      expiresAt,
    },
  });
  return key;
}

function mkReq(key: string) {
  return new Request("http://localhost/api/v1/leads", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "x-api-version": "2026-01",
    },
    body: JSON.stringify({
      external_lead_id: "e1",
      first_name: "a",
      last_name: "b",
      email: "e1@t.io",
      phone: "+14155550199",
      geo: "US",
      ip: "203.0.113.5",
      event_ts: "2026-04-21T00:00:00.000Z",
    }),
  });
}

describe("api-key expiry", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("accepts when expiresAt is null", async () => {
    const k = await mkKey(null);
    const res = await POST(mkReq(k));
    expect(res.status).not.toBe(401);
  });

  it("accepts when expiresAt is in the future", async () => {
    const k = await mkKey(new Date(Date.now() + 60_000));
    const res = await POST(mkReq(k));
    expect(res.status).not.toBe(401);
  });

  it("rejects 401 when expiresAt is in the past", async () => {
    const k = await mkKey(new Date(Date.now() - 60_000));
    const res = await POST(mkReq(k));
    expect(res.status).toBe(401);
  });
});
