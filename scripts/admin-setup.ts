import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../src/server/routers/_app";

const BASE = process.env.CRM_BASE ?? "https://crm-node.fly.dev";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@gambchamp.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";
const BROKER_ID = process.env.BROKER_ID ?? "seed-broker-1";

const GEOS = ["DE", "FR", "IT", "ES", "PL", "NL", "PT", "AT", "CH", "BE", "IE", "FI"];

function curl(args: string[]): string {
  return execFileSync("curl", ["-sS", ...args], { encoding: "utf8" });
}

// NextAuth uses redirect-based login; undici's `redirect: "manual"` returns
// an opaque response with no Set-Cookie header exposed. Shell out to curl
// so we actually see the cookies from the 302.
function login(): string {
  const dir = mkdtempSync(join(tmpdir(), "crm-login-"));
  const jarPath = join(dir, "cookies.txt");
  try {
    const csrfJson = curl(["-c", jarPath, `${BASE}/api/auth/csrf`]);
    const { csrfToken } = JSON.parse(csrfJson) as { csrfToken: string };

    const body = new URLSearchParams({
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      callbackUrl: BASE,
      json: "true",
    }).toString();

    curl([
      "-c",
      jarPath,
      "-b",
      jarPath,
      "-X",
      "POST",
      "-H",
      "content-type: application/x-www-form-urlencoded",
      "--data-binary",
      body,
      `${BASE}/api/auth/callback/credentials?json=true`,
    ]);

    const raw = readFileSync(jarPath, "utf8");
    const pairs: string[] = [];
    for (const rawLine of raw.split("\n")) {
      // Curl marks HttpOnly cookies with "#HttpOnly_<domain>" (no space);
      // real comments start with "# ". Strip the HttpOnly marker before parsing.
      const line = rawLine.startsWith("#HttpOnly_") ? rawLine.slice("#HttpOnly_".length) : rawLine;
      if (!line || line.startsWith("#")) continue;
      const parts = line.split("\t");
      if (parts.length < 7) continue;
      const name = parts[5];
      const value = parts[6];
      if (name && value) pairs.push(`${name}=${value}`);
    }
    const jar = pairs.join("; ");
    if (!/session-token/.test(jar)) {
      throw new Error(`no session cookie after login. got: ${jar}`);
    }
    return jar;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  console.log(`logging in as ${EMAIL} to ${BASE} ...`);
  const cookie = login();
  console.log("session ok");

  const trpc = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${BASE}/api/trpc`,
        transformer: superjson,
        fetch: (url, opts) =>
          fetch(url as string, {
            ...(opts ?? {}),
            headers: { ...(opts?.headers ?? {}), cookie },
          }),
      }),
    ],
  });

  console.log(`updating broker ${BROKER_ID} ...`);
  const updated = await trpc.broker.update.mutate({
    id: BROKER_ID,
    name: "Echo Broker (postman-echo)",
    endpointUrl: "https://postman-echo.com/post",
    httpMethod: "POST",
    fieldMapping: {
      id: "id",
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
      phone: "phone",
      geo: "country",
    },
    responseIdPath: "$.data.id",
    postbackSecret: "seed-secret-change-me",
    postbackLeadIdPath: "$.lead_id",
    postbackStatusPath: "$.status",
    statusMapping: { accepted: "ACCEPTED", declined: "DECLINED", ftd: "FTD" },
  });
  console.log(`  broker updated: ${updated.id} -> ${updated.endpointUrl}`);

  console.log("loading existing rotation rules ...");
  const existing = await trpc.rotation.listByGeo.query();

  for (const geo of GEOS) {
    const has = existing[geo]?.some((r) => r.brokerId === BROKER_ID);
    if (has) {
      console.log(`  ${geo}: rule exists, skip`);
      continue;
    }
    const rule = await trpc.rotation.create.mutate({ geo, brokerId: BROKER_ID, priority: 1 });
    console.log(`  ${geo}: created priority=${rule.priority}`);
  }

  console.log("admin setup complete");
}

main().catch((e) => {
  console.error("admin setup failed:", e);
  process.exit(1);
});
