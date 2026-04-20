import { redis } from "@/server/redis";
import { selectWeighted } from "@/server/routing/algorithm/wrr";
import { beforeEach, describe, expect, it } from "vitest";

async function ensureRedisReady() {
  const status = redis.status as string;
  if (status === "ready") return;
  if (status === "end" || status === "close") {
    await redis.connect().catch(() => {});
  }
  if ((redis.status as string) !== "ready") {
    await new Promise<void>((resolve) => {
      const to = setTimeout(() => resolve(), 1000);
      redis.once("ready", () => {
        clearTimeout(to);
        resolve();
      });
    });
  }
}

describe("WRR excludes unavailable targets upstream", () => {
  beforeEach(async () => {
    await ensureRedisReady();
    await redis.flushdb();
  });

  it("при 50/50 и выключенном B — all to A", async () => {
    const active = [{ id: "A", weight: 50 }];
    const counts = { A: 0 };
    for (let i = 0; i < 500; i++) {
      const r = await selectWeighted("fv-1", active);
      counts[r.id as keyof typeof counts] += 1;
    }
    expect(counts.A).toBe(500);
  });
});
