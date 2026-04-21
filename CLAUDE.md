# Working notes for Claude Code

## v2.0 S2.0-3 — Stripe subscription billing (EPIC-21, 2026-04-23)

- **Schema.** New models: `Subscription` (1:1 on Tenant), `PaymentMethod`, `Invoice` + `SubscriptionStatus` enum (`ACTIVE|TRIALING|PAST_DUE|CANCELED|UNPAID|INCOMPLETE`). Migration `20260423120000_v2_s3_subscription_billing`. **NB:** this `Invoice` is the *platform subscription* invoice from Stripe; distinct from `BrokerInvoice` / `AffiliateInvoice` (v1.0 S6 internal payout accounting) — do not confuse the two. `tests/helpers/db.ts::resetDb()` wipes invoice → paymentMethod → subscription → tenant.
- **Env.** Added (all optional) `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{STARTER,GROWTH,PRO}`, `STRIPE_BILLING_RETURN_URL` in `src/lib/env.ts`. When `STRIPE_SECRET_KEY` is unset, the app runs in "trial-only" mode — admin billing mutations throw `stripe_not_configured`.
- **Service layer.** `src/server/billing/stripe.ts` — lazy Stripe singleton + `createOrRetrieveCustomer` / `createCheckoutSession` / `createBillingPortalSession` / `cancelSubscription` / `reactivateSubscription`. `_resetStripeClientForTests()` for test isolation. `isStripeConfigured()` gates everything.
- **Plans.** `src/server/billing/plans.ts` defines `PlanTier = trial|starter|growth|pro` + `PLAN_LIMITS` (monthly leads + max brokers + seats + price in cents). `stripePriceIdFor(plan)` / `planFromStripePriceId(priceId)` round-trip via env.
- **Quota gate.** `src/server/billing/plan-gates.ts::enforceQuota(tenantId, delta)` — aggregates current-month `LeadDailyRoll.totalReceived` via `$queryRaw` joined to `Affiliate.tenantId`, compares vs `PLAN_LIMITS[plan].maxLeadsPerMonth`. Fails-open on DB errors. Pure helper `decideQuota(plan, used, delta)` exposed for unit tests. Wired into `src/app/api/v1/leads/route.ts` right after rate-limit check — over-quota returns 429 `plan_quota_exceeded`.
- **Webhook.** `src/app/api/stripe/webhook/route.ts` (public — whitelisted in `src/middleware.ts`). Verifies signature via `STRIPE_WEBHOOK_SECRET`, dispatches to `src/server/billing/webhook.ts::handleStripeEvent` (pure + unit-testable). Handles `customer.subscription.{created,updated,deleted}` + `invoice.{paid,payment_failed}`. Emits Telegram `SUBSCRIPTION_CREATED|RENEWED|CANCELED|INVOICE_PAID|INVOICE_FAILED` (all admin-only; templates in `src/server/telegram/templates/{subscription-*,invoice-*}.ts`). `subscriptionPeriod()` reads `current_period_start/end` from either `Subscription` or nested `SubscriptionItem` (Stripe API v2025+ moved them).
- **tRPC router.** `src/server/routers/billing.ts` — `getSubscription` / `getUsage` / `listInvoices` (tenant-scoped, `protectedProcedure`) + `startCheckout` / `openPortal` / `cancel` / `reactivate` (`adminProcedure`). Registered as `billing` in `src/server/routers/_app.ts`.
- **Seed.** `prisma/seed.ts` now upserts a `TRIAL` `Subscription` for `tenant_default` (14-day window). Idempotent via `upsert`.
- **UI.** `/dashboard/settings/billing` — current-plan card + status pill + renewal date + Stripe portal button + cancel/reactivate, usage bar with 90 % warn/over-quota red state, 3-tier plan-change grid (Starter/Growth/Pro), invoice table with PDF/hosted link. Nav shortcut `O` (added to `src/components/shell/NavConfig.ts`). Shows "Stripe is not configured" banner when the secret is missing; disables admin actions.
- **Tests added (22 new):** `tests/unit/billing-plan-gates.test.ts` (7 — decideQuota logic), `tests/integration/billing-webhook.test.ts` (7 — handleStripeEvent DB transitions + telegram stub), `tests/integration/billing-router.test.ts` (8 — getSubscription/listInvoices + cross-tenant isolation + non-admin blocked).
- **Release.** Version `2.0.0-s3` in `package.json`; tag `v2.0.0-s3-stripe-billing`.

