import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { getIntakeSettings, invalidateCache, updateIntakeSettings } from "./settings";

describe("intake settings", () => {
  beforeEach(async () => {
    await resetDb();
    invalidateCache();
  });

  it("getIntakeSettings возвращает defaults если ещё не задано", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "s" } });
    const s = await getIntakeSettings(aff.id);
    expect(s.dedupeWindowDays).toBe(30);
    expect(s.maxRpm).toBe(120);
    expect(s.requiredFields).toEqual([]);
  });

  it("updateIntakeSettings валидирует max_rpm 10-2000", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "v" } });
    await expect(updateIntakeSettings(aff.id, { maxRpm: 5 }, "user-1")).rejects.toThrow(
      /max_rpm/,
    );
    await expect(updateIntakeSettings(aff.id, { maxRpm: 3000 }, "user-1")).rejects.toThrow(
      /max_rpm/,
    );
    const ok = await updateIntakeSettings(aff.id, { maxRpm: 500 }, "user-1");
    expect(ok.maxRpm).toBe(500);
  });

  it("updateIntakeSettings валидирует dedupe_window_days 1-90", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "d" } });
    await expect(updateIntakeSettings(aff.id, { dedupeWindowDays: 0 }, "u")).rejects.toThrow();
    await expect(updateIntakeSettings(aff.id, { dedupeWindowDays: 91 }, "u")).rejects.toThrow();
  });
});
