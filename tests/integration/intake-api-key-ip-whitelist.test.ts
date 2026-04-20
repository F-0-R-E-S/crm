import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function mkKey(allowedIps: string[]) {
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
      allowedIps,
    },
  });
  return key;
}

function mkReq(key: string, ip: string) {
  return new Request("http://localhost/api/v1/leads", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "x-api-version": "2026-01",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      external_lead_id: "x1",
      first_name: "a",
      last_name: "b",
      email: "x1@t.io",
      phone: "+14155550199",
      geo: "US",
      ip: "203.0.113.5",
      event_ts: "2026-04-21T00:00:00.000Z",
    }),
  });
}

describe("api-key IP whitelist", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("allows request when allowedIps is empty", async () => {
    const k = await mkKey([]);
    const res = await POST(mkReq(k, "203.0.113.5"));
    // auth passes — body-level outcomes may vary
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("allows request when client IP is in allowedIps (exact)", async () => {
    const k = await mkKey(["203.0.113.5"]);
    const res = await POST(mkReq(k, "203.0.113.5"));
    expect(res.status).not.toBe(403);
  });

  it("rejects 403 when client IP is not in allowedIps", async () => {
    const k = await mkKey(["203.0.113.5"]);
    const res = await POST(mkReq(k, "198.51.100.7"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code ?? "").toBe("ip_not_allowed");
  });

  it("allows request when client IP falls inside a CIDR block", async () => {
    const k = await mkKey(["10.0.0.0/8"]);
    const res = await POST(mkReq(k, "10.1.2.3"));
    expect(res.status).not.toBe(403);
  });
});
