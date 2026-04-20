# Working notes for Claude Code

## Stack
- Next.js 15 (App Router, Server Components by default, `"use client"` only when needed).
- tRPC v11 with `superjson` transformer. Client lives in `src/lib/trpc.ts`, router in `src/server/routers/_app.ts`.
- Prisma 5 (Postgres). Schema: `prisma/schema.prisma`. Always run `pnpm db:push` (or create a migration) after schema edits.
- NextAuth v5 (Auth.js) with Credentials provider. JWT sessions. Config: `src/auth.ts`.
- Biome for lint + format. Run `pnpm lint` before finishing.
- Vitest for unit tests (Node env). No jsdom wired yet.

## Conventions
- Import alias `@/*` → `src/*`.
- Server-only code lives under `src/server/`. Do not import `@/server/db` or `@/auth` from a `"use client"` file.
- Mutations must invalidate the relevant query via `trpc.useUtils().<router>.<proc>.invalidate()`.
- Use `protectedProcedure` for anything user-scoped; it exposes `ctx.userId`.
- Auth state on the server: `await auth()` inside RSC / route handlers / server actions.

## When adding a new entity
1. Add model to `prisma/schema.prisma` (+ indexes).
2. `pnpm db:push`.
3. Create `src/server/routers/<entity>.ts` with `list`/`byId`/`create`/`update`/`delete`.
4. Register it in `src/server/routers/_app.ts`.
5. Build `src/app/(dashboard)/<entity>/page.tsx` (client component using `trpc.<entity>.*`).
6. Add nav link in `src/app/(dashboard)/layout.tsx`.

## Before declaring a task done
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (if logic changed)

## Routing engine (EPIC-02)

- **Primary:** `Flow` / `FlowVersion` / `FlowBranch` / `FlowAlgorithmConfig` / `FallbackStep` / `CapDefinition` / `CapCounter` + `src/server/routing/engine.ts` (pure-decision) + `src/server/routing/simulator.ts` (dry-run wrapper).
- **Algorithms:** `src/server/routing/algorithm/wrr.ts` (smooth-WRR Nginx-style via Redis Lua); `src/server/routing/algorithm/slots-chance.ts` (CSPRNG `crypto.randomInt`); `src/server/routing/algorithm/selector.ts` (flow vs branch override).
- **Constraints:** `src/server/routing/constraints/geo.ts`, `schedule.ts` (DST-aware via `src/lib/timezone.ts`), `caps.ts` (hourly/daily/weekly, atomic Postgres upsert; поддерживает `country` дискриминатор — `CapDefinition.perCountry=true` + `CapCountryLimit[]` задают раздельный лимит по `lead.geo`; fail-closed при отсутствии country или лимита для страны).
- **Fallback:** `src/server/routing/fallback/orchestrator.ts` — `classifyPushResult` + `buildFallbackPlan` + cycle detection hooked into `publishFlow`.
- **REST:** `/api/v1/routing/flows/*` (list/create/get/update + publish/archive + algorithm config), `/api/v1/routing/caps/:flowId` (remaining cap status), `/api/v1/routing/simulate` (single/batch + `/[jobId]` status).
- **DEPRECATED compat:**
  - `RotationRule` + `src/server/routing/select-broker.ts` → auto-migrated to `auto:<GEO>` Flow via `src/server/routing/flow/auto-migrate.ts::ensureDefaultFlowsFromRotationRules()`; wire into `push-lead.ts` is an Operational Follow-up (see plan).
  - `src/server/routing/caps.ts` — legacy DailyCap shim; new code uses `src/server/routing/constraints/caps.ts`.
  - `src/server/routing/filters.ts::isWithinWorkingHours` — legacy; new code uses `src/server/routing/constraints/schedule.ts::evaluateSchedule`.
- **Tests:** WRR/Slots-Chance statistical tests take 1-3s (10k-20k iterations) — запускать отдельно при timeout issues. Edge-case 100k iteration test for 0.01% chance deliberately skipped from default suite.

## Intake pipeline (EPIC-01)

