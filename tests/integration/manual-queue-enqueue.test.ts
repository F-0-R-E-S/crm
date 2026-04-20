import { prisma } from "@/server/db";
import { enqueueManualReview } from "@/server/routing/manual-queue";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("enqueueManualReview", () => {
	let leadId: string;

	beforeEach(async () => {
		await resetDb();
		const aff = await prisma.affiliate.create({
			data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
		});
		const lead = await prisma.lead.create({
			data: {
				affiliateId: aff.id,
				geo: "US",
				ip: "203.0.113.5",
				eventTs: new Date(),
				traceId: "trace-mrq-1",
			},
		});
		leadId = lead.id;
	});

	it("inserts a row with reason + lastBrokerId + lastError", async () => {
		await enqueueManualReview({
			leadId,
			reason: "BROKER_FAILED",
			lastBrokerId: null,
			lastError: "upstream 500",
		});
		const row = await prisma.manualReviewQueue.findUnique({ where: { leadId } });
		expect(row?.reason).toBe("BROKER_FAILED");
		expect(row?.lastError).toBe("upstream 500");
		expect(row?.resolvedAt).toBeNull();
	});

	it("is idempotent for the same leadId (upserts)", async () => {
		await enqueueManualReview({ leadId, reason: "CAP_REACHED" });
		await enqueueManualReview({ leadId, reason: "BROKER_FAILED", lastError: "timeout" });
		const rows = await prisma.manualReviewQueue.findMany({ where: { leadId } });
		expect(rows).toHaveLength(1);
		expect(rows[0].reason).toBe("BROKER_FAILED");
		expect(rows[0].lastError).toBe("timeout");
	});

	it("fires emitAlert once per enqueue (stub counted)", async () => {
		const { __getAlertCalls, __resetAlertCalls } = await import("@/server/alerts/emitter");
		__resetAlertCalls();
		await enqueueManualReview({ leadId, reason: "NO_BROKER_MATCH" });
		expect(__getAlertCalls()).toHaveLength(1);
		expect(__getAlertCalls()[0].event).toBe("manual_queue_enqueued");
	});
});
