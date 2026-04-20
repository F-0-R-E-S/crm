import { describe, expect, it } from "vitest";
import { type Schedule, evaluateSchedule } from "./schedule";

const schedule: Schedule = {
  tz: "Europe/Moscow",
  windows: [
    { day: 1, from: "09:00", to: "18:00" },
    { day: 2, from: "09:00", to: "18:00" },
  ],
};

describe("evaluateSchedule", () => {
  it("Mon 12:00 MSK — ok", () => {
    const at = new Date("2026-04-20T09:00:00Z");
    expect(evaluateSchedule(schedule, at).ok).toBe(true);
  });

  it("Mon 08:00 MSK — outside_hours", () => {
    const at = new Date("2026-04-20T05:00:00Z");
    const r = evaluateSchedule(schedule, at);
    expect(r.ok).toBe(false);
  });

  it("Sunday — outside_hours (нет window для dow=0)", () => {
    const at = new Date("2026-04-19T10:00:00Z");
    expect(evaluateSchedule(schedule, at).ok).toBe(false);
  });

  it("DST boundary America/New_York — рабочее окно с 09:00 EDT", () => {
    const edt: Schedule = {
      tz: "America/New_York",
      windows: [{ day: 2, from: "09:00", to: "17:00" }],
    };
    const pre = new Date("2026-03-10T12:00:00Z");
    const post = new Date("2026-03-10T13:00:00Z");
    expect(evaluateSchedule(edt, pre).ok).toBe(false);
    expect(evaluateSchedule(edt, post).ok).toBe(true);
  });

  it("empty windows — always ok", () => {
    expect(evaluateSchedule({ tz: "UTC", windows: [] }).ok).toBe(true);
  });
});