- **Entry:** `src/app/api/v1/leads/route.ts` — Bearer API-key + X-API-Version + sandbox mode + size/injection hardening + multi-strategy dedup (409 response) + idempotency payload-hash + Zod strict/compat + intake-settings application.
- **Bulk:** `/api/v1/leads/bulk` (sync 207 ≤50, async 202 >50) + `/api/v1/leads/bulk/[jobId]` status.
- **Schema registry:** `src/server/schema/registry.ts` with versioned intake schemas (currently `2026-01`); discoverable via `GET /api/v1/schema/leads?version=...`.
- **Settings:** `IntakeSettings` table + `src/server/intake/settings.ts` (30s LRU cache) + `GET/PUT /api/v1/affiliates/:id/intake-settings`.
- **Sandbox:** `ApiKey.isSandbox` + `src/server/intake/sandbox.ts` deterministic outcomes by `external_lead_id` prefix; `GET /api/v1/errors` catalog.
- **Metrics:** `src/server/intake/metrics.ts` (Prisma raw SQL aggregation) + `GET /api/v1/intake/metrics?from&to&interval&group_by`.
- **Audit:** `src/server/audit/hash-chain.ts` (HMAC-SHA256 hash-chain for LeadEvent + AuditLog); `src/server/audit/pii-mask.ts` (email hash local-part, phone last-4, IPv4 /24, IPv6 /56).
- **Outcome webhooks:** `AffiliateIntakeWebhook` + `WebhookDelivery` + `src/server/webhooks/intake-outcome.ts` (HMAC-signed) + `src/server/jobs/intake-webhook-delivery.ts` (5-retry schedule `10s,60s,300s,900s,3600s` + auto-pause on HTTP 410).
- **Perf harness:** `perf/intake-load.js` (autocannon; scenarios `sustained_300_rps_15m` + `burst_1000_rps_60s`).
- **Env:** centralized Zod validation in `src/lib/env.ts`; `zBool` helper (correctly handles `"false"`); `NEXTAUTH_SECRET` OR `AUTH_SECRET` accepted; `AUDIT_HASH_CHAIN_SECRET` required in `NODE_ENV=production`.

## Fraud score (W2.1 + W2.2)

- Model `FraudPolicy` (single global row, upserted in seed) — 5 weight fields + `autoRejectThreshold` (80) + `borderlineMin` (60) + `version`. Cache: 30s LRU in `src/server/intake/fraud-policy-cache.ts` with `invalidateFraudPolicyCache()` for tests.
- Pure fn `computeFraudScore(signals, policy)` in `src/server/intake/fraud-score.ts` — sums weights, clamps to 0..100, returns `{score, fired}`.
- Signal builder `buildSignals(input)` in `src/server/intake/fraud-signals.ts` — assembles `FraudSignal[]` from blacklist/dedup/voip/phone-country-vs-geo check.
- Intake pipeline writes `Lead.fraudScore` + `Lead.fraudSignals` (Json) and emits `LeadEvent.FRAUD_SCORED { score, signals, policyVersion, autoFraudReject, needsReview }`.
- **Enforcement (W2.2):**
  - `score >= autoRejectThreshold` AND no prior rejectReason → `state=REJECTED_FRAUD`, `rejectReason='fraud_auto'`. Response `status: "rejected_fraud"` + `reason_codes: [<signal.kind>, ...]`. **Weights are never exposed in API response** (per spec — only signal kinds).
  - `borderlineMin <= score < autoRejectThreshold` → `state=NEW`, `needsReview=true`. Response body adds `needs_review: true`. Lead still routes normally.
  - Blacklist hard-reject semantics preserved: blacklist hit → `state=REJECTED` (not REJECTED_FRAUD). Fraud score is still computed and persisted, but hard-reject wins.
- UI: `LeadStateKey` + `STATE_TONES` include `REJECTED_FRAUD` (danger / deep-red).
- Tests: unit (fraud-score + fraud-signals); integration `intake-fraud-score.test.ts` (5 cases) + `intake-fraud-autoreject.test.ts` (6 cases — threshold / borderline / clean / skip-routing / blacklist-precedence).

## Status Pipe Pending (W1.2 anti-shave)

- `Broker.pendingHoldMinutes: Int?` — opt-in per-broker (null = feature off).
- После успешного push в `src/server/jobs/push-lead.ts`: если `holdMin > 0` → `LeadState.PENDING_HOLD` + `Lead.pendingHoldUntil` + LeadEvent `PENDING_HOLD_STARTED` + pg-boss job `resolve-pending-hold` scheduled на момент истечения hold-окна.
- Postback handler (`src/app/api/v1/postbacks/[brokerId]/route.ts`): если прежнее состояние PENDING_HOLD и mapped=DECLINED → `Lead.shaveSuspected=true` + LeadEvent `SHAVE_SUSPECTED`. При ACCEPTED/FTD/DECLINED clearing `pendingHoldUntil` и emit `PENDING_HOLD_RELEASED` (если не shave).
- Job `resolve-pending-hold` (`src/server/jobs/resolve-pending-hold.ts`): при срабатывании, если лид всё ещё в PENDING_HOLD — переводит в ACCEPTED + emit `PENDING_HOLD_RELEASED`.

