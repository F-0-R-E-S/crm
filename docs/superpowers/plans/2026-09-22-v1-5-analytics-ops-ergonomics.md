# v1.5 — Analytics & Ops Ergonomics (Sprint-level Implementation Plan)

> **For agentic workers:** this is a **sprint-level** plan. Each sprint gets a dedicated day-by-day / TDD plan file generated immediately before it starts (e.g. `2026-09-22-v1-5-sprint-1-bi-report-builder.md`). This file sets scope, file surface, task breakdown, open questions, and acceptance criteria — no line-by-line code.

**Target release:** v1.5.0 — **December 2026** (~10 weeks after v1.0 GA on 2026-09-10).
**Branch strategy:** each sprint on its own branch (`v15/s1-bi-builder`, `v15/s2-visual-rules`, ...) merged into `main` after green CI + manual smoke.
**Theme:** analytics and operator productivity on top of the v1.0 core — no new runtime subsystems, no schema migrations that break v1.0 invariants.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §5 (scope), §8 (competitive), §10 (success criteria).

**Assumed inbound state from v1.0 GA:**
- `AnalyticsPreset` table exists (shipped in v1.0 S4).
- Hourly / daily / weekly materialized views exist (`mv_conv_hourly`, `mv_reject_hourly`, `mv_rev_hourly`, `mv_metric_hourly` + `_daily` + `_weekly`), refreshed by a pg-boss cron.
- Drill-down tRPC routers `analytics.drill*` expose summary + breakdown at all 4 metric types. v1.5 S1 extends the UI but does not rewrite the data layer.
- `Flow` / `FlowVersion` / `FlowBranch` / `FlowAlgorithmConfig` / `FallbackStep` Prisma models are the source of truth for routing. v1.5 S2 edits them via a new UI — no runtime changes.
- `Broker` model has all config, creds, and per-broker webhook templates.
- `computeQualityScore()` (added in v1.0 S2) is the Q-Leads scoring helper; v1.5 S4 extends its inputs.

**Cross-sprint invariant (hard rule):**
> Nothing in v1.5 changes routing runtime behavior. Flows authored in visual mode round-trip to the same JSON the engine already consumes. The v1.0 engine.ts is untouched.

**Preflight (run once at sprint 1 day 1):**
- `git checkout main && git pull`
- `pnpm install`
- `pnpm db:up`
- Confirm v1.0 tag `v1.0.0` is reachable; branch off `main` at or after that tag.

---

## Sprint S1.5-1 (W1–2, 2026-09-22 → 2026-10-03) — EPIC-14 BI Report Builder polish

**Focus:** close the BI-builder gap left from the v1.0 S4 descope. Saved presets, fully-populated drill-down UIs for all 4 metric types, period-compare visual polish, shareable-link UX, optional Google Sheets export.

### Deliverables

1. **Preset CRUD UI** (on top of existing `AnalyticsPreset` table)
   - Create / rename / duplicate / delete preset from the analytics page header.
   - "Default preset" toggle per user.
   - Presets shared at org scope optional flag (owner-only).
2. **Drill-down UI for all 4 metric types**
   - Metric (volume + conversion funnel)
   - Conversions (FTD, deposit count, revenue per lead)
   - Rejects (reason histogram + affiliate × reason heatmap)
   - Revenue (CRG vs CPA vs Rev-share split; broker × affiliate matrix)
3. **Period-compare visual polish**
   - Consistent delta badges (`+12.4%` / `-3.1%`) across all panels.
   - Dual-axis line chart with dashed previous-period overlay.
   - Respects preset filters when "compare" is toggled.
4. **Shareable tokenized link polish**
   - Copy-link button with inline TTL selector (1h / 24h / 7d / never).
   - Read-only landing page for unauthenticated viewers: same drill-downs, export disabled, "powered by GambChamp" footer.
   - Viewer-count metric on owner's dashboard ("seen by N anonymous viewers").
5. **Google Sheets export** (if `google-spreadsheet` npm stays under ~200 kB and auth flow is OAuth-only, not service account)
   - One-click "export to Google Sheets" per drilldown panel.
   - OAuth consent flow; token stored per user (`User.googleOauthToken`).
   - If library is heavier than budget or requires service-account JSON in env, **skip** and mark as v2.0 parking lot.

### Files to create / modify

**Prisma (additive only):**
- `prisma/schema.prisma` — extend `AnalyticsPreset` with `isDefault Boolean`, `shareScope: 'PRIVATE' | 'ORG'`; add `SharedAnalyticsView` (id, presetId, token, expiresAt, viewCount, createdBy).
- Add `User.googleOauthToken String?` + `User.googleOauthRefresh String?` only if Sheets export ships.

**Server:**
- `src/server/routers/analytics-preset.ts` — extend existing router with `setDefault`, `duplicate`, `listShared`, `shareCreate`, `shareRevoke`.
- `src/server/analytics/share-token.ts` — HMAC-signed token builder + verifier (reuse `AUDIT_HASH_CHAIN_SECRET` pattern? — **open question 1**).
- `src/server/analytics/sheets-export.ts` — only if Sheets ships.
- `src/app/api/v1/analytics/shared/[token]/route.ts` — public read-only endpoint.

