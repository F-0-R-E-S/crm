# Changelog

All notable changes to GambChamp CRM. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## v1.5.0-s2 (2026-04-20)

S1.5-2 — EPIC-17 Visual Rule-Builder residuals on top of the v1.0.2 /
v1.0.3 structural editor. Core canvas, toolbar, inspector, add/remove,
edge-draw and publish-guard already shipped in v1.0.3; this release
closes the remaining gaps from the v1.5 plan.

### Added

- **Deep filter-condition builder** — Inspector's Filter block is now a
  full rule-builder with an op-aware value editor, AND/OR logic toggle,
  live Zod validation and inline error highlight.
  `src/components/routing-editor/FilterConditionEditor.tsx` +
  `filter-conditions.ts` (pure helpers: field/op matrix, value coercion,
  chip parser). 21 unit tests in `filter-conditions.test.ts`.
- **Node position persistence via `FlowNode.meta.pos`** — the Zod node
  schemas now carry an optional `meta` field with a `{pos: {x, y}}`
  layout hint. `flowToGraph` reads positions with precedence
  (explicit > meta.pos > auto-layout); `graphToFlow` stamps the current
  reactflow position back onto `meta.pos` so drag edits survive the
  JSON round-trip. Canvas's `onNodeDragStop` writes into
  `node.data.raw.meta.pos` which flows into the save signature and
  triggers the debounced save. Legacy `algorithm.__positions` side
  channel preserved for backward compat.
- **Draft-vs-Publish state badge** in the flow-editor breadcrumb, driven
  by a pure `computeDraftPublishState` state machine:
  `DIRTY_UNSAVED` (red) / `DRAFT_AHEAD` (orange) / `PUBLISHED` (green) /
  `DRAFT_SAVED_Ns_AGO` (neutral) / `READ_ONLY`. 14 unit tests in
  `draft-publish-state.test.ts` covering every transition + the elapsed-
  time formatter.

### Tests

- **Diff-test: 5 v1.0-shape flows round-trip** —
  `src/server/routing/flow/graph-diff.test.ts`. 5 fixtures
  (auto-migrate single, WRR four brokers, Slots-Chance three, two-hop
  fallback chain, parallel filter branches). Each survives Zod, byte-
  equal round-trip under `{persistPositions: false}`, and structural
  equality (ignoring meta) under defaults.
- **Meta-pos round-trip tests** —
  `src/server/routing/flow/graph-meta-pos.test.ts` (6 cases).

### Changed

- `src/server/routing/flow/model.ts` — added `NodeMetaSchema` +
  re-exported each node variant as a named TS type.
- `src/server/routing/flow/graph.ts::flowToGraph` now preserves input
  node order (no more bucket-sort reshuffling) for byte-stable
  round-trips. Reactflow renders by absolute position, not list order,
  so visual output is unchanged.
- `src/app/dashboard/routing/flows/[flowId]/page.tsx` — wired
  `DraftPublishBadge` into the header, exposed `debouncePending` derived
  from `saveSignature !== lastSavedSigRef`.

### Parking lot

- **Live preview widget** (Task D) — deferred. The existing full
  Simulator page at `/dashboard/routing/flows/:id/simulator` is one
  click away from the editor header; embedding a client-side
  synthetic-sim widget in the sidebar would duplicate engine logic for
  marginal UX gain. Reassess in v1.5-s3 if usage data shows users would
  benefit from an in-canvas N-lead distribution histogram.

## v1.5.0-s1 (2026-04-21)

