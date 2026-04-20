import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const rawKey = `ak_im_${"x".repeat(40)}`;

async function req(body: object, idem: string) {
  return POST(
    new Request("http://localhost:3000/api/v1/leads", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${rawKey}`,
        "x-idempotency-key": idem,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("intake — idempotency mismatch", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "im" } });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "x",
      },
    });
  });

  const basePayload = () => ({
    geo: "UA",
    ip: "8.8.8.8",
    email: "fixed@b.com",
    event_ts: "2026-04-20T10:00:00.000Z",
  });

  it("тот же ключ, тот же payload → replayed response", async () => {
    const p = basePayload();
    const a = await req(p, "K1");
    const b = await req(p, "K1");
    const aB = await a.json();
    const bB = await b.json();
    expect(bB.lead_id).toBe(aB.lead_id);
  });

  it("тот же ключ, разный payload → 409 idempotency_mismatch", async () => {
    const a = await req(basePayload(), "K2");
    expect(a.status).toBe(202);
    const different = { ...basePayload(), email: "other@b.com" };
    const b = await req(different, "K2");
    expect(b.status).toBe(409);
    const body = await b.json();
    expect(body.error.code).toBe("idempotency_mismatch");
  });
});
