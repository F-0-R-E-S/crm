import type { Prisma } from "@prisma/client";

export type AlertAckFilter = "all" | "acked" | "unacked";

/**
 * Pure where-clause builder — kept in its own module (no tRPC/auth imports)
 * so it can be unit-tested without pulling the auth stack through Vitest.
 */
export function buildAlertLogWhere(input: {
  ruleKey?: string;
  ack?: AlertAckFilter;
  from?: Date;
  to?: Date;
}): Prisma.AlertLogWhereInput {
  const ack = input.ack ?? "all";
  return {
    ...(input.ruleKey ? { ruleKey: input.ruleKey } : {}),
    ...(ack === "acked" ? { NOT: { ackedAt: null } } : {}),
    ...(ack === "unacked" ? { ackedAt: null } : {}),
    ...(input.from || input.to
      ? {
          triggeredAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };
}
