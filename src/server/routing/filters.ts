export interface WorkingHours {
  tz: string;
  schedule: Array<{ day: number; from: string; to: string }>; // day 0-6 (sun-sat), "HH:MM"
}

export function isWithinWorkingHours(
  hours: WorkingHours | null | undefined,
  at: Date = new Date(),
): boolean {
  if (!hours || !hours.schedule?.length) return true;
  // simplified: evaluate in UTC for MVP; timezone-aware eval is v0.2
  const day = at.getUTCDay();
  const mins = at.getUTCHours() * 60 + at.getUTCMinutes();
  return hours.schedule.some((s) => {
    if (s.day !== day) return false;
    const [fh, fm] = s.from.split(":").map(Number);
    const [th, tm] = s.to.split(":").map(Number);
    return mins >= fh * 60 + fm && mins <= th * 60 + tm;
  });
}