**UI:**
- `src/app/(dashboard)/analytics/page.tsx` — add preset dropdown + share dialog header.
- `src/app/(dashboard)/analytics/_components/preset-manager.tsx` (new).
- `src/app/(dashboard)/analytics/_components/share-dialog.tsx` (new).
- `src/app/(dashboard)/analytics/_components/drilldown-<metric|conversions|rejects|revenue>.tsx` — fill in panels left stubbed in v1.0 S4.
- `src/app/(public)/shared/[token]/page.tsx` — read-only shared-view renderer.
- `src/app/(dashboard)/analytics/_components/compare-toggle.tsx` — visual polish component.

**Tests:**
- `tests/integration/analytics-preset-crud.test.ts`
- `tests/integration/analytics-share-token.test.ts` (token signing, expiry, viewCount increment)
- `tests/integration/analytics-drilldown-<type>.test.ts` × 4 (assert panels render with seed data and delta badges match expected math)
- `tests/integration/analytics-sheets-export.test.ts` — only if Sheets ships.

### Task breakdown

1. **Day 1–2: Preset CRUD backend + UI** — extend `analytics-preset` router + preset dropdown component. Acceptance: user can create, rename, duplicate, delete, set-default a preset; default is loaded on page mount.
2. **Day 3–4: Drill-down panels for Metric + Conversions** — wire existing tRPC queries to real panels; replace v1.0 stubs. Acceptance: both panels populated with seed data, expand-to-row works, filter from preset is respected.
3. **Day 5–6: Drill-down panels for Rejects + Revenue** — same pattern, including the reject-reason heatmap and the CRG/CPA/Rev-share split chart. Acceptance: same as above for both.
4. **Day 7: Period-compare visual polish** — delta badge component, dashed-overlay chart, consistent deployment across all 4 panels. Acceptance: toggling compare redraws all 4 panels with overlay; color delta badges render red/green correctly.
5. **Day 8: Shareable link UI + public viewer** — share dialog, token route, public page. Acceptance: copy-link → open in incognito → same panels render without auth; expired token → 410.
6. **Day 9: Google Sheets export** — **only if** decision in open question 2 is "ship". Acceptance: click → OAuth consent → sheet appears in user's Drive with the current drill-down panel's data. If skipped, write a 1-line deferral note into `CLAUDE.md` under a `## v1.5 parking lot` section.
7. **Day 10: Hardening + integration smoke + commit/merge** — full test + lint + typecheck green; manual smoke of all 4 drill-downs and share link in staging DB.

### Open design questions (resolve in pre-sprint brainstorm)

1. **Share-token signing secret:** reuse `AUDIT_HASH_CHAIN_SECRET` or introduce a new `ANALYTICS_SHARE_SECRET`? — leaning towards new var to keep rotation independent of the audit chain.
2. **Google Sheets export:** ship or defer? `google-spreadsheet` is ~150 kB + `googleapis` ~3 MB — budget-sensitive. If deferred, record decision as spec rider. **Pre-sprint must decide.**
3. **Preset share scope:** does "org" mean all users in the same org, or just other admins? Check v1.0 S4 RBAC — likely admins + managers only.
4. **Public shared view:** does it expose anonymized broker / affiliate names, or redact them by default with an opt-in unredact toggle? Default to unredacted for v1.5, add redaction toggle as v2.0 item.

### Acceptance criteria

- All 4 drill-down panels fully populated (zero placeholder blocks) against seed data in a fresh dev DB.
- Create → rename → set-default → delete preset round-trip verified in integration test.
- Share link opens in incognito browser and renders the correct preset's drill-down. TTL expiry returns HTTP 410.
- `view_count` increments on each anonymous load (verified via raw SQL in test).
- Period-compare toggle produces visually correct deltas on all 4 panels (verified by snapshot or numeric assertion with seeded rows).
- Google Sheets export either works E2E in a smoke run **or** is explicitly deferred with a spec rider.
- Performance: drill-down render < 800 ms p95 on 100k seeded leads (reuse v1.0 S4 perf harness).
- `pnpm test`, `pnpm lint`, `pnpm typecheck` green.

---

## Sprint S1.5-2 (W3–4, 2026-10-06 → 2026-10-17) — EPIC-17 Visual Rule-Builder

**Focus:** replace the current JSON-editor-only Flow / Branch screen with a drag-and-drop visual editor that round-trips to the same Flow JSON the v1.0 engine already consumes. No runtime changes; purely an authoring tool.

### Deliverables

1. **Visual editor screen** at `/dashboard/routing/flows/:id/edit`
   - Node palette: Condition (Geo, Schedule, Cap, FraudScore, Custom-predicate), Branch (true/false), Broker Selection (WRR weight / Slots / Chance / Priority), Fallback step.
   - React Flow canvas, pan + zoom, auto-layout initial render, snap-to-grid.
   - Right-side inspector panel: per-node config form (country list for Geo, cron for Schedule, cap-ref picker for Cap, weight table for WRR, etc.).
   - Undo / redo (at least linear history; branching history is nice-to-have).
2. **Flow JSON round-trip**
   - `graphToFlow()` — converts visual graph → `FlowVersion.config` JSON identical in shape to v1.0 hand-authored JSON.
   - `flowToGraph()` — converts existing `FlowVersion.config` JSON → visual graph for editing. Idempotent: `graphToFlow(flowToGraph(x)) === x`.
