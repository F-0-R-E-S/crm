import { POST as postbackPOST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { runCrgCohortSettle } from "@/server/jobs/crg-cohort-settle";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";
import { signPostback } from "../helpers/postback-signature";
import { seedAdminSession, seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

vi.mock("@/auth", () => ({
	auth: vi.fn(async () => null),
	handlers: {},
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

const { appRouter } = await import("@/server/routers/_app");

describe("sprint 6 smoke — end-to-end finance pipeline", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("postback → conversion → pnl → invoice round trip", async () => {
		const ctx = await seedAdminSession();
		const aff = await seedAffiliate();
		const broker = await seedBroker({
			statusMapping: { dep_1: "FTD" },
			postbackSecret: "s3cret",
			postbackLeadIdPath: "broker_lead_id",
			postbackStatusPath: "status",
		});
		await seedLead({
			affiliateId: aff.id,
			brokerId: broker.id,
			brokerExternalId: "brx-1",
		});

		await prisma.brokerPayoutRule.create({
			data: {
				brokerId: broker.id,
				kind: "CPA_FIXED",
				cpaAmount: new Prisma.Decimal(200),
				activeFrom: new Date("2026-01-01"),
			},
		});
		await prisma.affiliatePayoutRule.create({
			data: {
				affiliateId: aff.id,
				kind: "CPA_FIXED",
				cpaAmount: new Prisma.Decimal(150),
				activeFrom: new Date("2026-01-01"),
			},
		});

		// 1) postback emits FTD conversion
		const body = JSON.stringify({
			broker_lead_id: "brx-1",
			status: "dep_1",
			deposit_amount: "500",
		});
		const sig = signPostback(body, broker.postbackSecret);
		await postbackPOST(
			new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
				method: "POST",
				headers: { "content-type": "application/json", "x-signature": sig },
				body,
			}),
			{ params: Promise.resolve({ brokerId: broker.id }) },
		);

		// 2) pnl reflects
		const caller = appRouter.createCaller(ctx);
		const pnl = await caller.finance.pnl({
			from: new Date("2026-01-01"),
			to: new Date("2030-01-01"),
		});
		expect(pnl.revenue).toBe("200");
		expect(pnl.payout).toBe("150");
		expect(pnl.margin).toBe("50");
		expect(pnl.conversionCount).toBe(1);

		// 3) generate invoices + link
		const bi = await caller.finance.generateBrokerInvoice({
			brokerId: broker.id,
			periodStart: new Date("2026-01-01"),
			periodEnd: new Date("2030-01-01"),
		});
		const ai = await caller.finance.generateAffiliateInvoice({
			affiliateId: aff.id,
			periodStart: new Date("2026-01-01"),
			periodEnd: new Date("2030-01-01"),
		});
		expect(bi.amount.toString()).toBe("200");
		expect(ai.amount.toString()).toBe("150");
		expect(ai.brokerInvoiceId).toBe(bi.id);

		// 4) mark paid transitions status
		const paid = await caller.finance.markInvoicePaid({
			kind: "broker",
			id: bi.id,
		});
		expect(paid.status).toBe("PAID");
		expect(paid.paidAt).not.toBeNull();

		// 5) PDF export returns placeholder envelope
		const pdf = await caller.finance.exportInvoicePdf({
			kind: "broker",
			id: bi.id,
		});
		expect(pdf.placeholder).toBe(true);
		expect(pdf.invoice.amount).toBe("200");
	});

	it("crg settlement yields shortfall line item on invoice", async () => {
		const ctx = await seedAdminSession();
		const aff = await seedAffiliate();
		const broker = await seedBroker();
		await prisma.brokerPayoutRule.create({
			data: {
				brokerId: broker.id,
				kind: "CPA_CRG",
				cpaAmount: new Prisma.Decimal(100),
				crgRate: new Prisma.Decimal("0.20"),
				activeFrom: new Date("2026-01-01"),
			},
		});
		// 10 leads accepted, 1 FTD
		for (let i = 0; i < 10; i++) {
			const lead = await seedLead({
				affiliateId: aff.id,
				brokerId: broker.id,
				acceptedAt: new Date("2026-06-02T12:00:00Z"),
			});
			if (i === 0) {
				await prisma.conversion.create({
					data: {
						leadId: lead.id,
						kind: "FTD",
						amount: new Prisma.Decimal(500),
						occurredAt: new Date("2026-06-10"),
						brokerReportedAt: new Date(),
					},
				});
			}
		}
		await runCrgCohortSettle(new Date("2026-07-15T04:00:00Z"));

		const caller = appRouter.createCaller(ctx);
		const bi = await caller.finance.generateBrokerInvoice({
			brokerId: broker.id,
			periodStart: new Date("2026-06-01"),
			periodEnd: new Date("2026-07-01"),
		});
		const items = bi.lineItems as unknown as Array<{
			conversionId: string;
			payoutAmount: string;
		}>;
		const crgLine = items.find((li) => li.conversionId.startsWith("crg-cohort-"));
		expect(crgLine).toBeDefined();
		expect(crgLine?.payoutAmount).toBe("100");
	});
});