## v2.0 multi-tenancy (S2.0-1 + S2.0-2 landed 2026-04-21)

- **Tenant model live** (`prisma/schema.prisma`). Every tenant-scoped model carries `tenantId`; primary tables (`Affiliate`, `ApiKey`, `Broker`, `BrokerTemplate`, `Lead`, `User`) are `NOT NULL` + DB `DEFAULT 'tenant_default'`.
- **`withTenant(tenantId, fn)`** (`src/server/db-tenant.ts`) scopes Prisma calls via AsyncLocalStorage. `attachTenantMiddleware` ($use) auto-filters reads / updates / deletes on `TENANT_SCOPED_MODELS`, post-filters findUnique, and fills `tenantId = tenant_default` on creates with no scope.
- **tRPC** — `ctx.tenantId`, `ctx.hostTenantId`, `ctx.sessionTenantId` set. `protectedProcedure` rejects `sessionTenantId !== hostTenantId` (except SUPER_ADMIN) and runs inside `withTenant(ctx.tenantId, …)`. `superAdminProcedure` skips scoping (cross-tenant CRUD).
- **Hostname → tenant (S2.0-2).** `src/server/tenant/domain-role.ts` parses `<role>.<slug>.<root>` → `{ tenantSlug, domainRole }`. `src/middleware.ts` reads `x-forwarded-host` (Fly), resolves, 404s path mismatches, and propagates via `x-tenant-slug` header. `src/server/tenant-registry.ts` resolves slug → tenantId (60s LRU, flushed on CRUD).
- **Domain roles.**
  - `network.<slug>.<root>` → `/dashboard/*`, `/super-admin/*`, `/login`, `/`, `/api/trpc/*`, `/api/auth/*`, `/docs/*`, `/share/*`. Rejects `/api/v1/*`.
  - `autologin.<slug>.<root>` → `/autologin/*`, `/api/v1/autologin/*`, `/api/auth/*`, `/api/v1/health`.
  - `api.<slug>.<root>` → only `/api/v1/*`.
  - No match / `crm-node.fly.dev` / `localhost` → `tenant_default` / `network`.
- **Branding.** `Tenant.theme` (Zod `TenantThemeSchema`): `brandName` / `logoUrl` / `primaryColor` / `accentColor` / `legalLinks`. Server-only `getTenantBranding(tenantId)` (60s LRU) + `TenantBrandingStyle` RSC injects `--brand` / `--accent` CSS vars into the dashboard layout.
- **Super-admin UI.** `/super-admin/tenants` (list) / `/super-admin/tenants/new` / `/super-admin/tenants/[id]` — only for `UserRole.SUPER_ADMIN`. `src/server/routers/tenant.ts` drives CRUD + audit log on every write.
- **Tenant branding settings.** `/dashboard/settings/branding` (tenant admin only, shortcut `V`) — form-edit own tenant's theme. Uses `tenant.myBranding` / `tenant.updateMyBranding` tRPC procs.
- **Intake** — `verifyApiKey` returns `tenantId`; `/api/v1/leads`, `/api/v1/leads/bulk`, `/api/v1/postbacks/:brokerId` wrap their handler in `withTenant(key.tenantId, …)` and stamp `Lead.tenantId`.
- **Env var.** `ROOT_DOMAIN` (empty = disable 3-domain pattern; every host → `tenant_default`).
- **Pentest.** `tests/e2e/tenant-isolation-pentest.test.ts` — 22 probes, 100% isolated. Adding a new tenant-scoped tRPC proc? Add a probe there.

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

## Routing UI (v1.0.2 rebuild)