3. **Diff-test against 5 real v1.0 flows** (success criteria from spec §10)
   - Snapshot each real customer flow's `FlowVersion.config` JSON.
   - Round-trip through `flowToGraph → graphToFlow`; assert deep-equal.
   - Integration test runs the v1.0 `simulate` endpoint against 100 synthetic leads on both original and round-tripped config; outputs must match.
4. **Live preview panel**
   - Embedded simulator widget: sample lead inputs → highlights path taken through the visual graph.
   - Reuses `/api/v1/routing/simulate` from v1.0.
5. **Publish flow**
   - "Save draft" writes a new `FlowVersion` with `status: 'DRAFT'`.
   - "Publish" promotes to `status: 'ACTIVE'` and archives the previous active version — identical to existing publish endpoint; the visual editor just submits the assembled JSON to it.

### Files to create / modify

**Dependencies (new):**
- `reactflow` (industry standard, ~100 kB gzipped).
- `dagre` for auto-layout.

**Server:**
- `src/server/routers/flow.ts` — expose `previewJson(graphJson)` → passes through `graphToFlow` server-side (same logic as client for determinism) for safety.
- `src/server/routing/flow/graph-serializer.ts` — pure module: `graphToFlow()` + `flowToGraph()` + `validateGraph()`.

**UI (new):**
- `src/app/(dashboard)/routing/flows/[id]/edit/page.tsx` — visual editor shell.
- `src/app/(dashboard)/routing/flows/[id]/edit/_components/canvas.tsx` — React Flow wrapper.
- `src/app/(dashboard)/routing/flows/[id]/edit/_components/node-palette.tsx`
- `src/app/(dashboard)/routing/flows/[id]/edit/_components/inspector.tsx`
- `src/app/(dashboard)/routing/flows/[id]/edit/_components/node-types/{geo,schedule,cap,fraud-score,custom-predicate,branch,broker-selection,fallback}.tsx`
- `src/app/(dashboard)/routing/flows/[id]/edit/_components/preview-panel.tsx`

**Tests:**
- `tests/integration/flow-graph-serializer-roundtrip.test.ts` — 5 fixture flows.
- `tests/integration/flow-graph-serializer-equivalence.test.ts` — simulate 100 leads on both variants, assert identical outputs.
- `tests/unit/flow-graph-validate.test.ts` — catches invalid graphs (cycles, disconnected nodes, missing required inspector fields).

### Task breakdown

1. **Day 1: Spike + library selection** — confirm reactflow + dagre budget + SSR compatibility (reactflow is client-only, screen must be `"use client"`). Prototype a 2-node drag demo.
2. **Day 2–3: `graphToFlow` / `flowToGraph` serializer** — pure module, TDD from fixture JSON. Start with the simplest flow (single broker, no conditions), expand to fixtures with nested branches + caps + fallback. Acceptance: round-trip identity on all 5 fixtures.
3. **Day 4: Canvas + palette + drag-to-add** — basic shell with empty canvas, drag nodes from palette, connect edges. No inspector yet. Acceptance: user can assemble a graph, state reflects in a debug JSON dump.
4. **Day 5: Inspector for all node types** — per-type form components; changes reflect in node data. Acceptance: all 8 node types have editable inspectors, all required fields validated before save.
5. **Day 6: Auto-layout + undo/redo + save-draft** — dagre layout on load; local undo stack via `useReducer`. Wire "Save draft" to existing `flow.saveDraft` mutation. Acceptance: opening an existing flow renders with sensible layout; save+reopen preserves state.
6. **Day 7: Preview panel** — embed simulator, sample-lead form, highlight traversed nodes with edge animations. Acceptance: simulating a lead lights up the path, broker selection result shown.
7. **Day 8: Diff-test against 5 real flows** — snapshot 5 actual v1.0 FlowVersion configs from a staging DB dump → round-trip test → simulator equivalence test. Acceptance: all 5 pass bit-identical round-trip and behavioral equivalence on 100 synthetic leads.
8. **Day 9: Publish flow + archive previous** — "Publish" button, confirmation modal, optimistic UI. Reuse existing publish endpoint. Acceptance: draft → publish → draft now ACTIVE, previous ACTIVE is ARCHIVED, routing engine picks up new version.
9. **Day 10: Hardening + docs + merge** — accessibility check on canvas (keyboard nav for nodes), changelog entry, merge to main.

### Open design questions (resolve in pre-sprint brainstorm)

1. **Custom predicate node:** v1.5 exposes predicates via a safe expression language (subset of JS? CEL? a predefined dropdown?) — leaning towards a closed predicate vocabulary for v1.5 (geo-in, cap-reached, fraud-score >=, time-of-day, day-of-week, custom-regex-on-field). Full expression language → v2.0. **Must decide before task 4.**
2. **Layout persistence:** do we persist node x/y coordinates in `FlowVersion.config`? (would contaminate the engine-consumed JSON) or in a sibling `FlowVersionLayout` table keyed by version id? — leaning toward sibling table to keep engine JSON clean.
3. **Preview determinism:** the simulator uses CSPRNG for Slots/Chance. For preview, do we seed it for repeatability? Leaning toward seeding with a request-scoped token the UI can hold constant while tweaking a graph.
4. **Accessibility:** drag+drop is not screen-reader friendly — do we need a fallback text-form-based editor for a11y compliance? Defer to v2.0 unless a launch blocker.

