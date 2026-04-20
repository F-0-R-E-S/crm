import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const rawKey = `ak_dd_${"x".repeat(40)}`;

async function req(body: object) {
  return POST(
    new Request("http://localhost:3000/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
      body: JSON.stringify(body),
    }),
  );
}

describe("intake dedup — 409 shape + external_lead_id", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "dd" } });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "x",
      },
    });
  });

  it("повтор по external_lead_id → 409 duplicate_lead с existing_lead_id", async () => {
    const p = {
      external_lead_id: "EXT-42",
      geo: "UA",
      ip: "8.8.8.8",
      email: "a@a.com",
      event_ts: new Date().toISOString(),
    };
    const first = await req(p);
    expect(first.status).toBe(202);
    const firstBody = await first.json();

    const second = await req({ ...p, email: "b@a.com" });
    expect(second.status).toBe(409);
    const b = await second.json();
    expect(b.error.code).toBe("duplicate_lead");
    expect(b.error.existing_lead_id).toBe(firstBody.lead_id);
    expect(b.error.matched_by).toBe("external_lead_id");
    expect(b.error.first_seen_at).toBeTruthy();
  });
});
