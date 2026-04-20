import { createHash } from "node:crypto";
import { GET as getErrors } from "@/app/api/v1/errors/route";
import { POST as postLead } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("sandbox mode", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("sandbox key + mode=sandbox → 202, детерминированный outcome по external_lead_id", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "sb" } });
    const rawKey = `ak_sb_${"x".repeat(40)}`;
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "sb",
        isSandbox: true,
      },
    });
    const r = await postLead(
      new Request("http://localhost:3000/api/v1/leads?mode=sandbox", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${rawKey}`,
        },
        body: JSON.stringify({
          external_lead_id: "ACCEPT-1",
          geo: "UA",
          ip: "8.8.8.8",
          email: "a@a.com",
          event_ts: new Date().toISOString(),
        }),
      }),
    );
    expect(r.status).toBe(202);
    const b = await r.json();
    expect(b.status).toBe("received");
    expect(b.sandbox).toBe(true);
    expect(b.mock_outcome).toBe("ACCEPTED");
    const count = await prisma.lead.count();
    expect(count).toBe(0);
  });

  it("production key + ?mode=sandbox → 403", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "p" } });
    const rawKey = `ak_pp_${"x".repeat(40)}`;
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "p",
        isSandbox: false,
      },
    });
    const r = await postLead(
      new Request("http://localhost:3000/api/v1/leads?mode=sandbox", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${rawKey}`,
        },
        body: JSON.stringify({
          geo: "UA",
          ip: "8.8.8.8",
          email: "a@a.com",
          event_ts: new Date().toISOString(),
        }),
      }),
    );
    expect(r.status).toBe(403);
  });

  it("GET /api/v1/errors — каталог с error_code", async () => {
    const r = await getErrors();
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(
      b.errors.find((e: { error_code: string }) => e.error_code === "duplicate_lead"),
    ).toBeTruthy();
    expect(
      b.errors.find((e: { error_code: string }) => e.error_code === "geo_not_allowed"),
    ).toBeTruthy();
  });
});