- **Overview:** `src/app/dashboard/routing/page.tsx` — dashboard view (KPI tiles, flows table, by-GEO bars, broker pool health roster, top-5 cap-blocked 24h). Pulls from `routing.overview` tRPC proc.
- **Flow list:** `src/app/dashboard/routing/flows/page.tsx` — unchanged shape.
- **Visual editor:** `src/app/dashboard/routing/flows/[flowId]/page.tsx` — reactflow-driven split-pane (versions | canvas | inspector). Uses `src/components/routing-editor/*` for the canvas + node renderers + inspectors.
- **Graph adapter:** `src/server/routing/flow/graph.ts::flowToGraph()` / `graphToFlow()` / `extractPositions()` — round-trip between persistence `FlowGraph` (nodes+edges) and reactflow's `{id, position, data, type}` shape.
- **Editor components:** `src/components/routing-editor/{Canvas,Inspector,AlgorithmInspector,CapInspector,ScheduleGrid,VersionHistory,nodes}.tsx`.
- **Simulator:** `src/app/dashboard/routing/flows/[flowId]/simulator/page.tsx` — tabbed single/batch mode with vertical execution-trace timeline.
- **New tRPC procs:** `routing.listAlgoConfigs` / `upsertAlgoConfig` / `listBrokersForFlow` / `overview`.

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

## v1.5.0 (April 2026) — GA

Five sprints, one tag. Theme: analytics + ops ergonomics on top of the v1.0 core. No runtime routing changes. Upgrade notes `docs/release/v1-5-upgrade-notes.md`; sign-off `docs/release/v1-5-sign-off.md`; parking lot `docs/v1-5-parking-lot.md`.

- **BI Report Builder (EPIC-14):** preset CRUD polish (rename / duplicate / default), full drill-down on 4 metric types (`DrillDownDrawer`), period-compare delta badges + colored sparklines, tokenized share links with TTL + public viewer at `/share/analytics/:token`.
- **Visual Rule-Builder (EPIC-17):** deep filter-condition builder, drag-position persistence via `FlowNode.meta.pos`, draft-vs-publish state badge. Proven round-trippable against 5 real v1.0 flows (`src/server/routing/flow/graph-diff.test.ts`).
- **Broker Clone:** `Broker.clonedFromId` self-relation + `cloneBroker` helper (blanks secrets, starts paused) + tRPC `broker.clone` + `listClones` + clone dialog UI.
- **Delayed Actions:** `ScheduledChange` table (Flow/Broker/Cap), patch allowlist, `applyScheduledChange` orchestrator with latency stamping, `*/1` minute cron, admin UI at `/dashboard/settings/scheduled-changes`. SLA: 95 % within ±5 min of target (`scheduled-change-sla.test.ts`).
- **Status Groups (EPIC-18):** `CanonicalStatus` (20 seeded rows × 4 categories) + `StatusMapping` per-broker + `classifyLeadStatus` 30s LRU cache + status-mapping admin page + inline backfill with `STATUS_MAPPING_BACKFILL_PROGRESS` Telegram events. `Lead.canonicalStatus` + `LeadDailyRoll.canonicalStatus` (now part of unique tuple + populated by rollup).
- **Q-Leads v1.5 trend:** `computeQualityScoreWithTrend` adds a per-affiliate 7d MA adjustment (`down −5 / up +3 / flat 0`). Per-affiliate `QualityTrendWidget` + table sparkline column.
- **S1.5-5 close-outs:** `LeadDailyRoll.canonicalStatus` groupBy + unique-tuple change; `STATUS_MAPPING_BACKFILL_PROGRESS` event + template; cross-sprint E2E at `tests/e2e/v1-5-full-flow.test.ts`; perf baseline `docs/perf/v1-5-baseline.md`.
- **Tests:** 717 passing + 1 todo (v1.0.0 shipped at 558). Three new since S1.5-4: rollup canonicalStatus bucketing, status-mapping backfill emit, v1.5 cross-sprint smoke.
- **Release:** `package.json` → `1.5.0`; tag `v1.5.0` on `main`.

## v1.5 S1.5-4 — EPIC-18 Status Groups + Q-Leads v1.5 trend (April 2026)

