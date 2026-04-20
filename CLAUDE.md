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

## Fraud score (W2.1)

- Model `FraudPolicy` (single global row, upserted in seed) — 5 weight fields + `autoRejectThreshold` (80) + `borderlineMin` (60) + `version`. Cache: 30s LRU in `src/server/intake/fraud-policy-cache.ts`.
- Pure fn `computeFraudScore(signals, policy)` in `src/server/intake/fraud-score.ts` — sums weights, clamps to 0..100, returns `{score, fired}`.
- Signal builder `buildSignals(input)` in `src/server/intake/fraud-signals.ts` — assembles `FraudSignal[]` from blacklist/dedup/voip/phone-country-vs-geo check.
- Intake pipeline writes `Lead.fraudScore` + `Lead.fraudSignals` (Json) and emits `LeadEvent.FRAUD_SCORED { score, signals, policyVersion }`. **No enforcement yet** — W2.2 adds auto-reject above threshold.
- Tests: unit coverage for score math + signal builder; integration `intake-fraud-score.test.ts` (clean / blacklist / geo_mismatch / combo / custom weights).

## Status Pipe Pending (W1.2 anti-shave)

- `Broker.pendingHoldMinutes: Int?` — opt-in per-broker (null = feature off).
- После успешного push в `src/server/jobs/push-lead.ts`: если `holdMin > 0` → `LeadState.PENDING_HOLD` + `Lead.pendingHoldUntil` + LeadEvent `PENDING_HOLD_STARTED` + pg-boss job `resolve-pending-hold` scheduled на момент истечения hold-окна.
- Postback handler (`src/app/api/v1/postbacks/[brokerId]/route.ts`): если прежнее состояние PENDING_HOLD и mapped=DECLINED → `Lead.shaveSuspected=true` + LeadEvent `SHAVE_SUSPECTED`. При ACCEPTED/FTD/DECLINED clearing `pendingHoldUntil` и emit `PENDING_HOLD_RELEASED` (если не shave).
- Job `resolve-pending-hold` (`src/server/jobs/resolve-pending-hold.ts`): при срабатывании, если лид всё ещё в PENDING_HOLD — переводит в ACCEPTED + emit `PENDING_HOLD_RELEASED`.
