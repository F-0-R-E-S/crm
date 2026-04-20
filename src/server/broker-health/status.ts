import { prisma } from "@/server/db";

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export async function aggregateHealthStatus(brokerId: string): Promise<HealthStatus> {
  const recent = await prisma.brokerHealthCheck.findMany({
    where: { brokerId },
    orderBy: { checkedAt: "desc" },
    take: 5,
  });
  if (recent.length === 0) return "unknown";

  const last = recent[0];
  if (last.status === "ok") return "healthy";

  let consecutiveFails = 0;
  for (const r of recent) {
    if (r.status === "ok") break;
    consecutiveFails++;
  }
  if (consecutiveFails >= 3) return "down";
  return "degraded";
}