- **Schema:** `StatusCategory` enum (`NEW | QUALIFIED | REJECTED | CONVERTED`); `CanonicalStatus` model (20 seeded rows via `prisma/seeds/canonical-statuses.ts`); `StatusMapping` model (`@@unique([brokerId, rawStatus])`, `@@index([canonicalStatusId])`); `Lead.canonicalStatus String?` + `LeadDailyRoll.canonicalStatus String?` denormalized.
- **Classifier:** `src/server/status-groups/classify.ts::classifyLeadStatus(brokerId, rawStatus)` — 30s LRU per-broker cache with `invalidateStatusMappingCache(brokerId?)`. Returns `"unmapped"` for null/empty/unknown. Trims whitespace; case-sensitive by design. Called from `src/app/api/v1/postbacks/[brokerId]/route.ts`; every postback writes `Lead.canonicalStatus`.
- **Router:** `src/server/routers/statusMapping.ts` — `listCanonical` (protected), `observedRawStatuses` (last-30d raw freq + mapping join), `upsert/bulkUpsert/remove` (admin, AuditLog + cache invalidate), `suggestFor` (Levenshtein — `src/server/status-groups/suggest.ts`), `coverageForBroker`, `backfillLeads`.
- **UI:** `/dashboard/brokers/[id]/status-mapping` — coverage + unmapped tiles, raw table with per-row canonical dropdown, bulk "apply suggested", "remap existing leads" backfill. Link added on broker detail top-bar.
- **Seed demo mappings:** `prisma/seeds/status-mappings.ts` ships 10 demo brokers × ~10 raw statuses = ~100 mappings, upserted from `prisma/seed.ts`.
- **Q-Leads v1.5 trend:** `computeQualityScoreWithTrend` in `src/server/intake/quality-score.ts` layers a per-affiliate 7d trend adjustment on top of the v1.0 score — `down` (Δ<-10) → -5 pts; `up` (avg≥80, |Δ|≤5) → +3; `flat` else. `loadAffiliate7dTrend(affiliateId)` pulls last-7d vs 7d..14d AVG in one `$queryRaw`. Intake route persists `qualitySignals.affiliateTrend` + `trendDelta` alongside the existing components.
- **Affiliate UI:** `/dashboard/affiliates/[id]` renders `QualityTrendWidget` (30d daily avg + 7d MA overlay, color-coded by tone). `/dashboard/affiliates` table gains "q trend" column — 7d sparkline + avg from `affiliate.qualitySparklines`.
- **Analytics:** `AnalyticsFilters.canonicalStatuses` multi-select (optional for backward compat). `analytics.canonicalStatusBreakdown` groups `Lead.canonicalStatus` counts across window. `drillDown` gains `canonical-status` kind.
- **Tests added:** 30 — unit `classifyLeadStatus` (10), unit `computeQualityScoreWithTrend` (11), integration `status-mapping-router` (7), integration `postback-canonical-status` (2), integration `analytics-canonical-status` (2). Coverage seed (broker top-10) drives the 95% coverage demo; production coverage query exists as `statusMapping.coverageForBroker`.
- **Deferred:** materialized-view `LeadDailyRoll.canonicalStatus` population (column exists, refresh cron still writes NULL — `canonicalStatusBreakdown` reads `Lead` directly). Telegram `STATUS_MAPPING_BACKFILL_PROGRESS` event (plan §A.4) deferred — backfill runs inline.
- **Release:** version `1.5.0-s4` in `package.json`; tag `v1.5.0-s4-status-groups-qleads`.

## v1.5 S1.5-3 — Broker Clone + Delayed Actions (April 2026)