### Acceptance criteria

- `graphToFlow(flowToGraph(x)) === x` for all 5 fixture FlowVersion configs (deep-equal assertion).
- Simulation on 100 synthetic leads produces identical output for original and round-tripped config (zero behavioral diff).
- A v1.0 flow authored in JSON loads into the visual editor and displays every node + every edge correctly (manual smoke + snapshot test).
- "Save draft" + "Publish" both function; ACTIVE version picked up by engine within one request cycle.
- Visual editor performance: loading a flow with 30 nodes + 50 edges < 1.5 s on laptop hardware.
- Reactflow bundle size < 150 kB gzipped (measured with `next build` output).
- `pnpm test`, `pnpm lint`, `pnpm typecheck` green.

---

## Sprint S1.5-3 (W5–6, 2026-10-20 → 2026-10-31) — Broker Clone + Delayed Actions

**Focus:** two productivity features that shave minutes off every ops workflow. Broker Clone (iREV parity) and Delayed Actions (CRM Mate parity + success criteria: ±5 min of target).

### Deliverables

#### A. Broker Clone

1. **"Clone broker" button** on `/dashboard/brokers/[id]` detail page.
2. **Clone dialog:**
   - New broker name field (required, pre-filled `"<original> (clone)"`).
   - Preview diff: what will be copied (all config, webhook templates, status mapping if S1.5-4 already in place), what will be blanked (endpoint URL, auth credentials, API secrets).
   - Confirm button writes a new `Broker` row with `clonedFromId` (new column) pointing at the source.
3. **Attribution trail:**
   - Broker detail page shows "Cloned from `<source broker name>`" if `clonedFromId` set.
   - Cloned-from broker shows "Cloned as `<N>` broker(s)" reverse badge.

#### B. Delayed Actions

1. **`ScheduledChange` table** (new) — see schema below.
2. **pg-boss cron `apply-scheduled-changes`** — runs every minute:
   - Fetches `status = 'PENDING' AND applyAt <= now()`.
   - For each row: loads current entity, applies JSON-patch, transitions to `APPLIED` with `appliedAt` stamp. Errors transition to `FAILED` with `errorMessage`.
