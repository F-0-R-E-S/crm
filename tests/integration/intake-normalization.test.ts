import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const rawKey = `ak_n_${"x".repeat(40)}`;

async function req(body: object) {
  return POST(
    new Request("http://localhost:3000/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
      body: JSON.stringify(body),
    }),
  );
}

describe("intake normalization", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "nrm" } });
    await prisma.apiKey.create({
      data: { affiliateId: aff.id, keyHash: sha(rawKey), keyPrefix: rawKey.slice(0, 12), label: "x" },
    });
  });

  it("UK → GB, lead стор хранит rawPayload", async () => {
    const r = await req({
      geo: "UK",
      ip: "8.8.8.8",
      email: "A@B.com",
      event_ts: new Date().toISOString(),
    });
    expect(r.status).toBe(202);
    const lead = await prisma.lead.findFirst();
    expect(lead?.geo).toBe("GB");
    const raw = lead?.rawPayload as Record<string, string>;
    expect(raw.geo).toBe("UK");
    expect(raw.email).toBe("A@B.com");
  });

  it("ZZ unknown → 422 geo_unknown", async () => {
    const r = await req({
      geo: "ZZ",
      ip: "8.8.8.8",
      email: "a@b.com",
      event_ts: new Date().toISOString(),
    });
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("geo_unknown");
  });
});
