import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { Prisma } from "@prisma/client";

export interface RollupRange {
  from: Date;
  to: Date;
}

/** Emit UTC-midnight timestamps for every day that intersects [from, to). */
function enumerateUtcDays(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < to) {
    out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Emit UTC on-the-hour timestamps for every hour that intersects [from, to). */
function enumerateUtcHours(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setUTCMinutes(0, 0, 0);
  while (cursor < to) {
    out.push(new Date(cursor));
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return out;
}

/**
 * Refresh daily rollups for every UTC day that intersects [from, to).
 * Idempotent: one ON CONFLICT DO UPDATE statement per day.
 */
export async function refreshDailyRollups({ from, to }: RollupRange): Promise<void> {
  const days = enumerateUtcDays(from, to);
  for (const dayStart of days) {
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    await prisma.$executeRaw(Prisma.sql`
			INSERT INTO "LeadDailyRoll" (
				id, date, "affiliateId", "brokerId", geo, "canonicalStatus",
				"totalReceived", "totalValidated", "totalRejected",
				"totalPushed", "totalAccepted", "totalDeclined", "totalFtd",
				"sumRevenue", "updatedAt"
			)
			SELECT
				gen_random_uuid()::text,
				date_trunc('day', "receivedAt"),
				"affiliateId",
				COALESCE("brokerId", '__none__'),
				geo,
				COALESCE("canonicalStatus", '__none__'),
				COUNT(*)::int,
				SUM(CASE WHEN state::text <> 'REJECTED' AND state::text <> 'REJECTED_FRAUD' THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text = 'REJECTED' OR state::text = 'REJECTED_FRAUD' THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text IN ('PUSHED','ACCEPTED','DECLINED','FTD') THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text IN ('ACCEPTED','FTD') THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text = 'DECLINED' THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text = 'FTD' THEN 1 ELSE 0 END)::int,
				0,
				NOW()
			FROM "Lead"
			WHERE "receivedAt" >= ${dayStart} AND "receivedAt" < ${dayEnd}
			GROUP BY 2, "affiliateId", COALESCE("brokerId", '__none__'), geo, COALESCE("canonicalStatus", '__none__')
			ON CONFLICT (date, "affiliateId", "brokerId", geo, "canonicalStatus") DO UPDATE SET
				"totalReceived"  = EXCLUDED."totalReceived",
				"totalValidated" = EXCLUDED."totalValidated",
				"totalRejected"  = EXCLUDED."totalRejected",
				"totalPushed"    = EXCLUDED."totalPushed",
				"totalAccepted"  = EXCLUDED."totalAccepted",
				"totalDeclined"  = EXCLUDED."totalDeclined",
				"totalFtd"       = EXCLUDED."totalFtd",
				"sumRevenue"     = EXCLUDED."sumRevenue",
				"updatedAt"      = NOW();
		`);
    logger.debug({ event: "rollup_daily", day: dayStart.toISOString() });
  }
}

/** Refresh hourly rollups for every UTC hour that intersects [from, to). */
export async function refreshHourlyRollups({ from, to }: RollupRange): Promise<void> {
  const hours = enumerateUtcHours(from, to);
  for (const hourStart of hours) {
    const hourEnd = new Date(hourStart);
    hourEnd.setUTCHours(hourEnd.getUTCHours() + 1);
    await prisma.$executeRaw(Prisma.sql`
			INSERT INTO "LeadHourlyRoll" (
				id, hour, "affiliateId", "brokerId", geo,
				"totalReceived", "totalValidated", "totalRejected",
				"totalPushed", "totalAccepted", "totalDeclined", "totalFtd",
				"sumRevenue", "updatedAt"
			)
			SELECT
				gen_random_uuid()::text,
				date_trunc('hour', "receivedAt"),
				"affiliateId",
				COALESCE("brokerId", '__none__'),
				geo,
				COUNT(*)::int,
				SUM(CASE WHEN state::text <> 'REJECTED' AND state::text <> 'REJECTED_FRAUD' THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text = 'REJECTED' OR state::text = 'REJECTED_FRAUD' THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text IN ('PUSHED','ACCEPTED','DECLINED','FTD') THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text IN ('ACCEPTED','FTD') THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text = 'DECLINED' THEN 1 ELSE 0 END)::int,
				SUM(CASE WHEN state::text = 'FTD' THEN 1 ELSE 0 END)::int,
				0,
				NOW()
			FROM "Lead"
			WHERE "receivedAt" >= ${hourStart} AND "receivedAt" < ${hourEnd}
			GROUP BY 2, "affiliateId", COALESCE("brokerId", '__none__'), geo
			ON CONFLICT (hour, "affiliateId", "brokerId", geo) DO UPDATE SET
				"totalReceived"  = EXCLUDED."totalReceived",
				"totalValidated" = EXCLUDED."totalValidated",
				"totalRejected"  = EXCLUDED."totalRejected",
				"totalPushed"    = EXCLUDED."totalPushed",
				"totalAccepted"  = EXCLUDED."totalAccepted",
				"totalDeclined" = EXCLUDED."totalDeclined",
				"totalFtd"       = EXCLUDED."totalFtd",
				"sumRevenue"     = EXCLUDED."sumRevenue",
				"updatedAt"      = NOW();
		`);
    logger.debug({ event: "rollup_hourly", hour: hourStart.toISOString() });
  }
}
