import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../tests/helpers/db";
import { consumeCap, releaseCap, remainingCap } from "./caps";

describe("caps v2", () => {
  beforeEach(async () => {
    await resetDb();
    await redis.flushdb();
  });

  it("daily — INCR с limit=3 принимает 3 и отклоняет 4-й", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "b1",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 3,
    };
    for (let i = 1; i <= 3; i++) {
      const r = await consumeCap({ ...base, now: new Date("2026-04-20T10:00:00Z") });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.remaining).toBe(3 - i);
    }
    const over = await consumeCap({ ...base, now: new Date("2026-04-20T10:00:00Z") });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toBe("cap_exhausted");
  });

  it("hourly — сброс в начале нового часа", async () => {
    const base = {
      scope: "TARGET" as const,
      scopeId: "t1",
      window: "HOURLY" as const,
      tz: "UTC",
      limit: 2,
    };
    await consumeCap({ ...base, now: new Date("2026-04-20T10:30:00Z") });
    await consumeCap({ ...base, now: new Date("2026-04-20T10:59:00Z") });
    const over = await consumeCap({ ...base, now: new Date("2026-04-20T10:59:30Z") });
    expect(over.ok).toBe(false);
    const fresh = await consumeCap({ ...base, now: new Date("2026-04-20T11:00:00Z") });
    expect(fresh.ok).toBe(true);
  });

  it("releaseCap возвращает слот", async () => {
    const base = {
      scope: "FLOW" as const,
      scopeId: "f1",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 2,
    };
    await consumeCap({ ...base, now: new Date("2026-04-20T10:00:00Z") });
    await consumeCap({ ...base, now: new Date("2026-04-20T10:01:00Z") });
    const over = await consumeCap({ ...base, now: new Date("2026-04-20T10:02:00Z") });
    expect(over.ok).toBe(false);
    await releaseCap({ ...base, now: new Date("2026-04-20T10:02:00Z") });
    const afterRelease = await consumeCap({ ...base, now: new Date("2026-04-20T10:02:00Z") });
    expect(afterRelease.ok).toBe(true);
  });

  it("remainingCap returns used+remaining", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "bx",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 1000,
    };
    for (let i = 0; i < 20; i++)
      await consumeCap({ ...base, now: new Date("2026-04-20T10:00:00Z") });
    const r = await remainingCap({ ...base, now: new Date("2026-04-20T10:00:00Z") });
    expect(r.used).toBe(20);
    expect(r.remaining).toBe(980);
  });
});
