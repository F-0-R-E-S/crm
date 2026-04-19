import { prisma } from "@/server/db";

export async function cleanupExpiredIdempotency(): Promise<number> {
  const res = await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return res.count;
}
