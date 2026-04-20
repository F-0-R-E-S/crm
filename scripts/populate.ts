import { randomInt } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const BASE = process.env.CRM_BASE ?? "https://crm-node.fly.dev";
const TOKEN = process.env.CRM_API_KEY ?? "ak_9a9768234f591703e45e6762324cf7392910365526ee7c2f";
const BROKER_ID = process.env.BROKER_ID ?? "seed-broker-1";
const BROKER_SECRET = process.env.BROKER_SECRET ?? "seed-secret-change-me";
const TOTAL = Number(process.env.TOTAL ?? "2000");
const INTAKE_INTERVAL_MS = Number(process.env.INTAKE_INTERVAL_MS ?? "520"); // ~1.9 rps, safely under 2 rps cap

// GEO distribution (weights must sum to 100)
const GEO_WEIGHTS: Array<[string, number]> = [
  ["DE", 20],
  ["FR", 15],
  ["IT", 12],
  ["ES", 12],
  ["PL", 10],
  ["NL", 8],
  ["PT", 6],
  ["AT", 5],
  ["CH", 4],
  ["BE", 4],
  ["IE", 2],
  ["FI", 2],
];

// Phone prefixes: picked so libphonenumber-js recognizes them as valid mobiles.
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
  "Léa",
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

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(arr.length)];
}

function digits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += String(randomInt(10));
  return s;
}

function pickGeo(): string {
  const r = randomInt(100);
  let acc = 0;
  for (const [g, w] of GEO_WEIGHTS) {
    acc += w;
    if (r < acc) return g;
  }
  return GEO_WEIGHTS[0][0];
}

function randomIp(): string {
  // avoid private ranges just for realism — antifraud has no bogon list here
  return `${randomInt(1, 224)}.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

function validPhone(geo: string): string {
  for (let attempt = 0; attempt < 8; attempt++) {
    const raw = PHONE_GEN[geo]();
    const parsed = parsePhoneNumberFromString(raw, geo as never);
    if (parsed?.isValid()) return parsed.number;
  }
  // fallback — server will reject 422 and we'll log
  return PHONE_GEN[geo]();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface IntakeResult {
  lead_id: string;
  status: "received" | "rejected";
  reject_reason: string | null;
  trace_id: string;
  received_at: string;
}

async function sendIntake(payload: Record<string, unknown>): Promise<IntakeResult | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}/api/v1/leads`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return (await res.json()) as IntakeResult;
    }
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "2");
      await sleep(Math.max(retryAfter * 1000, 1500));
      continue;
    }
    const body = await res.text();
    if (res.status === 422) {
      // validation — caller gets null, we move on
      console.warn(`422 for ${payload.external_lead_id}: ${body.slice(0, 200)}`);
      return null;
    }
    console.warn(`intake ${res.status} for ${payload.external_lead_id}: ${body.slice(0, 200)}`);
    return null;
  }
  return null;
}

