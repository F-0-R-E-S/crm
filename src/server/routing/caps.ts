import { prisma } from "@/server/db";
import type { CapScope } from "@prisma/client";

export function todayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Atomic UPSERT-increment. Returns the new count AFTER the increment.
 * If the row doesn't exist, creates it with count=1.
 */
export async function incrementCap(scope: CapScope, scopeId: string, day: Date): Promise<number> {
  const res = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "DailyCap" (id, scope, "scopeId", day, count)
    VALUES (gen_random_uuid()::text, ${scope}::"CapScope", ${scopeId}, ${day}, 1)
    ON CONFLICT (scope, "scopeId", day) DO UPDATE
      SET count = "DailyCap".count + 1
    RETURNING count
  `;
  return res[0].count;
}

export async function decrementCap(scope: CapScope, scopeId: string, day: Date): Promise<number> {
  const res = await prisma.$queryRaw<{ count: number }[]>`
    UPDATE "DailyCap" SET count = GREATEST(count - 1, 0)
    WHERE scope = ${scope}::"CapScope" AND "scopeId" = ${scopeId} AND day = ${day}
    RETURNING count
  `;
  return res[0]?.count ?? 0;
}
