import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { decrementCap, incrementCap, todayUtc } from "./caps";

describe("caps", () => {
  beforeEach(async () => {
    await prisma.dailyCap.deleteMany({});
  });

  it("increments from 0 to 1", async () => {
    const n = await incrementCap("AFFILIATE", "a1", todayUtc());
    expect(n).toBe(1);
  });

  it("increments sequentially", async () => {
    for (let i = 1; i <= 5; i++) {
      const n = await incrementCap("AFFILIATE", "a1", todayUtc());
      expect(n).toBe(i);
    }
  });

  it("decrements back", async () => {
    await incrementCap("BROKER", "b1", todayUtc());
    await incrementCap("BROKER", "b1", todayUtc());
    const n = await decrementCap("BROKER", "b1", todayUtc());
    expect(n).toBe(1);
  });
});
