import { execFileSync } from "node:child_process";
import { createHmac, randomInt } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import superjson from "superjson";
import type { AppRouter } from "../src/server/routers/_app";

const BASE = process.env.CRM_BASE ?? "https://crm-node.fly.dev";
const TOKEN = process.env.CRM_API_KEY ?? "ak_9a9768234f591703e45e6762324cf7392910365526ee7c2f";
const BROKER_ID = process.env.BROKER_ID ?? "seed-broker-1";
const BROKER_SECRET = process.env.BROKER_SECRET ?? "seed-secret-change-me";
const AFFILIATE_ID = process.env.AFFILIATE_ID ?? "seed-affiliate-1";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@gambchamp.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";

const DEDUP_COUNT = Number(process.env.DEDUP_COUNT ?? "90"); // duplicate -> REJECTED("duplicate")
const FRESH_COUNT = Number(process.env.FRESH_COUNT ?? "500"); // fresh intakes after cap raise
const INTAKE_INTERVAL_MS = Number(process.env.INTAKE_INTERVAL_MS ?? "550");

const GEO_WEIGHTS: Array<[string, number]> = [
  ["DE", 22],
  ["FR", 18],
  ["IT", 12],
  ["ES", 10],
  ["PL", 10],
  ["NL", 8],
  ["PT", 6],
  ["AT", 5],
  ["CH", 3],
  ["BE", 3],
  ["IE", 2],
  ["FI", 1],
];
const PHONE_GEN: Record<string, () => string> = {
  DE: () =>
    `+49${pick(["170", "171", "172", "173", "174", "175", "176", "177", "178", "179"])}${digits(7)}`,
  FR: () => `+33${pick(["6", "7"])}${digits(8)}`,
  IT: () => `+393${digits(9)}`,
  ES: () => `+34${pick(["6", "7"])}${digits(8)}`,
  PL: () =>
    `+48${pick(["50", "51", "53", "57", "60", "66", "69", "72", "73", "78", "79", "88"])}${digits(7)}`,
  NL: () => `+316${digits(8)}`,
  PT: () => `+3519${pick(["1", "2", "3", "6"])}${digits(7)}`,
  AT: () =>
    `+43${pick(["650", "660", "664", "676", "677", "680", "681", "688", "699"])}${digits(7)}`,
  CH: () => `+41${pick(["74", "75", "76", "77", "78", "79"])}${digits(7)}`,
  BE: () => `+324${pick(["6", "7", "8", "9"])}${digits(7)}`,
  IE: () => `+3538${pick(["2", "3", "5", "6", "7", "9"])}${digits(7)}`,
  FI: () => `+3584${pick(["0", "1", "2", "4", "5"])}${digits(7)}`,
};

const FIRST_NAMES = [
  "Alex",
  "Maria",
  "Luca",
  "Sofia",
  "Max",
  "Emma",
  "Paul",
  "Anna",
  "Leo",
  "Julia",
  "Tom",
  "Laura",
  "Ben",
  "Clara",
  "Nico",
  "Lena",
  "Finn",
  "Nina",
  "Hugo",
  "Elena",
  "Jan",
  "Alice",
  "Oskar",
  "Eric",
  "Chiara",
  "Kai",
  "Noa",
  "Diego",
  "Olivia",
  "Pavel",
  "Iryna",
  "Piotr",
  "Zofia",
  "Sven",
  "Katja",
  "Marco",
  "Beatriz",
];
const LAST_NAMES = [
  "Muller",
  "Rossi",
  "Garcia",
  "Dubois",
  "Kowalski",
  "Janssen",
  "Silva",
  "Bauer",
  "Bianchi",
  "Lopez",
  "Martin",
  "Nowak",
  "DeJong",
  "Costa",
  "Huber",
  "Russo",
  "Fernandez",
  "Bernard",
  "Wozniak",
  "Peters",
  "Almeida",
  "Gruber",
  "Ricci",
  "Sanchez",
  "Petit",
  "Kaminski",
  "Visser",
  "Santos",
  "Wagner",
  "Ferrari",
];
const SUB_IDS = [
  "fb-crypto-eu-q1",
  "fb-forex-eu-q1",
  "gg-crypto-dach",
  "gg-forex-pl",
  "tg-crypto-main",
  "native-eu-push",
  "tiktok-finance",
  "yt-crypto-edu",
];
const UTM_SOURCES = ["facebook", "google", "telegram", "native", "tiktok", "youtube"];
const UTM_MEDIUMS = ["cpc", "cpm", "organic", "paid_social"];
const UTM_CAMPAIGNS = [
  "q1-crypto-eu",
  "q1-forex-dach",
  "q1-push-eu",
  "eu-retarget",
  "spring-launch",
  "q2-bull-run",
];
const LANDING_PAGES = [
  "/land/crypto-starter",
  "/land/forex-pro",
  "/land/trading-now",
  "/land/bull-run",
  "/land/smart-invest",
  "/land/free-signals",
];
const EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "proton.me",
  "mail.ru",
  "web.de",
  "libero.it",
  "orange.fr",
];

