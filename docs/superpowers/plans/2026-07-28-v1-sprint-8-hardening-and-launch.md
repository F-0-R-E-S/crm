# v1.0 Sprint 8 — Hardening + Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out v1.0 GA. Validate performance against launch SLOs (`intake p95 < 500ms sustained`, `zero drops at 1k rps/60s burst`), harden observability, ship public API docs + sandbox, write launch runbook + on-call checklist, pass a security baseline (CSP + signup rate limit + IDOR review), reserve a 3-day bug-triage window, and cut `v1.0.0`.

**Architecture:** Purely additive — no schema rewrites. One new table (`AlertLog`), two new API routes (`/api/v1/metrics/summary`, extended `/api/v1/health`), one new admin page (`/docs/api`), one `src/server/alerts/rules.ts` module that runs on the existing `pg-boss` queue. Perf tooling lives under `perf/`. Docs live under `docs/runbooks/`, `docs/perf/`, `docs/api/v1/`, `docs/security/`.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), NextAuth v5, ioredis, Vitest, autocannon, `@asteasolutions/zod-to-openapi`, `@scalar/api-reference-react`.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §4 Sprint 8 + §10 Success criteria.

**Preflight:**
- All S1–S7 work merged to `main`; `git status` clean.
- Dev DB + Redis up (`pnpm db:up`); baseline `pnpm test` + `pnpm lint` + `pnpm typecheck` green.
- A seeded API key exported as `INTAKE_API_KEY` (from `pnpm db:seed`).
- `autocannon` installed as dev-dep (`pnpm list autocannon`).

**Sprint shape (~10 working days):**
- Days 1–2: perf harness (Tasks 1, 2) + baseline run (Task 3). The 30-min + 15-min scenarios consume real wall clock — plan to kick them off morning day 1 and day 2 while working on adjacent tasks in parallel.
- Days 3–4: E2E test (Task 4) + observability wiring (Task 5). The helper extracted in Task 4 is reused by Task 5 tests; order matters.
- Day 5: health+metrics (Task 6) + alerts engine (Task 7). Alert-rule SQL should be written against the actual seed data, not imagined data — start with the e2e helper's output as a fixture.
- Days 6–7: runbooks (Task 8) + public docs (Task 9) + security baseline (Task 10). These are mostly doc-writing + light code; batch into one focused block.
- Days 8–10: bug triage (Task 11) **in parallel** with launch checklist (Task 12), version bump (Task 13), `CLAUDE.md` update (Task 14), final verification (Task 15). Days 8–10 have a strict no-new-features rule — only fixes + docs.

