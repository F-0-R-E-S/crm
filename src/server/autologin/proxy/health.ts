import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { ProxyAgent } from "undici";
import { toProxyUrl } from "./pool";

const PROBE_URL = "https://api.ipify.org?format=json";
const PROBE_TIMEOUT_MS = 5_000;
const DOWN_AFTER_CONSECUTIVE = 3;

export type ProbeResult =
  | { status: "healthy"; latencyMs: number }
  | { status: "degraded"; latencyMs: number; error?: string }
  | { status: "down"; latencyMs: number; error?: string };

export async function probeProxy(endpointId: string): Promise<ProbeResult> {
  const ep = await prisma.proxyEndpoint.findUnique({ where: { id: endpointId } });
  if (!ep) return { status: "down", latencyMs: 0, error: "not_found" };
  const agent = new ProxyAgent({ uri: toProxyUrl(ep) });
  const started = Date.now();
  try {
    const res = await fetch(PROBE_URL, {
      // @ts-expect-error undici dispatcher forwarded via Node fetch
      dispatcher: agent,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { status: "degraded", latencyMs, error: `http_${res.status}` };
    const body = (await res.json()) as { ip?: string };
    if (!body.ip) return { status: "degraded", latencyMs, error: "no_ip_in_body" };
    return latencyMs < 2_000 ? { status: "healthy", latencyMs } : { status: "degraded", latencyMs };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function recordHealthResult(endpointId: string, result: ProbeResult): Promise<void> {
  const ep = await prisma.proxyEndpoint.findUnique({ where: { id: endpointId } });
  if (!ep) return;
  const nextFails = result.status === "healthy" ? 0 : ep.consecutiveFails + 1;
  const nextStatus = nextFails >= DOWN_AFTER_CONSECUTIVE ? "down" : result.status;
  await prisma.proxyEndpoint.update({
    where: { id: endpointId },
    data: {
      lastHealthStatus: nextStatus,
      lastLatencyMs: result.latencyMs,
      lastCheckedAt: new Date(),
      consecutiveFails: nextFails,
    },
  });
  if (nextStatus === "down") logger.warn({ endpointId, label: ep.label }, "proxy_down");
}
