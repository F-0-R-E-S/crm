/**
 * One-shot purge of stuck pg-boss jobs. Run after rotating worker deployments
 * or recovering from an incident; only deletes jobs that have been idle for
 * >= 30 minutes and are still in a pre-run state.
 *
 * Usage: `pnpm tsx scripts/purge-stale-queue.ts`
 */
import { prisma } from "@/server/db";

async function main() {
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "pgboss"."job" WHERE state IN ('created', 'retry') AND createdon < NOW() - INTERVAL '30 minutes'`,
  );
  console.log(`purged ${result} stale pg-boss jobs`);
}

main()
  .catch((err) => {
    console.error("purge failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
