/**
 * Push mixed, realistic traffic against a running instance and collect
 * a state report.
 *
 * Usage:
 *   BASE_URL=https://crm-node.fly.dev \
 *   KEY_US=ak_… KEY_EU=ak_… KEY_LATAM=ak_… KEY_ASIA=ak_… \
 *   COUNT=60 pnpm tsx scripts/prod-demo/traffic.ts
 *
 * If the env keys are missing, falls back to a single KEY_DEFAULT from
 * env with GEOs randomized across the fixtures.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const COUNT = Number.parseInt(process.env.COUNT ?? "40", 10);

const KEY_US = process.env.KEY_US ?? process.env.KEY_DEFAULT;
const KEY_EU = process.env.KEY_EU ?? process.env.KEY_DEFAULT;
const KEY_LATAM = process.env.KEY_LATAM ?? process.env.KEY_DEFAULT;
const KEY_ASIA = process.env.KEY_ASIA ?? process.env.KEY_DEFAULT;

if (!KEY_US || !KEY_EU || !KEY_LATAM || !KEY_ASIA) {
  console.error("Need at least KEY_DEFAULT (or per-GEO: KEY_US/EU/LATAM/ASIA).");
  process.exit(2);
}

interface Fixture {
  label: string;
  geo: string;
  key: string;
  email: string;
  phone: string;
  ip: string;
  // optional flags to exercise fraud / dup paths
  blacklistEmail?: boolean;
  blacklistIp?: boolean;
  blacklistPhone?: boolean;
}

// Realistic-looking phone-number bank (not 555-prefixed — libphonenumber rejects those).
const DE_PHONES = ["+4915112345001", "+4915112345002", "+4915112345003", "+4915112345004"];
const FR_PHONES = ["+33612345001", "+33612345002", "+33612345003"];
const IT_PHONES = ["+393490123001", "+393490123002"];
const ES_PHONES = ["+34612345001", "+34612345002"];
const PL_PHONES = ["+48512345001"];
const AT_PHONES = ["+436601234001"];
const UK_PHONES = ["+447700901001", "+447700901002"];
const US_PHONES = ["+14155550123", "+12025551212", "+16505550199"];
const CA_PHONES = ["+14165550111"];
const BR_PHONES = ["+5511912345001", "+5511912345002"];
const MX_PHONES = ["+525512345001"];
const AR_PHONES = ["+541112345001"];
const JP_PHONES = ["+819012345001"];
const KR_PHONES = ["+821012345001"];
const HK_PHONES = ["+85212345001"];
const SG_PHONES = ["+6592345001"];
const AU_PHONES = ["+61412345001"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function buildFixtures(n: number): Fixture[] {
  const out: Fixture[] = [];
  const pools: Array<{ geo: string; key: string; phones: string[]; ipPrefix: string }> = [
    { geo: "US", key: KEY_US!, phones: US_PHONES, ipPrefix: "203.0.113." },
    { geo: "CA", key: KEY_US!, phones: CA_PHONES, ipPrefix: "204.0.113." },
    { geo: "DE", key: KEY_EU!, phones: DE_PHONES, ipPrefix: "195.10.20." },
    { geo: "FR", key: KEY_EU!, phones: FR_PHONES, ipPrefix: "195.10.21." },
    { geo: "IT", key: KEY_EU!, phones: IT_PHONES, ipPrefix: "195.10.22." },
    { geo: "ES", key: KEY_EU!, phones: ES_PHONES, ipPrefix: "195.10.23." },
    { geo: "PL", key: KEY_EU!, phones: PL_PHONES, ipPrefix: "195.10.24." },
    { geo: "AT", key: KEY_EU!, phones: AT_PHONES, ipPrefix: "195.10.25." },
    { geo: "UK", key: KEY_EU!, phones: UK_PHONES, ipPrefix: "195.10.26." },
    { geo: "BR", key: KEY_LATAM!, phones: BR_PHONES, ipPrefix: "200.10.20." },
    { geo: "MX", key: KEY_LATAM!, phones: MX_PHONES, ipPrefix: "200.10.21." },
    { geo: "AR", key: KEY_LATAM!, phones: AR_PHONES, ipPrefix: "200.10.22." },
    { geo: "JP", key: KEY_ASIA!, phones: JP_PHONES, ipPrefix: "210.10.20." },
    { geo: "KR", key: KEY_ASIA!, phones: KR_PHONES, ipPrefix: "210.10.21." },
    { geo: "HK", key: KEY_ASIA!, phones: HK_PHONES, ipPrefix: "210.10.22." },
    { geo: "SG", key: KEY_ASIA!, phones: SG_PHONES, ipPrefix: "210.10.23." },
    { geo: "AU", key: KEY_ASIA!, phones: AU_PHONES, ipPrefix: "210.10.24." },
  ];

  for (let i = 0; i < n; i++) {
    const pool = pools[i % pools.length];
    out.push({
      label: `${pool.geo}-${i}`,
      geo: pool.geo,
      key: pool.key,
      email: `user${i}@clean.io`,
      phone: pick(pool.phones, i),
      ip: pool.ipPrefix + String(1 + (i % 250)),
    });
  }

  // Inject 5 fraud probes and 5 duplicates
  const frauds: Fixture[] = [
    {
      label: "fraud-blocked-email-domain",
      geo: "DE",
      key: KEY_EU!,
      email: "whatever@evil.io",
      phone: pick(DE_PHONES, 20),
      ip: "195.10.99.11",
      blacklistEmail: true,
    },
    {
      label: "fraud-blocked-ip",
      geo: "FR",
      key: KEY_EU!,
      email: "clean@clean.io",
      phone: pick(FR_PHONES, 21),
      ip: "203.0.113.66",
      blacklistIp: true,
    },
    {
      label: "fraud-blocked-phone",
      geo: "US",
      key: KEY_US!,
      email: "clean2@clean.io",
      phone: "+12025550000",
      ip: "203.0.113.5",
      blacklistPhone: true,
    },
    {
      label: "fraud-geo-mismatch",
      geo: "IT",
      key: KEY_EU!,
      email: "mismatch@clean.io",
      phone: "+14155550123", // US number on IT geo
      ip: "195.10.30.5",
    },
    {
      label: "fraud-bulk-repeat",
      geo: "ES",
      key: KEY_EU!,
      email: "chain@spam.io", // blacklisted domain
      phone: "+14155550000", // blacklisted phone
      ip: "185.220.100.1", // blacklisted IP
    },
  ];
  out.push(...frauds);

  // 3 duplicates (same phone as pool items 0,1,2 of DE)
  for (let i = 0; i < 3; i++) {
    out.push({
      label: `dup-de-${i}`,
      geo: "DE",
      key: KEY_EU!,
      email: `dup${i}@clean.io`,
      phone: pick(DE_PHONES, i),
      ip: "195.10.20." + String(10 + i),
    });
  }

  return out;
}

async function postLead(f: Fixture, idx: number) {
  const body = {
    external_lead_id: `tf-${Date.now()}-${idx}`,
    first_name: `First${idx}`,
    last_name: `Last${idx}`,
    email: f.email,
    phone: f.phone,
    geo: f.geo,
    ip: f.ip,
    event_ts: new Date().toISOString(),
  };
  const res = await fetch(`${BASE_URL}/api/v1/leads`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${f.key}`,
      "content-type": "application/json",
      "x-api-version": "2026-01",
    },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, body: j };
}

async function main() {
  const fixtures = buildFixtures(COUNT);
  const results: Array<{ fixture: string; geo: string; status: number; body: unknown }> = [];
  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i];
    const r = await postLead(f, i);
    results.push({ fixture: f.label, geo: f.geo, status: r.status, body: r.body });
    if (i % 10 === 9) process.stdout.write(".");
  }
  console.log("\n");
  const by: Record<number, number> = {};
  for (const r of results) by[r.status] = (by[r.status] ?? 0) + 1;
  console.log("status code distribution:", by);
  const rejected = results.filter((r) => r.status >= 400);
  if (rejected.length) {
    console.log("\nrejected breakdown:");
    for (const r of rejected.slice(0, 20)) {
      const body = r.body as Record<string, unknown> | null;
      console.log(
        `  ${r.status} ${r.geo} ${r.fixture}`,
        JSON.stringify(body ?? {}).slice(0, 100),
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
