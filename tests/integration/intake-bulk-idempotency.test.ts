import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/bulk/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("bulk intake idempotency", () => {
  let apiKey: string;

  beforeEach(async () => {
    await resetDb();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    apiKey = `ak_${randomBytes(16).toString("hex")}`;
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha256(apiKey),
        keyPrefix: apiKey.slice(0, 12),
        label: "t",
      },
    });
  });

  function makeReq(idemKey: string, payload: unknown) {
    return new Request("http://localhost/api/v1/leads/bulk", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-api-version": "2026-01",
        "x-idempotency-key": idemKey,
      },
      body: JSON.stringify(payload),
    });
  }

  const payload = {
    leads: [
      {
        external_lead_id: "b1",
        first_name: "a",
        last_name: "b",
        email: "b1@t.io",
        phone: "+14155550199",
        geo: "US",
        ip: "203.0.113.5",
        event_ts: "2026-04-21T00:00:00.000Z",
      },
    ],
  };

  it("returns cached response for same key + same payload", async () => {
    const r1 = await POST(makeReq("k1", payload));
    const b1 = await r1.json();
    const r2 = await POST(makeReq("k1", payload));
    const b2 = await r2.json();
    expect(r2.status).toBe(r1.status);
    expect(b2).toEqual(b1);
    const leads = await prisma.lead.count();
    expect(leads).toBe(1);
  });

  it("returns 409 when same key is reused with a different payload", async () => {
    await POST(makeReq("k2", payload));
    const mutated = {
      leads: [{ ...payload.leads[0], email: "different@t.io" }],
    };
    const res = await POST(makeReq("k2", mutated));
    expect(res.status).toBe(409);
    const body = await res.json();
    const errMsg = body.error?.message ?? body.error ?? "";
    expect(String(errMsg)).toMatch(/idempotency/i);
  });
});
