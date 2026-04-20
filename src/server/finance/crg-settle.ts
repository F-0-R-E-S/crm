import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

/**
 * Policy: cohort = calendar week of accepted leads per broker.
 * Cohort settlement window: 30 days after `cohortEnd`.
 *
 * For each broker with an active CPA_CRG payout rule:
 * - Compute total accepted leads in the cohort window (cohortSize).
 * - Compute FTD count within the settlement window (ftdCount).
 * - ftdRate = ftdCount / cohortSize.
 * - If ftdRate < guaranteedRate → SHORTFALL, compute shortfallAmount =
 *   (guaranteedRate - ftdRate) * cohortSize * cpaAmount
 *   (i.e. the broker undercharged for leads whose implied quality they
 *   guaranteed; we clawback the difference).
 * - Otherwise MET.
 */
export async function settleCohortsBefore(cutoffEnd: Date) {
	const pending = await prisma.cRGCohort.findMany({
		where: { status: "PENDING", cohortEnd: { lte: cutoffEnd } },
	});

	const results: {
		cohortId: string;
		status: "MET" | "SHORTFALL";
		shortfallAmount: string;
	}[] = [];

	for (const cohort of pending) {
		const ftdCount = await prisma.conversion.count({
			where: {
				kind: "FTD",
				occurredAt: {
					gte: cohort.cohortStart,
					lt: new Date(cohort.cohortEnd.getTime() + 30 * 24 * 3600_000),
				},
				lead: { brokerId: cohort.brokerId },
			},
		});

		const ftdRate =
			cohort.cohortSize > 0
				? new Prisma.Decimal(ftdCount).div(cohort.cohortSize)
				: new Prisma.Decimal(0);

		const guaranteed = cohort.guaranteedRate ?? new Prisma.Decimal(0);
		const status: "MET" | "SHORTFALL" = ftdRate.gte(guaranteed) ? "MET" : "SHORTFALL";

		let shortfallAmount: Prisma.Decimal = new Prisma.Decimal(0);
		if (status === "SHORTFALL") {
			const activeRule = await prisma.brokerPayoutRule.findFirst({
				where: {
					brokerId: cohort.brokerId,
					kind: "CPA_CRG",
					activeFrom: { lte: cohort.cohortStart },
					OR: [{ activeTo: null }, { activeTo: { gt: cohort.cohortEnd } }],
				},
			});
			const cpa = activeRule?.cpaAmount ?? new Prisma.Decimal(0);
			// Shortfall = (guaranteed - actual) * cohortSize * cpa
			shortfallAmount = guaranteed.sub(ftdRate).mul(cohort.cohortSize).mul(cpa);
		}

		await prisma.cRGCohort.update({
			where: { id: cohort.id },
			data: {
				ftdCount,
				ftdRate,
				status,
				shortfallAmount: status === "SHORTFALL" ? shortfallAmount : null,
				settledAt: new Date(),
			},
		});

		results.push({
			cohortId: cohort.id,
			status,
			shortfallAmount: shortfallAmount.toString(),
		});
	}

	return results;
}

/**
 * Create PENDING cohorts for each broker with a CPA_CRG rule whose
 * cohort window has passed but no cohort row exists yet.
 * Cohort window: Monday 00:00 UTC → following Monday 00:00 UTC.
 */
export async function ensureCohortsUpTo(cutoffEnd: Date) {
	const crgBrokers = await prisma.brokerPayoutRule.findMany({
		where: { kind: "CPA_CRG", activeFrom: { lte: cutoffEnd } },
		select: { brokerId: true, crgRate: true, activeFrom: true, activeTo: true },
	});

	for (const rule of crgBrokers) {
		let cursor = startOfWeekUTC(rule.activeFrom);
		const stopAt =
			rule.activeTo && rule.activeTo < cutoffEnd ? rule.activeTo : cutoffEnd;
		while (cursor < stopAt) {
			const cohortEnd = new Date(cursor.getTime() + 7 * 24 * 3600_000);
			const exists = await prisma.cRGCohort.findUnique({
				where: {
					brokerId_cohortStart_cohortEnd: {
						brokerId: rule.brokerId,
						cohortStart: cursor,
						cohortEnd,
					},
				},
			});
			if (!exists) {
				const cohortSize = await prisma.lead.count({
					where: {
						brokerId: rule.brokerId,
						acceptedAt: { gte: cursor, lt: cohortEnd },
					},
				});
				await prisma.cRGCohort.create({
					data: {
						brokerId: rule.brokerId,
						cohortStart: cursor,
						cohortEnd,
						cohortSize,
						guaranteedRate: rule.crgRate,
						status: "PENDING",
					},
				});
			}
			cursor = cohortEnd;
		}
	}
}

function startOfWeekUTC(d: Date): Date {
	const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	const wd = new Date(ms).getUTCDay(); // 0 = Sun
	const shift = (wd + 6) % 7; // Monday = 0
	return new Date(ms - shift * 24 * 3600_000);
}
