import { prisma } from "@/server/db";

/**
 * Backfill a single "Default Org" and attach all users without an orgId to it.
 * Idempotent: re-running returns the same org id and does not create duplicates.
 * Existing deployments are treated as paid (STARTER), not trial.
 */
export async function backfillDefaultOrg(): Promise<string> {
  const existing = await prisma.org.findUnique({ where: { slug: "default" } });
  const org =
    existing ??
    (await prisma.org.create({
      data: {
        name: "Default Org",
        slug: "default",
        plan: "STARTER",
      },
    }));

  await prisma.user.updateMany({
    where: { orgId: null },
    data: { orgId: org.id },
  });

  return org.id;
}
