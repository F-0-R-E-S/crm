import { prisma } from "@/server/db";
import { emitTelegramEvent } from "@/server/telegram/emit";

export const JOB_NAME = "docs-staleness-report";

export async function handleDocsStalenessReport(): Promise<void> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const refused: Array<{ question: string; n: number | bigint }> = await prisma.$queryRaw`
    SELECT question, COUNT(*)::int AS n
    FROM "DocAskEvent"
    WHERE "createdAt" > ${since} AND refused = true
    GROUP BY question
    ORDER BY n DESC
    LIMIT 20
  `;
  if (!refused.length) return;

  await emitTelegramEvent("DOCS_STALENESS_REPORT", {
    windowDays: 7,
    topRefusedQuestions: refused.map((r) => ({ q: r.question, count: Number(r.n) })),
  });
}
