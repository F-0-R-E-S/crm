import { prisma } from "@/server/db";
import { redact } from "@/server/rbac/redact";
import { protectedProcedure, router } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const RoleSchema = z.enum(["ADMIN", "OPERATOR", "AFFILIATE_VIEWER", "BROKER_VIEWER"]);

export const rbacPreviewRouter = router({
  preview: protectedProcedure
    .input(z.object({ role: RoleSchema }))
    .query(async ({ ctx, input }) => {
      if (ctx.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "admin only" });
      }
      const [lead, broker, affiliate] = await Promise.all([
        prisma.lead.findFirst({ orderBy: { createdAt: "desc" } }),
        prisma.broker.findFirst({ orderBy: { createdAt: "desc" } }),
        prisma.affiliate.findFirst({ orderBy: { createdAt: "desc" } }),
      ]);
      return {
        lead: lead
          ? (redact(lead as unknown as Record<string, unknown>, input.role, "Lead") as typeof lead)
          : null,
        broker: broker
          ? (redact(
              broker as unknown as Record<string, unknown>,
              input.role,
              "Broker",
            ) as typeof broker)
          : null,
        affiliate: affiliate
          ? (redact(
              affiliate as unknown as Record<string, unknown>,
              input.role,
              "Affiliate",
            ) as typeof affiliate)
          : null,
      };
    }),
});
