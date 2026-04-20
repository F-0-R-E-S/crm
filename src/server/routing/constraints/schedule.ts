import { dayOfWeekInTz, minutesOfDayInTz } from "@/lib/timezone";

export interface ScheduleWindow {
  day: number;
  from: string;
  to: string;
}
export interface Schedule {
  tz: string;
  windows: ScheduleWindow[];
}
export type ScheduleResult = { ok: true } | { ok: false; reason: "outside_hours" };

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function evaluateSchedule(s: Schedule, at: Date = new Date()): ScheduleResult {
  if (!s.windows.length) return { ok: true };
  const day = dayOfWeekInTz(at, s.tz);
  const mins = minutesOfDayInTz(at, s.tz);
  const match = s.windows.some(
    (w) => w.day === day && mins >= toMin(w.from) && mins < toMin(w.to),
  );
  return match ? { ok: true } : { ok: false, reason: "outside_hours" };
}
