import { prisma } from "@/server/db";

export async function resetDb() {
  await prisma.$transaction([
    prisma.leadEvent.deleteMany(),
    prisma.outboundPostback.deleteMany(),
    prisma.postbackReceipt.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.idempotencyKey.deleteMany(),
    prisma.dailyCap.deleteMany(),
    prisma.rotationRule.deleteMany(),
    prisma.broker.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.affiliate.deleteMany(),
    prisma.blacklist.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
