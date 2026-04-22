import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../../tests/helpers/db";
import type { LeadSnapshot } from "../engine";
import type { PqlGate } from "../flow/model";
import { consumeCap, effectiveRejectedLimit, releaseCap, remainingCap } from "./caps";

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

  it("kind: PUSHED and REJECTED counters are isolated per bucket", async () => {
    const base = {
      scope: "BROKER" as const,
      scopeId: "bKind",
      window: "DAILY" as const,
      tz: "UTC",
      limit: 1,
    };
    const at = new Date("2026-04-20T10:00:00Z");
    const p = await consumeCap({ ...base, kind: "PUSHED", now: at });
    expect(p.ok).toBe(true);
    // Even though PUSHED is at its limit, REJECTED starts at 0 so it
    // can still count its own rejection.
    const r = await consumeCap({ ...base, kind: "REJECTED", now: at });
    expect(r.ok).toBe(true);
  });

  it("pqlScope: lead that misses the scope bypasses the cap (skipped)", async () => {
    const scope: PqlGate = {
      rules: [{ field: "geo", sign: "eq", value: "UA", caseSensitive: false }],
      logic: "AND",
    };
    const lead: LeadSnapshot = { id: "L1", affiliateId: "A1", geo: "PL" };
    const r = await consumeCap({
      scope: "BROKER",
      scopeId: "bScope",
      window: "DAILY",
      tz: "UTC",
      limit: 1,
      pqlScope: scope,
      lead,
      now: new Date("2026-04-20T10:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.skipped).toBe(true);
    // A subsequent matching lead should be counted normally and the
    // scoped bucket should be at 1/1.
    const hit = await consumeCap({
      scope: "BROKER",
      scopeId: "bScope",
      window: "DAILY",
      tz: "UTC",
      limit: 1,
      pqlScope: scope,
      lead: { id: "L2", affiliateId: "A1", geo: "UA" },
      now: new Date("2026-04-20T10:01:00Z"),
    });
    expect(hit.ok).toBe(true);
    if (hit.ok) expect(hit.skipped).toBeFalsy();
  });

  it("pqlScope: different scopes salt into separate buckets", async () => {
    const scopeA: PqlGate = {
      rules: [{ field: "geo", sign: "eq", value: "UA", caseSensitive: false }],
      logic: "AND",
    };
    const scopeB: PqlGate = {
      rules: [{ field: "geo", sign: "eq", value: "PL", caseSensitive: false }],
      logic: "AND",
    };
    const at = new Date("2026-04-20T10:00:00Z");
    const ua = await consumeCap({
      scope: "BROKER",
      scopeId: "bSalt",
      window: "DAILY",
      tz: "UTC",
      limit: 1,
      pqlScope: scopeA,
      lead: { id: "L1", affiliateId: "A1", geo: "UA" },
      now: at,
    });
    expect(ua.ok).toBe(true);
    // Same bare bucket key but different pqlScope → different salt →
    // PL cap is independent.
    const pl = await consumeCap({
      scope: "BROKER",
      scopeId: "bSalt",
      window: "DAILY",
      tz: "UTC",
      limit: 1,
      pqlScope: scopeB,
      lead: { id: "L2", affiliateId: "A1", geo: "PL" },
      now: at,
    });
    expect(pl.ok).toBe(true);
  });

  it("effectiveRejectedLimit handles absolute and percent forms", () => {
    expect(effectiveRejectedLimit(100, 20, false)).toBe(20);
    expect(effectiveRejectedLimit(100, 20, true)).toBe(20);
    expect(effectiveRejectedLimit(100, 25, true)).toBe(25);
    expect(effectiveRejectedLimit(200, 30, true)).toBe(60);
    expect(effectiveRejectedLimit(100, null, false)).toBeNull();
    expect(effectiveRejectedLimit(100, undefined, false)).toBeNull();
  });
});