**Critical path:** Task 3 (perf) blocks Tasks 12–15 (can't sign the launch checklist without baseline numbers). Task 4 (e2e) blocks Task 5 (observability test reuses helper). Task 7 (alerts) blocks Task 8 runbook rule-specific sections. Everything else is loosely coupled.

---

### Task 1: Extend `perf/intake-load.js` with 30-min 500-rps scenario

**Files:**
- Modify: `perf/intake-load.js` — add a `sustained_500_rps_30m` entry to the `scenarios` array (`{ duration: 1800, connections: 500 }`).
- Modify: `perf/README.md` — describe the new scenario + document the GA pass gate (`p95 < 500ms`, `err_pct < 0.5%`).

- [ ] **Step 1:** Read `perf/intake-load.js` (68 lines). Confirm the `scenarios` array on line ~21 holds two entries. Note the pass-gate calculation at the bottom of `run()` — `pass = slo.p95_ms < 500 && slo.err_pct < 0.5` — it applies uniformly across scenarios, so our 30-min scenario inherits it for free.
- [ ] **Step 2:** Append the new scenario. The final array:

  ```javascript
  const scenarios = [
    { name: "sustained_300_rps_15m", duration: 900, connections: 300 },
    { name: "burst_1000_rps_60s", duration: 60, connections: 1000 },
    { name: "sustained_500_rps_30m", duration: 1800, connections: 500 },
  ];
  ```

  `autocannon`'s `connections` doubles as steady-state rps at `pipelining: 1` once the ramp-up settles — so `connections: 500` produces ~500 rps.
- [ ] **Step 3:** Append usage section to `perf/README.md`:
  - Command: `INTAKE_API_KEY=ak_... node perf/intake-load.js sustained_500_rps_30m`.
  - Gate: `p95 < 500ms`, `err_pct < 0.5%`.
  - Baseline destination: `docs/perf/v1-baseline.md` (Task 3).
  - Note that the scenario assumes a warm dev server — start `pnpm dev` and run a 30-rps warmup for 60s (`node perf/intake-load.js sustained_300_rps_15m` for 60s) before the real measurement.
- [ ] **Step 4:** Smoke: export `INTAKE_API_KEY`, run the harness for ~5 seconds and `^C`. Confirm the autocannon table header prints (columns: `Stat | 2.5% | 50% | 97.5% | 99% | Avg | Stdev | Min`). Real run happens in Task 3.
- [ ] **Step 5:** Commit.

```bash
git add perf/intake-load.js perf/README.md
git commit -m "perf(intake): add sustained_500_rps_30m scenario"
```

---

### Task 2: Create `perf/routing-stress.js` (10k batch simulations)

**Files:**
- Create: `perf/routing-stress.js` — autocannon harness POSTing 10k-lead batches to `/api/v1/routing/simulate`.
- Create: seed helper in `prisma/seed.ts` behind `SEED_PERF=1` that creates `flow-perf-default` with 5 brokers + 5 `FlowBranch` rows weighted 10..14. No-op if the flow already exists.
- Modify: `perf/README.md` — document invocation + gate (`p95 < 1000ms`, `err_pct < 0.5%`).

- [ ] **Step 1:** Write `perf/routing-stress.js` using the same shape as `intake-load.js`:
  - `TARGET` default `http://localhost:3000/api/v1/routing/simulate`.
  - `BATCH_SIZE` from env (default 10_000). Build a batch with randomized `country` from `["US","DE","FR","GB","IT","ES","PL","NL","SE","NO"]`; `flow_id` from env.
  - Request body shape: `{ flow_id, leads: [{ external_lead_id, country, email, phone }, ...], mode: "batch" }`. Each lead's `phone` is `+15555XXXXXXX` (7-digit pad) to avoid collisions.
  - Headers: `content-type: application/json`, `authorization: Bearer ${API_KEY}`.
  - Two scenarios in a `scenarios` map: `batch_10k_sustained = { duration: 300, connections: 20, pipelining: 1 }` (engine throughput — one long batch per request, low concurrency) and `batch_10k_concurrent = { duration: 300, connections: 100, pipelining: 1 }` (exercises Redis WRR Lua script contention).
  - `setupClient: (c) => { c.setBody = () => makeBatch() }` so each request gets a fresh batch.
  - SLO block identical to intake-load but gate is looser: `pass = slo.p95_ms < 1000 && slo.err_pct < 0.5` — 10k-lead batch inherently takes longer than a single-request intake.
- [ ] **Step 2:** Extend `prisma/seed.ts` with an `if (process.env.SEED_PERF === "1") await seedPerfFlow();` block at the bottom of the main seed. `seedPerfFlow()` does:
  - Check `prisma.flow.findUnique({ where: { id: 'flow-perf-default' } })` — if present, return (idempotent).
  - Create 5 `Broker` rows with names `perf-broker-0..4`, `adapterKind: 'HTTP'`, `config: {}`, `isActive: true`.
  - Create `Flow` with `id: 'flow-perf-default'`, `algorithm: 'WRR'`, `description: 'for perf/routing-stress.js'`.
  - Create `FlowVersion` `version: 1`, `isPublished: true`, `publishedAt: new Date()`.
  - Create 5 `FlowBranch` rows pointing to those brokers, `weight: 10 + i`, `priority: i`.
  - Also create a perf-only `Affiliate` + `ApiKey` with `keyPrefix: 'ak_perf_'` so the harness can use a stable credential; log the raw key to stdout so the operator can export it.
- [ ] **Step 3:** Document in `perf/README.md` — show `SEED_PERF=1 pnpm db:seed` prerequisite, both scenario commands, pass criteria.
- [ ] **Step 4:** Smoke: `SEED_PERF=1 pnpm db:seed` creates the fixtures without error. Run harness for a few seconds to confirm requests land (look at `SELECT count(*) FROM "RoutingDecision"`).
- [ ] **Step 5:** Commit.

```bash
git add perf/routing-stress.js perf/README.md prisma/seed.ts
git commit -m "perf(routing): add routing-stress harness (10k batch simulations)"
```

---

### Task 3: Run perf baseline + document in `docs/perf/v1-baseline.md`

**Files:**
- Create: `docs/perf/v1-baseline.md`
- Create: `docs/perf/v1-baseline-logs/` (raw autocannon output).

- [ ] **Step 1:** Start dev server in terminal A: `pnpm dev`. Wait for Next.js ready banner.
- [ ] **Step 2:** In terminal B: `SEED_PERF=1 pnpm db:seed`; export the printed `ak_perf_...` key as `INTAKE_API_KEY`.
- [ ] **Step 3:** Run and tee each scenario log to `/tmp/`:
  - `node perf/intake-load.js sustained_300_rps_15m | tee /tmp/perf-300.log` (15 min)
  - `node perf/intake-load.js burst_1000_rps_60s | tee /tmp/perf-1k.log` (1 min) — **zero drops required** (err_pct `0.00`, `non2xx` 0).
  - `node perf/intake-load.js sustained_500_rps_30m | tee /tmp/perf-500.log` (30 min)
  - `node perf/routing-stress.js batch_10k_sustained | tee /tmp/perf-routing-sus.log`
  - `node perf/routing-stress.js batch_10k_concurrent | tee /tmp/perf-routing-conc.log`
- [ ] **Step 4:** If any scenario FAILs the gate, stop and triage. Typical causes:
  - Intake p95 > 500ms → Prisma connection pool (`DATABASE_URL?connection_limit=40`), `AuditLog` hash-chain cost (batch the writes), or pino overhead at `info` (drop to `warn`).
  - 1k burst drops → node HTTP header size, `pg-boss` insert rate, Next.js body-size limits.
  - Routing stress fail → Redis Lua WRR contention (check `redis-cli info stats | grep lua`), reduce branch count in seed for isolation, look at `pg_stat_statements` top queries.
  Document bottleneck + fix in baseline doc. **Do not proceed to Task 4 until all 5 scenarios PASS.**
- [ ] **Step 5:** Create `docs/perf/v1-baseline.md` with:
  - **Header:** date `2026-07-28`, `git rev-parse HEAD`, host spec (`uname -a`, `sysctl -n hw.ncpu`, `sysctl -n hw.memsize | awk '{print $1/1024/1024/1024" GB"}'`), Postgres version (`SELECT version()`), Redis version (`redis-cli INFO server | grep redis_version`).
  - **Summary table:** columns `Scenario | Target p95 | Measured p95 | p99 | err_pct | Verdict`. Five rows for the 5 scenarios. Mark PASS/FAIL explicitly per row.
  - **Tuning applied:** explicit list of what was changed during the run to achieve the baseline (e.g. `DATABASE_URL?connection_limit=40`, `LOG_LEVEL=warn`, `AUDIT_HASH_CHAIN_SECRET` present, pg-boss `newJobCheckIntervalSeconds=1`). These become production defaults — `docs/runbooks/v1-launch.md` references them.
  - **Bottlenecks observed:** top 1–3 with supporting evidence. Capture during-run snapshots of `pg_stat_activity`, `redis-cli slowlog GET 10`, Node heap usage (`process.memoryUsage()` — exposed via `/api/v1/health/debug` if necessary). Reference specific log files.
  - **GA-gate status** checklist (3 items): intake p95 < 500ms sustained @ 500 rps over 30 min; 1k rps / 60s burst with zero drops; routing 10k-batch p95 < 1000ms.
  - **Raw output:** list the 5 log files in `docs/perf/v1-baseline-logs/` with a one-line summary each.
  - **Reproduction instructions:** exact sequence another engineer would run to reproduce the numbers. Include the seed command, the env vars, the scenario order.
- [ ] **Step 6:** `mkdir -p docs/perf/v1-baseline-logs && cp /tmp/perf-*.log docs/perf/v1-baseline-logs/`.
- [ ] **Step 7:** Commit.

```bash
git add docs/perf/v1-baseline.md docs/perf/v1-baseline-logs/
git commit -m "docs(perf): v1.0 baseline — intake + routing stress results"
```

---

### Task 4: End-to-end smoke test (`tests/e2e/v1-full-flow.test.ts`)

**Files:**
- Create: `tests/e2e/v1-full-flow.test.ts`
- Create: `tests/helpers/e2e-flow.ts` — extractable helper so Task 5 can reuse.
- Modify: `vitest.config.ts` if `tests/e2e/` isn't already in `include`.

- [ ] **Step 1:** Confirm `tests/e2e/` picked up. `grep -n include vitest.config.ts`. If not, extend `include` to `["tests/**/*.test.ts"]`.
- [ ] **Step 2:** Write `tests/helpers/e2e-flow.ts` that exports `runE2EFlow(): Promise<{ leadId, brokerId, affiliateId, apiKey }>`. Its body, in order:
  1. Create `Organization`, `Affiliate` (`totalDailyCap: 1000`, `isActive: true`), `User` with `role: "ADMIN"` tied to the org (so `auth()`-based endpoints in Task 6 can be exercised via the same helper).
  2. Create `ApiKey` — hash a fresh `ak_${randomBytes(16).toString("hex")}`; store `keyHash`, `keyPrefix`, `allowedIps: []`.
  3. Create `Broker` (adapterKind `HTTP`, `config: { url: "http://localhost:9999/mock-broker", method: "POST" }`, `isActive: true`). The URL is intentionally unreachable — we assert push-attempt recording, not success.
  4. Create `Flow` (`algorithm: "WRR"`) + published `FlowVersion` (`version: 1, isPublished: true`) + one `FlowBranch` → that broker (`weight: 100, priority: 0`).
  5. Link affiliate → flow via the wiring model used in v1.0. Before writing this, `grep -rn "affiliateFlow\|flowAssignment\|AffiliateFlow" prisma/schema.prisma src/` — use whatever exists. Do not invent a new table.
  6. `POST /api/v1/leads` via `intakePOST(new Request(...))` with the seeded api key — body `{ external_lead_id: "e2e-1", first_name, last_name, email, phone: "+15555550100", country: "US" }`. Headers: `authorization: Bearer ${apiKey}`, `content-type: application/json`, `x-api-version: "2026-01"`.
  7. Wait 250ms for inline job processing — test env runs `pg-boss` with `SYNC_JOBS=1` (check `src/server/jobs/boss.ts`; if the flag name differs, use that).
  8. Simulate a postback: dynamic-import `@/app/api/v1/postbacks/[broker]/route` and call `postbackPOST(new Request(..., { external_lead_id: "e2e-1", broker_lead_id: "b-1", status: "FTD", amount: 100 }), { params: Promise.resolve({ broker: broker.externalId }) })`.
  Return `{ leadId, brokerId, affiliateId, apiKey }`. The caller (Task 4, Task 5, Task 10) uses the returned ids for assertions.
- [ ] **Step 3:** Write `tests/e2e/v1-full-flow.test.ts`. One `it("...")` block calling `runE2EFlow()` and asserting:
  - `Lead.state` in `['PUSHED', 'PUSH_PENDING', 'PUSH_FAILED']`.
  - `RoutingDecision` exists for the lead; `brokerId` matches.
  - `PushAttempt` exists for the lead (regardless of the mock response — we care that the stack ran).
  - `LeadEvent` count for that lead ≥ 3 (`CREATED` + `PUSHED` + `FTD`).
  - `TelegramOutbox` row exists with `eventType: 'FTD'`.
  Timeout: 30_000ms.
- [ ] **Step 4:** Schema-alignment pass: if any model name in Step 2/3 doesn't exist in `prisma/schema.prisma` (because S2–S7 diverged), adjust the test — not the production code. Common divergences: `AffiliateFlow` might be `FlowAssignment`; `TelegramOutbox` might be `TelegramEvent`.
- [ ] **Step 5:** `pnpm vitest run tests/e2e/v1-full-flow.test.ts`. Expected: PASS.
- [ ] **Step 6:** Commit.

```bash
git add tests/e2e/v1-full-flow.test.ts tests/helpers/e2e-flow.ts vitest.config.ts
git commit -m "test(e2e): v1.0 full-flow smoke — signup → lead → postback → telegram"
```

---

### Task 5: Structured-logging audit + gap fixes

**Files:**
- Modify: `src/server/observability.ts` — ensure a single shared `logger` export with pino redact paths for `authorization`, `cookie`, `body.email`, `body.phone`, `body.password`, `*.apiKey`.
- Modify: `src/app/api/v1/leads/route.ts` and `src/app/api/v1/leads/bulk/route.ts` — emit `intake.request` (trace_id, affiliate_id, api_key_prefix, content_length, api_version) at entry and `intake.response` (status, duration_ms, outcome) before every `return`.
- Modify: `src/server/routing/engine.ts` — emit `routing.decision` (trace_id, flow_id, flow_version, branch_id, algorithm, broker_id, decided_in_ms, constraints_passed) at the successful-return site. Thread `traceId` through the engine's context arg (optional field, defaults to `"unknown"` — no caller breakage).
- Modify: `src/server/broker-adapter/*` — wrap the HTTP call with a `try/finally` that emits `broker.push` (trace_id, broker_id, lead_id, outcome, latency_ms, attempt).
- Modify: `src/server/intake/fraud-score.ts` — emit `fraud.score` (trace_id, lead_id, score, signals[], decision) after score compute.
- Modify: `src/server/telegram/emit.ts` — emit `telegram.emit` (trace_id, event_type, recipients, subscription_ids) at emission site.
- Create: `tests/integration/observability-events.test.ts` — spies on `logger.info`, runs `runE2EFlow()` from Task 4, asserts every event name is present.

- [ ] **Step 1:** `grep -rn "logger\." src/ | head -40` and `grep -rn "from \"pino\"" src/` — if a shared `logger` already exists, note its location; else add to `src/server/observability.ts`.
- [ ] **Step 2:** In `src/server/observability.ts` ensure `export const logger = pino({ level: LOG_LEVEL, base: { app: "crm-node", env }, redact: { paths: [...], censor: "[REDACTED]" } })`. Redact paths listed above.
- [ ] **Step 3:** Intake wiring: at top of `POST`, derive `const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID()` + `reqLog = logger.child({ trace_id, route })`. Emit `intake.request` with metadata only (no body — belt-and-braces on top of redact). Emit `intake.response` with `status, duration_ms, outcome: status<300 ? "accepted" : "rejected"` before each `return`.
- [ ] **Step 4:** Routing wiring: at the "picked" return site in `engine.ts`, log the decision payload. If `engineStart`/`constraintsSummary` aren't tracked yet, add them as local `let` in the engine's main path.
- [ ] **Step 5:** Broker-push wiring: wrap `await doPush(...)` in `try { ... pushOutcome = "success"; } catch/finally { ... }` pattern; the `finally` logs `broker.push` with the measured latency and `attemptNumber`.
- [ ] **Step 6:** Fraud wiring: after `score = computeFraudScore(...)`, log `fraud.score` with `signals.map(s => ({ kind, weight }))` (no values — weights only) + the `decision` literal.
- [ ] **Step 7:** Telegram wiring: at the emission loop's top, log `telegram.emit` with `recipients.length` and ids — do NOT log payload body.
- [ ] **Step 8:** Create `tests/integration/observability-events.test.ts`:
  ```typescript
  import { describe, expect, it, vi } from "vitest";
  import { logger } from "@/server/observability";
  import { runE2EFlow } from "../helpers/e2e-flow";

  describe("structured logging contract", () => {
    it("each critical path emits one event type", async () => {
      const spy = vi.spyOn(logger, "info");
      await runE2EFlow();
      const events = spy.mock.calls
        .map((c) => (c[0] as any)?.event)
        .filter(Boolean);
      for (const e of [
        "intake.request",
        "intake.response",
        "routing.decision",
        "broker.push",
        "fraud.score",
        "telegram.emit",
      ]) {
        expect(events).toContain(e);
      }
    });
  });
  ```
  Also assert each event payload has `trace_id` string: iterate the spy's captured call args for `routing.decision` / `broker.push` / `fraud.score` / `telegram.emit`, assert `(call[0] as any).trace_id` is a non-empty string — catches threading bugs where one module forgets to pass the id through.
- [ ] **Step 9:** `pnpm vitest run tests/integration/observability-events.test.ts && pnpm lint && pnpm typecheck`.
- [ ] **Step 10:** Commit.

```bash
git add src/server/observability.ts src/app/api/v1/leads src/server/routing/engine.ts src/server/broker-adapter src/server/intake/fraud-score.ts src/server/telegram tests/integration/observability-events.test.ts
git commit -m "observability: structured pino events across intake/routing/push/fraud/telegram"
```

---

### Task 6: Extend `/api/v1/health` + add `/api/v1/metrics/summary`

**Files:**
- Modify: `src/app/api/v1/health/route.ts` — add `queue: { pending, failed_last_hour }` and `version` (from `package.json`).
- Create: `src/server/metrics/rolling-counters.ts` — Redis sorted-set-based 60s rolling counters.
- Create: `src/app/api/v1/metrics/summary/route.ts` — admin-auth endpoint returning the 5 summary counters.
- Create: `tests/integration/health-and-metrics.test.ts`.

- [ ] **Step 1:** Extend `/api/v1/health/route.ts`:
  - Keep existing db + redis checks (already 27 lines; do not regress).
  - Add two raw queries wrapped in try/catch (pgboss schema may be missing in a fresh DB — never let that 500 the health check):
    ```typescript
    try {
      const pending = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM pgboss.job
        WHERE state IN ('created','retry','active')`;
      const failed = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM pgboss.job
        WHERE state = 'failed' AND completedon > NOW() - INTERVAL '1 hour'`;
      queue = {
        pending: Number(pending[0]?.count ?? 0),
        failed_last_hour: Number(failed[0]?.count ?? 0),
      };
    } catch {
      ok = false; // missing pgboss schema is degraded, not unknown
    }
    ```
  - Import `version` from `package.json`: `import pkg from "../../../../../package.json" with { type: "json" };` (path has 5 hops up from `src/app/api/v1/health/route.ts`).
  - Response shape: `{ status: "ok" | "degraded", db: "ok" | "down", redis: "ok" | "down", queue: { pending, failed_last_hour }, version }`. HTTP 200 when `ok=true`, 503 otherwise.
  - Do **not** expose arbitrary DB row counts (e.g. affiliate count, lead count) — keep `/health` load-balancer-friendly and PII-free; richer numbers belong to `/metrics/summary`.
- [ ] **Step 2:** Write `src/server/metrics/rolling-counters.ts`:
  - Key prefix `metrics:rolling:`, `WINDOW_SECONDS = 60`, one Redis sorted-set per counter. Members are unique uuid-like strings (`${now}-${Math.random().toString(36).slice(2)}`); scores are unix seconds.
  - `async function incrCounter(name: string, by = 1): Promise<void>` — pipeline (`redis.multi()`) `zadd` × `by` + `expire key 120` (twice the window so readers have slack during cold starts).
  - `async function readCounter(name: string): Promise<number>` — `zremrangebyscore key 0 (now-60)` followed by `zcard key`. The zremrange is a lazy GC at read time; no background sweeper required.
  - `async function readAll(names: string[]): Promise<Record<string, number>>` — sequential `await` loop is fine (5 keys, sub-ms each).
  - Export the name constants as a frozen object:
    ```typescript
    export const COUNTER_NAMES = {
      LEADS_RECEIVED: "leads_received",
      LEADS_PUSHED: "leads_pushed",
      FRAUD_HIT: "fraud_hit",
      BROKER_DOWN: "broker_down_count",
      MANUAL_QUEUE_DEPTH: "manual_queue_depth",
    } as const;
    ```
  - Unit test (`tests/unit/rolling-counters.test.ts`): `incrCounter("foo", 5)` → `readCounter("foo") === 5`; wait 61s (`vi.useFakeTimers()` + advance) → `readCounter("foo") === 0`.
- [ ] **Step 3:** Wire `incrCounter` calls at:
  - Intake accepted path → `leads_received`.
  - Broker push success path → `leads_pushed`.
  - Fraud auto-reject path → `fraud_hit`.
  - Broker-health monitor when a broker flips to `DOWN` → `broker_down_count`.
  (`manual_queue_depth` is read as a point-in-time gauge via `pgboss.job` query, not via rolling counter.)
- [ ] **Step 4:** Write `src/app/api/v1/metrics/summary/route.ts`:
  - `GET` handler. `const session = await auth();` → 401 if no session.
  - Load `User` by `session.user.id`; require `role === "ADMIN"` → 403 otherwise.
  - Return `{ window_seconds: 60, leads_received, leads_pushed, fraud_hit, broker_down_count, manual_queue_depth }`.
  - Manual-queue query: `SELECT COUNT(*)::bigint FROM pgboss.job WHERE name = 'manual-queue' AND state IN ('created','retry','active');`.
- [ ] **Step 5:** Write `tests/integration/health-and-metrics.test.ts`:
  - Health test: GET the handler, expect `status in [200, 503]`, body has `db, redis, queue.pending, queue.failed_last_hour, version` matching `/^\d+\.\d+\.\d+$/`.
  - Metrics test: unauthenticated call → 401. Authenticated admin path covered indirectly via e2e (needs session mock — stub to come in Task 4 helpers if missing).
- [ ] **Step 6:** `pnpm vitest run tests/integration/health-and-metrics.test.ts`.
- [ ] **Step 7:** Commit.

```bash
git add src/app/api/v1/health/route.ts src/app/api/v1/metrics src/server/metrics tests/integration/health-and-metrics.test.ts
git commit -m "feat(observability): /health queue+version, /metrics/summary rolling counters"
```

---

### Task 7: Alert rules engine + `AlertLog` table

**Files:**
- Modify: `prisma/schema.prisma` — add `AlertLog { id, ruleKey, severity, triggeredAt, windowStart, windowEnd, measurement Json, message, resolvedAt }` with indexes on `(ruleKey, triggeredAt)` and `(resolvedAt)`.
- Create: `src/server/alerts/rules.ts` — 6 rule definitions.
- Create: `src/server/alerts/evaluator.ts` — `evaluateAlerts(now)` loop with de-dup + auto-resolve.
- Create: `src/server/jobs/alerts-evaluator.ts` — pg-boss registration on `*/1 * * * *`.
- Create: `tests/integration/alerts-rules.test.ts` — one case per rule.

- [ ] **Step 1:** Add `AlertLog` model to schema, `pnpm prisma db push`.
- [ ] **Step 2:** Write `src/server/alerts/rules.ts` exporting `rules: Rule[]`. Each `Rule = { key, severity: "warning" | "critical", windowSeconds, evaluate(now): Promise<null | AlertTrigger> }`. The 6 rules, with measurement logic:
  - **`intake_failure_rate`** (critical, 300s): count `Lead WHERE createdAt >= now - 5m`, failed = states `REJECTED|INVALID|ERROR`. Skip if `total < 100`. Trigger if `failed/total > 0.01`. Measurement: `{ rate, failed, total, threshold: 0.01 }`.
  - **`routing_p95`** (critical, 300s): `percentile_cont(0.95) WITHIN GROUP (ORDER BY "decidedInMs") FROM "RoutingDecision" WHERE createdAt >= now - 5m`. Trigger if `p95 > 1000`.
  - **`autologin_sla_breach`** (warning, 600s): count `AutologinAttempt WHERE createdAt >= now - 10m AND outcome = 'FAILED' AND slaMs > 10000`. Trigger if count > 0.
  - **`manual_queue_depth`** (warning, 60s): `pgboss.job WHERE name = 'manual-queue' AND state IN ('created','retry','active')`. Trigger if count > 50.
  - **`broker_down_prolonged`** (critical, 600s): `Broker WHERE healthStatus = 'DOWN' AND healthStatusSince < now - 10m`. Trigger if any match.
  - **`ftd_dropoff`** (warning, 86400s): count FTD `LeadEvent` today vs yesterday (bucket via SQL `CASE`). Skip if `yesterday < 10`. Trigger if `1 - today/yesterday > 0.3`.
- [ ] **Step 3:** Write `src/server/alerts/evaluator.ts::evaluateAlerts(now = new Date())`:
  - For each rule: call `rule.evaluate(now)`.
  - If `null` → auto-resolve: `AlertLog.updateMany({ where: { ruleKey, resolvedAt: null }, data: { resolvedAt: now } })`.
  - If trigger → dedupe: `AlertLog.findFirst({ where: { ruleKey, triggeredAt: { gte: now - windowSeconds }, resolvedAt: null } })` — if found, skip.
  - Else insert `AlertLog` + `emitTelegramEvent({ eventType: "ALERT_TRIGGERED", payload: { rule_key, severity, message, alert_id } })` + `logger.warn({ event: "alert.triggered", ... })`.
  - Wrap each rule's body in `try/catch` — a broken rule must not block the others (`logger.error({ event: "alert.evaluator_error", rule_key, err })`).
- [ ] **Step 4:** Register in `src/server/jobs/alerts-evaluator.ts`: `boss.work("alerts-evaluator", async () => evaluateAlerts()); boss.schedule("alerts-evaluator", "*/1 * * * *");`. Call from the jobs-bootstrap (wherever other `boss.work(...)` live).
- [ ] **Step 5:** Write `tests/integration/alerts-rules.test.ts` — one `it()` per rule. Structure:
  - `intake_failure_rate`: seed 195 leads `state=PUSHED` + 5 leads `state=REJECTED`. `await evaluateAlerts()`. Assert `AlertLog` has exactly 1 row `ruleKey=intake_failure_rate, severity=critical`. Re-invoke `evaluateAlerts()` — still exactly 1 row (dedupe).
  - `routing_p95`: seed 10 `RoutingDecision` rows with `decidedInMs` values `[200,300,400,500,700,800,900,1200,1400,1600]` — p95 = 1480ms. Trigger. Assert severity critical.
  - `autologin_sla_breach`: seed 2 `AutologinAttempt` rows `outcome=FAILED, slaMs=12000`. Trigger. Assert severity warning.
  - `manual_queue_depth`: insert 51 `pgboss.job` rows with `name='manual-queue', state='created'`. Trigger. Assert severity warning.
  - `broker_down_prolonged`: create one `Broker` `healthStatus='DOWN', healthStatusSince: now - 11 min`. Trigger. Severity critical.
  - `ftd_dropoff`: seed 100 FTD `LeadEvent` yesterday + 20 today (80% drop). Trigger. Severity warning.
  Plus a `does-not-trigger-when-quiet` case: empty DB → `evaluateAlerts()` produces 0 `AlertLog` rows, no throws.
  Plus an `auto-resolves` case: trigger once, then remove the causing rows (e.g. delete the REJECTED leads), call again — original row's `resolvedAt` is set.
- [ ] **Step 6:** `pnpm vitest run tests/integration/alerts-rules.test.ts && pnpm lint && pnpm typecheck`.
- [ ] **Step 7:** Commit.

```bash
git add prisma/schema.prisma src/server/alerts src/server/jobs/alerts-evaluator.ts tests/integration/alerts-rules.test.ts
git commit -m "feat(alerts): rules engine + AlertLog + Telegram emission (6 rules)"
```

---

### Task 8: Launch runbook + on-call checklist

**Files:**
- Create: `docs/runbooks/v1-launch.md`
- Create: `docs/runbooks/oncall-checklist.md`

- [ ] **Step 1:** Write `docs/runbooks/v1-launch.md` with one section per failure mode. Each section has five parts: **Symptom**, **Confirm**, **Triage** (3–5 numbered steps), **Rollback/Mitigation**, **Escalate**. Sections:
  - **On intake degradation** — alert `intake_failure_rate` or `/health` 503. Confirm: `curl /api/v1/health`, `/api/v1/metrics/summary`. Triage: Postgres conns (`pg_stat_activity` — raise `connection_limit`), Redis ping, per-affiliate traffic skew (`SELECT "affiliateId", count(*) FROM "Lead" WHERE createdAt > NOW() - INTERVAL '5 min' GROUP BY 1 ORDER BY 2 DESC`), recent-deploy log-cost regression (`LOG_LEVEL=warn`). Rollback: `git revert HEAD && pnpm deploy`. Escalate: DB on-call + founder.
  - **On broker-down** — alert `broker_down_prolonged`. Confirm: `SELECT id, name, healthStatus, healthStatusSince FROM "Broker" WHERE healthStatus != 'UP';`. Triage: one vs many (egress broken → test `curl httpbin.org/ip` from node), vendor-side 5xx / timeout / endpoint change, temporary pause: `UPDATE "FlowBranch" SET weight=0 WHERE "brokerId"=$1`. Rollback: none. Escalate: vendor + founder.
  - **On queue backup** — alert `manual_queue_depth` or `/health` queue.pending > 1000. Confirm: `SELECT name, state, count(*) FROM pgboss.job GROUP BY 1,2 ORDER BY 3 DESC`. Triage: worker count mismatch (`ps aux | grep node`), single-job retry loop (`SELECT name, count(*) FROM pgboss.job WHERE state='retry' GROUP BY 1`), poisoned jobs (manually `state='failed'` where retrycount > 5), horizontal scale. Rollback: none. Escalate: founder + DB on-call if queue > 10k.
  - **On autologin failure** — alert `autologin_sla_breach`. Confirm: `SELECT count(*), outcome FROM "AutologinAttempt" WHERE createdAt > NOW() - INTERVAL '1 hour' GROUP BY 2`. Triage: proxy pool exhausted (rotate provider env + restart), captcha detection spike (`Broker.autologinEnabled=false` temporarily), broker session-cookie format changed (inspect response body; push selector fix to `src/server/autologin/extract.ts`). Rollback: previous autologin worker image. Escalate: proxy vendor + founder.
  - **On fraud spike** — `fraud_hit` counter >100 in 60s. Confirm: `SELECT count(*), fraudScore FROM "Lead" WHERE createdAt > NOW() - INTERVAL '10 min' GROUP BY 2`. Triage: per-affiliate concentration (pause), misflagging (temporarily reduce `FraudPolicy.autoRejectThreshold` -10, manually review top-50), recent blacklist bulk import (`DELETE FROM "BlacklistEntry" WHERE createdAt > NOW() - INTERVAL '1 hour'`), `FraudPolicy` edit revert via audit log. Rollback: revert policy edit or code+redeploy. Escalate: founder + compliance.
- [ ] **Step 2:** Write `docs/runbooks/oncall-checklist.md` with three sections:
  - **Morning** (within 1h of shift start): copy the checklist into your shift notes and tick as you go.
    - [ ] `curl $PROD/api/v1/health` returns `{status: "ok"}`, `db: "ok"`, `redis: "ok"`, `queue.pending < 100`, `queue.failed_last_hour < 10`.
    - [ ] `curl -b $ADMIN_COOKIE $PROD/api/v1/metrics/summary`:
      - `leads_received > 0` (if within business hours for top-3 affiliate timezones).
      - `leads_pushed / leads_received > 0.8` — push rate sane.
      - `fraud_hit < 5% of leads_received` — fraud not runaway.
      - `broker_down_count = 0`.
      - `manual_queue_depth < 20`.
    - [ ] `AlertLog` open rows: `SELECT "ruleKey", "severity", "triggeredAt", "message" FROM "AlertLog" WHERE "resolvedAt" IS NULL ORDER BY "triggeredAt" DESC;`. Investigate every row.
    - [ ] SLA dashboard: autologin uptime last 24h ≥ 99.5%. If trending below, start triage per `docs/runbooks/v1-launch.md § On autologin failure`.
    - [ ] #on-call Telegram scrollback: any unresolved threads from previous shift?
  - **Afternoon** (4–6h after morning check):
    - [ ] Spot-check the 5 morning metrics.
    - [ ] `SELECT COUNT(*) FROM "Lead" WHERE state='PUSH_FAILED' AND "updatedAt" > NOW() - INTERVAL '4 hours';` — should stay roughly flat vs morning baseline.
    - [ ] `git log --since="this morning"` — any deploys today? If yes, verify zero new alerts in the 30-min post-deploy window.
  - **End of shift:**
    - [ ] Resolve alerts you triaged: `UPDATE "AlertLog" SET "resolvedAt" = NOW() WHERE id = '$1';`.
    - [ ] Handoff note in #on-call: summary of what fired, what's open, what's tentative.
    - [ ] Add a row to `docs/v1-bug-triage.md` for anything surprising.
  - **Emergency pager list** (bottom of file):
    - Postgres on-call: `[PHONE]` — escalate if `pg_stat_activity` shows > 80 active connections or replica lag > 30s.
    - Proxy vendor (autologin): `[EMAIL + ESCALATION PATH]`.
    - Founder / commercial: `[TELEGRAM]` — any affiliate pause, vendor escalation, or customer-impacting outage.
    - Broker vendor contacts: `docs/runbooks/broker-contacts.md` (create in S8 T8 step 3 with top-10 broker emails + backup contacts).
- [ ] **Step 3:** Commit.

```bash
git add docs/runbooks/
git commit -m "docs(runbooks): v1 launch runbook + on-call checklist"
```

---

### Task 9: OpenAPI spec generation + `/docs/api` page

**Files:**
- Install: `@asteasolutions/zod-to-openapi`, `yaml` (dev-deps); `@scalar/api-reference-react` (runtime).
- Create: `src/server/schema/openapi.ts` — builds the OpenAPI document from the Zod registry.
- Create: `scripts/gen-openapi.ts` — writes `docs/api/v1/openapi.{yaml,json}`.
- Create: `src/app/api/v1/openapi/route.ts` — serves the yaml at runtime.
- Create: `src/app/docs/api/page.tsx` — Scalar viewer.
- Modify: `package.json` — add `"gen:openapi": "tsx scripts/gen-openapi.ts"`.

- [ ] **Step 1:** `pnpm add -D @asteasolutions/zod-to-openapi yaml && pnpm add @scalar/api-reference-react`.
- [ ] **Step 2:** Write `src/server/schema/openapi.ts`:
  - Call `extendZodWithOpenApi(z)` once at module top so every `z.*` schema picks up the `.openapi(...)` method.
  - Build `const registry = new OpenAPIRegistry()`.
  - Register paths (minimum v1.0 public surface):
    - `POST /api/v1/leads` — body: `leadCreateSchema` from `src/server/schema/registry.ts`. Headers: `x-api-version` required (`example: "2026-01"`), `x-idempotency-key` optional, `x-trace-id` optional. Responses: 201 `{ trace_id, lead_id }`, 401 invalid api key, 403 ip not allowed, 409 idempotency conflict, 422 validation or fraud auto-reject. Tag: `Intake`.
    - `POST /api/v1/leads/bulk` — body: `leadBulkSchema`. Responses: 207 sync multi-status ≤50, 202 async job ≥50. Tag: `Intake`.
    - `GET /api/v1/leads/bulk/[jobId]` — params: `jobId`. Response: `{ status, completed, failed, total }`. Tag: `Intake`.
    - `POST /api/v1/routing/simulate` — body: `{ flow_id, leads: LeadCreate[], mode: "single" | "batch" }`. Responses: 200 sync (batch ≤100) or 202 async (batch >100) `{ job_id }`. Tag: `Routing`.
    - `GET /api/v1/routing/simulate/[jobId]` — params: `jobId`. Response: simulation results. Tag: `Routing`.
    - `GET /api/v1/schema/leads` — query: `version?`. Response: Zod-schema JSON for self-discovery. Tag: `Schema`.
    - `GET /api/v1/errors` — response: error catalog. Tag: `Schema`.
    - `GET /api/v1/health` — response: `{ status, db, redis, queue, version }` shape from Task 6. Tag: `Operations`. No auth.
  - Register `securitySchemes.bearerAuth = { type: 'http', scheme: 'bearer', bearerFormat: 'api-key' }` and apply `security: [{ bearerAuth: [] }]` on every Intake + Routing path.
  - Build + return the document:
    ```typescript
    return new OpenApiGeneratorV3(registry.definitions).generateDocument({
      openapi: "3.0.0",
      info: {
        version: "1.0.0",
        title: "GambChamp CRM API",
        description: [
          "Lead distribution platform public API.",
          "All intake and routing endpoints require a Bearer api key.",
          "",
          "## Sandbox",
          "Toggle `isSandbox: true` on any api key (dashboard → settings → api keys) — requests",
          "continue to hit the same URLs but responses become deterministic mocks based on the",
          "`external_lead_id` prefix. See `GET /api/v1/errors` for the mock outcome catalog.",
          "",
          "Interactive docs: [/docs/api](/docs/api).",
        ].join("\n"),
      },
      servers: [
        { url: "https://api.gambchamp.example.com", description: "production" },
        { url: "https://sandbox.gambchamp.example.com", description: "sandbox" },
      ],
    });
    ```
- [ ] **Step 3:** Write `scripts/gen-openapi.ts`: `import { buildOpenApiSpec }`; `mkdirSync("docs/api/v1", { recursive: true })`; write `openapi.yaml` (via `yaml.stringify`) + `openapi.json`.
- [ ] **Step 4:** Add `"gen:openapi": "tsx scripts/gen-openapi.ts"` to `package.json`. Run it. Confirm both files exist.
- [ ] **Step 5:** Write `src/app/api/v1/openapi/route.ts`: reads `docs/api/v1/openapi.yaml` via `readFileSync(path.join(process.cwd(), ...))` and returns with `content-type: application/yaml`.
- [ ] **Step 6:** Write `src/app/docs/api/page.tsx` (client component):
  - `"use client"` + `import { ApiReferenceReact } from "@scalar/api-reference-react"` + its CSS import.
  - Wrap viewer in a top banner: "Sandbox keys: in the dashboard, create an API key and toggle 'sandbox mode' — all intake endpoints become deterministic mocks. See docs description for outcome catalog."
  - `configuration={{ spec: { url: "/api/v1/openapi" }, theme: "default", layout: "modern" }}`.
- [ ] **Step 7:** Smoke: `pnpm dev`, visit `/docs/api`, confirm Scalar renders and `POST /api/v1/leads` is clickable with the body schema visible.
- [ ] **Step 8:** Commit.

```bash
git add src/server/schema/openapi.ts scripts/gen-openapi.ts docs/api/v1/ src/app/docs/api/page.tsx src/app/api/v1/openapi/route.ts package.json pnpm-lock.yaml
git commit -m "feat(docs): OpenAPI spec generated from Zod + /docs/api viewer"
```

---

### Task 10: Security baseline — CSP, signup rate limit, IDOR review

**Files:**
- Modify: `next.config.ts` — add CSP + HSTS + X-Frame-Options + Referrer-Policy via `async headers()` on non-api routes.
- Modify: whichever file owns signup (`src/app/signup/actions.ts` server action OR `src/app/api/auth/signup/route.ts`) — add ip-based rate limit (5 per hour).
- Create (or modify): `src/server/ratelimit.ts` — minimal ioredis `incr+expire` helper if not already present.
- Create: `tests/integration/security-baseline.test.ts` — SQLi + XSS + IDOR regression cases.
- Create: `docs/security/v1-pentest-checklist.md` — manual review checklist.

- [ ] **Step 1:** Extend `next.config.ts` with `async headers() { return [{ source: "/((?!api).*)", headers: [...csp, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, X-Frame-Options: DENY] }] }`. CSP directives: `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://api.gambchamp.example.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'`. (`cdn.jsdelivr.net` required for Scalar assets.) Restart `pnpm dev`; `curl -I localhost:3000/` should show the header.
- [ ] **Step 2:** Locate signup handler. Add at top, before DB writes:
  ```typescript
  const ip = extractClientIp(req) ?? "unknown";
  const ok = await rateLimit({ key: `signup:${ip}`, limit: 5, windowSeconds: 3600 });
  if (!ok) return NextResponse.json({ error: "too many signups from this ip; try again in an hour" }, { status: 429 });
  ```
  If `rateLimit` helper doesn't exist, add `src/server/ratelimit.ts`:
  ```typescript
  export async function rateLimit({ key, limit, windowSeconds }) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  }
  ```
- [ ] **Step 3:** Write `tests/integration/security-baseline.test.ts`. Four cases, each via the real handler (no mocks):
  - **SQLi via intake:** `POST /api/v1/leads` with `first_name = "Robert'); DROP TABLE \"Lead\"; --"`. Expect status in `[200, 201, 422]`. Assert the `Lead` table still exists by running `prisma.lead.count()` — must return ≥ 0 without throwing. Also run `SELECT tablename FROM pg_tables WHERE tablename = 'Lead'` via `prisma.$queryRaw` and expect one row.
  - **XSS round-trip:** `POST /api/v1/leads` with `first_name = "<script>alert(1)</script>"`. Expect `[200, 201]`. Assert `lead.firstName` is the literal string (Prisma stores raw; escaping is view-layer responsibility — documented in pentest-lite checklist). The attack-surface test is: the intake layer must not try to "sanitize" by stripping tags, because that corrupts legitimate data for downstream brokers.
  - **IDOR on affiliate-scoped GET:** Create affiliates A and B with separate api keys; create a `Lead` owned by B. Call `GET /api/v1/leads/:id` using A's key with B's lead id. Expect `[403, 404]`. If `/api/v1/leads/:id` doesn't exist yet (v1.0 may only have it via tRPC), audit the equivalent tRPC procedure: write `tests/integration/trpc-idor.test.ts` that creates two sessions and calls `trpc.lead.byId({ id: leadB.id })` with A's session — expect TRPCError `NOT_FOUND` or `FORBIDDEN`. The key invariant: `affiliateId` is derived from `ctx` (api key or session), never from a request arg. **Do not skip this case — it is a v1.0 GA gate.**
  - **IDOR on broker-config:** non-admin user's session calls `trpc.broker.byId({ id: broker.id })` — expect `FORBIDDEN`. Broker config contains vendor api keys; leakage to affiliate-role is a critical bug.
- [ ] **Step 4:** Write `docs/security/v1-pentest-checklist.md`. Manual-only items — checklist format, one-line each. Sections:
  - **SQL injection:** `grep -rn "queryRawUnsafe" src/` must be zero; intake SQLi payload; dashboard text filters.
  - **XSS:** stored raw / rendered escaped; dashboard search with `"><img src=x onerror=alert(1)>`.
  - **IDOR:** every affiliate-scoped endpoint derives `affiliateId` from `ApiKey`; every tRPC procedure uses `protectedProcedure`; broker-config visible only to org admins.
  - **Auth bypass:** missing/random/expired/revoked key → 401; sandbox key on prod-only endpoint → 403 or mock.
  - **Rate limiting:** signup 6× from same IP → 429.
  - **Secret leakage:** `git log -p | grep -E "api_key|secret|password"`; trufflehog CI; no raw Bearer tokens in app logs.
  - **TLS/headers:** CSP + HSTS + `X-Frame-Options: DENY` present.
  - **Session hygiene:** cookies `HttpOnly, Secure, SameSite=Lax`; logout actually invalidates.
- [ ] **Step 5:** `pnpm vitest run tests/integration/security-baseline.test.ts && pnpm lint && pnpm typecheck`.
- [ ] **Step 6:** Commit.

```bash
git add next.config.ts src/app/signup src/app/api/auth src/server/ratelimit.ts tests/integration/security-baseline.test.ts docs/security/
git commit -m "security(baseline): CSP + signup rate-limit + SQLi/XSS/IDOR tests + pentest-lite checklist"
```

---

### Task 11: Bug triage doc + 3-day triage window

**Files:**
- Create: `docs/v1-bug-triage.md`

- [ ] **Step 1:** Create `docs/v1-bug-triage.md` with:
  - **Window:** 2026-08-05 → 2026-08-07 (days 6–8 of S8). Parallel with Tasks 9–10; dedicated focus on days 8–10 if open-list ≥5.
  - **Severity legend:** S1 blocker (prevents launch — must fix pre-tag), S2 major (user-visible regression / data loss — fix in S8 else first patch), S3 minor (cosmetic / rare edge — defer to v1.0.1 or v1.5).
  - **Open** table columns: `Ticket | Date | Severity | Area | Summary | Owner | Status`.
  - **Closed (this sprint)** table columns: `Ticket | Date | Severity | Area | Summary | Resolution`.
  - **Triage sources:** internal smoke tests (S8 T4), manual QA by external reviewer (Task 12 launch-checklist item), alerts during perf runs, Grafana anomalies, GitHub Issues tagged `bug` + `v1.0`.
  - **Triage procedure:** daily 10:00 review + severity assignment; S1 immediate, S2 into remaining days, S3 park in `docs/v1-postlaunch-backlog.md`; every fix gets a regression test; EOD update + commit.
- [ ] **Step 2:** Commit.

```bash
git add docs/v1-bug-triage.md
git commit -m "docs: v1.0 bug triage log — 3-day window"
```

- [ ] **Step 3:** Execute the triage window procedurally during days 8–10:
  - 2× daily `pnpm test && pnpm vitest run tests/e2e/`.
  - 1× daily manual onboarding-wizard walkthrough.
  - Update `docs/v1-bug-triage.md` with any new rows.
  - **No new feature commits this window — fixes only.**

---

### Task 12: Launch checklist (`docs/v1-launch-checklist.md`)

**Files:**
- Create: `docs/v1-launch-checklist.md`

- [ ] **Step 1:** Create the checklist with sections:
  - **Engineering:** perf validated (`docs/perf/v1-baseline.md` all PASS), e2e green, full suite green (≥500 tests), lint + typecheck zero errors, health live (version `1.0.0`), metrics live, 6 alert rules deployed + one test-fire, `AlertLog` + evaluator job registered.
  - **Operations:** runbook written, on-call checklist published, on-call rotation assigned (names + shifts), monitoring dashboards linked in README + runbook, rollback documented (revert + deploy in < 5 min), backup restore drill on staging passed.
  - **Product / GTM:** public pricing page live, `/docs/api` renders in production, sandbox keys documented, broker templates ≥10 (`SELECT COUNT(*) FROM "BrokerTemplate" WHERE "isPublic" = true`), external-reviewer signup+wizard walkthrough < 30 min, wizard all 5 steps no console errors, marketing site links to docs + pricing.
  - **Security:** `tests/integration/security-baseline.test.ts` green, pentest-lite fully ticked, trufflehog on main clean, CSP + HSTS live.
  - **Release:** `package.json` version = `1.0.0`, `CHANGELOG.md` populated, tag `v1.0.0` on `main`, release notes drafted on GitHub, zero open S1 or S2 bugs.
  - **Post-launch (first 24h):** on-call runs checklist 2× day 1, metrics snapshot at T+1h/T+6h/T+24h to `docs/perf/launch-day.md` (new file), first external customer e2e acceptance.
- [ ] **Step 2:** Commit.

```bash
git add docs/v1-launch-checklist.md
git commit -m "docs: v1.0 launch checklist"
```

---

### Task 13: Version bump + CHANGELOG + tag

**Files:**
- Modify: `package.json` — `"version": "1.0.0"`.
- Create: `CHANGELOG.md` at `crm-node/CHANGELOG.md` root.

- [ ] **Step 1:** Edit `package.json`: set `"version": "1.0.0"`.
- [ ] **Step 2:** Write `CHANGELOG.md` in Keep-a-Changelog format. Single `[1.0.0] — 2026-09-10 — Core GA` entry containing one short subsection per sprint:
  - **S1 — Wave1 merge + security hardening:** wave1 merged (per-country caps, PENDING_HOLD, fraud score + auto-reject); bulk intake idempotency; ApiKey `allowedIps` + `expiresAt`; nullable `tenantId` forward-compat.
  - **S2 — Autologin + SLA + Q-Leads:** proxy pool + health; 4-stage monitoring; SLA tracker (99.5%); Q-Leads 0–100.
  - **S3 — UAD + per-column RBAC:** cold-overflow queue; retry ladder 10s/60s/5m/15m/1h; manual fallback; affiliate role hides broker-side PII.
  - **S4 — Analytics v1:** 4 drill-downs; period-compare; tokenized share links; save-filter presets; MVs hourly/daily/weekly.
  - **S5 — Telegram ops bot:** 20+ event types; subscription mgmt + per-user filters; commands `/stats /ack /pause_broker /resume_broker`.
  - **S6 — P&L + CRG:** conversion tracking; payout calc; CRG native + auto-invoicing; back-to-back invoice matching MVP (single-currency, full-invoice only).
  - **S7 — Onboarding wizard:** 5-step wizard end-to-end <30min; ≥10 broker templates; public pricing page.
  - **S8 — Hardening + launch:** perf gates (500rps/30m p95<500ms, 1k/60s zero drops, routing 10k batch p95<1s); e2e smoke; structured pino events; `/health` + `/metrics/summary`; 6-rule alerts engine; runbooks; `/docs/api` + OpenAPI spec; security baseline (CSP + signup rate-limit + SQLi/XSS/IDOR); 3-day bug triage; checklist green; tag `v1.0.0`.
- [ ] **Step 3:** Commit.

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): v1.0.0 — version bump + changelog"
```

- [ ] **Step 4:** `git tag -a v1.0.0 -m "v1.0.0 — Core GA"`. Confirm with `git tag`. Push to origin only after sign-off (`git push origin v1.0.0`).

---

### Task 14: Update `CLAUDE.md` with S8 changes

**Files:**
- Modify: `crm-node/CLAUDE.md`

- [ ] **Step 1:** Append a section below the existing S1–S7 blocks:
  ```markdown
  ## v1.0 Sprint 8 hardening + launch (August–September 2026)

  - **Perf harness:** 3 scenarios in `perf/intake-load.js` + `perf/routing-stress.js` (10k batches). Baseline: `docs/perf/v1-baseline.md`.
  - **E2E:** `tests/e2e/v1-full-flow.test.ts` + helper `tests/helpers/e2e-flow.ts`.
  - **Observability:** shared `logger` + redact paths in `src/server/observability.ts`; structured events `intake.request`, `intake.response`, `routing.decision`, `broker.push`, `fraud.score`, `telegram.emit`.
  - **Health + metrics:** `/api/v1/health` returns `{status, db, redis, queue, version}`; `/api/v1/metrics/summary` admin-auth with 60s rolling counters from `src/server/metrics/rolling-counters.ts` (Redis zset per counter).
  - **Alerts:** 6-rule engine in `src/server/alerts/rules.ts` + `evaluator.ts`, scheduled every minute. `AlertLog` table; Telegram emission on trigger.
  - **Runbooks:** `docs/runbooks/v1-launch.md` (5 scenarios) + `docs/runbooks/oncall-checklist.md`.
  - **Public API:** `pnpm gen:openapi` → `docs/api/v1/openapi.yaml`; viewer `/docs/api` (Scalar); sandbox discoverability in `info.description`.
  - **Security:** CSP + HSTS in `next.config.ts`; signup rate-limit `5/h/IP` via `src/server/ratelimit.ts`; SQLi/XSS/IDOR regression in `tests/integration/security-baseline.test.ts`; manual pentest-lite at `docs/security/v1-pentest-checklist.md`.
  - **Version:** `1.0.0`. Tag: `v1.0.0`. Changelog: `CHANGELOG.md`.
  ```
- [ ] **Step 2:** Commit.

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): record v1.0 sprint 8 + launch deliverables"
```