function pick<T>(a: readonly T[]): T {
  return a[randomInt(a.length)];
}
function digits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String(randomInt(10));
  return s;
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function randomIp(): string {
  return `${randomInt(1, 224)}.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}
function ascii(s: string): string {
  // biome-ignore lint/suspicious/noMisleadingCharacterClass: NFD decomposition strips combining diacritics intentionally
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function pickGeo(): string {
  const total = GEO_WEIGHTS.reduce((a, [_, w]) => a + w, 0);
  const r = randomInt(total);
  let acc = 0;
  for (const [g, w] of GEO_WEIGHTS) {
    acc += w;
    if (r < acc) return g;
  }
  return GEO_WEIGHTS[0][0];
}
function validPhone(geo: string): string {
  const gen = PHONE_GEN[geo];
  if (!gen) return `+49170${digits(7)}`;
  for (let i = 0; i < 8; i++) {
    const raw = gen();
    const parsed = parsePhoneNumberFromString(raw, geo as never);
    if (parsed?.isValid()) return parsed.number;
  }
  return gen();
}

// --- admin session ---
function curlCmd(args: string[]): string {
  return execFileSync("curl", ["-sS", ...args], { encoding: "utf8" });
}
function loginAdmin(): string {
  const dir = mkdtempSync(join(tmpdir(), "crm-login-"));
  const jarPath = join(dir, "cookies.txt");
  try {
    const csrfJson = curlCmd(["-c", jarPath, `${BASE}/api/auth/csrf`]);
    const { csrfToken } = JSON.parse(csrfJson) as { csrfToken: string };
    curlCmd([
      "-c",
      jarPath,
      "-b",
      jarPath,
      "-X",
      "POST",
      "-H",
      "content-type: application/x-www-form-urlencoded",
      "--data-binary",
      new URLSearchParams({
        csrfToken,
        email: EMAIL,
        password: PASSWORD,
        callbackUrl: BASE,
        json: "true",
      }).toString(),
      `${BASE}/api/auth/callback/credentials?json=true`,
    ]);
    const raw = readFileSync(jarPath, "utf8");
    const pairs: string[] = [];
    for (const rawLine of raw.split("\n")) {
      const line = rawLine.startsWith("#HttpOnly_") ? rawLine.slice(10) : rawLine;
      if (!line || line.startsWith("#")) continue;
      const parts = line.split("\t");
      if (parts.length < 7) continue;
      if (parts[5] && parts[6]) pairs.push(`${parts[5]}=${parts[6]}`);
    }
    const jar = pairs.join("; ");
    if (!/session-token/.test(jar)) throw new Error(`login failed: ${jar}`);
    return jar;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
function makeTrpc(cookie: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${BASE}/api/trpc`,
        transformer: superjson,
        fetch: (url, opts) =>
          fetch(url as string, { ...(opts ?? {}), headers: { ...(opts?.headers ?? {}), cookie } }),
      }),
    ],
  });
}

// --- HTTP helpers ---
interface IntakeResult {
  lead_id: string;
  status: string;
  reject_reason: string | null;
  trace_id: string;
  received_at: string;
}
async function sendIntake(payload: Record<string, unknown>): Promise<IntakeResult | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}/api/v1/leads`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return (await res.json()) as IntakeResult;
    if (res.status === 429) {
      const ra = Number(res.headers.get("retry-after") ?? "2");
      await sleep(Math.max(ra * 1000, 1500));
      continue;
    }
    if (res.status === 422) return null;
    console.warn(`intake ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  return null;
}
async function sendPostback(leadId: string, status: "ftd" | "accepted" | "declined") {
  const body = JSON.stringify({ lead_id: leadId, status });
  const sig = createHmac("sha256", BROKER_SECRET).update(body).digest("hex");
  const res = await fetch(`${BASE}/api/v1/postbacks/${BROKER_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": sig },
    body,
  });
  return res.ok;
}

// --- phases ---
async function phaseRaiseCaps(cookie: string) {
  console.log("--- raising caps ---");
  const trpc = makeTrpc(cookie);

  const aff = await trpc.affiliate.update.mutate({
    id: AFFILIATE_ID,
    totalDailyCap: 20000,
  });
  console.log(`  affiliate totalDailyCap -> ${aff.totalDailyCap}`);

  // broker.update input merges BrokerInput.partial() so we only send fields we want to change
  const br = await trpc.broker.update.mutate({
    id: BROKER_ID,
    name: "Echo Broker (postman-echo)",
    endpointUrl: "https://postman-echo.com/post",
    fieldMapping: {
      id: "id",
      firstName: "first_name",
      lastName: "last_name",
      email: "email",
      phone: "phone",
      geo: "country",
    },
    postbackSecret: BROKER_SECRET,
    postbackLeadIdPath: "$.lead_id",
    postbackStatusPath: "$.status",
    dailyCap: 20000,
  });
  console.log(`  broker dailyCap -> ${br.dailyCap}`);
}

async function phaseRejected(cookie: string) {
  console.log(`--- REJECTED("duplicate") phase: ${DEDUP_COUNT} intentional dups ---`);
  const trpc = makeTrpc(cookie);
  // Grab leads that have phone+email and aren't REJECTED themselves.
  // We want PUSHED/ACCEPTED/FTD leads so their phone hash is fresh (within 7d).
  const recent = await trpc.lead.list.query({
    state: "ACCEPTED",
    page: 1,
    pageSize: Math.min(DEDUP_COUNT + 20, 500),
  });
  const pool = recent.items.filter((l) => l.email && l.phone);
  const count = Math.min(DEDUP_COUNT, pool.length);
  console.log(`  sourcing ${count} dups from existing ACCEPTED leads`);

  let rejected = 0;
  let other = 0;
  for (let i = 0; i < count; i++) {
    const src = pool[i];
    const r = await sendIntake({
      external_lead_id: `edge-dup-${Date.now()}-${i}`,
      first_name: ascii(src.firstName ?? "Dup"),
      last_name: ascii(src.lastName ?? "Lead"),
      email: src.email,
      phone: src.phone,
      geo: src.geo,
      ip: randomIp(),
      landing_url: "https://aff.example/land/retarget",
      sub_id: src.subId ?? "retarget-q1",
      utm: { source: "retarget", medium: "email", campaign: "rt-cta" },
      event_ts: new Date().toISOString(),
    });
    if (r?.status === "rejected" && r.reject_reason === "duplicate") rejected++;
    else other++;
    await sleep(INTAKE_INTERVAL_MS);
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${count} dup=${rejected} other=${other}`);
  }
  console.log(`  REJECTED("duplicate") done: dup=${rejected} other=${other}`);
}

