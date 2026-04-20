export const DEFAULT_RETRY_LADDER = [10, 60, 300, 900, 3600] as const;
const MAX_DELAY_SECONDS = 86_400;

export function parseRetrySchedule(raw: string | null | undefined): number[] {
  if (!raw) return [...DEFAULT_RETRY_LADDER];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.min(n, MAX_DELAY_SECONDS));
  return parts.length > 0 ? parts : [...DEFAULT_RETRY_LADDER];
}

export function nthRetryDelay(schedule: number[], attemptIndex: number): number | null {
  if (attemptIndex < 0 || attemptIndex >= schedule.length) return null;
  return schedule[attemptIndex];
}
