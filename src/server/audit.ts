import { prisma } from "./db";
import { getTraceId } from "./observability";

/**
 * Resolves a synthetic "system" actor for background jobs that don't have
 * a real user session (e.g. scheduled-change cron). Upserts on every call
 * to tolerate test DB resets.
 */
export async function getSystemUserId(): Promise<string> {
  const u = await prisma.user.upsert({
    where: { email: "system@gambchamp.local" },
    create: {
      email: "system@gambchamp.local",
      passwordHash: "!system-no-login",
      role: "ADMIN",
    },
    update: {},
  });
  return u.id;
}

export async function writeAuditLog(input: {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: unknown;
}): Promise<void> {
  let userId = input.userId === "system" ? await getSystemUserId() : input.userId;
  // Stale JWTs (e.g. after a DB reset) can reference a User.id that no
  // longer exists, which would blow up every mutation with an FK violation.
  // Check existence; fall back to the system user so the mutation succeeds
  // and the session will naturally refresh at next login.
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) userId = await getSystemUserId();
  await prisma.auditLog.create({
    data: {
      userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      diff: (input.diff ?? {}) as object,
      traceId: getTraceId() ?? null,
    },
  });
}
