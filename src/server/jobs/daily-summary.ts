import { prisma } from "@/server/db";
import { emitTelegramEvent } from "@/server/telegram/emit";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

function startOfUtcDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export async function sendDailySummaries(now: Date = new Date()): Promise<void> {
  const today = startOfUtcDay(now);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const where = { createdAt: { gte: yesterday, lt: today } };
  const [total, pushed, accepted, declined, ftd, rejected] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, state: "PUSHED" } }),
    prisma.lead.count({ where: { ...where, state: "ACCEPTED" } }),
    prisma.lead.count({ where: { ...where, state: "DECLINED" } }),
    prisma.lead.count({ where: { ...where, state: "FTD" } }),
    prisma.lead.count({ where: { ...where, state: { in: ["REJECTED", "REJECTED_FRAUD"] } } }),
  ]);

  const dateStr = yesterday.toISOString().slice(0, 10);

  await emitTelegramEvent("DAILY_SUMMARY", {
    date: dateStr,
    total,
    pushed,
    accepted,
    declined,
    ftd,
    rejected,
  });

  const perAffiliate = await prisma.lead.groupBy({
    by: ["affiliateId"],
    where,
    _count: { _all: true },
  });
  const affiliateIds = perAffiliate.map((r) => r.affiliateId);
  const affiliates = await prisma.affiliate.findMany({
    where: { id: { in: affiliateIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(affiliates.map((a) => [a.id, a.name]));

  for (const row of perAffiliate) {
    await emitTelegramEvent(
      "AFFILIATE_DAILY_SUMMARY",
      {
        date: dateStr,
        affiliateId: row.affiliateId,
        affiliateName: byId.get(row.affiliateId) ?? row.affiliateId,
        count: row._count._all,
        intake: row._count._all,
      },
      { affiliateId: row.affiliateId },
    );
  }
}

export async function registerDailySummaryWorker() {
  await startBossOnce();
  const boss = getBoss();
  await boss.work(JOB_NAMES.dailySummary, async () => {
    await sendDailySummaries();
  });
  await boss.schedule(JOB_NAMES.dailySummary, "0 9 * * *", {});
}
