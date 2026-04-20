import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function req(body: object, headers: Record<string, string>) {
  return POST(
    new Request("http://localhost:3000/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("intake — X-API-Version", () => {
  const rawKey = `ak_ver_${"x".repeat(40)}`;
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "ver" } });
    await prisma.apiKey.create({
      data: { affiliateId: aff.id, keyHash: sha(rawKey), keyPrefix: rawKey.slice(0, 12), label: "x" },
    });
  });

  const payload = () => ({
    geo: "UA",
    ip: "8.8.8.8",
    email: `v-${Math.random()}@x.com`,
    event_ts: new Date().toISOString(),
  });

  it("default version (no header) → 202", async () => {
    const r = await req(payload(), { authorization: `Bearer ${rawKey}` });
    expect(r.status).toBe(202);
  });

  it("supported version 2026-01 → 202", async () => {
    const r = await req(payload(), {
      authorization: `Bearer ${rawKey}`,
      "x-api-version": "2026-01",
    });
    expect(r.status).toBe(202);
  });

  it("неизвестная версия → 400 unsupported_version", async () => {
    const r = await req(payload(), {
      authorization: `Bearer ${rawKey}`,
      "x-api-version": "1999-01",
    });
    expect(r.status).toBe(400);
    const b = await r.json();
    expect(b.error.code).toBe("unsupported_version");
  });

  it("strict-mode — неизвестное поле даёт 422 unknown_field", async () => {
    const r = await req(
      { ...payload(), completely_unknown_field: "xxx" },
      { authorization: `Bearer ${rawKey}` },
    );
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("unknown_field");
  });
});
