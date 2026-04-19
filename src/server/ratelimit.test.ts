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
});
