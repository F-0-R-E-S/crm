# Changelog

All notable changes to GambChamp CRM. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## v1.0.1 (2026-04-21)

Hotfix sprint following the v1.0 launch checklist.

### Fixed / Changed

- **Self-host Scalar API viewer:** `/docs/api` now loads the locally bundled `@scalar/api-reference-react` package instead of pulling the standalone bundle from jsDelivr. Docs survive CDN outages. Spec source unchanged (`docs/api/v1/openapi.yaml` → `/api/v1/openapi`).
- **AlertLog acknowledgements:** added `ackedAt` / `ackedBy` columns to `AlertLog` plus a `/dashboard/settings/alerts` admin page (shortcut `H`) with rule / ack-state / date-range filters and a one-click Ack button. Backed by a new `alertLog.list` + `alertLog.ack` tRPC router (admin-only).
- **Zod-driven OpenAPI generation:** replaced the hand-authored `openapi.yaml` + passthrough script with a real generator (`@asteasolutions/zod-to-openapi` v7) that derives `/leads` POST, `/leads/bulk` POST, and `/health` GET from the schemas in `src/server/schema/registry.ts`. Routing / schema-discovery / ops paths remain hand-authored and are merged in — they expose internal runtime shapes that don't live in the intake registry. Run via `pnpm openapi:build` (also aliased at `pnpm gen:openapi`).
- **Biome lint polish:** 28 warnings → 0 via per-line fixes and targeted `biome-ignore` with reasons (a11y labels / svg titles / keyboard handlers on clickable rows / positional array-index keys / one jsonpath-plus v10 type gap). No `biome.json` rule-level changes.

### Ops

- `scripts/purge-stale-queue.ts` — one-shot `pnpm tsx scripts/purge-stale-queue.ts` helper to delete `pgboss.job` rows stuck in `created` / `retry` for ≥ 30 minutes.

## [1.0.0] — 2026-09-10 — Core GA

### Sprint 1 — Wave1 merge + security hardening

- **Wave1 landed:** per-country caps, `PENDING_HOLD` state, fraud score + auto-reject threshold + borderline review queue.
- **Bulk intake:** idempotency upsert with 409 response on payload-hash mismatch; sync ≤50 / async >50.
- **ApiKey hardening:** `allowedIps` allow-list, `expiresAt`, `isRevoked`, `isSandbox` fields; `keyHash` + `keyPrefix` stored separately.
- **`tenantId` nullable forward-compat:** all major tables have the column; v1.0 GA ships single-tenant.

### Sprint 2 — Autologin + SLA + Q-Leads

- **Autologin:** proxy pool + per-endpoint health tracker; 4-stage monitoring (initiating → captcha → authenticating → session-ready) with captcha-detection flag.
- **SLA tracker:** 99.5% uptime SLO with per-broker breakdown exposed via `/api/v1/autologin/sla`.
- **Q-Leads:** 0–100 quality score combining affiliate history, geo match, and broker fit — surfaced in analytics v1.

### Sprint 3 — UAD + per-column RBAC

- **UAD (Unified Attempt Dispatcher):** cold-overflow queue; retry ladder 10s / 60s / 5m / 15m / 1h; manual-fallback enqueue on exhaustion.
- **Per-column RBAC:** affiliate role hides broker-side PII (broker names, endpoint URLs, vendor keys); operator + admin have full visibility.

### Sprint 4 — Analytics v1

- **4 drill-downs:** by broker, by affiliate, by geo, by sub-id.
- **Period comparison** via URL state; save-filter presets; tokenized share links (TTL + revoke).
- **MVs:** hourly, daily, weekly materialized views with hourly refresh + lag gauge.

### Sprint 5 — Telegram ops bot

