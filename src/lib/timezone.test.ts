import { describe, expect, it } from "vitest";
import {
  bucketDayKey,
  bucketHourKey,
  bucketWeekKey,
  dayOfWeekInTz,
  minutesOfDayInTz,
} from "./timezone";

describe("timezone helpers", () => {
  it("dayOfWeekInTz — воскресенье UTC может быть пн в Sydney", () => {
    const sunUtc = new Date("2026-04-19T18:00:00Z");
    expect(dayOfWeekInTz(sunUtc, "UTC")).toBe(0);
    expect(dayOfWeekInTz(sunUtc, "Australia/Sydney")).toBe(1);
  });

  it("minutesOfDayInTz учитывает смещение DST (New_York)", () => {
    const minsEst = minutesOfDayInTz(new Date("2026-01-15T07:30:00Z"), "America/New_York");
    const minsEdt = minutesOfDayInTz(new Date("2026-06-15T07:30:00Z"), "America/New_York");
    expect(minsEst).not.toBe(minsEdt);
  });

  it("bucketHourKey — формат YYYY-MM-DDTHH", () => {
    expect(bucketHourKey(new Date("2026-04-20T14:15:30Z"), "UTC")).toBe("2026-04-20T14");
  });

  it("bucketDayKey — YYYY-MM-DD в указанной tz", () => {
    expect(bucketDayKey(new Date("2026-04-19T23:00:00Z"), "Europe/Moscow")).toBe("2026-04-20");
  });

  it("bucketWeekKey — ISO week YYYY-Www", () => {
    expect(bucketWeekKey(new Date("2026-04-20T10:00:00Z"), "UTC")).toMatch(/^2026-W\d{2}$/);
  });
});
