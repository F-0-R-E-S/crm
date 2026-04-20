export interface ProbeResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;

export async function probeBrokerEndpoint(
  url: string,
  method: "GET" | "POST" = "POST",
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
    };
    if (method === "POST") {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify({ probe: true });
    }
    const res = await fetchImpl(url, init);
    const latencyMs = Date.now() - started;
    if (res.status >= 500) {
      return { ok: false, status: res.status, latencyMs };
    }
    return { ok: true, status: res.status, latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const error = e instanceof Error ? e.message : "fetch failed";
    return { ok: false, error, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}
