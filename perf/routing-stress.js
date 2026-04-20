/* eslint-disable */
// Routing engine stress harness (EPIC-02 + S8 GA gate).
//
// Usage:
//   SEED_PERF=1 pnpm db:seed                       # creates `flow-perf-default` + 5 brokers
//   export ROUTING_COOKIE='next-auth.session-token=...'   # admin session required
//   export ROUTING_FLOW_ID='flow-perf-default'
//   node perf/routing-stress.js batch_10k_sustained
//   node perf/routing-stress.js batch_10k_concurrent
//
// Gate:
//   - p95 < 1000ms (10k-lead batch submission latency)
//   - err_pct < 0.5%
const autocannon = require("autocannon");

const TARGET = process.env.ROUTING_URL ?? "http://localhost:3000/api/v1/routing/simulate";
const COOKIE = process.env.ROUTING_COOKIE ?? "";
const FLOW_ID = process.env.ROUTING_FLOW_ID ?? "flow-perf-default";
const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE ?? "10000", 10);
const COUNTRIES = ["US", "DE", "FR", "GB", "IT", "ES", "PL", "NL", "SE", "NO"];

function makeBatch() {
  const leads = new Array(BATCH_SIZE);
  for (let i = 0; i < BATCH_SIZE; i++) {
    const geo = COUNTRIES[i % COUNTRIES.length];
    leads[i] = {
      affiliate_id: "seed-affiliate-1",
      geo,
      email: `perf-${i}-${Date.now()}@example.com`,
      phone: `+15555${String(1000000 + (i % 8999999)).padStart(7, "0")}`,
      sub_id: `perf-${i}`,
    };
  }
  return JSON.stringify({ flow_id: FLOW_ID, leads });
}

async function run() {
  const scenarios = {
    batch_10k_sustained: { duration: 300, connections: 20, pipelining: 1 },
    batch_10k_concurrent: { duration: 300, connections: 100, pipelining: 1 },
  };

  const scenarioName = process.argv[2] ?? "batch_10k_sustained";
  const scenario = scenarios[scenarioName];
  if (!scenario) {
    console.error(
      `unknown scenario: ${scenarioName}. available: ${Object.keys(scenarios).join(", ")}`,
    );
    process.exit(1);
  }

  const headers = {
    "content-type": "application/json",
  };
  if (COOKIE) headers.cookie = COOKIE;

  const instance = autocannon({
    url: TARGET,
    duration: scenario.duration,
    connections: scenario.connections,
    pipelining: scenario.pipelining,
    headers,
    setupClient: (client) => {
      client.setBody = () => makeBatch();
    },
    method: "POST",
    body: makeBatch(),
  });

  autocannon.track(instance, { renderResultsTable: true });

  instance.on("done", (result) => {
    const slo = {
      p95_ms: result.latency.p95,
      p99_ms: result.latency.p99,
      err_pct: (result["non2xx"] / result.requests.total) * 100,
      accepted_pct: ((result["2xx"] ?? 0) / result.requests.total) * 100,
    };
    console.log("\n=== SLO ===");
    console.log(JSON.stringify(slo, null, 2));
    const pass = slo.p95_ms < 1000 && slo.err_pct < 0.5;
    console.log(pass ? "PASS" : "FAIL");
    process.exit(pass ? 0 : 1);
  });
}

run();
