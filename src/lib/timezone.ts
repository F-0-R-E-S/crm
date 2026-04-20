function partsInTz(d: Date, tz: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) if (p.type !== "literal") parts[p.type] = p.value;
  return parts;
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function dayOfWeekInTz(d: Date, tz: string): number {
  const p = partsInTz(d, tz);
  return WEEKDAYS[p.weekday] ?? 0;
}

export function minutesOfDayInTz(d: Date, tz: string): number {
  const p = partsInTz(d, tz);
  const h = Number.parseInt(p.hour, 10);
  const m = Number.parseInt(p.minute, 10);
  return h * 60 + m;
}

export function bucketHourKey(d: Date, tz: string): string {
  const p = partsInTz(d, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}`;
}

export function bucketDayKey(d: Date, tz: string): string {
  const p = partsInTz(d, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function bucketWeekKey(d: Date, tz: string): string {
  const p = partsInTz(d, tz);
  const date = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)));
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function nextHourBoundary(d: Date, tz: string): Date {
  const p = partsInTz(d, tz);
  const ms = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) + 1);
  return new Date(ms);
}

export function nextDayBoundary(d: Date, tz: string): Date {
  const p = partsInTz(d, tz);
  const ms = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1);
  return new Date(ms);
}
