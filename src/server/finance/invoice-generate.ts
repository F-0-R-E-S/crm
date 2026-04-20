import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import {
	applyRule,
	resolveAffiliateRuleAt,
	resolveBrokerRuleAt,
} from "./payout-rule-resolver";

type Period = { start: Date; end: Date };

export type InvoiceLineItem = {
	conversionId: string;
	leadId: string;
	kind: "REGISTRATION" | "FTD" | "REDEPOSIT";
	amount: string; // raw deposit amount
	payoutAmount: string; // amount owed under the rule
	occurredAt: string;
};

export async function generateBrokerInvoice(brokerId: string, period: Period) {
	const conversions = await prisma.conversion.findMany({
		where: {
			occurredAt: { gte: period.start, lt: period.end },
			lead: { brokerId },
		},
	});

	const rules = await prisma.brokerPayoutRule.findMany({ where: { brokerId } });
	let total = new Prisma.Decimal(0);
	const lineItems: InvoiceLineItem[] = [];

	for (const c of conversions) {
		const rule = resolveBrokerRuleAt(rules, c.occurredAt);
		const payout = rule ? applyRule(rule, c.kind, c.amount) : new Prisma.Decimal(0);
		total = total.add(payout);
		lineItems.push({
			conversionId: c.id,
			leadId: c.leadId,
			kind: c.kind,
			amount: c.amount.toString(),
			payoutAmount: payout.toString(),
			occurredAt: c.occurredAt.toISOString(),
		});
	}

	// Add CRG shortfall as a line item if any settled cohorts in the period
	const shortfallCohorts = await prisma.cRGCohort.findMany({
		where: {
			brokerId,
			status: "SHORTFALL",
			cohortEnd: { gte: period.start, lt: period.end },
			shortfallAmount: { not: null },
		},
	});
	for (const sc of shortfallCohorts) {
		if (sc.shortfallAmount) {
			total = total.add(sc.shortfallAmount);
			lineItems.push({
				conversionId: `crg-cohort-${sc.id}`,
				leadId: "",
				kind: "FTD",
				amount: "0",
				payoutAmount: sc.shortfallAmount.toString(),
				occurredAt: sc.cohortEnd.toISOString(),
			});
		}
	}

	return prisma.brokerInvoice.upsert({
		where: {
			brokerId_periodStart_periodEnd: {
				brokerId,
				periodStart: period.start,
				periodEnd: period.end,
			},
		},
		update: {
			amount: total,
			lineItems: lineItems as unknown as Prisma.InputJsonValue,
		},
		create: {
			brokerId,
			periodStart: period.start,
			periodEnd: period.end,
			amount: total,
			currency: "USD",
			lineItems: lineItems as unknown as Prisma.InputJsonValue,
			status: "DRAFT",
		},
	});
}

export async function generateAffiliateInvoice(affiliateId: string, period: Period) {
	const conversions = await prisma.conversion.findMany({
		where: {
			occurredAt: { gte: period.start, lt: period.end },
			lead: { affiliateId },
		},
		include: { lead: { select: { brokerId: true } } },
	});

	const rules = await prisma.affiliatePayoutRule.findMany({ where: { affiliateId } });
	let total = new Prisma.Decimal(0);
	const lineItems: InvoiceLineItem[] = [];
	const brokerIdsSeen = new Set<string>();

	for (const c of conversions) {
		const brokerId = c.lead.brokerId;
		if (!brokerId) continue;
		brokerIdsSeen.add(brokerId);
		const rule = resolveAffiliateRuleAt(rules, brokerId, c.occurredAt);
		const payout = rule ? applyRule(rule, c.kind, c.amount) : new Prisma.Decimal(0);
		total = total.add(payout);
		lineItems.push({
			conversionId: c.id,
			leadId: c.leadId,
			kind: c.kind,
			amount: c.amount.toString(),
			payoutAmount: payout.toString(),
			occurredAt: c.occurredAt.toISOString(),
		});
	}

	// 1:1 linkage to a broker invoice: only set when exactly one broker is
	// represented and its invoice for the same period exists and is unlinked.
	let brokerInvoiceId: string | null = null;
	if (brokerIdsSeen.size === 1) {
		const [only] = [...brokerIdsSeen];
		const bi = await prisma.brokerInvoice.findUnique({
			where: {
				brokerId_periodStart_periodEnd: {
					brokerId: only,
					periodStart: period.start,
					periodEnd: period.end,
				},
			},
		});
		if (bi) {
			const existingLink = await prisma.affiliateInvoice.findUnique({
				where: { brokerInvoiceId: bi.id },
			});
			if (!existingLink) brokerInvoiceId = bi.id;
		}
	}

	return prisma.affiliateInvoice.upsert({
		where: {
			affiliateId_periodStart_periodEnd: {
				affiliateId,
				periodStart: period.start,
				periodEnd: period.end,
			},
		},
		update: {
			amount: total,
			lineItems: lineItems as unknown as Prisma.InputJsonValue,
			brokerInvoiceId,
		},
		create: {
			affiliateId,
			periodStart: period.start,
			periodEnd: period.end,
			amount: total,
			currency: "USD",
			lineItems: lineItems as unknown as Prisma.InputJsonValue,
			brokerInvoiceId,
			status: "DRAFT",
		},
	});
}
