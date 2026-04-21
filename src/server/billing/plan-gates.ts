/**
 * v2.0 S2.0-3 — Plan-based quota enforcement.
 *
 * Reads current month lead count from the analytics rollup tables and decides
 * whether intake should accept another lead. Missing Subscription row → fall
 * back to "trial" (14-day trial limits, blocks runaway usage by new tenants).
 */
import { prisma } from "@/server/db";
import { PLAN_LIMITS, type PlanTier, isPlanTier } from "./plans";

export interface QuotaCheckResult {
  allowed: boolean;
  plan: PlanTier;
  used: number;
  limit: number | null;
  /** Fraction of the monthly quota consumed (0..∞). `Infinity` when limit=0. */
  pct: number;
  /** Populated when `allowed=false`, stable code for API responses. */
  errorCode?: "plan_quota_exceeded" | "plan_inactive";
}

export function currentMonthWindow(now: Date = new Date()): { from: Date; to: Date } {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { from, to };
}

/**
 * Aggregate `LeadDailyRoll.totalReceived` for the current UTC month, scoped
 * to the supplied tenant. Rollups run every 15 min, so the result is lagged
 * by up to 15 min; that's acceptable for quota — worst-case we let a small
 * overshoot slip through.
 */
export async function getMonthlyLeadsUsed(
  tenantId: string,
  now: Date = new Date(),
): Promise<number> {
  const { from, to } = currentMonthWindow(now);
  // LeadDailyRoll has no `tenantId` column — join through Affiliate.
  const rows = await prisma.$queryRaw<{ used: bigint | null }[]>`
    SELECT COALESCE(SUM(r."totalReceived"), 0)::bigint AS used
    FROM "LeadDailyRoll" r
    JOIN "Affiliate" a ON a."id" = r."affiliateId"
    WHERE a."tenantId" = ${tenantId}
      AND r."date" >= ${from}
      AND r."date" < ${to}
  `;
  const used = rows[0]?.used;
  return used == null ? 0 : Number(used);
}

export async function resolveActivePlan(tenantId: string): Promise<{
  plan: PlanTier;
  active: boolean;
}> {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub) return { plan: "trial", active: true };
  const plan = isPlanTier(sub.plan) ? sub.plan : "trial";
  const active = sub.status === "ACTIVE" || sub.status === "TRIALING";
  return { plan, active };
}

/**
 * Pure helper — given a plan + used + delta, decide if the next N leads fit.
 * Extracted so the quota logic is testable without DB.
 */
export function decideQuota(
  plan: PlanTier,
  used: number,
  delta: number,
): Omit<QuotaCheckResult, "plan"> {
  const limit = PLAN_LIMITS[plan].maxLeadsPerMonth;
  if (limit === null) {
    return { allowed: true, used, limit: null, pct: 0 };
  }
  const next = used + delta;
  const pct = limit > 0 ? next / limit : Number.POSITIVE_INFINITY;
  if (next > limit) {
    return {
      allowed: false,
      used,
      limit,
      pct,
      errorCode: "plan_quota_exceeded",
    };
  }
  return { allowed: true, used, limit, pct };
}

/**
 * Enforcement hook for intake. `delta = 1` for a single-lead POST; bulk
 * handlers should pass the batch length. Fail-open on DB error to avoid
 * blocking paid traffic on a monitoring glitch — log loudly instead.
 */
export async function enforceQuota(tenantId: string, delta = 1): Promise<QuotaCheckResult> {
  try {
    const { plan, active } = await resolveActivePlan(tenantId);
    if (!active) {
      return {
        allowed: false,
        plan,
        used: 0,
        limit: PLAN_LIMITS[plan].maxLeadsPerMonth,
        pct: 0,
        errorCode: "plan_inactive",
      };
    }
    const used = await getMonthlyLeadsUsed(tenantId);
    const dec = decideQuota(plan, used, delta);
    return { plan, ...dec };
  } catch {
    // fail-open: allow the lead, rely on daily reconciliation.
    return { allowed: true, plan: "trial", used: 0, limit: null, pct: 0 };
  }
}