- **23 event types:** NEW_LEAD, PUSHED, ACCEPTED, DECLINED, FTD, FAILED, FRAUD_HIT, MANUAL_REVIEW_QUEUED, PENDING_HOLD_START/RELEASED, SHAVE_SUSPECTED, BROKER_DOWN/RECOVERED, CAP_REACHED, AUTOLOGIN_DOWN/SLA_BREACHED, PROXY_POOL_DEGRADED, DAILY_SUMMARY, ANOMALY_DETECTED, FRAUD_POLICY_CHANGED, BROKER_CONFIG_CHANGED, AFFILIATE_DAILY_SUMMARY, AFFILIATE_FTD, ALERT_TRIGGERED.
- **Subscription management** with per-user filters + broker/affiliate mute lists.
- **Slash commands:** `/stats`, `/ack`, `/pause_broker`, `/resume_broker`.

### Sprint 6 — P&L + CRG + invoicing

- **Conversion tracking** per affiliate + broker; payout rule resolver (CPA_FIXED / CPA_CRG / REV_SHARE / HYBRID).
- **CRG native cohorts** with auto-settle + shortfall detection; auto-invoicing with back-to-back matching MVP (single-currency, full-invoice only).

### Sprint 7 — Onboarding wizard

- **5-step wizard** end-to-end < 30 min: org setup → broker picker → affiliate + sandbox key → live test lead via SSE → go-live.
- **Broker templates catalog** with ≥ 10 named templates (OctaFX / IQOption / Plus500 / Exness style, etc.) + detail page at `/dashboard/brokers/templates/:id`.
- **Public pricing page** with 3 tiers + comparison matrix.
- **Admin widget:** time-to-first-lead (median + p90 over 30d).

### Sprint 8 — Hardening + launch

- **Perf gates met:**
  - 500 rps sustained 30 min: intake p95 < 500 ms (measured 394 ms).
  - 1k rps / 60 s burst: zero drops.
  - Routing engine 10k-batch p95 < 1 s (measured 743–961 ms depending on concurrency).
- **E2E smoke:** `tests/e2e/v1-full-flow.test.ts` — signup → onboarding → broker → intake → push → postback → telegram outbox.
- **Structured observability:** shared pino `logger` with redact paths; events `intake.request`, `intake.response`, `routing.decision`, `broker.push`, `fraud.score`, `telegram.emit`.
- **`/api/v1/health`:** returns `{status, db, redis, queue, version}` (load-balancer-friendly).
- **`/api/v1/metrics/summary`:** admin-auth 60 s rolling counters (leads_received, leads_pushed, fraud_hit, broker_down_count, manual_queue_depth).
- **Alerts engine:** 6 rules (intake_failure_rate, routing_p95, autologin_sla_breach, manual_queue_depth, broker_down_prolonged, ftd_dropoff) with `AlertLog` + Telegram `ALERT_TRIGGERED` + auto-resolve.
- **Runbooks:** `docs/runbooks/v1-launch.md` (5 scenarios) + `docs/runbooks/oncall-checklist.md` + broker-contacts register.
- **Public API docs:** OpenAPI 3.0 spec at `docs/api/v1/openapi.yaml` + `/docs/api` Scalar viewer + sandbox discoverability.
- **Security baseline:** CSP + HSTS + X-Frame-Options; signup rate-limit 5/h/IP; SQLi/XSS/IDOR regression tests; pentest-lite manual checklist.
- **pg-boss worker runner:** `worker.ts` now boots all S2–S8 crons (analytics rollups, CRG settle, manual-queue-depth-check, anomaly-detect, daily-summary, proxy-health, alerts-evaluator).
- **Version bump to `1.0.0`** + tag `v1.0.0`.

## [0.2.0] — 2026-04-20

- Wave0 + pre-wave1 merge. EPIC-01 Lead Intake, EPIC-02 Routing engine, EPIC-03 Broker integration, EPIC-04 Affiliate settings, EPIC-05 Lead UI, EPIC-06 RBAC.

## [0.1.0] — 2026-03-15

- Initial scaffold: Next.js 15 + tRPC v11 + Prisma 5 + NextAuth v5. Base models + admin dashboard shell.
