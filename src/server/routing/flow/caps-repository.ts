import { prisma } from "@/server/db";
import type { CapDefinitionInput } from "./caps-schema";

/**
 * Replaces all cap definitions for the latest (DRAFT) version of a flow.
 *
 * Runs in a single transaction:
 *  1. Clear existing CapDefinition rows (CapCountryLimit cascades via FK).
 *  2. Insert new CapDefinition rows.
 *  3. For each cap with perCountry=true + non-empty countryLimits, insert CapCountryLimit rows.
 *
 * Country codes on CapCountryLimit are normalised to uppercase.
 */
export async function upsertFlowCaps(flowId: string, caps: CapDefinitionInput[]) {
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!flow) throw new Error("flow_not_found");
  if (flow.status === "ARCHIVED") throw new Error("flow_archived");
  const latest = flow.versions[0];
  if (!latest) throw new Error("no_draft_version");

  return prisma.$transaction(async (tx) => {
    await tx.capDefinition.deleteMany({ where: { flowVersionId: latest.id } });

    for (const cap of caps) {
      const created = await tx.capDefinition.create({
        data: {
          flowVersionId: latest.id,
          scope: cap.scope,
          scopeRefId: cap.scopeRefId,
          window: cap.window,
          limit: cap.limit,
          timezone: cap.timezone,
          perCountry: cap.perCountry,
        },
      });
      if (cap.perCountry && cap.countryLimits.length > 0) {
        await tx.capCountryLimit.createMany({
          data: cap.countryLimits.map((cl) => ({
            capDefId: created.id,
            country: cl.country.toUpperCase(),
            limit: cl.limit,
          })),
        });
      }
    }

    return tx.capDefinition.findMany({
      where: { flowVersionId: latest.id },
      include: { countryLimits: true },
      orderBy: { id: "asc" },
    });
  });
}

export async function listFlowCaps(flowId: string) {
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!flow) throw new Error("flow_not_found");
  const latest = flow.versions[0];
  if (!latest) return [];
  return prisma.capDefinition.findMany({
    where: { flowVersionId: latest.id },
    include: { countryLimits: true },
    orderBy: { id: "asc" },
  });
}
