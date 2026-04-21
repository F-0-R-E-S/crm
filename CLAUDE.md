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

## v1.0 Sprint 5 — Telegram ops bot (EPIC-11)

- **Library:** `grammy`. Single global bot per deployment; `TelegramBotConfig` holds `botToken` + `webhookSecret`.
- **Webhook:** `POST /api/telegram/webhook/:secret` → `grammy` `webhookCallback`. Secret rotated via admin page. No IP allowlist (Telegram does not publish a stable IP range).
- **Event catalog:** 23 types in `src/server/telegram/event-catalog.ts` (lead lifecycle, broker/system, operational, affiliate-facing). Templates: one file per type under `src/server/telegram/templates/`.
- **Emitter:** `src/server/telegram/emit.ts::emitTelegramEvent(type, payload, filters?)` — resolves matching subscriptions (by eventTypes, brokerFilter, affiliateFilter, mutedBrokerIds) and enqueues `telegram-send` pg-boss jobs. Empty-array filters = "all"; `mutedBrokerIds` always wins.
- **Worker:** `src/server/jobs/telegram-send.ts` — renders per-template, sends via Telegram API, 3× retry with 429 `retry_after` honouring + exponential back-off for other errors, logs every attempt to `TelegramEventLog`.
- **Commands:** `/start <token>` (link; 15-min single-use hashed token in `src/server/telegram/link-token.ts`), `/stats` (today's counters scoped to subscription filters), `/sub`/`/unsub`/`/mutebroker`, ADMIN-only `/ack <leadId>`/`/pause_broker <id>`/`/resume_broker <id>` — `/ack` writes `MANUAL_OVERRIDE` LeadEvent, broker commands write `AuditLog` with `via: "telegram"`.
- **UI:** `/dashboard/settings/telegram` (user: link, filters, save) and `/dashboard/settings/telegram-admin` (admin: token, webhook info, test-send, event log auto-refreshed 30s).
- **Emit points:** intake route (`NEW_LEAD`, `FRAUD_HIT`), push worker (`PUSHED`, `FAILED`, `CAP_REACHED`, `MANUAL_REVIEW_QUEUED`), pending-hold resolver (`PENDING_HOLD_RELEASED`), status-poll (`FTD`, `AFFILIATE_FTD`), broker-health transition (`BROKER_DOWN`, `BROKER_RECOVERED`). All sites use fire-and-forget `void emit(...).catch(...)`. S3 `emitAlert` stub now forwards to Telegram (`manual_queue_*`, `broker_down`, `fraud_hit`).
- **Crons:** `anomaly-detect` every 15 min (50% hour-over-hour drop, prior > 10 leads → `ANOMALY_DETECTED`); `daily-summary` at 09:00 UTC (global `DAILY_SUMMARY` + per-affiliate `AFFILIATE_DAILY_SUMMARY`). Both registered in `worker.ts`.
- **Env:** `TELEGRAM_WEBHOOK_BASE_URL` (optional; used by admin page to render webhook URL), `TELEGRAM_LINK_TOKEN_TTL_MIN` (default 15).
- **Gotcha:** template.TEMPLATES maps `TelegramEventType` → renderer; add a renderer + register in `templates/index.ts` when adding a new event type. Completeness enforced by `tests/unit/telegram-templates.test.ts`.

## v1.0 Sprint 6 — Finance / P&L / CRG / Invoicing (EPIC-12)

- **Models:** `Conversion`, `BrokerPayoutRule`, `AffiliatePayoutRule`, `CRGCohort`, `BrokerInvoice`, `AffiliateInvoice` + enums `ConversionKind`, `PayoutRuleKind`, `CRGCohortStatus`, `InvoiceStatus`. Money fields `Decimal(12,2)`; rate fields `Decimal(5,4)`.
- **Conversion ingest:** broker postback handler emits `Conversion` on REGISTRATION / FTD / REDEPOSIT via `src/server/finance/emit-conversion.ts`. REGISTRATION + FTD idempotent per lead; REDEPOSIT can repeat. Broker `statusMapping` value can name either a `LeadState` or a `ConversionKind` — the postback route maps `REDEPOSIT` → LeadState `FTD`, `REGISTRATION` → `ACCEPTED` so the state-machine stays in sync while the conversion row is emitted.
- **P&L service:** `src/server/finance/pnl.ts::computePnL` + `payout-rule-resolver.ts` (`resolveRuleAt` most-recent-wins; `resolveAffiliateRuleAt` prefers broker-scoped then global; `applyRule` handles CPA_FIXED / CPA_CRG / REV_SHARE / HYBRID). Revenue uses broker-rule × conversion; payout uses affiliate-rule × conversion; margin = revenue − payout.
- **CRG cron:** `src/server/jobs/crg-cohort-settle.ts::runCrgCohortSettle` — weekly cohort per broker with CPA_CRG rule (Monday 00:00 UTC → next Monday); settles cohorts whose `cohortEnd` is ≥ 30 days in the past. Shortfall = `(guaranteed − actual) × cohortSize × cpaAmount`. Empty cohorts (cohortSize=0) marked MET with null shortfall. `JOB_NAMES.crgCohortSettle` registered; worker boot deferred to S8 with other crons.
- **Invoice generation:** `src/server/finance/invoice-generate.ts::generateBrokerInvoice` / `generateAffiliateInvoice`. Upserts per `(broker|affiliate, periodStart, periodEnd)`. 1:1 linkage (set `AffiliateInvoice.brokerInvoiceId`) only when conversions span exactly one broker for the period and its broker invoice is unlinked. CRG-shortfall cohorts whose `cohortEnd` falls in the period are appended as `crg-cohort-<id>` line items. PDF export returns JSON placeholder (real PDF in v2.0).
- **tRPC router:** `finance` in `src/server/routers/finance.ts` — `pnl`, `list/upsertBrokerPayoutRule`, `list/upsertAffiliatePayoutRule`, `listInvoices`, `markInvoicePaid`, `exportInvoicePdf`, `generateBrokerInvoice`, `generateAffiliateInvoice`, `listCrgCohorts`. All monetary inputs accept stringified decimals; outputs coerce `Prisma.Decimal` → strings.
- **UI:** `/dashboard/finance/{pnl,invoices,crg-cohorts}` (nav shortcuts `P`, `N`, `C`) + `/dashboard/brokers/[id]/payout` + `/dashboard/affiliates/[id]/payout` rule editors. PnL page has filter bar (date range, affiliate, broker, geo). Invoices page tabs broker/affiliate with drawer (mark paid + export stub).
- **Test helpers:** new `tests/helpers/seed.ts` (`seedAffiliate`, `seedBroker`, `seedLead`, `seedAdminSession`) + `tests/helpers/postback-signature.ts` (`signPostback`). `tests/helpers/db.ts::resetDb` now wipes `affiliateInvoice`, `brokerInvoice`, `cRGCohort`, `affiliatePayoutRule`, `brokerPayoutRule`, `conversion`.
- **v1.0 constraints locked:** USD only, 1:1 broker↔affiliate invoice linkage, no partial payments, no chargebacks, postback-only conversion ingest, full-invoice (no splits).

## Onboarding (EPIC-13)

- **Entry:** `/signup` (public) → `createAccount` in `src/server/onboarding/signup.ts` → seeds `{User, Org, OnboardingProgress}` + 14-day trial clock → redirects to `/onboarding`.
- **Wizard:** single client component `src/app/onboarding/wizard.tsx` with 5-node state machine. Steps: `src/app/onboarding/steps/step-{1..5}-*.tsx`. Progress persisted to `OnboardingProgress` (server) + `localStorage` (client).
- **Broker health check:** `src/server/onboarding/broker-health.ts::probeBrokerEndpoint` — 5s timeout; 5xx/network = not ok, anything else = reachable.
- **Test lead live stream:** `src/app/api/v1/onboarding/lead-stream/[traceId]/route.ts` — SSE, 500ms polling interval, 60s ceiling. Closes on terminal state.
- **Org model:** new first-class entity. `User.orgId` back-references. Existing users backfilled into "Default Org" via `src/server/onboarding/backfill.ts::backfillDefaultOrg` (idempotent, called from `prisma/seed.ts`).
- **Pricing:** public `/pricing` page, tier config in `src/app/pricing/tiers.ts` (Starter $399 / Growth $599 / Pro $899). Stripe integration = v2.0 scope.
- **Broker templates:** 10 named templates in `src/server/broker-template/seeds/<vendor>-style.ts`; seeded via `pnpm tsx src/server/broker-template/seed.ts` (idempotent).
- **SLA metric:** `src/server/onboarding/metrics.ts::getTimeToFirstLeadLast30Days` → admin-only dashboard widget showing median + p90. Target: median < 30 min.

## v1.0 Sprint 8 hardening + launch (GA)

- **Perf harness:** 3 scenarios in `perf/intake-load.js` (`sustained_300_rps_15m`, `burst_1000_rps_60s`, `sustained_500_rps_30m`) + `perf/routing-stress.js` (10k batches, two concurrency levels). Baseline numbers: `docs/perf/v1-baseline.md`. Prereq: `SEED_PERF=1 pnpm db:seed` creates `flow-perf-default` + `perf-affiliate` + `ak_perf_*` key.
- **E2E smoke:** `tests/e2e/v1-full-flow.test.ts` + reusable helper `tests/helpers/e2e-flow.ts` (returns `{leadId, brokerId, affiliateId, apiKey, mockBroker}`).
- **Observability:** shared pino `logger` in `src/server/observability.ts` with redact paths (`authorization`, `cookie`, `body.email`, `body.phone`, `body.password`, `*.apiKey`). Structured events: `intake.request`, `intake.response`, `routing.decision`, `broker.push`, `fraud.score`, `telegram.emit`. Contract enforced by `tests/integration/observability-events.test.ts`.
- **Health + metrics:** `/api/v1/health` returns `{status, db, redis, queue, version}`; `/api/v1/metrics/summary` admin-auth with 60s rolling counters from `src/server/metrics/rolling-counters.ts` (Redis zset per counter). Wire-up in intake (`LEADS_RECEIVED`, `FRAUD_HIT`) and push-lead (`LEADS_PUSHED`).
- **Alerts engine:** `src/server/alerts/rules.ts` (6 rules) + `src/server/alerts/evaluator.ts` (dedupe inside window + auto-resolve when measurement returns null). Runs every minute via `src/server/jobs/alerts-evaluator.ts`. Emits Telegram `ALERT_TRIGGERED`. `AlertLog` table — on-call resolves manually via SQL (admin UI deferred to v1.5).
- **pg-boss worker runner finalized:** `worker.ts` now boots all previously deferred crons: `alerts-evaluator` (1m), `manual-queue-depth-check` (5m), `crg-cohort-settle` (hourly), `proxy-health` (10m) on top of the S4/S5 analytics + summary + anomaly-detect registrations.
- **Runbooks:** `docs/runbooks/v1-launch.md` (intake degradation / broker-down / queue backup / autologin failure / fraud spike) + `docs/runbooks/oncall-checklist.md` (morning/afternoon/EOD) + `docs/runbooks/broker-contacts.md` (stub for vendor contacts).
- **Public API docs:** hand-authored OpenAPI 3.0 spec at `docs/api/v1/openapi.yaml`; JSON twin regenerated via `pnpm gen:openapi` (script: `scripts/gen-openapi.ts` + `yaml` dep). Served at `/api/v1/openapi` and rendered by Scalar at `/docs/api` (CDN-loaded standalone bundle — self-host in v1.0.1).
- **Security:** CSP + HSTS + X-Frame-Options in `next.config.ts` (non-API routes). Signup rate-limit 5/h/IP via `rateLimit()` helper in `src/server/ratelimit.ts`. Regression suite: `tests/integration/security-baseline.test.ts` (SQLi, XSS, IDOR, rate-limit). Manual pentest-lite: `docs/security/v1-pentest-checklist.md`.
- **Release:** version `1.0.0` in `package.json`; `CHANGELOG.md` populated; tag `v1.0.0` on `main`.
- **Known v1.0.1 follow-ups:** extend structured logging to onboarding wizard, health endpoint broker-health polling, self-host Scalar viewer, admin UI for AlertLog ack, batch AuditLog hash-chain lookups.

## v1.0.1 hotfix (April 2026)

- **Self-hosted Scalar docs viewer:** `/docs/api` is split into an RSC shell (`src/app/docs/api/page.tsx`) + a client component (`src/app/docs/api/ApiDocsClient.tsx`) rendering `@scalar/api-reference-react` with locally bundled JS/CSS. No more jsDelivr dependency. Spec source unchanged (`docs/api/v1/openapi.yaml` → `/api/v1/openapi`).
- **AlertLog ack:** new `ackedAt` / `ackedBy` columns + `ackedAt` index on `AlertLog` (applied via `pnpm prisma db push`). Admin-only `alertLog.list` + `alertLog.ack` tRPC router in `src/server/routers/alertLog.ts`; pure where-clause builder in `src/server/routers/alertLog-filter.ts` so filter logic is unit-testable without pulling the auth stack. UI at `/dashboard/settings/alerts` (nav shortcut `H`). Tests: `tests/integration/alert-log-router.test.ts` + `src/server/routers/alertLog.test.ts`.
- **Zod → OpenAPI generator:** `scripts/gen-openapi.ts` now uses `@asteasolutions/zod-to-openapi` v7 (v8 requires zod@4; we're on 3.24) to derive `/leads` POST, `/leads/bulk` POST, and `/health` GET components + paths directly from `src/server/schema/registry.ts`. Remaining paths (`/leads/bulk/{jobId}`, routing simulate, schema discovery, error catalog, metrics summary) stay hand-authored and are merged in — they expose internal runtime shapes outside the intake registry. Invoked via `pnpm openapi:build` (alias `pnpm gen:openapi`). Output contract guarded by `tests/unit/openapi-spec.test.ts`.
- **Lint:** 28 warnings → 0 via per-line fixes + targeted `biome-ignore` with reasons (a11y label/htmlFor pairs, svg titles, keyboard handlers on clickable rows, positional array-index keys on svg children, one jsonpath-plus v10 type gap). No `biome.json` rule-level changes.
- **Ops script:** `scripts/purge-stale-queue.ts` — `pnpm tsx scripts/purge-stale-queue.ts` one-shot `DELETE FROM pgboss.job WHERE state IN ('created','retry') AND createdon < NOW() - INTERVAL '30 minutes'`.
- **Release:** version `1.0.1` in `package.json`; `CHANGELOG.md` appended; tag `v1.0.1` on `main`.
