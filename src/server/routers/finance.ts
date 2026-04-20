import { prisma } from "@/server/db";
import {
	generateAffiliateInvoice,
	generateBrokerInvoice,
} from "@/server/finance/invoice-generate";
import { computePnL } from "@/server/finance/pnl";
import { protectedProcedure, router } from "@/server/trpc";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const pnlParams = z.object({
	from: z.coerce.date(),
	to: z.coerce.date(),
	affiliateId: z.string().optional(),
	brokerId: z.string().optional(),
	geo: z.string().length(2).optional(),
});

const payoutKind = z.enum(["CPA_FIXED", "CPA_CRG", "REV_SHARE", "HYBRID"]);

const brokerRuleInput = z.object({
	id: z.string().optional(),
	brokerId: z.string(),
	kind: payoutKind,
	cpaAmount: z.string().optional(),
	crgRate: z.string().optional(),
	revShareRate: z.string().optional(),
	minQualifiedDeposit: z.string().optional(),
	activeFrom: z.coerce.date(),
	activeTo: z.coerce.date().optional(),
});

const affiliateRuleInput = z.object({
	id: z.string().optional(),
	affiliateId: z.string(),
	brokerId: z.string().nullable().optional(),
	kind: payoutKind,
	cpaAmount: z.string().optional(),
	crgRate: z.string().optional(),
	revShareRate: z.string().optional(),
	activeFrom: z.coerce.date(),
	activeTo: z.coerce.date().optional(),
});

type StringMoney = string | undefined;
const toDec = (v: StringMoney) =>
	v === undefined || v === "" ? null : new Prisma.Decimal(v);

export const financeRouter = router({
	pnl: protectedProcedure.input(pnlParams).query(async ({ input }) => {
		const r = await computePnL(input);
		return {
			revenue: r.revenue.toString(),
			payout: r.payout.toString(),
			margin: r.margin.toString(),
			marginPct: r.marginPct,
			conversionCount: r.conversionCount,
			breakdown: r.breakdown,
		};
	}),

	listBrokerPayoutRules: protectedProcedure
		.input(z.object({ brokerId: z.string() }))
		.query(({ input }) =>
			prisma.brokerPayoutRule.findMany({
				where: { brokerId: input.brokerId },
				orderBy: { activeFrom: "desc" },
			}),
		),

	upsertBrokerPayoutRule: protectedProcedure
		.input(brokerRuleInput)
		.mutation(async ({ input }) => {
			const { id, cpaAmount, crgRate, revShareRate, minQualifiedDeposit, ...rest } = input;
			const data = {
				...rest,
				cpaAmount: toDec(cpaAmount),
				crgRate: toDec(crgRate),
				revShareRate: toDec(revShareRate),
				minQualifiedDeposit: toDec(minQualifiedDeposit),
			};
			return id
				? prisma.brokerPayoutRule.update({ where: { id }, data })
				: prisma.brokerPayoutRule.create({ data });
		}),

	listAffiliatePayoutRules: protectedProcedure
		.input(z.object({ affiliateId: z.string() }))
		.query(({ input }) =>
			prisma.affiliatePayoutRule.findMany({
				where: { affiliateId: input.affiliateId },
				orderBy: { activeFrom: "desc" },
			}),
		),

	upsertAffiliatePayoutRule: protectedProcedure
		.input(affiliateRuleInput)
		.mutation(async ({ input }) => {
			const { id, cpaAmount, crgRate, revShareRate, brokerId, ...rest } = input;
			const data = {
				...rest,
				brokerId: brokerId ?? null,
				cpaAmount: toDec(cpaAmount),
				crgRate: toDec(crgRate),
				revShareRate: toDec(revShareRate),
			};
			return id
				? prisma.affiliatePayoutRule.update({ where: { id }, data })
				: prisma.affiliatePayoutRule.create({ data });
		}),

	listInvoices: protectedProcedure
		.input(
			z.object({
				tab: z.enum(["broker", "affiliate"]),
				status: z.enum(["DRAFT", "SENT", "PAID"]).optional(),
			}),
		)
		.query(async ({ input }) => {
			if (input.tab === "broker") {
				return prisma.brokerInvoice.findMany({
					where: input.status ? { status: input.status } : {},
					orderBy: { periodEnd: "desc" },
					take: 200,
				});
			}
			return prisma.affiliateInvoice.findMany({
				where: input.status ? { status: input.status } : {},
				orderBy: { periodEnd: "desc" },
				take: 200,
			});
		}),

	markInvoicePaid: protectedProcedure
		.input(
			z.object({
				kind: z.enum(["broker", "affiliate"]),
				id: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			const now = new Date();
			return input.kind === "broker"
				? prisma.brokerInvoice.update({
						where: { id: input.id },
						data: { status: "PAID", paidAt: now },
					})
				: prisma.affiliateInvoice.update({
						where: { id: input.id },
						data: { status: "PAID", paidAt: now },
					});
		}),

	exportInvoicePdf: protectedProcedure
		.input(
			z.object({
				kind: z.enum(["broker", "affiliate"]),
				id: z.string(),
			}),
		)
		.query(async ({ input }) => {
			const inv =
				input.kind === "broker"
					? await prisma.brokerInvoice.findUniqueOrThrow({
							where: { id: input.id },
						})
					: await prisma.affiliateInvoice.findUniqueOrThrow({
							where: { id: input.id },
						});
			return {
				placeholder: true as const,
				format: "pdf-v2.0-pending",
				invoice: {
					id: inv.id,
					periodStart: inv.periodStart,
					periodEnd: inv.periodEnd,
					amount: inv.amount.toString(),
					currency: inv.currency,
					lineItems: inv.lineItems,
					status: inv.status,
				},
			};
		}),

	listCrgCohorts: protectedProcedure
		.input(z.object({ brokerId: z.string().optional() }))
		.query(({ input }) =>
			prisma.cRGCohort.findMany({
				where: input.brokerId ? { brokerId: input.brokerId } : {},
				orderBy: { cohortEnd: "desc" },
				take: 100,
			}),
		),

	generateBrokerInvoice: protectedProcedure
		.input(
			z.object({
				brokerId: z.string(),
				periodStart: z.coerce.date(),
				periodEnd: z.coerce.date(),
			}),
		)
		.mutation(({ input }) =>
			generateBrokerInvoice(input.brokerId, {
				start: input.periodStart,
				end: input.periodEnd,
			}),
		),

	generateAffiliateInvoice: protectedProcedure
		.input(
			z.object({
				affiliateId: z.string(),
				periodStart: z.coerce.date(),
				periodEnd: z.coerce.date(),
			}),
		)
		.mutation(({ input }) =>
			generateAffiliateInvoice(input.affiliateId, {
				start: input.periodStart,
				end: input.periodEnd,
			}),
		),
});
