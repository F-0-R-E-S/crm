import { prisma } from "@/server/db";
import type { ProxyEndpoint } from "@prisma/client";

export async function pickProxy(country?: string): Promise<ProxyEndpoint | null> {
  const candidates = await prisma.proxyEndpoint.findMany({
    where: {
      isActive: true,
      lastHealthStatus: { in: ["healthy", "unknown"] },
      ...(country ? { OR: [{ country }, { country: null }] } : {}),
    },
    orderBy: [{ consecutiveFails: "asc" }, { lastCheckedAt: "desc" }, { id: "asc" }],
    take: 10,
  });
  return candidates[0] ?? null;
}

export function toProxyUrl(
  ep: Pick<ProxyEndpoint, "host" | "port" | "username" | "password">,
): string {
  return `http://${encodeURIComponent(ep.username)}:${encodeURIComponent(ep.password)}@${ep.host}:${ep.port}`;
}
