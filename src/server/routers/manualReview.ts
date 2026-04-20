import { prisma } from "@/server/db";
import { JOB_NAMES, getBoss, startBossOnce } from "@/server/jobs/queue";
import { writeLeadEvent } from "@/server/lead-event";
import { protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const ReasonSchema = z.enum([
	"BROKER_FAILED",
	"CAP_REACHED",
	"NO_BROKER_MATCH",
	"FRAUD_BORDERLINE",
]);
const ResolutionSchema = z.enum(["ACCEPT", "REJECT", "REQUEUE"]);

export const manualReviewRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				status: z.enum(["OPEN", "CLAIMED", "RESOLVED", "ALL"]).default("OPEN"),
				reason: ReasonSchema.optional(),
				cursor: z.string().nullish(),
				take: z.number().int().min(1).max(200).default(50),
			}),
		)
		.query(async ({ input }) => {
			const where: Record<string, unknown> = {};
			if (input.status === "OPEN") {
				where.claimedBy = null;
				where.resolvedAt = null;
			}
			if (input.status === "CLAIMED") {
				where.claimedBy = { not: null };
				where.resolvedAt = null;
			}
			if (input.status === "RESOLVED") {
				where.resolvedAt = { not: null };
			}
			if (input.reason) where.reason = input.reason;

			const rows = await prisma.manualReviewQueue.findMany({
				where,
				include: {
					lead: { include: { affiliate: true } },
					lastBroker: true,
					claimer: true,
					resolver: true,
				},
				orderBy: { createdAt: "desc" },
				take: input.take + 1,
				cursor: input.cursor ? { id: input.cursor } : undefined,
			});
			const hasMore = rows.length > input.take;
			const nextCursor = hasMore ? rows.pop()?.id ?? null : null;
			return { rows, nextCursor };
		}),

	claim: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const row = await prisma.manualReviewQueue.findUnique({ where: { id: input.id } });
			if (!row) throw new TRPCError({ code: "NOT_FOUND" });
			if (row.resolvedAt) {
				throw new TRPCError({ code: "CONFLICT", message: "already resolved" });
			}
			if (row.claimedBy && row.claimedBy !== ctx.userId) {
				throw new TRPCError({ code: "CONFLICT", message: "claimed by another user" });
			}
			await prisma.manualReviewQueue.update({
				where: { id: input.id },
				data: { claimedBy: ctx.userId, claimedAt: new Date() },
			});
			await writeLeadEvent(row.leadId, "MANUAL_REVIEW_CLAIMED", { by: ctx.userId });
			return { ok: true };
		}),

	resolve: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				resolution: ResolutionSchema,
				note: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const row = await prisma.manualReviewQueue.findUnique({ where: { id: input.id } });
			if (!row) throw new TRPCError({ code: "NOT_FOUND" });
			if (row.resolvedAt) {
				throw new TRPCError({ code: "CONFLICT", message: "already resolved" });
			}
			if (input.resolution === "REQUEUE") {
				return await doRequeue(row.id, row.leadId, ctx.userId, input.note ?? null);
			}
			const nextLeadState = input.resolution === "ACCEPT" ? "ACCEPTED" : "REJECTED";
			await prisma.$transaction([
				prisma.manualReviewQueue.update({
					where: { id: row.id },
					data: {
						resolution: input.resolution,
						resolutionNote: input.note ?? null,
						resolvedBy: ctx.userId,
						resolvedAt: new Date(),
					},
				}),
				prisma.lead.update({
					where: { id: row.leadId },
					data: { state: nextLeadState },
				}),
			]);
			await writeLeadEvent(row.leadId, "MANUAL_REVIEW_RESOLVED", {
				resolution: input.resolution,
				by: ctx.userId,
			});
			return { ok: true };
		}),

	requeue: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const row = await prisma.manualReviewQueue.findUnique({ where: { id: input.id } });
			if (!row) throw new TRPCError({ code: "NOT_FOUND" });
			if (row.resolvedAt) throw new TRPCError({ code: "CONFLICT" });
			return await doRequeue(row.id, row.leadId, ctx.userId, null);
		}),
});

async function doRequeue(rowId: string, leadId: string, userId: string, note: string | null) {
	await prisma.$transaction([
		prisma.manualReviewQueue.update({
			where: { id: rowId },
			data: {
				resolution: "REQUEUE",
				resolutionNote: note,
				resolvedBy: userId,
				resolvedAt: new Date(),
			},
		}),
		prisma.lead.update({ where: { id: leadId }, data: { state: "NEW", brokerId: null } }),
	]);
	const lead = await prisma.lead.findUnique({ where: { id: leadId } });
	if (lead) {
		try {
			await startBossOnce();
			const boss = getBoss();
			await boss.send(JOB_NAMES.pushLead, { leadId, traceId: lead.traceId });
		} catch {
			// pg-boss unavailable in tests — ignore; state is already reset to NEW.
		}
	}
	await writeLeadEvent(leadId, "MANUAL_REVIEW_REQUEUED", { by: userId });
	return { ok: true };
}
