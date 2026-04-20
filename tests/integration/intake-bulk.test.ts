import { createHash } from "node:crypto";
import { POST } from "@/app/api/v1/leads/bulk/route";
import { GET as getJob } from "@/app/api/v1/leads/bulk/[jobId]/route";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const rawKey = `ak_bulk_${"x".repeat(40)}`;

async function post(body: object, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3000/api/v1/leads/bulk", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${rawKey}`,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/v1/leads/bulk", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    const aff = await prisma.affiliate.create({ data: { name: "bk" } });
    await prisma.apiKey.create({
      data: { affiliateId: aff.id, keyHash: sha(rawKey), keyPrefix: rawKey.slice(0, 12), label: "x" },
    });
  });

  const mk = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      external_lead_id: `b-${i}`,
      geo: "UA",
      ip: "8.8.8.8",
      email: `bulk-${i}-${Math.random()}@x.com`,
      event_ts: new Date().toISOString(),
    }));

  it("10 items → 207 Multi-Status с per-item результатами", async () => {
    const r = await post({ leads: mk(10) });
    expect(r.status).toBe(207);
    const b = await r.json();
    expect(b.results).toHaveLength(10);
    expect(b.results[0].status_code).toBe(202);
    expect(b.results[0].lead_id).toBeTruthy();
  });

  it("101 items → 413 payload_too_large", async () => {
    const r = await post({ leads: mk(101) });
    expect(r.status).toBe(413);
  });

  it("частичный успех — смесь валидных и невалидных", async () => {
    const leads = [
      mk(1)[0],
      { geo: "UA", ip: "8.8.8.8", event_ts: new Date().toISOString() },
    ];
    const r = await post({ leads });
    expect(r.status).toBe(207);
    const b = await r.json();
    expect(b.results[0].status_code).toBe(202);
    expect(b.results[1].status_code).toBe(422);
  });

  it("GET /bulk/[jobId] возвращает queued|done с результатами", async () => {
    const create = await post({ leads: mk(60) });
    const { job_id } = await create.json();
    const r = await getJob(
      new Request(`http://localhost:3000/api/v1/leads/bulk/${job_id}`, {
        headers: { authorization: `Bearer ${rawKey}` },
      }),
      { params: Promise.resolve({ jobId: job_id }) },
    );
    expect([200, 202]).toContain(r.status);
    const b = await r.json();
    expect(["queued", "processing", "done", "failed"]).toContain(b.status);
  });
});
