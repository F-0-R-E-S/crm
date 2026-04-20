import { probeProxy, recordHealthResult } from "@/server/autologin/proxy/health";
import { prisma } from "@/server/db";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

export interface ProxyHealthPayload {
  endpointId: string;
}

export async function handleProxyHealth(p: ProxyHealthPayload): Promise<void> {
  const result = await probeProxy(p.endpointId);
  await recordHealthResult(p.endpointId, result);
}

export async function scheduleAllProxyHealthProbes(): Promise<number> {
  await startBossOnce();
  const endpoints = await prisma.proxyEndpoint.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const boss = getBoss();
  for (const ep of endpoints) {
    await boss.send(JOB_NAMES.proxyHealth, { endpointId: ep.id });
  }
  return endpoints.length;
}
