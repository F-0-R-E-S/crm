import { prisma } from "@/server/db";

export async function isDuplicate(
  affiliateId: string,
  hashes: { phoneHash: string | null; emailHash: string | null },
  windowDays: number,
): Promise<boolean> {
  if (!hashes.phoneHash && !hashes.emailHash) return false;
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);
  const match = await prisma.lead.findFirst({
    where: {
      affiliateId,
      createdAt: { gte: since },
      OR: [
        hashes.phoneHash ? { phoneHash: hashes.phoneHash } : undefined,
        hashes.emailHash ? { emailHash: hashes.emailHash } : undefined,
      ].filter(Boolean) as never,
    },
    select: { id: true },
  });
  return !!match;
}