- **Broker Clone:** `Broker.clonedFromId` self-relation. `src/server/brokers/clone.ts::cloneBroker` copies all whitelisted config, blanks `endpointUrl` / `postbackSecret` / `authConfig` / `autologinLoginUrl`, starts clone paused. tRPC `broker.clone` (AuditLog emitted) + `broker.listClones`. Detail page: "Clone…" button + `CloneDialog` (copy/blank preview) + "cloned from" / "cloned as N" badges.
- **Delayed Actions:** new `ScheduledChange` table (entityType Flow/Broker/Cap, status PENDING/APPLIED/CANCELLED/FAILED, payload JSON patch, applyAt, latencyMs, appliedBy, errorMessage).
  - **Patch allowlist** (`src/server/scheduled-changes/patch.ts`): Broker {isActive, dailyCap, workingHours, retrySchedule, pendingHoldMinutes, autologinEnabled}; Flow {status (DRAFT→PUBLISHED via `publishFlow`), activeVersionId}; Cap {limit, perCountry, countryLimits (array re-create)}.
  - **Orchestrator** (`src/server/scheduled-changes/orchestrator.ts`): `applyScheduledChange(id)` inside Prisma transaction, stamps `latencyMs` = drift from target, writes `scheduled_change_applied` / `_failed` AuditLog, emits Telegram events (both admin-only).
  - **Cron** (`src/server/jobs/apply-scheduled-changes.ts` + `worker.ts`): `*/1 * * * *` schedule. SLA success criterion: 95% of changes apply within ±5 min of target — `scheduled-change-sla.test.ts` asserts 20/20.
  - **tRPC router** (`src/server/routers/scheduledChange.ts`): `list` (filters status / entityType / applyAt range), `byId`, `create`, `cancel`, `applyNow`, `retry`, `allowedFields`. All adminProcedure.
  - **Admin UI:** `/dashboard/settings/scheduled-changes` (nav shortcut `J`). Filter bar + per-row Apply now / Cancel / Retry.
  - **Audit hash-chain:** `src/server/audit.ts::getSystemUserId` upserts `system@gambchamp.local` so cron-driven `writeAuditLog({userId:"system"})` satisfies FK.
  - **Telegram:** `SCHEDULED_CHANGE_APPLIED` + `SCHEDULED_CHANGE_FAILED` events added to `event-catalog.ts` (both in `ADMIN_ONLY_EVENTS`); templates `scheduled-change-applied.ts` / `-failed.ts`.
- **Parking lot:** per-entity "Schedule change" wizard on Flow/Broker/Cap edit pages (admin list suffices for S3); baseline-drift detection (last-write-wins for v1.5); auto-subscribing admins to the new events.
- **Tests added:** broker-clone (4), broker-clone-router (3), scheduled-change-apply (3), scheduled-change-cancel (1), scheduled-change-failure (2), scheduled-change-router (6), scheduled-change-sla (1), patch (8), telegram-template (2) = 30 new.
- **Release:** version `1.5.0-s3` in `package.json`; tag `v1.5.0-s3-clone-and-delayed`.

## v1.5 S1.5-2 — EPIC-17 Visual Rule-Builder residuals (April 2026)

- **Deep filter-condition builder:** Inspector's Filter block replaced with a full rule-builder — field × op matrix (`legalOpsForField` — `matches` restricted to string fields, `timeOfDay` to set-like ops), op-aware value editor (single-input / chip list / time-range), AND/OR logic toggle, live Zod validation + row error highlight. `src/components/routing-editor/FilterConditionEditor.tsx` + `filter-conditions.ts` pure helper (21 tests).
- **Node position persistence via `meta.pos`:** Zod node schemas now carry optional `NodeMetaSchema` (`{pos: {x, y}}` + passthrough). `flowToGraph` reads with precedence `explicit > meta.pos > auto-layout`; `graphToFlow` stamps reactflow position onto `meta.pos` (opt out via `{persistPositions: false}`). `Canvas.onNodeDragStop` writes into `node.data.raw.meta.pos` → save-signature drift → debounced save. Legacy `algorithm.__positions` channel preserved for backward compat.
- **Draft-vs-Publish state badge:** pure `computeDraftPublishState` state machine → `dirty` / `ahead` / `published` / `saved` / `readonly`. `DraftPublishBadge` component drives the editor breadcrumb; replaces the plain flow-status Pill. `debouncePending` derived from `saveSignature !== lastSavedSigRef`.
- **Diff-test: 5 v1.0 flows round-trip:** `src/server/routing/flow/graph-diff.test.ts` pins auto-migrate-single / WRR-four / Slots-Chance-three / two-hop fallback / parallel filter branches. Byte-equal with `{persistPositions: false}`; structural equality + meta.pos stamp otherwise.
- **Deferred:** live preview widget (Task D) — the existing `/dashboard/routing/flows/:id/simulator` page is one click from the header; an embedded client-side N-lead sim would duplicate engine logic. Reassess if users request in-canvas distribution histograms.
- **Release:** version `1.5.0-s2` in `package.json`; tag `v1.5.0-s2-visual-rule-builder`. 629 tests + 1 todo (up from 577).

## v1.5 S1.5-1 — EPIC-14 BI Report Builder polish (April 2026)

