import { prisma } from "./db";
import { getTraceId } from "./observability";

export async function writeAuditLog(input: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      diff: (input.diff ?? {}) as object,
      traceId: getTraceId() ?? null,
    },
  });
}
