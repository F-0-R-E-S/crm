import { prisma } from "@/server/db";

export interface TimeToFirstLeadMetrics {
  count: number;
  medianSeconds: number;
  p90Seconds: number;
}

export function computeTimeToFirstLead(samples: number[]): TimeToFirstLeadMetrics {
  if (samples.length === 0) {
    return { count: 0, medianSeconds: 0, p90Seconds: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  let median: number;
  if (n % 2 === 0) {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  } else {
    median = sorted[Math.floor(n / 2)];
  }
  const p90Index = Math.min(n - 1, Math.floor(n * 0.9));
  const p90 = sorted[p90Index];
  return {
    count: n,
    medianSeconds: Math.round(median),
    p90Seconds: Math.round(p90),
  };
}

export async function getTimeToFirstLeadLast30Days(): Promise<TimeToFirstLeadMetrics> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.onboardingProgress.findMany({
    where: {
      completedAt: { not: null, gte: cutoff },
      durationSeconds: { not: null },
    },
    select: { durationSeconds: true },
  });
  const samples = rows
    .map((r) => r.durationSeconds)
    .filter((n): n is number => typeof n === "number");
  return computeTimeToFirstLead(samples);
}