## v1.0 Sprint 1 hardening (April 2026)

- **Wave1 merged:** per-country caps (`CapDefinition.perCountry`, `CapCountryLimit`), `PENDING_HOLD` / anti-shave (`Lead.pendingHoldUntil`, `Broker.pendingHoldMinutes`, `resolve-pending-hold` job), fraud score (`FraudPolicy`, `Lead.fraudScore`, `Lead.fraudSignals`) with auto-reject at threshold and borderline review flag.
- **Bulk idempotency:** `/api/v1/leads/bulk` honors `x-idempotency-key` via the existing `IdempotencyKey` table — same key + same payload → cached response, same key + different payload → 409, default 24h TTL.
- **API-key IP whitelist:** `ApiKey.allowedIps String[]` (exact match or CIDR, e.g. `10.0.0.0/8`) enforced in `src/server/intake/check-ip.ts`; empty array = no restriction. Client IP extracted from `x-forwarded-for` or `x-real-ip`.
- **API-key expiry:** `ApiKey.expiresAt DateTime?`; expired keys rejected at `verifyApiKey` with 401.
- **Forward-compat:** nullable `tenantId` column added to `Affiliate`, `Broker`, `ApiKey`, `Lead`, `User`, `BrokerTemplate` with per-table `@@index([tenantId])`. Unused until v2.0 white-label.

## v1.0 Sprint 2 — Autologin + SLA + Q-Leads (May 2026)

- **Schema:** `ProxyEndpoint`, `AutologinAttempt` (+ `AutologinStage` / `AutologinStatus` enums), `Broker.autologinEnabled`, `Broker.autologinLoginUrl`, `Lead.qualityScore`, `Lead.qualitySignals`.
- **Proxy:** `src/server/autologin/proxy/pool.ts` (round-robin pick) + `health.ts` (probe `https://api.ipify.org` via undici `ProxyAgent`, 3-strike down). Job: `src/server/jobs/proxy-health.ts` + `scheduleAllProxyHealthProbes()` (cron wiring in S8).
- **Adapters:** `src/server/autologin/adapters/base.ts` + `mock.ts` + `registry.ts`. Real adapters ship opportunistically S3+.
- **Captcha:** `src/server/autologin/captcha-solver.ts` stub returns `"test-captcha-token"`; 2captcha deferred to v1.5.
- **State machine:** `src/server/autologin/run-attempt.ts` drives `INITIATING → CAPTCHA → AUTHENTICATING → SESSION_READY`; Playwright `chromium` headless; proxy via `browser.launch({ proxy })`. pg-boss wrapper `src/server/jobs/autologin-attempt.ts` enqueued from `push-lead.ts` when `Broker.autologinEnabled = true`.
- **SLA:** `src/server/autologin/sla.ts` + `GET /api/v1/autologin/sla?from&to` → `{total, successful, failed, uptime_pct, p50_duration_ms, p95_duration_ms, by_stage_failed}`; default 7 days, max 31. `GET /api/v1/autologin/attempts` for the grid.
- **UI:** `/dashboard/autologin` (SlaTile + AttemptsGrid), nav shortcut `X` (shortcut `A` was already occupied by the affiliates page on main; noted in the S2 retrospective).
- **Q-Leads:** `src/server/intake/quality-score.ts` pure `computeQualityScore({fraudScore, signalKinds, affiliate, brokerGeo})` 0..100 with component breakdown; `loadAffiliateHistory` + `loadBrokerGeoStats` 30-day aggregations. Wired into `src/app/api/v1/leads/route.ts` after fraud score. UI: `QualityBadge` (≤40 red / ≤70 amber / >70 green) in `LeadsGrid` column `Q` and `LeadDrawer` component breakdown.

## v1.0 Sprint 3 — UAD + per-column RBAC (May 2026)

