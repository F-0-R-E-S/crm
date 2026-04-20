import { createHash } from "node:crypto";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const sendMock = vi.fn().mockResolvedValue("job-id");

vi.mock("@/server/jobs/queue", async (orig) => {
  const actual = (await orig()) as typeof import("@/server/jobs/queue");
  return {
    ...actual,
    startBossOnce: async () => ({ send: sendMock }),
    getBoss: () => ({ send: sendMock }),
  };
});

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("intake route → telegram NEW_LEAD emission", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
    sendMock.mockClear();
  });

  it("enqueues a telegram-send job with eventType NEW_LEAD on successful intake", async () => {
    // Seed an affiliate subscriber
    const user = await prisma.user.create({
      data: { email: `u${Date.now()}@t.local`, passwordHash: "x", role: "OPERATOR" },
    });
    await prisma.telegramSubscription.create({
      data: { userId: user.id, chatId: "c1", isActive: true, eventTypes: ["NEW_LEAD"] },
    });
    const aff = await prisma.affiliate.create({ data: { name: "A" } });
    const key = `ak_tg_${"x".repeat(40)}`;
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha(key),
        keyPrefix: key.slice(0, 12),
        label: "l",
      },
    });

    const { POST } = await import("@/app/api/v1/leads/route");
    const res = await POST(
      new Request("http://localhost:3000/api/v1/leads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          email: "x@y.com",
          phone: "+14155550199",
          geo: "US",
          ip: "1.2.3.4",
          event_ts: new Date().toISOString(),
          external_lead_id: "ex-1",
        }),
      }),
    );
    expect(res.status).toBe(202);

    const tgCalls = sendMock.mock.calls.filter(
      (c) => c[0] === "telegram-send",
    );
    expect(tgCalls.length).toBeGreaterThanOrEqual(1);
    expect(tgCalls[0][1].eventType).toBe("NEW_LEAD");
  });
});
