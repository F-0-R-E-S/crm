import { JSONPath } from "jsonpath-plus";

export interface PushOpts {
  url: string;
  method: "POST" | "PUT";
  headers: Record<string, string>;
  body: Record<string, unknown>;
  responseIdPath?: string | null;
  timeoutMs: number;
  maxAttempts: number;
  backoffMs?: number[];
}

export interface PushResult {
  success: boolean;
  httpStatus?: number;
  durationMs: number;
  attemptN: number;
  externalId?: string;
  rawResponse?: unknown;
  error?: string;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function pushToBroker(opts: PushOpts): Promise<PushResult> {
  const backoffs = opts.backoffMs ?? [1000, 2000, 4000];
  let lastErr = "";
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const start = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    try {
      const res = await fetch(opts.url, {
        method: opts.method,
        headers: { "content-type": "application/json", ...opts.headers },
        body: JSON.stringify(opts.body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const duration = Date.now() - start;
      lastStatus = res.status;
      if (res.status >= 200 && res.status < 300) {
        const ct = res.headers.get("content-type") ?? "";
        const raw = ct.includes("json") ? await res.json() : await res.text();
        let externalId: string | undefined;
        if (opts.responseIdPath && typeof raw === "object") {
          // preventEval: true disables JS eval in path strings (security hardening).
          // In jsonpath-plus v10, the types omit this legacy option but runtime still honors it.
          // biome-ignore lint/suspicious/noExplicitAny: preventEval is a runtime-only legacy option omitted from v10 types
          const matches = (JSONPath as any)({
            path: opts.responseIdPath,
            json: raw,
            preventEval: true,
          }) as unknown[];
          if (matches.length) externalId = String(matches[0]);
        }
        return {
          success: true,
          httpStatus: res.status,
          durationMs: duration,
          attemptN: attempt,
          externalId,
          rawResponse: raw,
        };
      }
      if (res.status >= 400 && res.status < 500) {
        return {
          success: false,
          httpStatus: res.status,
          durationMs: duration,
          attemptN: attempt,
          error: `http ${res.status}`,
        };
      }
      lastErr = `http ${res.status}`;
    } catch (e) {
      clearTimeout(timer);
      lastErr = (e as Error).message;
    }
    if (attempt < opts.maxAttempts) await sleep(backoffs[attempt - 1] ?? 4000);
  }
  return {
    success: false,
    httpStatus: lastStatus,
    durationMs: 0,
    attemptN: opts.maxAttempts,
    error: lastErr,
  };
}