S1.5-1 — EPIC-14 BI Report Builder polish (descoped from the plan's full scope).

### Added

- **Preset CRUD polish** — `AnalyticsPreset.isDefault` column + new tRPC
  procs `renamePreset`, `setDefaultPreset`, `getDefaultPreset`. UI in
  `PresetManager` component (star-toggle default, rename, delete,
  click-to-apply). Default preset auto-loads once on page mount.
- **Full drill-down on 4 metric types** — click any metric tile, line
  point, funnel bar, reject bar or revenue row to open the
  `DrillDownDrawer` — a read-only list of the underlying leads with
  links back to `/dashboard/leads/:id`. Backed by new
  `analytics.drillDown` discriminated-union tRPC procedure +
  `src/server/analytics/drilldown.ts` (`bucketToRange` +
  `buildLeadWhere`).
- **Period-compare visual polish** — new `DeltaBadge` with
  `classifyDelta(deltaPct, epsilon)` yielding `up` / `flat` / `down` /
  `unknown` tones. Metric-tile sparklines now color-match the tone
  (green/amber/red/neutral).
- **Shareable link polish** — new `GET /api/v1/analytics/share` (list
  caller's links with expiry metadata) + `DELETE /api/v1/analytics/share`
  (purge expired). `ShareDialog` client component adds copy-URL-
  to-clipboard with a 2-sec toast, TTL selector (1/7/30/90 days),
  "expires in N days" indicator + one-click purge-expired.
- **Public viewer page** `/share/analytics/:token` — unauthenticated
  read-only dashboard rendering the saved query live. Expired tokens
  show a friendly banner (no 404); unknown tokens `notFound()`. Route
  whitelisted in `src/middleware.ts`. "Powered by GambChamp CRM" footer.

### Changed

- `src/app/dashboard/analytics/page.tsx` — header now uses
  `PresetManager` + dedicated share button (replacing the old inline
  share/save-preset controls in `FilterBar`); version stamp bumped to
  `v1.5`. Revenue tile + line chart + conversions/rejects widgets all
  dispatch click events into the drill-down drawer.
- `src/components/analytics/FilterBar.tsx` — `presets` prop marked
  DEPRECATED (kept for compat; new code uses `PresetManager`).

### Ops

- `package.json` → `1.5.0-s1`. Tag `v1.5.0-s1-bi-polish`.
- 19 new tests (6 preset polish + 4 drill-down + 4 delta-badge + 2
  share list/purge + 3 public viewer SSR). Total 577 + 1 todo (558 → 577).

### Deferred

- Google Sheets export — per plan "first-drop candidate". Requires
  `googleapis` (~3 MB) + OAuth service-account flow; out of scope for
  S1.5-1 as written. Parked for S1.5-polish or v2.0.

## v1.0.2 (2026-04-21)

Routing UI rebuild — pulls v1.5 EPIC-17 "Visual Rule-Builder" forward.

### Added

- **Visual flow editor** (`/dashboard/routing/flows/:id`) — replaces the
  old JSON-heavy detail page with a three-pane layout: version history
  sidebar (left), reactflow canvas (center), node-kind-dispatched
  inspector (right). Custom node renderers for Entry / Filter /
  Algorithm / BrokerTarget / Fallback / Exit. Broker-target nodes surface
  `lastHealthStatus` and `autologinEnabled` directly on the card.
- **Flow↔visual graph adapter** — `src/server/routing/flow/graph.ts`
  with `flowToGraph()` + `graphToFlow()` + `extractPositions()`. Fully
  round-trippable through `FlowGraphSchema`. Auto-layout buckets nodes
  by role (entry → filter → algorithm → broker → fallback → exit) and
  spaces them on a left→right grid; user drag edits can be snapshotted
  via the optional `positions` argument.
- **Algorithm inspector** — per-broker WRR sliders (1–100) with preview
  %, Slots-Chance rows (must sum to 100%) with auto-normalize button and
  reset. Reuses existing server-side validators.
- **7×24 schedule grid** — click-drag paint / right-click erase; TZ
  field round-trips into the `entryFilters.schedule` JSON consumed by
  `src/server/routing/constraints/schedule.ts` (DST-aware).
- **Cap inspector** — scoped-to-broker view of cap definitions with
  inline hourly/daily/weekly windows, per-country limit sub-rows, and
  live remaining from `/api/v1/routing/caps/:flowId` (refresh every 30s).
  Reuses the Wave1 `CapCountryLimit` model.
- **Simulator upgrade** (`/dashboard/routing/flows/:id/simulator`) —
  tabbed single/batch mode. Single renders a vertical decision trace
  with per-step ok/fail + detail; batch takes a JSON array of lead
  payloads and shows a results table. Fallback path rendering highlights
  which fallback hops fired.
- **Routing overview** (`/dashboard/routing`) — KPI tiles (active flows,
  received/routed 24h, hit-rate), flows table, by-GEO bars, broker pool
  roster with health, top-5 cap-blocked events (24h). Replaces the old
  rotation-rules legacy UI entirely.
- **New tRPC procedures** on `routing.*`:
  - `listAlgoConfigs` / `upsertAlgoConfig` — mirrors the existing REST
    algorithm endpoint; validates chance-sum + slot-bounds.
  - `listBrokersForFlow` — trimmed summary without broker secrets.
  - `overview` — 24h aggregation for the overview dashboard.
- **Tests** — `src/server/routing/flow/graph.test.ts` (5 round-trip
  tests); `tests/integration/routing-ui-procedures.test.ts` (5 tests
  covering listBrokersForFlow secret redaction, algo upsert,
  chance-sum validation, PUBLISHED guard + OPERATOR block, overview
  aggregation). Test count: 534 + 1 todo.

### Changed

- `flows/page.tsx` back-link renamed "← overview" (legacy rotation
  rules UI is gone).
- `package.json` → `1.0.2`.

### Ops

- New runtime dependency: `reactflow@11.11.4`.

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

## v1.0.3 (2026-04-21)

### Routing editor — structural editing from UI
- Canvas toolbar with **+ Filter / Fallback / Exit** buttons.
- **+ Add broker target** in Algorithm inspector (dropdown of active brokers, weight/chance slider, remove).
- Edge drawing via reactflow `onConnect` (self-loop / Entry-target / Exit-source guards).
- `Delete` / `Backspace` removes selected node + adjacent edges (Entry + last Exit protected).
- Debounced draft save (500 ms) with "saved Ns ago" indicator.
- Empty-state banner when flow has no broker targets.
- Publish button disabled when no BrokerTarget reachable from Entry.

### Tests
- 25 new unit tests for pure graph builders (add/remove node, edge guards, reachability).
- Total 557 passed + 1 todo; flaky telegram-events-wired test passes in isolation.
