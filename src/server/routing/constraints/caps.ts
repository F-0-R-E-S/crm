import { createHash } from "node:crypto";
import {
  bucketDayKey,
  bucketHourKey,
  bucketWeekKey,
  nextDayBoundary,
  nextHourBoundary,
} from "@/lib/timezone";
import { prisma } from "@/server/db";
import type { CapCounterKind, CapScope, CapWindow } from "@prisma/client";
import type { LeadSnapshot } from "../engine";
import type { PqlGate } from "../flow/model";
import { evaluatePqlGate } from "../pql/evaluate";

export interface CapInput {
  scope: CapScope;
  scopeId: string;
  window: CapWindow;
  tz: string;
  limit: number;
  country?: string;
  kind?: CapCounterKind; // PUSHED (default) or REJECTED
  /** When set, cap only increments when `lead` passes the PQL gate.
   *  The bucket key is also salted by a hash of the scope so multiple
   *  PQL-scoped caps on the same target don't collide. */
  pqlScope?: PqlGate | null;
  lead?: LeadSnapshot;
  now?: Date;
}

export type CapResult =
  | { ok: true; remaining: number; resetsAt: Date; skipped?: false }
  | { ok: false; reason: "cap_exhausted"; remaining: 0; resetsAt: Date; skipped?: false }
  | {
      // When a pqlScope is set and the lead doesn't match, the cap is
      // silently bypassed (no increment, no block). The push-lead
      // worker should treat this as "no cap applies to this lead".
      ok: true;
      remaining: -1;
      resetsAt: Date;
      skipped: true;
    };

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

function pqlScopeSalt(scope: PqlGate | null | undefined): string {
  if (!scope || scope.rules.length === 0) return "";
  // Deterministic JSON — rules are already an array of plain objects;
  // Zod normalizes key order at parse time. Truncate to 8 hex chars so
  // the bucketKey doesn't balloon.
  const json = JSON.stringify(scope);
  return `:${createHash("sha256").update(json).digest("hex").slice(0, 8)}`;
}

export async function consumeCap(input: CapInput): Promise<CapResult> {
  const at = input.now ?? new Date();
  const country = input.country ?? "";
  const kind: CapCounterKind = input.kind ?? "PUSHED";

  // PQL-scope gate: if set and the lead doesn't match, bypass the cap
  // entirely — no counter bump, no block.
  if (input.pqlScope && input.pqlScope.rules.length > 0) {
    if (!input.lead) {
      // Scope declared but no lead snapshot provided — fail-open, same
      // as other ambiguous states. Caller should always pass a lead.
      return { ok: true, remaining: -1, resetsAt: at, skipped: true };
    }
    const verdict = evaluatePqlGate(
      input.pqlScope.rules,
      input.pqlScope.logic,
      input.lead,
      at,
    );
    if (!verdict.ok) {
      const { resetsAt } = bucketKey(input.window, at, input.tz);
      return { ok: true, remaining: -1, resetsAt, skipped: true };
    }
  }

  const { key: baseKey, resetsAt } = bucketKey(input.window, at, input.tz);
  const key = baseKey + pqlScopeSalt(input.pqlScope);
  const row = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "CapCounter" (id, scope, "scopeId", "window", "bucketKey", country, kind, count, "resetsAt")
    VALUES (gen_random_uuid()::text, ${input.scope}::"CapScope", ${input.scopeId}, ${input.window}::"CapWindow", ${key}, ${country}, ${kind}::"CapCounterKind", 1, ${resetsAt})
    ON CONFLICT (scope, "scopeId", "window", "bucketKey", country, kind) DO UPDATE
      SET count = "CapCounter".count + 1
    RETURNING count
  `;
  const n = row[0]?.count ?? 0;
  if (n > input.limit) {
    await prisma.$queryRaw`
      UPDATE "CapCounter" SET count = GREATEST(count - 1, 0)
      WHERE scope = ${input.scope}::"CapScope" AND "scopeId" = ${input.scopeId}
        AND "window" = ${input.window}::"CapWindow" AND "bucketKey" = ${key}
        AND country = ${country} AND kind = ${kind}::"CapCounterKind"
    `;
    return { ok: false, reason: "cap_exhausted", remaining: 0, resetsAt };
  }
  return { ok: true, remaining: Math.max(0, input.limit - n), resetsAt };
}

export async function releaseCap(input: CapInput): Promise<void> {
  const at = input.now ?? new Date();
  const country = input.country ?? "";
  const kind: CapCounterKind = input.kind ?? "PUSHED";
  const { key: baseKey } = bucketKey(input.window, at, input.tz);
  const key = baseKey + pqlScopeSalt(input.pqlScope);
  await prisma.$queryRaw`
    UPDATE "CapCounter" SET count = GREATEST(count - 1, 0)
    WHERE scope = ${input.scope}::"CapScope" AND "scopeId" = ${input.scopeId}
      AND "window" = ${input.window}::"CapWindow" AND "bucketKey" = ${key}
      AND country = ${country} AND kind = ${kind}::"CapCounterKind"
  `;
}

export async function remainingCap(
  input: CapInput,
): Promise<{ used: number; remaining: number; resetsAt: Date }> {
  const at = input.now ?? new Date();
  const country = input.country ?? "";
  const kind: CapCounterKind = input.kind ?? "PUSHED";
  const { key: baseKey, resetsAt } = bucketKey(input.window, at, input.tz);
  const key = baseKey + pqlScopeSalt(input.pqlScope);
  const row = await prisma.capCounter.findFirst({
    where: {
      scope: input.scope,
      scopeId: input.scopeId,
      window: input.window,
      bucketKey: key,
      country,
      kind,
    },
  });
  const used = row?.count ?? 0;
  return { used, remaining: Math.max(0, input.limit - used), resetsAt };
}

/**
 * Compute the effective rejected limit from a cap definition.
 * If `asPercent` is true, interpret `rejectedLimit` as a percent of the
 * pushed cap's `limit` (floored). Returns null if rejection tracking is
 * not configured.
 */
export function effectiveRejectedLimit(
  limit: number,
  rejectedLimit: number | null | undefined,
  asPercent: boolean,
): number | null {
  if (rejectedLimit == null) return null;
  if (!asPercent) return rejectedLimit;
  return Math.max(0, Math.floor((limit * rejectedLimit) / 100));
}
