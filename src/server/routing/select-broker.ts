import { prisma } from "@/server/db";
import type { Broker } from "@prisma/client";

export async function selectBrokerPool(geo: string): Promise<Broker[]> {
  const rules = await prisma.rotationRule.findMany({
    where: { geo, isActive: true, broker: { isActive: true } },
    include: { broker: true },
    orderBy: [{ priority: "asc" }],
  });
  return rules.map((r) => r.broker);
}
