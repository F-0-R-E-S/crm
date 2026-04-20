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

  it("per-country — DE и UK не делят bucket при одном scopeId", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "bPC",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 2,
    };
    const at = new Date("2026-04-20T10:00:00Z");

    const de1 = await consumeCap({ ...base, country: "DE", now: at });
    const de2 = await consumeCap({ ...base, country: "DE", now: at });
    const deOver = await consumeCap({ ...base, country: "DE", now: at });
    expect(de1.ok && de2.ok).toBe(true);
    expect(deOver.ok).toBe(false);

    const uk1 = await consumeCap({ ...base, country: "UK", now: at });
    expect(uk1.ok).toBe(true);
    if (uk1.ok) expect(uk1.remaining).toBe(1);
  });

  it("per-country — release возвращает слот только в своей стране", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "bRel",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 1,
    };
    const at = new Date("2026-04-20T10:00:00Z");
    await consumeCap({ ...base, country: "DE", now: at });
    const over = await consumeCap({ ...base, country: "DE", now: at });
    expect(over.ok).toBe(false);

    await releaseCap({ ...base, country: "UK", now: at });
    const stillFull = await consumeCap({ ...base, country: "DE", now: at });
    expect(stillFull.ok).toBe(false);

    await releaseCap({ ...base, country: "DE", now: at });
    const afterRelease = await consumeCap({ ...base, country: "DE", now: at });
    expect(afterRelease.ok).toBe(true);
  });

  it("default country='' сохраняет back-compat с TOTAL-режимом", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "bBC",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 2,
    };
    const at = new Date("2026-04-20T10:00:00Z");
    const a = await consumeCap({ ...base, now: at });
    const b = await consumeCap({ ...base, now: at });
    const c = await consumeCap({ ...base, now: at });
    expect(a.ok && b.ok).toBe(true);
    expect(c.ok).toBe(false);
  });
});
