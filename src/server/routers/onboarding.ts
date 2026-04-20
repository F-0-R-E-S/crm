import { prisma } from "@/server/db";
import { protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

async function getOrgIdOrThrow(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } });
  if (!user?.orgId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "user has no org" });
  }
  return user.orgId;
}

// scrub fields that must never land in OnboardingProgress.stepData
function scrubSecrets(data: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...data };
  // biome-ignore lint/performance/noDelete: explicit strip
  delete copy.plaintextKey;
  return copy;
}

export const onboardingRouter = router({
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { orgId: true, org: true },
    });
    if (!user?.orgId) return null;
    const progress = await prisma.onboardingProgress.findUnique({
      where: { orgId: user.orgId },
    });
    return progress ? { ...progress, org: user.org } : null;
  }),

  saveStep: protectedProcedure
    .input(
      z.object({
        step: z.number().int().min(1).max(5),
        data: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgIdOrThrow(ctx.userId);
      const existing = await prisma.onboardingProgress.findUnique({ where: { orgId } });
      const prevData =
        (existing?.stepData as Record<string, unknown> | null | undefined) ?? {};
      const scrubbed = scrubSecrets(input.data ?? {});
      const nextData = { ...prevData, ...scrubbed };

      const completionKey = `step${input.step - 1}CompletedAt` as const;
      const completionPatch: Record<string, Date> = {};
      if (input.step > 1) {
        completionPatch[completionKey] = new Date();
      }

      const stepDataJson = nextData as Prisma.InputJsonValue;
      return prisma.onboardingProgress.upsert({
        where: { orgId },
        create: { orgId, currentStep: input.step, stepData: stepDataJson },
        update: {
          currentStep: input.step,
          stepData: stepDataJson,
          ...completionPatch,
        },
      });
    }),

  updateOrg: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(60),
        timezone: z.string().min(1),
        currency: z.string().length(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getOrgIdOrThrow(ctx.userId);
      return prisma.org.update({
        where: { id: orgId },
        data: { name: input.name, timezone: input.timezone, currency: input.currency },
      });
    }),

  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = await getOrgIdOrThrow(ctx.userId);
    const progress = await prisma.onboardingProgress.findUnique({ where: { orgId } });
    if (!progress) {
      throw new TRPCError({ code: "NOT_FOUND", message: "no progress" });
    }
    const now = new Date();
    const durationSeconds = Math.round(
      (now.getTime() - new Date(progress.startedAt).getTime()) / 1000,
    );
    return prisma.onboardingProgress.update({
      where: { orgId },
      data: {
        completedAt: now,
        step5CompletedAt: now,
        durationSeconds,
        currentStep: 5,
      },
    });
  }),
});