3. **UI "Schedule change" option** on every editable resource (Flow, Broker, Cap):
   - Date-time picker (timezone-aware; uses operator's TZ, defaults to UTC).
   - Diff preview: JSON patch against current entity.
   - "Apply immediately" alternate button (no scheduling).
4. **Scheduled-changes admin page** at `/dashboard/admin/scheduled-changes`:
   - List of pending / applied / cancelled / failed changes.
   - Cancel button on pending rows.
   - Filter by entity type + created-by.
5. **Telegram notification integration** — when a scheduled change applies (success or failure), fire a `scheduled_change_applied` or `scheduled_change_failed` event on the v1.0 Telegram bot (reuse S5 event bus).

### Files to create / modify

**Prisma:**
- `prisma/schema.prisma`:
  - `Broker.clonedFromId String?` + self-relation + `@@index([clonedFromId])`.
  - New model `ScheduledChange`:
    ```
    model ScheduledChange {
      id            String   @id @default(cuid())
      entityType    String   // 'Flow' | 'Broker' | 'Cap'
      entityId      String
      payload       Json     // JSON patch to apply
      applyAt       DateTime
      status        String   @default("PENDING") // 'PENDING' | 'APPLIED' | 'CANCELLED' | 'FAILED'
      appliedAt     DateTime?
      errorMessage  String?
      createdBy     String   // User.id
      createdAt     DateTime @default(now())
      updatedAt     DateTime @updatedAt
      @@index([status, applyAt])
      @@index([entityType, entityId])
      @@index([createdBy])
    }
    ```

**Server:**
- `src/server/brokers/clone.ts` — pure clone helper (takes source broker id + new name, returns cloned record).
- `src/server/routers/broker.ts` — add `clone` mutation.
- `src/server/scheduled-changes/orchestrator.ts` — `applyScheduledChange(id)` with JSON-patch apply + audit log entry + Telegram notify.
- `src/server/scheduled-changes/patch.ts` — safe JSON-patch application per entity type (whitelist of editable fields per type).
- `src/server/routers/scheduled-change.ts` — `list`, `create`, `cancel`, `byId`.
- `src/server/jobs/apply-scheduled-changes.ts` — pg-boss cron worker.
- `src/server/jobs/register-jobs.ts` — register the cron at boot with 1-minute schedule.

**UI:**
- `src/app/(dashboard)/brokers/[id]/_components/clone-dialog.tsx` (new).
- `src/app/(dashboard)/brokers/[id]/page.tsx` — "Clone" button + clonedFrom badge rendering.
- `src/app/(dashboard)/_components/schedule-change-dialog.tsx` — generic dialog reused by Flow / Broker / Cap edit pages.
- `src/app/(dashboard)/admin/scheduled-changes/page.tsx` — list view.

**Tests:**
- `tests/integration/broker-clone.test.ts` — clone copies all whitelisted fields, blanks creds, sets `clonedFromId`.
- `tests/integration/scheduled-change-apply.test.ts` — create pending → fast-forward time → run worker → entity updated, status APPLIED.
- `tests/integration/scheduled-change-cancel.test.ts` — cancel pending → worker skips.
- `tests/integration/scheduled-change-failure.test.ts` — invalid patch (unwhitelisted field) → status FAILED with error.
- `tests/integration/scheduled-change-sla.test.ts` — create 20 changes, run worker, 95% apply within ±5 min of target (success criterion from spec §10).

### Task breakdown

1. **Day 1: Prisma additions + migration** — `clonedFromId`, `ScheduledChange` model + indexes, `pnpm db:push`. Acceptance: schema in sync, type-check green.
2. **Day 2: Broker clone helper + router mutation + tests** — TDD from `tests/integration/broker-clone.test.ts`. Acceptance: clone copies all fields except endpoint URL + auth creds, sets `clonedFromId`.
3. **Day 3: Broker clone UI** — dialog with preview, wire mutation, attribution badges on detail page. Acceptance: manual smoke produces correct clone in DB + UI updates.
4. **Day 4: Scheduled-change orchestrator + patch helper + whitelist** — core logic + unit tests for each entity type's whitelisted fields. Acceptance: patch rejects writes to `id`, `createdAt`, `tenantId`, `clonedFromId`.
5. **Day 5: pg-boss cron wiring + apply worker** — register job, run worker, apply all pending changes. Acceptance: integration test with `vi.setSystemTime` fast-forward passes.
6. **Day 6: Schedule-change dialog UI + integration with Flow / Broker / Cap edit pages** — generic component, respect user TZ. Acceptance: user can schedule a change on each of the 3 entity types, sees it in the admin list.
7. **Day 7: Scheduled-changes admin page + cancel flow** — list, filters, cancel action. Acceptance: cancel transitions to `CANCELLED`, worker skips.
8. **Day 8: Telegram event wiring** — emit `scheduled_change_applied` + `scheduled_change_failed`. Acceptance: event appears in Telegram bot log; subscribers receive.
9. **Day 9: SLA test (±5 min)** — integration test creating 20 scheduled changes at varied times, simulating worker over an hour, asserting ≥95% applied within ±5 min. Acceptance: passes on first run (single worker instance, no contention assumed).
10. **Day 10: Hardening + changelog + merge.**

### Open design questions (resolve in pre-sprint brainstorm)

1. **Patch format:** RFC 6902 JSON patch or a simpler `{ path: value }` diff? RFC 6902 is standard but verbose; a flat diff is easier for UI and sufficient since whitelists are narrow. **Leaning flat diff; decide before task 4.**
2. **Editable-field whitelist per entity:** need to enumerate exactly which fields on Flow, Broker, Cap are safe to schedule changes against. **Must be finalized before task 4.** Candidates:
   - Flow: `name`, `description`, `isActive` (toggling to false is an implicit "pause"), `fallbackPlan`. NOT `algorithmConfigId`, `version` — those need a draft / publish cycle.
   - Broker: `capHourly`, `capDaily`, `capWeekly`, `priority`, `isActive`, `scheduleJson` (working hours).
   - Cap: `hourlyLimit`, `dailyLimit`, `weeklyLimit`, `perCountryLimits`.
3. **Timezone for applyAt:** store as `TIMESTAMPTZ` (UTC) in DB, render in operator's TZ in UI. Confirm UI passes ISO-8601 with offset, not local.
4. **Audit log entry:** every applied scheduled change emits an `AuditLog` row with `actor=<createdBy>`, `action='scheduled_change_applied'`, `payload=patch`. Integrate with existing hash-chain.
5. **Race condition:** what if the entity was manually edited between schedule and apply? Options: (a) best-effort apply on top (last-write-wins), (b) fail with `STALE_BASE` if the baseline field value changed, (c) store baseline snapshot and 3-way merge. **Leaning option (b) for v1.5 safety; 3-way merge deferred.**

### Acceptance criteria

- Broker clone creates a new row with `clonedFromId` set, all whitelisted config copied, endpoint URL + all `auth*` fields blank.
- UI shows attribution both directions (clone → source, source → list of clones).
- pg-boss cron fires at 1-minute cadence (confirmed via log).
- `scheduled-change-sla.test.ts` passes at ≥95% within ±5 min.
- Cancel flow works: pending → cancelled → worker skips and leaves entity untouched.
- Failure flow: invalid patch / baseline-drift → `FAILED` with `errorMessage`, Telegram notify fires.
- `AuditLog` entry emitted for every applied change; hash-chain integrity preserved.
- Telegram bot receives both success and failure events.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` green.

---

## Sprint S1.5-4 (W7–8, 2026-11-03 → 2026-11-14) — EPIC-18 Status Groups + Q-Leads v1.5

**Focus:** two analytical improvements. **Status Groups** normalizes the chaos of 100+ per-broker raw statuses into 20 canonical statuses; analytics views switch to canonical. **Q-Leads v1.5** layers trend analysis and affiliate-list visibility on top of the v1.0 quality score.

### Deliverables

#### A. Status Groups

1. **`CanonicalStatus` table** — seeded with 20 canonical statuses across 4 categories:
   - NEW (arrived, intake_pending)
   - QUALIFIED (verified, enriched, scored, callback_set)
   - REJECTED (duplicate, fraud, cap_reached, invalid_phone, invalid_email, geo_excluded, rejected_by_broker, timeout)
   - CONVERTED (ftd_small, ftd_medium, ftd_large, redeposit, churned, chargedback)
   - (Exact list finalized during pre-sprint brainstorm; open question 1.)
2. **`StatusMapping` table** — per-broker `rawStatus → canonicalStatusId`. Unique on `(brokerId, rawStatus)`.
3. **Status-mapping admin UI** at `/dashboard/brokers/[id]/status-mapping`:
   - Grid of raw statuses observed from this broker (query from `Lead.lastBrokerStatusRaw` aggregated by broker in last 30d).
   - Dropdown per row: select canonical status.
   - Bulk actions (map all unmapped → `REJECTED/rejected_by_broker` etc.).
   - "Unmapped: N" counter at top; target 0 for top-10 brokers.
4. **Seed data for top-10 brokers** (~100 raw → 20 canonical mappings; covers 95% per spec §10).
5. **Analytics views switch to canonical**
   - Add `CanonicalStatusId` FK + denormalized `canonicalCategory` to `Lead` (computed at push-result-ingest time).
   - Hourly / daily / weekly materialized views re-created to aggregate by `canonicalCategory` instead of raw broker status.
   - Legacy per-broker raw-status drill-down still available under a "Raw statuses" toggle.

#### B. Q-Leads v1.5

1. **Per-affiliate quality trend chart** on `/dashboard/affiliates/[id]`:
   - 30-day line chart of daily avg `qualityScore` for leads from this affiliate.
   - 7-day moving-average overlay.
2. **Affiliate quality badge** on `/dashboard/affiliates`:
   - Colored badge (green ≥ 75, yellow 50–74, red < 50) showing current 7-day moving average.
   - Sortable column.
3. **`computeQualityScore` extension** (v1.0 S2 shipped the base):
   - Add input: 7-day moving average of prior leads from the same affiliate.
   - New weight: `weightAffiliateTrend` (default 0.15). Pulls the affiliate's rolling average down if the current lead scores ≥ 10 points below trend (possible deterioration signal).
   - Backward compatible: if no 7-day history, score computed as before.

### Files to create / modify

**Prisma:**
- `prisma/schema.prisma`:
  - `CanonicalStatus { id, code @unique, label, description, category }` (categories as a Prisma enum).
  - `StatusMapping { id, brokerId, rawStatus, canonicalStatusId, @@unique([brokerId, rawStatus]) }`.
  - `Lead.canonicalStatusId String?` + `Lead.canonicalCategory String?` + indexes.
  - Seed file `prisma/seeds/canonical-statuses.ts` with the 20 statuses.
  - Seed file `prisma/seeds/top-10-broker-mappings.ts`.

**Server:**
- `src/server/status-groups/classify.ts` — `classifyBrokerStatus(brokerId, raw) → canonical` helper; LRU-cached for 30s.
- `src/server/push-result/ingest.ts` (v1.0 file) — extend to set `canonicalStatusId` + `canonicalCategory` on push-result write.
- `src/server/routers/status-mapping.ts` — CRUD + bulk operations.
- `src/server/quality-score/compute.ts` — extend with `weightAffiliateTrend`; add `getAffiliate7dTrend(affiliateId)` helper.
- Materialized views: `prisma/sql/mv_*_canonical.sql` — replace the v1.0 MV definitions; refreshed by same cron.

**UI:**
- `src/app/(dashboard)/brokers/[id]/status-mapping/page.tsx` (new).
- `src/app/(dashboard)/brokers/[id]/status-mapping/_components/mapping-grid.tsx`.
- `src/app/(dashboard)/affiliates/page.tsx` — add quality badge column + sort.
- `src/app/(dashboard)/affiliates/[id]/_components/quality-trend-chart.tsx`.
- `src/app/(dashboard)/analytics/_components/drilldown-rejects.tsx` — switch grouping to `canonicalCategory`, add "Raw" toggle.

**Tests:**
- `tests/integration/status-mapping-crud.test.ts`
- `tests/integration/status-classify.test.ts` — classify maps raw → canonical correctly, falls back to "unmapped" bucket for unknown raws.
- `tests/integration/push-result-writes-canonical.test.ts` — push-result ingest sets canonical fields.
- `tests/integration/analytics-canonical-views.test.ts` — MVs reflect canonical categories.
- `tests/integration/quality-score-trend.test.ts` — `computeQualityScore` with + without trend history produces expected scores.
- `tests/integration/affiliate-quality-badge.test.ts` — list page renders correct badge color for seeded affiliates.

### Task breakdown

1. **Day 1: Prisma additions + seed CanonicalStatus** — 20 statuses via seed file; MVs re-created. Acceptance: schema in sync, 20 rows seeded.
2. **Day 2: `classifyBrokerStatus` helper + classify integration in ingest** — TDD. Acceptance: push-result-ingest writes `canonicalStatusId` + `canonicalCategory` for every new result.
3. **Day 3: Status-mapping router + admin UI grid** — grid of unmapped raws + mapping action. Acceptance: mapping via UI reflects immediately in new leads' canonical fields (LRU cache respects 30s TTL).
4. **Day 4: Seed top-10 broker mappings** — script writes ~100 mappings, validated with a query: for each of the 10 brokers, unmapped raws ≤ 5% of volume in last 30d. Acceptance: ≥95% coverage verified via aggregate query.
5. **Day 5: Analytics drilldown canonical view + Raw toggle** — switch reject panel grouping. Acceptance: drilldown shows 4 canonical categories, toggle reveals raw breakdown.
6. **Day 6: `computeQualityScore` extension + `getAffiliate7dTrend`** — TDD from `quality-score-trend.test.ts`. Acceptance: trend factor applied when history present; backward compatible.
7. **Day 7: Quality trend chart on affiliate detail page** — tRPC query + recharts line chart. Acceptance: chart renders 30d + 7d MA; smooth on affiliate with 10k+ leads.
8. **Day 8: Quality badge on affiliates list + sort** — badge color + sortable column. Acceptance: sort by quality DESC works on 100+ affiliates; badge updates on reload.
9. **Day 9: Materialized-view migration + cron refresh** — drop v1.0 MVs, create v1.5 canonical MVs, confirm cron refreshes. Acceptance: analytics page loads in < 800 ms p95 on 100k seeded leads (perf harness re-run).
10. **Day 10: Hardening + changelog + merge.**

### Open design questions (resolve in pre-sprint brainstorm)

1. **Exact 20 canonical statuses:** needs a product decision round-trip with competitor research — leaning on GetLinked + Trackbox canonical lists for starting point. **Must be finalized before task 1.**
2. **Unmapped raw statuses:** default behavior for a never-seen raw status at ingest — (a) store `canonicalStatusId = null` and flag for admin, (b) auto-assign to `UNMAPPED` canonical bucket. Leaning (b) + Telegram alert when a new unmapped raw appears.
3. **Category for ingest-time aggregation:** do we denormalize `canonicalCategory` on Lead (fast reads, redundant data) or always JOIN through `StatusMapping → CanonicalStatus`? Leaning denormalize for MV performance; refresh on mapping change via a one-shot backfill job.
4. **Q-Leads trend weight:** default `0.15` is a guess — pre-sprint should agree on whether trend penalizes down but not up, or bidirectional.
5. **Affiliate list sort stability:** when many affiliates have zero leads in last 7d, they all score 0 — sort tie-breaker (alphabetical? creation date?). Leaning creation date DESC.

### Acceptance criteria

- 20 canonical statuses seeded, documented in `CLAUDE.md`.
- ≥95% raw-status coverage verified via query on top-10 brokers (≤5% of volume is unmapped raws).
- Analytics reject drilldown grouped by canonical category by default; raw toggle accessible.
- `computeQualityScore` returns same value as v1.0 when no trend history exists (backward compat).
- Quality trend chart renders on affiliate detail page without console errors on 30+ days of data.
- Affiliate list quality-badge sort produces stable order across reloads.
- Perf: canonical MVs refresh in < 10 s on 100k-lead dataset.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` green.

---

## Sprint S1.5-5 (W9–10, 2026-11-17 → 2026-11-28) — Hardening + release

**Focus:** no new features. Integration smoke of all v1.5 additions against each other, perf regression check, CHANGELOG, tag `v1.5.0`, deploy gate.

### Deliverables

1. **Integration smoke suite** — end-to-end happy-path test scripts exercising all v1.5 features in one flow:
   - Create preset → drill-down → share link → open in incognito (S1.5-1).
   - Create flow in visual editor → publish → simulate → verify routing match (S1.5-2).
   - Clone a broker → schedule a cap change 5 min out → verify applied (S1.5-3).
   - Observe 10 raw broker statuses → map each → verify canonical rollup in analytics (S1.5-4).
2. **Perf re-run** — run `perf/intake-load.js` scenarios (`sustained_300_rps_15m`, `burst_1000_rps_60s`); compare p50 / p95 / p99 to v1.0 GA baseline. Regression budget: < 5% at p95. Any regression > 5% → blocker.
3. **`CHANGELOG.md`** — v1.5.0 section summarizing deliverables per sprint, breaking changes (should be none), upgrade notes (re-seed canonical statuses, run canonical-MV migration).
4. **Upgrade runbook** — `docs/runbooks/v1.5-upgrade.md`:
   - Ordered migration steps (Prisma migrate, seed CanonicalStatus, seed top-10 mappings, refresh MVs).
   - Rollback plan (revert MV definitions, drop new tables; existing Lead rows retain raw status so no data loss).
   - Smoke checklist for post-deploy.
5. **Tag `v1.5.0`** — only after all above green.

### Files to create / modify

- `tests/integration/smoke/v1-5-all-features.test.ts` — end-to-end smoke.
- `CHANGELOG.md` — new v1.5.0 section (create file if not exists).
- `docs/runbooks/v1.5-upgrade.md` (new).
- `CLAUDE.md` — append `## v1.5 Analytics & Ops ergonomics` section summarizing each S1.5-* deliverable (mirror the style of the existing `## v1.0 Sprint 1 hardening` block).
- `perf/baselines/v1-0-ga.json` (if not committed in v1.0 S8) — ensure it exists, else capture fresh and mark as interim baseline.

### Task breakdown

1. **Day 1: E2E smoke test suite** — one test file that stitches all 4 sprint deliverables into a single linear happy-path. Acceptance: runs in < 3 min, all assertions pass.
2. **Day 2: Perf re-run + comparison** — capture p50 / p95 / p99 for intake on a 100k-lead seeded DB; diff vs v1.0 baseline; produce a table in CHANGELOG. Acceptance: all scenarios within 5% of baseline. If any regression > 5%, triage and fix before tag.
3. **Day 3: CHANGELOG + runbook** — write both. Acceptance: peer-review by self against all 4 sprint deliverables, no omissions.
4. **Day 4: Staging deploy + manual smoke** — deploy to staging, run checklist manually. Acceptance: all 20+ checklist items pass.
5. **Day 5: Bug-fix buffer + doc fixes** — fix anything surfaced by smoke. Acceptance: all blockers closed.
6. **Day 6: Production deploy + tag `v1.5.0`** — deploy, tag, push tag. Acceptance: `git tag v1.5.0` present on main, CI green.
7. **Day 7–10: Post-release observation window** — monitor error rates, Telegram alert volume, support tickets. Hot-fix slot: any critical finding in this window may consume the remaining 3 days. No new feature work.

### Open design questions

1. **Baseline source:** do we have a committed `perf/baselines/v1-0-ga.json` from v1.0 S8? If not, first run of S1.5-5 produces an interim baseline and the 5% budget is suspended for this release. Resolve pre-sprint.
2. **Staging infrastructure:** is staging a real env with 100k seed data, or a scaled-down copy? Perf re-run must happen against staging-like resources; if staging is too small, run locally against a production-sized DB snapshot.
3. **Release comms:** external changelog for customers (what features to highlight), internal changelog for operators (migration steps). Two docs, or one with sections? Leaning one doc with sections.

### Acceptance criteria

- E2E smoke suite green.
- Perf within 5% of v1.0 GA baseline at p95 across both scenarios (or baseline explicitly re-established and documented).
- `CHANGELOG.md` and `docs/runbooks/v1.5-upgrade.md` complete and reviewed.
- `CLAUDE.md` updated with v1.5 section.
- Staging smoke pass, production deploy successful, `v1.5.0` tag pushed.
- No critical bugs in 7-day post-release observation window (or all hot-fixed and documented).
- All success criteria from spec §10 v1.5 satisfied:
  - **BI builder:** save filter → share → drill-down 3+ levels — demonstrated in E2E smoke.
  - **Visual rule-builder:** 5 real v1.0 flows recreated, no behavioral diff — demonstrated by S1.5-2 diff test.
  - **Delayed Actions:** 95% of scheduled changes apply within ±5 min — demonstrated by S1.5-3 SLA test.
  - **Status Groups:** ≥95% top-10 broker coverage — demonstrated by S1.5-4 coverage query.

---

## Cross-sprint success criteria (from spec §10 v1.5)

| Criterion | Demonstrated in | Test |
|---|---|---|
| BI builder: save filter → share → drill-down 3+ levels | S1.5-1 + S1.5-5 smoke | `analytics-share-token.test.ts` + E2E smoke |
| Visual rule-builder: 5 flows recreated without diff | S1.5-2 | `flow-graph-serializer-equivalence.test.ts` |
| Delayed Actions: 95% within ±5 min | S1.5-3 | `scheduled-change-sla.test.ts` |
| Status Groups: ≥95% top-10 broker coverage | S1.5-4 | Coverage query + `status-classify.test.ts` |

## Risks

1. **Reactflow bundle bloat (S1.5-2)** — > 150 kB gzip kills the "fast dashboard" promise. Mitigation: measure on day 1; if over budget, lazy-load editor route only (it's an admin-only screen, acceptable).
2. **MV schema migration in S1.5-4** — replacing production MVs is a live-data operation; needs coordinator with no-traffic window or double-write scheme. Mitigation: v1.5 canonical MVs exist alongside v1.0 MVs for one release; v1.0 MVs dropped in v2.0. Zero-downtime.
3. **Scheduled-change staleness (S1.5-3)** — baseline-drift failure could surprise operators. Mitigation: UI shows baseline snapshot next to "Apply" confirmation, and re-fetches baseline on dialog open.
4. **Solo cadence:** 10 weeks for 4 feature sprints + 1 release is tight but precedented by v1.0. Built-in slack: S1.5-5 has a 4-day buffer. First-drop candidate if S1–4 slip: **Google Sheets export (S1.5-1)** → defer to v2.0 without narrative damage.

## Deferred to v2.0 (explicit)

- Google Sheets export (if budget blocks).
- Full expression language for custom-predicate nodes in visual editor (v1.5 ships closed vocabulary).
- 3-way merge on scheduled-change baseline drift (v1.5 ships fail-on-drift).
- Accessibility fallback for visual editor drag+drop.
- Public-shared-view PII redaction toggle.

## Related documents

- `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` — source spec.
- `docs/superpowers/plans/2026-04-21-v1-sprint-1-wave1-merge-and-hardening.md` — style reference for per-sprint plan files.
- `CLAUDE.md` (crm-node) — shipped subsystems, deprecated shims, conventions.
- `crm-design/project/SPEC.md` — UI design-system source of truth; all new screens (BI builder drill-downs, visual rule-builder canvas, schedule-change dialog, status-mapping grid) need prototypes in `crm-design/project/src/` before implementation in each sprint.