async function sendPostback(leadExternalId: string, status: "accepted" | "declined" | "ftd") {
  const body = JSON.stringify({ lead_id: leadExternalId, status });
  const { createHmac } = await import("node:crypto");
  const sig = createHmac("sha256", BROKER_SECRET).update(body).digest("hex");
  const res = await fetch(`${BASE}/api/v1/postbacks/${BROKER_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": sig },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn(`postback ${status} for ${leadExternalId} -> ${res.status}: ${t.slice(0, 200)}`);
    return false;
  }
  return true;
}

interface Accepted {
  leadId: string; // Prisma cuid returned by intake
  externalLeadId: string;
  geo: string;
}

async function intakePhase(): Promise<Accepted[]> {
  console.log(`intake phase: ${TOTAL} leads at ~${(1000 / INTAKE_INTERVAL_MS).toFixed(2)} rps`);
  const accepted: Accepted[] = [];
  let rejected = 0;
  let failed = 0;
  const start = Date.now();

  for (let i = 0; i < TOTAL; i++) {
    const geo = pickGeo();
    const externalLeadId = `pop-${Date.now()}-${i.toString().padStart(5, "0")}`;
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomInt(100000, 999999)}@${pick(["gmail.com", "outlook.com", "yahoo.com", "proton.me", "mail.ru", "web.de", "libero.it", "orange.fr"])}`;
    const phone = validPhone(geo);
    const payload = {
      external_lead_id: externalLeadId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      geo,
      ip: randomIp(),
      landing_url: `https://aff.example${pick(LANDING_PAGES)}`,
      sub_id: pick(SUB_IDS),
      utm: {
        source: pick(UTM_SOURCES),
        medium: pick(UTM_MEDIUMS),
        campaign: pick(UTM_CAMPAIGNS),
      },
      event_ts: new Date().toISOString(),
    };

    const result = await sendIntake(payload);
    if (!result) {
      failed++;
    } else if (result.status === "rejected") {
      rejected++;
    } else {
      accepted.push({ leadId: result.lead_id, externalLeadId, geo });
    }

    if ((i + 1) % 50 === 0) {
      const elapsed = (Date.now() - start) / 1000;
      const etaSec = (elapsed / (i + 1)) * (TOTAL - i - 1);
      console.log(
        `  ${i + 1}/${TOTAL} ok=${accepted.length} rej=${rejected} fail=${failed} elapsed=${elapsed.toFixed(0)}s eta=${etaSec.toFixed(0)}s`,
      );
    }

    await sleep(INTAKE_INTERVAL_MS);
  }

  console.log(
    `intake done: accepted=${accepted.length} rejected=${rejected} failed=${failed} in ${((Date.now() - start) / 1000).toFixed(0)}s`,
  );
  return accepted;
}

async function postbackPhase(accepted: Accepted[]) {
  // target distribution across the full TOTAL (includes rejected/failed above)
  const tgtFtd = Math.round(TOTAL * 0.12);
  const tgtAccepted = Math.round(TOTAL * 0.55);
  const tgtDeclined = Math.round(TOTAL * 0.08);
  // remainder stays at PUSHED

  // Shuffle accepted
  const shuffled = [...accepted];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const ftdSlice = shuffled.slice(0, tgtFtd);
  const accSlice = shuffled.slice(tgtFtd, tgtFtd + tgtAccepted);
  const decSlice = shuffled.slice(tgtFtd + tgtAccepted, tgtFtd + tgtAccepted + tgtDeclined);
  console.log(
    `postback plan: ftd=${ftdSlice.length} accepted=${accSlice.length} declined=${decSlice.length} staying_pushed=${shuffled.length - ftdSlice.length - accSlice.length - decSlice.length}`,
  );

  async function runBatch(items: Accepted[], status: "ftd" | "accepted" | "declined") {
    let ok = 0;
    let fail = 0;
    const CONCURRENCY = 8;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map((it) => sendPostback(it.leadId, status)));
      for (const r of results) r ? ok++ : fail++;
    }
    console.log(`  ${status}: ok=${ok} fail=${fail}`);
  }

  console.log("postback phase (ftd first, then accepted, then declined)");
  await runBatch(ftdSlice, "ftd");
  await runBatch(accSlice, "accepted");
  await runBatch(decSlice, "declined");
}

async function waitForPushDrain(expected: number) {
  // Wait for worker to push most leads. With batchSize=20 and pollInterval=1s,
  // throughput is ~20 pushes/sec. 2000 pushed in ~100s.
  const waitMs = Math.max(30_000, (expected / 15) * 1000);
  console.log(`waiting ${Math.round(waitMs / 1000)}s for push queue to drain ...`);
  await sleep(waitMs);
}

async function main() {
  console.log(`populating ${BASE}`);
  const accepted = await intakePhase();
  await waitForPushDrain(accepted.length);
  await postbackPhase(accepted);
  console.log("populate complete");
}

main().catch((e) => {
  console.error("populate failed:", e);
  process.exit(1);
});
