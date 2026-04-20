import type { Job } from "pg-boss";
import { env } from "@/lib/env";
import { prisma } from "@/server/db";
import { logger } from "@/server/observability";

export async function handleSandboxPurge(_job: Job<Record<string, never>>) {
  const cutoff = new Date(Date.now() - env.SANDBOX_TTL_DAYS * 24 * 3600 * 1000);
  const deleted = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      action: { startsWith: "sandbox_" },
    },
  });
  logger.info(
    { event: "sandbox_purge", deleted: deleted.count, cutoff: cutoff.toISOString() },
    "sandbox purge done",
  );
}
