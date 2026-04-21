import { prisma } from "@/server/db";
import type { Broker } from "@prisma/client";

/**
 * Fields that are *blanked* on a cloned broker — these must be re-entered
 * by the operator because they are credentials / endpoint-specific values
 * that almost always differ between broker instances.
 */
export const CLONE_BLANKED_FIELDS = [
  "endpointUrl",
  "postbackSecret",
  "authConfig",
  "autologinLoginUrl",
] as const;

/**
 * Fields that must NEVER be copied over to the clone (auto-assigned or
 * strictly identity).
 */
export const CLONE_EXCLUDED_FIELDS = [
  "id",
  "createdAt",
  "updatedAt",
  "lastHealthStatus",
  "lastHealthCheckAt",
  "lastPolledAt",
  "clonedFromId",
  "tenantId",
] as const;

export interface CloneBrokerInput {
  sourceId: string;
  newName: string;
}

/**
 * Deep-clones a broker row, blanking out endpoint/credential fields and
 * assigning the source id as `clonedFromId`. Pure — does NOT touch audit
 * log or telegram emit (callers are expected to do that).
 */
export async function cloneBroker(input: CloneBrokerInput): Promise<Broker> {
  const source = await prisma.broker.findUniqueOrThrow({ where: { id: input.sourceId } });
  const excluded = new Set<string>(CLONE_EXCLUDED_FIELDS);
  const blanked = new Set<string>(CLONE_BLANKED_FIELDS);

  const record = source as unknown as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (excluded.has(key)) continue;
    if (blanked.has(key)) continue;
    data[key] = record[key];
  }
  // Apply blanked defaults
  data.endpointUrl = "";
  data.postbackSecret = "";
  data.authConfig = {};
  data.autologinLoginUrl = null;
  // Attribution
  data.clonedFromId = source.id;
  // Force name override + clean health state
  data.name = input.newName;
  data.isActive = false; // safety: clones start paused so they can't accept traffic unconfigured
  data.lastHealthStatus = "unknown";
  data.lastHealthCheckAt = null;
  data.lastPolledAt = null;

  const clone = await prisma.broker.create({ data: data as never });
  return clone;
}
