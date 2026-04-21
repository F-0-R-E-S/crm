import { publishFlow } from "@/server/routing/flow/publish";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Per-entity allowlist of fields that may be edited via a scheduled change.
 * Any field outside the allowlist is rejected with an error.
 *
 * Note: `Flow.status` is NOT a raw swap — the orchestrator routes it through
 * `publishFlow` so the draft/publish lifecycle is preserved.
 */
export const ALLOWED_FIELDS: Record<"Flow" | "Broker" | "Cap", readonly string[]> = {
  Broker: [
    "isActive",
    "dailyCap",
    "workingHours",
    "retrySchedule",
    "pendingHoldMinutes",
    "autologinEnabled",
  ],
  Flow: ["status", "activeVersionId"],
  Cap: ["limit", "perCountry", "countryLimits"],
} as const;

export class SchedulePatchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Validate a JSON-Merge-Patch-style flat patch against the entity allowlist.
 * Throws `SchedulePatchError` if a disallowed field is present, or the patch
 * is empty / malformed.
 */
export function validatePatch(
  entityType: keyof typeof ALLOWED_FIELDS,
  patch: unknown,
): Record<string, unknown> {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new SchedulePatchError("invalid_patch", "patch must be a non-empty object");
  }
  const keys = Object.keys(patch as Record<string, unknown>);
  if (keys.length === 0) {
    throw new SchedulePatchError("invalid_patch", "patch must contain at least one field");
  }
  const allowed = new Set(ALLOWED_FIELDS[entityType]);
  const disallowed = keys.filter((k) => !allowed.has(k));
  if (disallowed.length > 0) {
    throw new SchedulePatchError(
      "disallowed_field",
      `disallowed field(s) for ${entityType}: ${disallowed.join(", ")}`,
    );
  }
  return patch as Record<string, unknown>;
}

interface ApplyContext {
  prisma: PrismaClient | Prisma.TransactionClient;
  appliedBy: string;
}

/**
 * Apply a validated patch to the target entity inside the caller's
 * transaction / prisma client. Returns the `before` / `after` snapshots.
 */
export async function applyPatch(args: {
  entityType: keyof typeof ALLOWED_FIELDS;
  entityId: string;
  patch: Record<string, unknown>;
  ctx: ApplyContext;
}): Promise<{ before: unknown; after: unknown }> {
  const { entityType, entityId, patch, ctx } = args;

  if (entityType === "Broker") {
    const before = await ctx.prisma.broker.findUniqueOrThrow({ where: { id: entityId } });
    const after = await ctx.prisma.broker.update({
      where: { id: entityId },
      data: patch as never,
    });
    return { before, after };
  }

  if (entityType === "Flow") {
    const before = await ctx.prisma.flow.findUniqueOrThrow({ where: { id: entityId } });
    const { status, ...rest } = patch as { status?: string };
    let after: unknown = before;
    // Status → route through publishFlow for DRAFT → PUBLISHED transition.
    if (status === "PUBLISHED" && before.status !== "PUBLISHED") {
      after = await publishFlow(entityId, ctx.appliedBy);
    } else if (status && status !== before.status) {
      throw new SchedulePatchError(
        "invalid_status_transition",
        `status transition ${before.status} → ${status} not supported via scheduled change`,
      );
    }
    if (Object.keys(rest).length > 0) {
      after = await ctx.prisma.flow.update({ where: { id: entityId }, data: rest as never });
    }
    return { before, after };
  }

  // Cap
  const before = await ctx.prisma.capDefinition.findUniqueOrThrow({ where: { id: entityId } });
  const { countryLimits, ...rest } = patch as {
    countryLimits?: Array<{ country: string; limit: number }>;
  };
  const after = await ctx.prisma.capDefinition.update({
    where: { id: entityId },
    data: rest as never,
  });
  if (Array.isArray(countryLimits)) {
    await ctx.prisma.capCountryLimit.deleteMany({ where: { capDefId: entityId } });
    if (countryLimits.length > 0) {
      await ctx.prisma.capCountryLimit.createMany({
        data: countryLimits.map((cl) => ({
          capDefId: entityId,
          country: cl.country,
          limit: cl.limit,
        })),
      });
    }
  }
  return { before, after };
}
