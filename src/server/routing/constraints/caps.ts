import {
  bucketDayKey,
  bucketHourKey,
  bucketWeekKey,
  nextDayBoundary,
  nextHourBoundary,
} from "@/lib/timezone";
import { prisma } from "@/server/db";
import type { CapScope, CapWindow } from "@prisma/client";

export interface CapInput {
  scope: CapScope;
  scopeId: string;
  window: CapWindow;
  tz: string;
  limit: number;
  now?: Date;
}

export type CapResult =
  | { ok: true; remaining: number; resetsAt: Date }
  | { ok: false; reason: "cap_exhausted"; remaining: 0; resetsAt: Date };

function bucketKey(window: CapWindow, at: Date, tz: string): { key: string; resetsAt: Date } {
  if (window === "HOURLY")
    return { key: bucketHourKey(at, tz), resetsAt: nextHourBoundary(at, tz) };
  if (window === "WEEKLY") {
    const key = bucketWeekKey(at, tz);
    const reset = new Date(at.getTime());
    reset.setUTCDate(reset.getUTCDate() + (7 - ((reset.getUTCDay() + 6) % 7)));
    reset.setUTCHours(0, 0, 0, 0);
    return { key, resetsAt: reset };
  }
  return { key: bucketDayKey(at, tz), resetsAt: nextDayBoundary(at, tz) };
}

export async function consumeCap(input: CapInput): Promise<CapResult> {
  const at = input.now ?? new Date();
  const { key, resetsAt } = bucketKey(input.window, at, input.tz);
  const row = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "CapCounter" (id, scope, "scopeId", "window", "bucketKey", count, "resetsAt")
    VALUES (gen_random_uuid()::text, ${input.scope}::"CapScope", ${input.scopeId}, ${input.window}::"CapWindow", ${key}, 1, ${resetsAt})
    ON CONFLICT (scope, "scopeId", "window", "bucketKey") DO UPDATE
      SET count = "CapCounter".count + 1
    RETURNING count
  `;
  const n = row[0]?.count ?? 0;
  if (n > input.limit) {
    await prisma.$queryRaw`
      UPDATE "CapCounter" SET count = GREATEST(count - 1, 0)
      WHERE scope = ${input.scope}::"CapScope" AND "scopeId" = ${input.scopeId}
        AND "window" = ${input.window}::"CapWindow" AND "bucketKey" = ${key}
    `;
    return { ok: false, reason: "cap_exhausted", remaining: 0, resetsAt };
  }
  return { ok: true, remaining: Math.max(0, input.limit - n), resetsAt };
}

export async function releaseCap(input: CapInput): Promise<void> {
  const at = input.now ?? new Date();
  const { key } = bucketKey(input.window, at, input.tz);
  await prisma.$queryRaw`
    UPDATE "CapCounter" SET count = GREATEST(count - 1, 0)
    WHERE scope = ${input.scope}::"CapScope" AND "scopeId" = ${input.scopeId}
      AND "window" = ${input.window}::"CapWindow" AND "bucketKey" = ${key}
  `;
}

export async function remainingCap(
  input: CapInput,
): Promise<{ used: number; remaining: number; resetsAt: Date }> {
  const at = input.now ?? new Date();
  const { key, resetsAt } = bucketKey(input.window, at, input.tz);
  const row = await prisma.capCounter.findFirst({
    where: {
      scope: input.scope,
      scopeId: input.scopeId,
      window: input.window,
      bucketKey: key,
    },
  });
  const used = row?.count ?? 0;
  return { used, remaining: Math.max(0, input.limit - used), resetsAt };
}