- **ManualReviewQueue table** (`reason ∈ {BROKER_FAILED, CAP_REACHED, NO_BROKER_MATCH, FRAUD_BORDERLINE}`, `resolution ∈ {ACCEPT, REJECT, REQUEUE}`). Cold-overflow trigger in `src/server/jobs/push-lead.ts`; orchestration in `src/server/routing/manual-queue.ts::enqueueManualReview`.
- **Configurable retry ladder:** `Broker.retrySchedule` (default `"10,60,300,900,3600"`) parsed by `src/server/routing/retry-schedule.ts`. `PushLeadPayload.attemptN` threads the attempt index across pg-boss re-enqueues; when the last-failed broker's schedule still has a slot, the lead is re-enqueued with `startAfter = nthRetryDelay(...)` instead of going to FAILED.
- **Fallback orchestration:** current pool iteration walks `RotationRule`-derived brokers by priority; explicit multi-flow `FallbackStep` walker (with `selectBrokerPoolForFlow` + flowId exposure) is deferred to S4 — the required `selectBrokerPool` refactor was out of scope for S3.
- **Manual review UI:** `/dashboard/manual-review` page (claim / accept / reject / requeue); REST at `/api/v1/manual-review/*` (GET list + PATCH action); nav shortcut `M`.
- **Alert emitter stub:** `src/server/alerts/emitter.ts` — `emitAlert(event, payload)` interface; Telegram transport lands in S5. Scheduled `manual-queue-depth-check` job (`JOB_NAMES.manualQueueDepthCheck`) in `src/server/jobs/manual-queue-depth-check.ts` triggers `manual_queue_depth_exceeded` when open-depth >= threshold (default 25, env `MANUAL_QUEUE_ALERT_THRESHOLD`). Cron registration (`*/5 * * * *`) wires with the pg-boss worker runner in S8.
- **Per-column RBAC:** `UserRole.AFFILIATE_VIEWER`, `UserRole.BROKER_VIEWER`. Matrix in `src/server/rbac/column-visibility.ts`; redaction via `redact()` / `redactMany()` in `src/server/rbac/redact.ts`. Applied in `lead` / `broker` / `affiliate` tRPC routers (list + byId). Redaction is server-side — omitted fields are simply absent on the wire. `ALL_SET` proxy returns `true` from `has(*)` so ADMIN / OPERATOR flow through unchanged. `useVisibleColumns` helper in `src/lib/use-visible-columns.ts` for future auto-hide of fully-empty columns.
- **Preview:** admin-only `/dashboard/settings/rbac-preview` (shortcut `Q`) renders lead / broker / affiliate JSON samples through a chosen role via `rbacPreview.preview` query.

## Analytics v1 (EPIC-10, Sprint 4)

- **Rollup tables:** `LeadDailyRoll` + `LeadHourlyRoll` (real Prisma tables, not PG MATERIALIZED VIEWs). Unique on `(bucket, affiliateId, brokerId, geo)`. `brokerId` sentinel `"__none__"` for brokerless (rejected) leads.
- **Cron:** pg-boss schedules — `analytics-roll-daily` every 15 min, `analytics-roll-hourly` every 5 min. Idempotent via `INSERT ... ON CONFLICT DO UPDATE`. Handlers: `src/server/jobs/analytics-roll-daily.ts`, `src/server/jobs/analytics-roll-hourly.ts`. Worker registration wired; actual boot still S8-pending like other S3 jobs.
- **Service:** `src/server/analytics/service.ts` — `metricSeries`, `conversionBreakdown`, `rejectBreakdown`, `revenueBreakdown`. Period-compare (`previous_period` / `year_ago` / `custom`) baked in. Reads only from rollups (exception: `rejectBreakdown` reads `Lead.rejectReason` directly — bounded by window + state).
- **Router:** `analytics` in `src/server/routers/analytics.ts`. Cache: Redis LRU, 60s TTL, key = `analytics:v1:<proc>:<sha256(params)>`. Presets: `savePreset`/`listPresets`/`deletePreset`.
- **Share links:** `AnalyticsShareLink` (token, query, expiresAt). `POST /api/v1/analytics/share` mints 16-byte hex token (30-day TTL). `GET /api/v1/analytics/share/:token` — 404 unknown, 410 expired. Share view re-executes the service to return live data.
- **UI:** `/dashboard/analytics` (nav shortcut `Y`) — recharts-based. 4 metric tiles with sparklines + delta%, full-width line chart with compare overlay, 2-col breakdown grid (conversions funnel + rejects by reason). Filter bar with date range, groupBy, compare toggle, save/load preset, share.
- **Export:** `GET /api/v1/analytics/export?query=<json>` — returns `text/csv` per drill-down (metricSeries / conversionBreakdown / rejectBreakdown / revenueBreakdown). In-memory buffered; streaming deferred until row counts exceed ~10k.
