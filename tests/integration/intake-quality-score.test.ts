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

describe("intake — writes Q-Leads qualityScore", () => {
  const rawKey = `ak_quality_${"x".repeat(40)}`;

  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "qs-aff" } });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "q",
      },
    });
  });

  it("POST valid lead → Lead.qualityScore is 0..100 and qualitySignals has 3 components", async () => {
    const r = await req(
      {
        external_lead_id: "qs-1",
        first_name: "a",
        last_name: "b",
        email: "qs@example.com",
        phone: "+14155550199",
        geo: "US",
        ip: "8.8.8.8",
        event_ts: new Date().toISOString(),
      },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(202);
    const b = await r.json();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: b.lead_id } });
    expect(lead.qualityScore).not.toBeNull();
    expect(lead.qualityScore!).toBeGreaterThanOrEqual(0);
    expect(lead.qualityScore!).toBeLessThanOrEqual(100);
    const sig = lead.qualitySignals as unknown as Record<string, unknown>;
    expect(sig).toHaveProperty("fraudComponent");
    expect(sig).toHaveProperty("affiliateComponent");
    expect(sig).toHaveProperty("brokerGeoComponent");
    expect(typeof sig.fraudComponent).toBe("number");
    expect(typeof sig.affiliateComponent).toBe("number");
    expect(typeof sig.brokerGeoComponent).toBe("number");
  });
});
