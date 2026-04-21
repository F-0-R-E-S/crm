import { beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

let serverReachable = false;

beforeAll(async () => {
  try {
    const probe = await fetch(`${BASE}/api/v1/health`, {
      signal: AbortSignal.timeout(1000),
    });
    serverReachable = probe.ok;
  } catch {
    serverReachable = false;
  }
  process.env.GAME_ORIGIN = "http://localhost:5173";
});

async function opt(path: string, origin: string) {
  return fetch(`${BASE}${path}`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type, authorization",
    },
  });
}

describe.skipIf(!process.env.RUN_CORS_INTEGRATION)("CORS for GAME_ORIGIN", () => {
  it("allows preflight from GAME_ORIGIN on /api/v1/*", async () => {
    const res = await opt("/api/v1/auth/operator-token", "http://localhost:5173");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    expect(res.headers.get("access-control-allow-methods")).toMatch(/POST/);
    expect(res.headers.get("access-control-allow-headers")).toMatch(/authorization/i);
  });

  it("allows preflight from GAME_ORIGIN on /api/trpc/*", async () => {
    const res = await opt("/api/trpc/broker.list", "http://localhost:5173");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("does NOT echo Origin for an unlisted origin", async () => {
    const res = await opt("/api/v1/auth/operator-token", "http://evil.example");
    expect(res.headers.get("access-control-allow-origin")).not.toBe("http://evil.example");
  });

  it("adds CORS headers to the actual response on allowed origin", async () => {
    const res = await fetch(`${BASE}/api/v1/auth/operator-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
      },
      body: JSON.stringify({ email: "nobody@test.local", password: "x" }),
    });
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });
});
