import {
  COUNTER_NAMES,
  incrCounter,
  readAll,
  readCounter,
} from "@/server/metrics/rolling-counters";
import { redis } from "@/server/redis";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("rolling counters", () => {
  beforeAll(async () => {
    // Wait for ioredis connection before the first command (enableOfflineQueue: false).
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
        // Resolve fast if already connecting.
        setTimeout(() => resolve(), 2000).unref?.();
      });
    }
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  it("incr and read within the window", async () => {
    await incrCounter("t-foo", 5);
    expect(await readCounter("t-foo")).toBe(5);
  });

  it("readAll returns zero for unknown counters", async () => {
    const all = await readAll(["nope-a", "nope-b"]);
    expect(all["nope-a"]).toBe(0);
    expect(all["nope-b"]).toBe(0);
  });

  it("GC'd when all members fall out of the window", async () => {
    const k = "metrics:rolling:t-gc";
    // Insert with a score far in the past so read's zremrangebyscore wipes it.
    await redis.zadd(k, 100, "old-1");
    await redis.zadd(k, 101, "old-2");
    expect(await readCounter("t-gc")).toBe(0);
    // After the read, the key is empty.
    expect(await redis.zcard(k)).toBe(0);
  });

  it("all counter names exposed", () => {
    expect(Object.values(COUNTER_NAMES)).toContain("leads_received");
    expect(Object.values(COUNTER_NAMES)).toContain("leads_pushed");
    expect(Object.values(COUNTER_NAMES)).toContain("fraud_hit");
  });
});
