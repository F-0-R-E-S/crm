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