---

### Task 15: Sprint 8 final verification

**Files:**
- None (verification only; retrospective is appended to this plan file).

- [ ] **Step 1:** `pnpm test` — all pass, ≥500 tests.
- [ ] **Step 2:** `pnpm lint && pnpm typecheck` — zero errors.
- [ ] **Step 3:** Re-run the 5 perf scenarios one last time (shortened durations OK for the long sustained ones if time-pressured — 5 min each). All must still PASS. If any regression: most likely cause is the new alerts evaluator + observability overhead. Mitigate: `LOG_LEVEL=warn` in prod, confirm evaluator runs on a background worker (not inline on request path).
- [ ] **Step 4:** Manual launch-day walkthrough:
  1. Sign up a fresh user.
  2. Complete onboarding wizard (5 steps, < 30 min).
  3. Create an API key.
  4. `curl -X POST /api/v1/leads` with the new key — 201.
  5. Confirm Telegram event lands in the ops channel (test channel OK).
  6. Visit `/docs/api` — Scalar renders.
  7. Visit `/api/v1/health` — `version: "1.0.0"`.
  8. `GET /api/v1/metrics/summary` as admin — counters present.
- [ ] **Step 5:** Confirm tag is at HEAD: `git log --oneline v1.0.0..HEAD` is empty; `git log --oneline -20` shows ~15 new commits over the S7 tag.
- [ ] **Step 6:** Append `## Retrospective` to the bottom of this plan file covering:
  - What shipped vs planned (task-by-task).
  - What deferred to v1.0.1.
  - Measured perf vs SLO targets (copy from baseline doc).
  - Bug triage S1 / S2 / S3 closed counts.
  - Hours spent per task (rough).
  - Open risks for launch day.
  Then:
  ```bash
  git add docs/superpowers/plans/2026-07-28-v1-sprint-8-hardening-and-launch.md
  git commit -m "docs(plan): s8 retrospective"
  ```