async function phaseFreshBurst(): Promise<Array<{ id: string }>> {
  console.log(`--- FRESH BURST: ${FRESH_COUNT} new leads after cap raise ---`);
  const accepted: Array<{ id: string }> = [];
  let rejected = 0;
  let failed = 0;
  const start = Date.now();
  for (let i = 0; i < FRESH_COUNT; i++) {
    const geo = pickGeo();
    const fn = ascii(pick(FIRST_NAMES));
    const ln = ascii(pick(LAST_NAMES));
    const payload = {
      external_lead_id: `edge-fresh-${Date.now()}-${i.toString().padStart(4, "0")}`,
      first_name: fn,
      last_name: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${randomInt(100000, 999999)}@${pick(EMAIL_DOMAINS)}`,
      phone: validPhone(geo),
      geo,
      ip: randomIp(),
      landing_url: `https://aff.example${pick(LANDING_PAGES)}`,
      sub_id: pick(SUB_IDS),
      utm: { source: pick(UTM_SOURCES), medium: pick(UTM_MEDIUMS), campaign: pick(UTM_CAMPAIGNS) },
      event_ts: new Date().toISOString(),
    };
    const r = await sendIntake(payload);
    if (!r) failed++;
    else if (r.status === "rejected") rejected++;
    else accepted.push({ id: r.lead_id });
    await sleep(INTAKE_INTERVAL_MS);
    if ((i + 1) % 50 === 0) {
      const el = (Date.now() - start) / 1000;
      console.log(
        `  fresh ${i + 1}/${FRESH_COUNT} ok=${accepted.length} rej=${rejected} fail=${failed} elapsed=${el.toFixed(0)}s`,
      );
    }
  }
  console.log(`  fresh burst done: ok=${accepted.length} rej=${rejected} fail=${failed}`);
  return accepted;
}

async function phaseFreshPostback(accepted: Array<{ id: string }>) {
  // Target mix: 65% FTD, 20% ACCEPTED, 10% DECLINED, 5% stay PUSHED
  const shuffled = [...accepted];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const n = shuffled.length;
  const ftd = shuffled.slice(0, Math.round(n * 0.65));
  const acc = shuffled.slice(ftd.length, ftd.length + Math.round(n * 0.2));
  const dec = shuffled.slice(
    ftd.length + acc.length,
    ftd.length + acc.length + Math.round(n * 0.1),
  );
  console.log(
    `  postback plan (of ${n}): ftd=${ftd.length} accepted=${acc.length} declined=${dec.length} stay_pushed=${n - ftd.length - acc.length - dec.length}`,
  );

  async function batch(items: Array<{ id: string }>, status: "ftd" | "accepted" | "declined") {
    let ok = 0;
    let fail = 0;
    const CONCURRENCY = 8;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      const rs = await Promise.all(chunk.map((it) => sendPostback(it.id, status)));
      for (const r of rs) r ? ok++ : fail++;
    }
    console.log(`  ${status}: ok=${ok} fail=${fail}`);
  }
  await batch(ftd, "ftd");
  await batch(acc, "accepted");
  await batch(dec, "declined");
}

async function main() {
  console.log("edge-cases populate starting");
  const cookie = loginAdmin();
  await phaseRaiseCaps(cookie);
  await phaseRejected(cookie);
  const fresh = await phaseFreshBurst();
  console.log("  waiting 60s for push queue to drain ...");
  await sleep(60_000);
  await phaseFreshPostback(fresh);
  console.log("edge-cases populate complete");
}

main().catch((e) => {
  console.error("edge-cases failed:", e);
  process.exit(1);
});
