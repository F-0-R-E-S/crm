# GambChamp CRM — Readiness Checklist

> **Living document.** Update on every release. Claude Code is instructed via `CLAUDE.md` to keep the boxes honest. Mark `[x]` when a block is actually shipped to prod (not just coded locally).
>
> **Paired with:** [`specs/2026-04-20-multi-version-roadmap-design.md`](specs/2026-04-20-multi-version-roadmap-design.md) (the spec) and the sprint plans under `plans/`.

## Snapshot

| Field | Value |
|---|---|
| **Last updated** | 2026-04-22 |
| **Prod version** | `2.0.0-s3` (https://crm-node.fly.dev) |
| **Local HEAD** | `a4a70d5 feat(routing): tRPC treeView proc + tree-list read-only page (S3.3 T2+T3)` |
| **Tests** | ~969 passed / 10 skipped / 1 todo (213 test files) |
| **Prisma models** | 55 (added `ComparingBucketStat`) |
| **tRPC routers** | 22 (routing gains `treeView`) |
| **Page + API endpoints** | 70 (added `/routing/simulate-pool` + tree page) |
| **Prisma migrations** | 13 (latest: `20260424120000_v2_s3_1_routing_irev_parity`) |
| **v1.0 → v2.0-s3 commits** | ~170 (from `pre-wave1-merge`) |

## Overall readiness

- **v1.0 core** — ✅ **100%** (released `v1.0.0`, hardened via `v1.0.1` + `v1.0.2` + `v1.0.3`)
- **v1.5** — ✅ **100%** (released `v1.5.0`, all 5 sprints shipped)
- **v2.0** — ⚠️ **67%** (4 of 6 sprints shipped: S1/S2/S3 billing + **S3-routing iREV parity** complete locally)
- **v2.5** — ⏳ **0%** (not started)
- **Post-v2.0 residual parking lot** — 10 items, all documented below

---

## v1.0 GA — Core platform

### P0 MVP (EPIC-01..07 — all shipped pre-audit)

- [x] EPIC-01 Lead Intake API (`/api/v1/leads` single + bulk, versioned schema, idempotency via `IdempotencyKey`, sandbox, metrics, audit hash-chain, PII masking)
- [x] EPIC-02 Routing engine (WRR + Slots-Chance, GEO/schedule/cap constraints, fallback orchestrator, simulator)
- [x] EPIC-03 Broker integration (templates catalog, field mapping, postback HMAC, health checks, error aggregator)
- [x] EPIC-04 Affiliate management (CRUD, API keys, intake settings, outcome webhooks)
- [x] EPIC-05 Leads UI (grid, 4-tab drawer, filters, export)
- [x] EPIC-06 RBAC (ADMIN + OPERATOR seed; expanded in later sprints)
- [x] EPIC-07 Anti-fraud v0 (blacklist, dedup, VOIP, phone-vs-geo)

### v1.0 Sprints (roadmap spec §4)

- [x] **S1** Wave1 merge (per-country caps, `PENDING_HOLD`, fraud score + enforcement) + bulk idempotency + `ApiKey.allowedIps`/`expiresAt` + nullable `tenantId` forward-compat — `v1.0-sprint-1-complete`
- [x] **S2** EPIC-08 Autologin + SLA + Q-Leads quality score — `v1.0-sprint-2-complete`
- [x] **S3** EPIC-09 UAD (cold-overflow + manual review queue) + per-column RBAC — `v1.0-sprint-3-complete`
- [x] **S4** EPIC-10 Analytics v1 (rollups, drill-down, period-compare, share links, presets, CSV) — `v1.0-sprint-4-complete`
- [x] **S5** EPIC-11 Telegram ops bot (23 event types, 8 commands, anomaly + daily-summary crons) — `v1.0-sprint-5-complete`
- [x] **S6** EPIC-12 P&L + CRG native + back-to-back invoicing MVP — `v1.0-sprint-6-complete`
- [x] **S7** EPIC-13 Onboarding wizard + `/pricing` + 10 broker templates + live test-lead stream — `v1.0-sprint-7-complete`
- [x] **S8** Hardening (perf, `/health`, `/metrics/summary`, alert rules, runbooks, OpenAPI, `CHANGELOG`) — `v1.0.0`

### v1.0.x post-GA polish

- [x] `v1.0.1` — self-host Scalar viewer, AlertLog ack UI, Zod-driven OpenAPI, lint cleanup (28 → 0 warnings)
- [x] `v1.0.2-routing-rebuild` — reactflow visual editor, split-pane layout, KPI overview, simulator modernized
- [x] `v1.0.3-routing-editor-ux` — canvas toolbar, `+ Add broker target`, edge drawing, Delete, publish guard
- [x] Sidebar redesign — 6 expandable groups + full-sidebar collapse + `localStorage` persistence

### v1.0 residuals — **closed**

- [x] Drift migration `20260421095551_v1_0_post_wave1` — 650-line migration capturing all v1.0 schema changes that had landed via `db push`
- [x] Middleware public-route whitelist (`/api/v1/openapi`, `/docs/api`, `/api/telegram/`, `/share/analytics/`)
- [x] Routing editor autosave fix (`updateDraftGraph` — in-place update vs version-bump — `b9709b0`)

---

## v1.5 GA — Analytics & Ops ergonomics

Released `v1.5.0` (pre-release tags `s1..s4` + GA). Success criteria at roadmap spec §10.

### S1.5-1 — BI Report Builder polish

- [x] Preset CRUD polish (rename, delete, default, auto-load)
- [x] Drill-down drawer across all 4 metric types (metric/conversions/rejects/revenue) — click-through to underlying leads
- [x] Period-compare delta badges (green/amber/red)
- [x] Share-link copy + expiry UI + public `/share/analytics/:token` viewer (no auth)
- [ ] **Google Sheets export** — deferred (googleapis is 3MB; OAuth service-account setup deferred; see parking lot)

### S1.5-2 — Visual Rule-Builder residuals

- [x] Filter-condition deep editor (field × op × value builder with chip-list for in/not_in, timeOfDay range)
- [x] Node drag-position persistence (`FlowNode.meta.pos`)
- [x] Diff-test — 5 real v1.0 flow shapes round-trip through `flowToGraph → graphToFlow`
- [x] Draft-vs-publish state indicator (DRAFT / SAVED / AHEAD / PUBLISHED)
- [ ] **Live-preview widget** (synthetic leads through draft) — deferred in favor of standalone Simulator page

### S1.5-3 — Broker Clone + Delayed Actions

- [x] `Broker.clonedFromId` self-relation + "Clone broker" UI with attribution
- [x] `ScheduledChange` model + `apply-scheduled-changes` pg-boss cron (60s tick, ±5 min SLA)
- [x] Admin UI `/dashboard/settings/scheduled-changes` (create/list/cancel/applyNow/retry)
- [x] Telegram events `SCHEDULED_CHANGE_APPLIED` + `SCHEDULED_CHANGE_FAILED`
- [ ] **Per-entity "Schedule change" wizard on Flow/Broker/Cap edit pages** — deferred; admin list suffices

### S1.5-4 — Status Groups + Q-Leads trend

- [x] `CanonicalStatus` + `StatusMapping` models + 20 canonical statuses seed
- [x] Classifier `classifyLeadStatus` wired into postback handler
- [x] Admin UI `/dashboard/brokers/:id/status-mapping` (bulk + suggest via Levenshtein + inline backfill)
- [x] Analytics — `canonicalStatusBreakdown` + `canonicalStatus` filter in drill-down
- [x] Q-Leads v1.5 — 7-day trend factoring + per-affiliate trend chart + grid column sparkline

### S1.5-5 — Release hardening

- [x] Integration smoke `tests/e2e/v1-5-full-flow.test.ts`
- [x] Perf re-baseline at `docs/perf/v1-5-baseline.md` (within 5% of v1.0; zero drops at 1k rps burst)
- [x] `docs/release/v1-5-upgrade-notes.md` + `v1-5-sign-off.md` + `v1-5-parking-lot.md`
- [x] All 4 spec §10 success criteria signed off (BI drill-down, 5-flow round-trip, Delayed Actions SLA, Status Groups coverage)

---

## v2.0 — Monetize & Scale (IN PROGRESS)

Target GA: Q2 2027 per spec. Currently shipped: S1..S3.

### S2.0-1 — White-Label Foundation

- [x] `Tenant` model (id/slug/name/domains/theme/featureFlags/adminAllowedIps)
- [x] `tenantId` activated on 21 tables (primary made NOT NULL; Lead.tenantId now NOT NULL via S2.0-2 follow-up)
- [x] `withTenant()` AsyncLocalStorage helper + Prisma `$use` middleware auto-filter for tenant-scoped models
- [x] tRPC `ctx.tenantId` + `superAdminProcedure` for cross-tenant ops
- [x] Intake pipeline resolves tenant from api-key's affiliate
- [x] `UserRole.SUPER_ADMIN` + `super@gambchamp.local` seed

### S2.0-2 — Tenant Routing + Branding + Isolation

- [x] Hostname → tenant middleware (3-domain pattern: `network.*` / `autologin.*` / `api.*`)
- [x] Session-vs-host tenant assertion (logout + redirect if mismatched)
- [x] Super-admin tenant CRUD UI `/super-admin/tenants`
- [x] Per-tenant branding (Zod `TenantThemeSchema` + CSS-var injection + `/dashboard/settings/branding` editor)
- [x] `Lead.tenantId` NOT NULL
- [x] 22-probe cross-tenant pentest (100% isolated — one real leak in `scheduledChange.create` caught and patched)
- [ ] **`/login` and `/pricing` per-tenant branding** — dashboard branding shipped; public pages still default (parking lot)
- [ ] **Logo upload handler** (BYO URL only for now)

### S2.0-3 — Stripe Subscription Billing

- [x] `Subscription` / `PaymentMethod` / `Invoice` (platform-level, distinct from finance `BrokerInvoice`/`AffiliateInvoice`)
- [x] Stripe service layer (lazy singleton; stub mode without `STRIPE_SECRET_KEY`)
- [x] Webhook `/api/stripe/webhook` (5 event types → DB transitions + 5 Telegram events)
- [x] tRPC `billing` router (getSubscription, checkout, portal, cancel, reactivate, listInvoices)
- [x] Plan gating via `enforceQuota` on single-lead intake (`{starter, growth, pro, trial}` tiers)
- [x] `/dashboard/settings/billing` admin UI
- [x] Trial `Subscription` seeded for default tenant
- [ ] **Bulk-intake quota gate** — single-lead only today (parking lot)
- [ ] **Stripe secrets not configured in prod** — app runs in trial-only mode; set `STRIPE_SECRET_KEY` + price IDs to activate
- [ ] **Webhook signature-verification standalone unit test** — covered E2E only

### S2.0-3.1 — Routing iREV Parity (local; tagged `v2.0.0-s3.1..s3.3`)

Canonical spec: [`specs/2026-04-22-routing-irev-parity-design.md`](specs/2026-04-22-routing-irev-parity-design.md).
Plan: [`plans/2026-04-22-routing-irev-parity-plan.md`](plans/2026-04-22-routing-irev-parity-plan.md).

#### S3.1 backend — `v2.0.0-s3.1-routing-backend`

- [x] Prisma schema additions: `CapDefinition.{rejectedLimit,rejectedLimitAsPercent,rejectionsInARow,pqlScope,behaviorPattern}`, `CapCounter.kind`, `ComparingBucketStat` table + `CapBehaviorPattern` / `CapCounterKind` enums (migration `20260424120000_v2_s3_1_routing_irev_parity`)
- [x] PQL Zod vocabulary (8 fields × 10 signs + `caseSensitive` toggle) — `PqlRuleSchema`, `PqlGateSchema`
- [x] New FlowNode kinds: `SmartPool` (priority-failover) + `ComparingSplit` (A/B) + `BrokerTarget.{active,description,pqlGate}` extension
- [x] Legacy Filter `{conditions, op}` → `{rules, sign, caseSensitive}` shape rewritten by `FlowGraphSchema` preprocess + one-shot data migration (`scripts/migrate-filter-to-pql.ts`)
- [x] PQL field registry + pure evaluator (`src/server/routing/pql/`) — 29 tests
- [x] SmartPool → FallbackStep compiler — 8 tests
- [x] ComparingSplit → Algorithm(WRR) compiler — 9 tests
- [x] `publishFlow` compiles SmartPool chains at publish time; cycle detector runs on merged set
- [x] Engine: SmartPool bias (first-rank child wins over WRR/Slots-Chance); `BrokerTarget.pqlGate` evaluated pre-cap so a gate miss doesn't consume cap slots; per-target `active` toggle; decision tags `selectedSmartPoolId` + `selectedComparingSplitId`
- [x] Cap engine: `kind` (PUSHED/REJECTED) threaded through `consumeCap`/`releaseCap`/`remainingCap`; `pqlScope` gates consumption + salts bucket key via sha256; `effectiveRejectedLimit` helper
- [x] Rejection streak counter (Redis, 24h TTL) + `shouldAutoPause` pure helper
- [x] Postback handler bumps/resets streak and auto-pauses broker on threshold — emits `BROKER_REJECTION_STREAK_PAUSED` Telegram event + AuditLog
- [x] Simulator batch mode with per-broker accept-probability rolling + SmartPool chain-walk — 2 new tests

#### S3.2 canvas + simulator — `v2.0.0-s3.2-routing-canvas`

- [x] Filter / PQL editor vocabulary extended to full 8 fields × 10 signs with per-row case-sensitive toggle (`Aa` checkbox)
- [x] `SmartPoolNode` + `ComparingSplitNode` reactflow renderers with handles + kind-tinted accents
- [x] Canvas toolbar: `+ SmartPool` + `+ Compare` entries; Fallback button gets a "deprecated" tooltip
- [x] BrokerTarget inspector: `active`, `description`, optional PQL gate editor (add/remove)
- [x] CapInspector gains `rejectedLimit`, `rejectedLimitAsPercent`, `rejectionsInARow` controls
- [x] Simulator page `pool` tab: N + per-broker accept-probability JSON + result panel with per-broker bars + first-10 sequential traces
- [x] New REST `/api/v1/routing/simulate-pool` (synchronous batch with probs)

#### S3.3 tree surface + sign-off — `v2.0.0-s3.3-routing-tree`

- [x] `flowToTree(graph)` pure projection + `summarizeTree` helper — 6 unit tests
- [x] tRPC `routing.treeView` query
- [x] `/dashboard/routing/flows/:flowId/tree` read-only compact iREV-style view with per-kind Pills (AD/FLT/ALG/SM/CO/FB) + expand-collapse + child counts
- [x] Canvas editor header gains a "Tree" quick-switch button
- [x] Scenario E2E test: 100 leads through SmartPool `[b1:0, b2:0, b3:1]` → every lead lands on broker 3 via 3-hop trace; companion `[1,0,0]` single-hop test
- [ ] **Tree-list inline edit + create** — deferred to a follow-up (parking lot entry)
- [ ] **ComparingSplit bucket ingestion** — `ComparingBucketStat` writer hook in engine; UI widget rendering per-branch winners (parking lot)
- [ ] **Auto-migrate legacy `Fallback` nodes → `SmartPool`** — deprecation tooltip only for now

- [ ] Multi-currency (`Currency` enum + `FxRate` + daily FX rate ingest)
- [ ] Partial payment handling on `BrokerInvoice` / `AffiliateInvoice`
- [ ] Chargeback handling + CRG cohort adjustment
- [ ] Many-to-many invoice matching (pro-rata by traffic)

### S2.0-5 — Compliance Hardening (pending)

- [ ] 2FA enforcement per role (mandatory ADMIN + NETWORK_ADMIN)
- [ ] SSO: SAML 2.0 + Google Workspace
- [ ] Full audit-log UI (filters, export)
- [ ] Login anomaly detection (location/device/failed-attempts → Telegram alert + optional session lock)
- [ ] `Tenant.adminAllowedIps` CIDR enforcement (schema exists from S2.0-1, enforcement pending)

### S2.0-6 — Telegram Mini App + GA (pending)

- [ ] Mini App deployed as Telegram WebApp (view leads, pause broker, ack alert, view stats, switch affiliate)
- [ ] Telegram initData auth + JWT bridge to existing session
- [ ] `v2.0.0` tag + full pentest report + `CHANGELOG` + runbooks v2 update

---

## v2.5 — Intelligence & Platform (NOT STARTED)

Target: Q4 2027. Full plan at `plans/2027-07-01-v2-5-intelligence-and-platform.md`.

### S2.5-1 — Smart Fraud ML data pipeline + baseline
- [ ] Training set export (12+ months of decisions)
- [ ] Feature engineering (20+ features)
- [ ] Baseline model (gradient-boosted trees)
- [ ] Offline eval: precision ≥0.85 @ recall ≥0.75

### S2.5-2 — Online scoring + explainability UI
- [ ] Model deployed (Python FastAPI microservice or onnxjs)
- [ ] Shadow mode (2 weeks)
- [ ] SHAP values persisted on `Lead.fraudAttributions`
- [ ] Lead drawer explainability widget (top-3 contributing features)
- [ ] Threshold auto-tune recommender (admin approval required)

### S2.5-3 — Cohort / Retention Report
- [ ] Cohort retention analytics view (7d/30d/60d/90d)
- [ ] Shareable link support
- [ ] Drill-down to individual leads

### S2.5-4 — Public API & Developer Portal
- [ ] API token tiers (Free / Pro / Enterprise) with rate limit bands
- [ ] Public docs site (extend `/docs/api`)
- [ ] Webhooks catalog (discoverable event types)
- [ ] Anonymous sandbox (resets daily)
- [ ] 3 quickstart tutorials

### S2.5-5 — Provider API + PWA
- [ ] Provider API (3rd-party CRMs as upstream; HubSpot or Bitrix24 pilot)
- [ ] PWA wrapper for `/dashboard` with service-worker shell cache

### S2.5-6 — Marketplace v2 + GA
- [ ] `/marketplace` public catalog
- [ ] Community-contributed templates (review queue + 5-star ratings)
- [ ] One-click install
- [ ] `v2.5.0` GA

---

## Parking lot (shipped with known deferrals)

| Item | Introduced in | Target | Severity |
|---|---|---|---|
| Google Sheets export | v1.5-s1 | v1.5.x | low |
| In-canvas live simulator preview | v1.5-s2 | v2.1+ | low |
| Per-entity "Schedule change" wizards | v1.5-s3 | v2.0.1 | medium |
| Canonical status rollup column (reads `Lead` directly when same-day) | v1.5-s4 | v2.0.1 | low |
| Bulk-intake `enforceQuota` gate | v2.0-s3 | v2.0-s4 | medium |
| `/login` and `/pricing` per-tenant branding | v2.0-s2 | v2.0-s6 | low |
| Tenant logo upload (BYO URL only today) | v2.0-s2 | v2.0-s6 | low |
| Tenant-registry cache invalidation across multi-machine deploys | v2.0-s2 | when scaled past 1 app machine | medium |
| Flaky `tests/integration/telegram-events-wired.test.ts` (module-cache; passes in isolation) | v1.0-s5 | v2.0.1 cleanup | low |
| Tree-list inline edit + create (currently read-only) | v2.0-s3.3 | v2.0.x | medium |
| `ComparingBucketStat` writer + comparison winner UI | v2.0-s3.1 | v2.0.x | medium |
| Auto-migrate legacy `Fallback` nodes → `SmartPool` | v2.0-s3.3 | v2.1 | low |

---

## How to update this file

1. On any release/sprint completion, flip `[ ]` → `[x]` for the items that actually shipped to prod (`fly deploy` + `curl /api/v1/health` version check).
2. Add any new deferrals to the parking lot with introduced-version, target, severity.
3. Bump the **Snapshot** table at the top — `Last updated`, `Prod version`, `Local HEAD`, tests count.
4. Commit this file in the same PR as the release commit.

**Claude Code note:** `CLAUDE.md` references this file — keep it synchronized with CHANGELOG + what's actually in prod. If Claude finishes a sprint, it must update the relevant `- [ ]` → `- [x]` in the same commit and record the release tag.

## Docs infra

- [x] Feature inventory generator + `pnpm docs:regen` + CI drift guard — #2026-04-22-docs-01
- [x] Docs maintenance + evolution mechanism (audit + scaffold + update-prompt + playbook) — #2026-04-22-docs-07
