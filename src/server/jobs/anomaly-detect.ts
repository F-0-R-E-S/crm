import { prisma } from "@/server/db";
import { emitTelegramEvent } from "@/server/telegram/emit";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

export async function detectAnomalies(now: Date = new Date()): Promise<number> {
  const hourMs = 60 * 60 * 1000;
  const endOfCurrent = new Date(Math.floor(now.getTime() / hourMs) * hourMs);
  const startOfCurrent = new Date(endOfCurrent.getTime() - hourMs);
  const startOfPrev = new Date(startOfCurrent.getTime() - hourMs);
  const [prev, curr] = await Promise.all([
    prisma.lead.count({
      where: { createdAt: { gte: startOfPrev, lt: startOfCurrent } },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: startOfCurrent, lt: endOfCurrent } },
    }),
  ]);
  if (prev <= 10) return 0;
  const drop = (prev - curr) / prev;
  if (drop < 0.5) return 0;
  return emitTelegramEvent("ANOMALY_DETECTED", {
    metric: "intake_lead_count",
    priorHour: prev,
    currentHour: curr,
    dropPercent: Math.round(drop * 100),
    windowStart: startOfCurrent.toISOString(),
  });
}

export async function registerAnomalyDetectWorker() {
  await startBossOnce();
  const boss = getBoss();
  await boss.work(JOB_NAMES.anomalyDetect, async () => {
    await detectAnomalies();
  });
  await boss.schedule(JOB_NAMES.anomalyDetect, "*/15 * * * *", {});
}
