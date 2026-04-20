/* eslint-disable */
const autocannon = require("autocannon");

const TARGET = process.env.INTAKE_URL ?? "http://localhost:3000/api/v1/leads";
const API_KEY = process.env.INTAKE_API_KEY ?? "ak_perf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

const makeBody = () =>
  JSON.stringify({
    external_lead_id: `perf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    first_name: "Perf",
    last_name: "Test",
    email: `perf-${Math.random()}@example.com`,
    phone: `+38050${Math.floor(1e6 + Math.random() * 8e6)}`,
    geo: "UA",
    ip: "8.8.8.8",
    landing_url: "https://example.com/lp",
    event_ts: new Date().toISOString(),
  });

async function run() {
  const scenarios = [
    { name: "sustained_300_rps_15m", duration: 900, connections: 300 },
    { name: "burst_1000_rps_60s", duration: 60, connections: 1000 },
  ];

  const scenarioName = process.argv[2] ?? "sustained_300_rps_15m";
  const scenario = scenarios.find((s) => s.name === scenarioName);
  if (!scenario) {
    console.error(
      `unknown scenario: ${scenarioName}. available: ${scenarios.map((s) => s.name).join(", ")}`,
    );
    process.exit(1);
  }

  const instance = autocannon({
    url: TARGET,
    duration: scenario.duration,
    connections: scenario.connections,
    pipelining: 1,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${API_KEY}`,
    },
    setupClient: (client) => {
      client.setBody = () => makeBody();
    },
    method: "POST",
    body: makeBody(),
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
    const pass = slo.p95_ms < 500 && slo.err_pct < 0.5;
    console.log(pass ? "PASS" : "FAIL");
    process.exit(pass ? 0 : 1);
  });
}

run();
