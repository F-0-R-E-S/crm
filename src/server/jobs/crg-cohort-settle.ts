import { ensureCohortsUpTo, settleCohortsBefore } from "@/server/finance/crg-settle";

export async function runCrgCohortSettle(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 3600_000);
  await ensureCohortsUpTo(now);
  const results = await settleCohortsBefore(cutoff);
  return results;
}