- [ ] **Step 7:** Re-read `docs/v1-launch-checklist.md` + `docs/runbooks/v1-launch.md`. Every item ticked; no `[PLACEHOLDER]` strings left. When green: coordinate with founder for launch window, `git push origin v1.0.0`, publish release notes.

---

## Risks + follow-ups

**S8 risks (descending severity):**

1. **Perf gate misses** — the 500-rps/30min and 1k-burst gates are the most likely to fail on first run. Triage order: Prisma connection pool → hash-chain audit write cost → pino overhead → pg-boss insert rate. If a regression is rooted in S5 Telegram outbox writes on hot path, consider async-queueing the outbox insert (accept the 100ms lag window; acceptable because alerts still have the in-memory event log).
2. **E2E test flakiness** — the 250ms sleep for inline jobs is a hack; if `pg-boss` is configured with a real worker loop even under `SYNC_JOBS=1`, the test will flake on slow hosts. Mitigation: replace sleep with a poll-until-LeadEvent-count-reaches-3 helper with a 5s ceiling.
3. **OpenAPI drift** — generating from Zod is only useful if the Zod schemas are the source of truth. If any handler does its own manual JSON parsing (grep `req.json()` that isn't followed by `.parse(...)`), the spec silently lies. Task 9 should include a CI-lint pass that fails if `src/app/api/v1/**/*.ts` references a handler that doesn't go through a registered schema.
4. **Alerts false-positive flood at launch** — the `intake_failure_rate` threshold is 1% over 5 min; at low traffic (first hour post-launch), noise dominates. The `total < 100` skip guard mitigates but test the pager behavior on staging first.
5. **Security baseline incomplete** — pentest-lite is manual. If time-pressured, prioritize IDOR + signup rate-limit over CSP tuning (CSP mistakes are loud and easy to roll back; IDOR leaks are silent and hard to recover from).
6. **Scope creep from bug triage** — 3-day window can be eroded by "just one more feature." Hard rule: S8 commits after Task 13 are either (a) bug fixes with severity ≥ S2 and a regression test, or (b) doc-only.

**v1.0.1 patch follow-ups already known:**

- Extend structured logging to the onboarding wizard flow (S7 pages may not log request/response).
- Health endpoint should poll broker-health status; currently a broker-down fleet is visible via `/metrics/summary` only.
- Scalar viewer at `/docs/api` is a client component — server-side rendering of the spec would be faster first-paint; defer to v1.5.
- `AlertLog.resolvedAt` is auto-filled; manual ack via an admin UI is not yet exposed. Until v1.5, on-call edits via SQL per the on-call checklist.
- `src/server/metrics/rolling-counters.ts` uses one Redis zset per counter; at high traffic (~10k events/minute) this may warrant switching to a leaky-bucket or Prometheus-backed exporter. Baseline measurement goes in the retrospective.

**Cross-sprint items unblocked by S8:**

- v1.5 BI builder: additive on top of S4 materialized views; S8 observability events form the basis of a "rules-to-alerts" composability that v1.5 will reuse.
- v2.0 white-label: the `tenantId` column pre-added in S1 remains nullable; S8 does not populate it. The v1.0 GA build is single-tenant by design.

---

## Success criteria for Sprint 8 (= v1.0 GA gates)

**Product:**
- Intake `p95 < 500ms` sustained at 500 rps for 30 min (logged in `docs/perf/v1-baseline.md`).
- Burst 1k rps / 60s: zero drops.
- Routing engine: 10k-lead batch `p95 < 1s` at 20 concurrent clients.
- Fraud-score enforcement active; false-positive rate < 2% on manual review of 100 samples (recorded in triage doc).
- Autologin SLA uptime ≥ 99.5% over the 7-day window ending at launch (`autologin_sla_breach` critical never fires).

**Engineering:**
- Full suite green: `pnpm test` passes ≥500 tests.
- E2E: `tests/e2e/v1-full-flow.test.ts` green.
- `/api/v1/health` returns `version: "1.0.0"`; `/api/v1/metrics/summary` functional.
- 6 alert rules defined + at least one test-fire verified in staging.
- All 6 observability events asserted via `tests/integration/observability-events.test.ts`.

**GTM:**
- Public pricing page live.
- `/docs/api` renders OpenAPI spec with sandbox discoverability.
- ≥10 broker templates in catalog.
- External-reviewer wizard walkthrough < 30 min (row in `docs/v1-bug-triage.md`).
- Launch runbook + on-call checklist published; rotation assigned.
- Security baseline: CSP + signup rate-limit + SQLi/XSS/IDOR tests green + pentest-lite ticked.

**Release:**
- `package.json` version = `1.0.0`.
- `CHANGELOG.md` covers all 8 sprints.
- Tag `v1.0.0` on `main`.
- Zero open S1 or S2 bugs.
- `docs/v1-launch-checklist.md` fully ticked.

---

## Appendix: files touched this sprint

**New files (created):**
- `perf/routing-stress.js`
- `docs/perf/v1-baseline.md`, `docs/perf/v1-baseline-logs/*.log`
- `tests/e2e/v1-full-flow.test.ts`, `tests/helpers/e2e-flow.ts`
- `tests/integration/observability-events.test.ts`, `tests/integration/health-and-metrics.test.ts`, `tests/integration/alerts-rules.test.ts`, `tests/integration/security-baseline.test.ts`, `tests/unit/rolling-counters.test.ts`
- `src/server/metrics/rolling-counters.ts`
- `src/server/alerts/rules.ts`, `src/server/alerts/evaluator.ts`
- `src/server/jobs/alerts-evaluator.ts`
- `src/server/schema/openapi.ts`
- `src/server/ratelimit.ts` (if not already present)
- `src/app/api/v1/metrics/summary/route.ts`
- `src/app/api/v1/openapi/route.ts`
- `src/app/docs/api/page.tsx`
- `scripts/gen-openapi.ts`
- `docs/api/v1/openapi.yaml`, `docs/api/v1/openapi.json`
- `docs/runbooks/v1-launch.md`, `docs/runbooks/oncall-checklist.md`, `docs/runbooks/broker-contacts.md`
- `docs/security/v1-pentest-checklist.md`
- `docs/v1-bug-triage.md`, `docs/v1-launch-checklist.md`
- `CHANGELOG.md`

**Modified files:**
- `perf/intake-load.js`, `perf/README.md`
- `prisma/schema.prisma` (`AlertLog` model)
- `prisma/seed.ts` (`seedPerfFlow`)
- `src/server/observability.ts`
- `src/app/api/v1/leads/route.ts`, `src/app/api/v1/leads/bulk/route.ts`
- `src/app/api/v1/health/route.ts`
- `src/server/routing/engine.ts`
- `src/server/broker-adapter/*` (push-attempt log)
- `src/server/intake/fraud-score.ts`
- `src/server/telegram/emit.ts`
- `next.config.ts` (CSP + security headers)
- Signup route (`src/app/signup/actions.ts` or `src/app/api/auth/signup/route.ts`)
- `package.json` (version 1.0.0 + `gen:openapi` script + deps)
- `CLAUDE.md`
