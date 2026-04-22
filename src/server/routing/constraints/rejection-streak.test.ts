import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { redis } from "@/server/redis";
import {
  bumpRejectionStreak,
  readRejectionStreak,
  resetRejectionStreak,
  shouldAutoPause,
} from "./rejection-streak";

describe("rejection streak", () => {
  beforeAll(async () => {
    // ioredis with enableOfflineQueue:false fails commands issued before
    // connect completes. Wait for a ping before any test runs.
    for (let i = 0; i < 20; i++) {
      try {
        await redis.ping();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error("redis never became ready");
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  it("bumps from 0 to 1 to 2 to 3", async () => {
    expect(await bumpRejectionStreak("b1", "v1")).toBe(1);
    expect(await bumpRejectionStreak("b1", "v1")).toBe(2);
    expect(await bumpRejectionStreak("b1", "v1")).toBe(3);
  });

  it("readRejectionStreak returns the current count without changing it", async () => {
    await bumpRejectionStreak("b1", "v1");
    await bumpRejectionStreak("b1", "v1");
    expect(await readRejectionStreak("b1", "v1")).toBe(2);
    expect(await readRejectionStreak("b1", "v1")).toBe(2);
  });

  it("reset clears the counter", async () => {
    await bumpRejectionStreak("b1", "v1");
    await bumpRejectionStreak("b1", "v1");
    await resetRejectionStreak("b1", "v1");
    expect(await readRejectionStreak("b1", "v1")).toBe(0);
  });

  it("is scoped per (brokerId, flowVersionId)", async () => {
    await bumpRejectionStreak("b1", "v1");
    await bumpRejectionStreak("b1", "v1");
    await bumpRejectionStreak("b2", "v1");
    await bumpRejectionStreak("b1", "v2");
    expect(await readRejectionStreak("b1", "v1")).toBe(2);
    expect(await readRejectionStreak("b2", "v1")).toBe(1);
    expect(await readRejectionStreak("b1", "v2")).toBe(1);
  });

  it("shouldAutoPause compares streak to threshold", () => {
    expect(shouldAutoPause(2, 3)).toBe(false);
    expect(shouldAutoPause(3, 3)).toBe(true);
    expect(shouldAutoPause(10, 3)).toBe(true);
    expect(shouldAutoPause(1, null)).toBe(false);
    expect(shouldAutoPause(100, undefined)).toBe(false);
  });
});
