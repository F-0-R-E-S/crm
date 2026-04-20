import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("intake hardening — payload size + injection", () => {
  const rawKey = `ak_hard_${"x".repeat(40)}`;
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "hard-aff" } });
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(rawKey),
        keyPrefix: rawKey.slice(0, 12),
        label: "x",
      },
    });
  });

  it("413 when body exceeds INTAKE_MAX_PAYLOAD_BYTES", async () => {
    const big = "x".repeat(70 * 1024);
    const r = await POST(
      new Request("http://localhost:3000/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          geo: "UA",
          ip: "8.8.8.8",
          email: "a@a.com",
          event_ts: new Date().toISOString(),
          sub_id: big.slice(0, 128),
          utm: { blob: big },
        }),
      }),
    );
    expect(r.status).toBe(413);
    const b = await r.json();
    expect(b.error.code).toBe("payload_too_large");
    expect(b.error.trace_id).toBeTruthy();
  });

  it("422 on SQL/script injection in first_name", async () => {
    const r = await POST(
      new Request("http://localhost:3000/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          geo: "UA",
          ip: "8.8.8.8",
          email: "a@a.com",
          first_name: "<script>alert(1)</script>",
          event_ts: new Date().toISOString(),
        }),
      }),
    );
    expect(r.status).toBe(422);
    const b = await r.json();
    expect(b.error.code).toBe("validation_error");
    expect(b.error.field).toBe("first_name");
  });
});
