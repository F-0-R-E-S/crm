import { redis } from "@/server/redis";
import { beforeEach, describe, expect, it } from "vitest";
import { resetWrrCursor, selectWeighted } from "./wrr";

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

describe("weighted round-robin (statistical)", () => {
  beforeEach(async () => {
    await ensureRedisReady();
    await redis.flushdb();
  });

  it("respects weights ±5% on 10k iterations (70/20/10)", async () => {
    const targets = [
      { id: "a", weight: 70 },
      { id: "b", weight: 20 },
      { id: "c", weight: 10 },
    ];
    await resetWrrCursor("flow-test-1");
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 10_000; i++) {
      const { id } = await selectWeighted("flow-test-1", targets);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts.a / 10_000).toBeGreaterThan(0.65);
    expect(counts.a / 10_000).toBeLessThan(0.75);
    expect(counts.b / 10_000).toBeGreaterThan(0.15);
    expect(counts.b / 10_000).toBeLessThan(0.25);
    expect(counts.c / 10_000).toBeGreaterThan(0.05);
    expect(counts.c / 10_000).toBeLessThan(0.15);
  }, 20_000);

  it("single-target fallback", async () => {
    const r = await selectWeighted("flow-single", [{ id: "only", weight: 500 }]);
    expect(r.id).toBe("only");
  });

  it("throws if empty targets", async () => {
    await expect(selectWeighted("flow-empty", [])).rejects.toThrow(/no_targets/);
  });

  it("throws if weight < 1", async () => {
    await expect(selectWeighted("flow-bad", [{ id: "a", weight: 0 }])).rejects.toThrow(
      /invalid_weight/,
    );
  });
});