- **Preset polish:** `AnalyticsPreset.isDefault` + `renamePreset` / `setDefaultPreset({id:null})` to clear / `getDefaultPreset` procs in `src/server/routers/analytics.ts`. UI: `src/components/analytics/PresetManager.tsx` (star-toggle / rename / delete). Default preset auto-loaded on analytics page mount.
- **Drill-down:** `analytics.drillDown` discriminated-union proc (`metric|conversion|reject|revenue`) + `src/server/analytics/drilldown.ts` (`bucketToRange` translates date_trunc bucket + groupBy back to [from,to) window; `buildLeadWhere` assembles the Lead filter). `DrillDownDrawer` slide-over lists matching leads; each chart/tile wires a click handler.
- **Period-compare polish:** `src/components/analytics/DeltaBadge.tsx` with pure `classifyDelta(deltaPct, epsilon=0.5)` → `up|flat|down|unknown`. `MetricTile` sparkline stroke color matches tone.
- **Share-link polish:** `GET /api/v1/analytics/share` (list caller's links w/ `{token,createdAt,expiresAt,expired}`) + `DELETE /api/v1/analytics/share` (purge expired). `ShareDialog` component: copy-to-clipboard w/ 2-sec toast + TTL selector + "expires in Nd" + purge-expired shortcut. Public read-only page `/share/analytics/:token` (SSR), whitelisted in `src/middleware.ts`. Expired → in-page banner (not 404); unknown → `notFound()`.
- **Deferred:** Google Sheets export — `googleapis` is ~3 MB + OAuth service-account flow; per plan "first-drop candidate". Parked for S1.5 polish or v2.0.
- **Tests:** 19 new (6 preset polish, 4 drill-down, 4 delta-badge, 2 share list/purge, 3 public viewer SSR). Total 577 + 1 todo.

## v1.0.1 hotfix (April 2026)

- **Self-hosted Scalar docs viewer:** `/docs/api` is split into an RSC shell (`src/app/docs/api/page.tsx`) + a client component (`src/app/docs/api/ApiDocsClient.tsx`) rendering `@scalar/api-reference-react` with locally bundled JS/CSS. No more jsDelivr dependency. Spec source unchanged (`docs/api/v1/openapi.yaml` → `/api/v1/openapi`).
- **AlertLog ack:** new `ackedAt` / `ackedBy` columns + `ackedAt` index on `AlertLog` (applied via `pnpm prisma db push`). Admin-only `alertLog.list` + `alertLog.ack` tRPC router in `src/server/routers/alertLog.ts`; pure where-clause builder in `src/server/routers/alertLog-filter.ts` so filter logic is unit-testable without pulling the auth stack. UI at `/dashboard/settings/alerts` (nav shortcut `H`). Tests: `tests/integration/alert-log-router.test.ts` + `src/server/routers/alertLog.test.ts`.
- **Zod → OpenAPI generator:** `scripts/gen-openapi.ts` now uses `@asteasolutions/zod-to-openapi` v7 (v8 requires zod@4; we're on 3.24) to derive `/leads` POST, `/leads/bulk` POST, and `/health` GET components + paths directly from `src/server/schema/registry.ts`. Remaining paths (`/leads/bulk/{jobId}`, routing simulate, schema discovery, error catalog, metrics summary) stay hand-authored and are merged in — they expose internal runtime shapes outside the intake registry. Invoked via `pnpm openapi:build` (alias `pnpm gen:openapi`). Output contract guarded by `tests/unit/openapi-spec.test.ts`.
- **Lint:** 28 warnings → 0 via per-line fixes + targeted `biome-ignore` with reasons (a11y label/htmlFor pairs, svg titles, keyboard handlers on clickable rows, positional array-index keys on svg children, one jsonpath-plus v10 type gap). No `biome.json` rule-level changes.
- **Ops script:** `scripts/purge-stale-queue.ts` — `pnpm tsx scripts/purge-stale-queue.ts` one-shot `DELETE FROM pgboss.job WHERE state IN ('created','retry') AND createdon < NOW() - INTERVAL '30 minutes'`.
- **Release:** version `1.0.1` in `package.json`; `CHANGELOG.md` appended; tag `v1.0.1` on `main`.
