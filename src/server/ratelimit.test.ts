import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit } from "./ratelimit";
import { redis } from "./redis";

describe("rate limiter", () => {
  beforeAll(async () => {
    if (redis.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          redis.off("error", onError);
          resolve();
        };
        const onError = (err: Error) => {
          redis.off("ready", onReady);
          reject(err);
        };
        redis.once("ready", onReady);
        redis.once("error", onError);
      });
    }
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  it("allows requests within burst", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await checkRateLimit("k:test", { capacity: 30, refillPerSec: 2 });
      expect(res.allowed).toBe(true);
    }
  });

  it("blocks once bucket is drained", async () => {
    for (let i = 0; i < 30; i++) await checkRateLimit("k:test2", { capacity: 30, refillPerSec: 2 });
    const res = await checkRateLimit("k:test2", { capacity: 30, refillPerSec: 2 });
    expect(res.allowed).toBe(false);
    expect(res.retryAfterSec).toBeGreaterThan(0);
  });

  it("refills over time", async () => {
    // capacity=2, refill=2/sec → drain + wait 600ms should grant 1 token back
    for (let i = 0; i < 2; i++) await checkRateLimit("k:refill", { capacity: 2, refillPerSec: 2 });
    const drained = await checkRateLimit("k:refill", { capacity: 2, refillPerSec: 2 });
    expect(drained.allowed).toBe(false);
    // Wait 1.1s — at 2 tokens/sec, bucket should refill by >= 2 tokens
    await new Promise((r) => setTimeout(r, 1100));
    const refilled = await checkRateLimit("k:refill", { capacity: 2, refillPerSec: 2 });
    expect(refilled.allowed).toBe(true);
  });
});
