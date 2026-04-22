# Routing Engine — iREV Parity Design

**Status:** Draft — pending user review
**Date:** 2026-04-22
**Author:** brainstorming session 2026-04-22
**Scope:** Rotation / Flow subsystem only. Everything else (intake, billing, autologin, analytics) unchanged.
**Supersedes:** none (augments v1.0.3 routing editor; no earlier spec for iREV parity work)

---

## 1. Context

### 1.1 What we have today (v1.0.3)

The routing engine is a pure-decision function (`src/server/routing/engine.ts`) that consumes a `FlowVersion.graph` (Zod-validated `FlowGraph`) and returns an `EngineDecision`. The graph supports six node kinds:

- **Entry** — flow entry point.
- **Filter** — condition predicate (AND / OR over `FilterCondition[]`).
- **Algorithm** — `WEIGHTED_ROUND_ROBIN` or `SLOTS_CHANCE`.
- **BrokerTarget** — terminal → a specific `Broker`; carries `weight` / `slots` / `chance`.
- **Fallback** — `FallbackStep` hop chain when a push fails.
- **Exit** — terminal sink.

`FilterCondition` today accepts 6 fields (`geo, subId, utm_source, utm_medium, affiliateId, timeOfDay`) and 5 ops (`eq, neq, in, not_in, matches`). `CapDefinition` supports `HOURLY/DAILY/WEEKLY` windows with optional per-country limits. `FallbackStep` rows drive retries by `hopOrder`.

A visual editor (reactflow / `@xyflow/react`) at `/dashboard/routing/flows/:flowId` lets an operator build graphs, drag nodes, edit filters / caps / algorithms, and publish versions. A standalone simulator page exists at `/dashboard/routing/flows/:flowId/simulator`.

### 1.2 What iREV has that we lack

Direct product observation of `bankai.irev.com/en/app/traffic-distribution/rotation-control` surfaced a hierarchical model with six first-class entity types:

- **RO (Rotation Folder)** — a country-scoped container of children.
- **AD (Advertiser)** — terminal pointing to an advertiser, with a per-target **PQL** gate, description, and `Active` toggle.
- **SP (Split Folder)** — weighted split across children.
- **SM (SMART Folder)** — priority-ordered failover: try child 1; if it rejects / times out, try child 2; and so on.
- **CO (Comparing Folder)** — controlled A/B split with comparative metrics (push rate / revenue / FTD rate).
- **CA (Cap)** — richer than ours: per-target, with PQL-scoped counting windows, a `Pushed Lead Capacity`, a separate `Rejected Lead Capacity`, a `Rejections In a Row` auto-pause, a `Lead Behavior Pattern` toggle, and a `Timezone`.

**PQL (Property Query Language)** is iREV's predicate grammar. Fields observed in the dropdown: `Aff Sub 1..7`, `Hash`, `Hour of Day`, `IP`, `Last Name`, `Password`, `Phone Number`, `State`, `Test`, `Traffic Provider`. Signs include `equals`, `not equals`, `contained in`, `not contained in`, `contains`, `starts with`, `ends with`, `greater than`, `greater or equal to`, `less than`, `less or equal to`, `matches`. Each rule carries a **case-sensitive** toggle. Chained with **And / Or**.

### 1.3 User's triggering scenario

> "Traffic comes in for UA → goes to 3 brokers, whoever responds *ready to accept* takes it; otherwise polls them in turn."

This is the canonical **SmartPool** use case. Today it's expressible only via a hand-built `FallbackStep` chain — not authorable in the visual editor as a single node. The parity design must make this scenario a two-click authoring task.

### 1.4 Non-goals

- Replacing the graph canvas — it remains the authoring source of truth.
- Rewriting the engine's decision loop — all additions are composed with the existing pure-function.
- Currency / chargeback work — that lives in v2.0-s4.
- Changing how `CapCounter` persists — only its input surface grows.
- Building a PQL DSL / parser — PQL stays a structured `{field, sign, value}[]` shape, not free-text.

---

## 2. Goals

1. **Concept preservation.** Keep the graph canvas as the primary authoring surface; keep the existing Zod-schema-driven pipeline.
2. **Parity on primitives.** Add first-class **SmartPool** and **ComparingSplit** node kinds; enrich **BrokerTarget** with a per-target PQL gate + `active` + `description`.
3. **PQL expressiveness.** Expand `FilterCondition` to 8 fields and 8 operators with a case-sensitive toggle; make fields registry-driven so future additions cost ~10 lines.
4. **Richer caps.** Add `rejectedLimit`, `rejectionsInARow` auto-pause, `behaviorPattern`, and optional `pqlScope` to `CapDefinition`.
5. **Second surface.** Ship a tree-list editor (`/dashboard/routing/flows/:flowId/tree`) as a parallel read-and-edit surface on the same `FlowVersion` — iREV-style compactness for ops.
6. **Verifiable failover.** Upgrade the simulator so the user's "UA → 3 brokers sequential accept" scenario can be proven end-to-end, with each broker's simulated accept/reject visible in the trace.
7. **Backward compatibility.** Every existing `FlowVersion` continues to load, publish, execute, and round-trip through both editors with zero data changes.

---

## 3. Architecture

### 3.1 One model, two surfaces

Both editors operate on the same `FlowVersion.graph` JSON blob (validated by `FlowGraphSchema`). The tree-list editor is a projection, not a clone: `flowToTree(graph)` folds the flat `FlowNode[]` + `FlowEdge[]` into a hierarchy by following edges; `treeToFlow(tree)` is its inverse. Both projections round-trip byte-equal except for auto-generated node ids on new entities.

The graph canvas owns complex authoring (drawing edges, arranging nodes, A/B metric overlays). The tree-list owns compact inspection and field-level ops edits (cap limits, target order, active toggles, PQL rules). Heavyweight inspectors (Algorithm config, Cap editor, Comparing metrics setup) are shared React components invoked from both surfaces as modals.

### 3.2 Why SmartPool reuses FallbackStep

`FallbackStep` already drives `hopOrder`-ranked retries across brokers. Rather than introduce a parallel failover mechanism, a **SmartPool** node in the graph is a compile-time macro: publishing a flow containing a SmartPool expands it into `FallbackStep` rows whose `fromNodeId` is the pool's first child and `toNodeId` is the next child in rank order. The runtime engine sees only the existing fallback chain — zero new execution semantics.

Same principle for **ComparingSplit**: it compiles into an `Algorithm(WRR)` node plus a `FlowAlgorithmConfig` row with `scope: BRANCH, params: { compareMetric, sampleSize }`. The engine picks a broker via WRR; a post-decision hook tags the routing event with the branch id so analytics can compute the comparison.

This keeps engine code surface changes small and the two new node kinds are pure authoring affordances.

### 3.3 PQL as a structured predicate

PQL rules remain `Array<{ field, sign, value, caseSensitive }>` chained by AND/OR — no parser. Fields are declared in a registry (`src/server/routing/pql/fields.ts`) with a `{ kind, type, legalSigns, extract(lead) }` shape. The engine evaluator walks the list and shortcircuits on the logic operator. Adding a new field (e.g. `device_type` next quarter) is a single registry entry plus a Zod discriminator extension.

### 3.4 Cap semantics

`CapDefinition` grows three new columns and one new optional JSON field:

- `rejectedLimit Int?` — separate ceiling for rejected-lead count.
- `rejectedLimitAsPercent Boolean @default(false)` — if true, `rejectedLimit` is interpreted as % of `limit`.
- `rejectionsInARow Int?` — if non-null, auto-pause the broker/target when the counter hits this value.
- `pqlScope Json?` — optional `PqlRule[]`; counting only increments when the lead matches.

The counter table (`CapCounter`) gains a `kind` column (`PUSHED | REJECTED`) plus its `bucketKey` extended with a hash of the `pqlScope` when present. A separate `rejectionStreak` counter (in-memory Redis, not the durable `CapCounter` table) tracks the in-a-row logic.

`behaviorPattern` starts as a closed enum `Regular` only — the iREV observation showed one value; extensible later without a schema change (it's an enum, not a JSON blob).

---

## 4. Data model changes

### 4.1 Zod schema (`src/server/routing/flow/model.ts`)

```ts
// NEW: canonical PQL rule type (replaces FilterConditionSchema's field/op union)
export const PqlFieldSchema = z.enum([
  "geo", "subId", "utm_source", "utm_medium", "affiliateId",
  "timeOfDay", "phone", "hourOfDay",
]);

export const PqlSignSchema = z.enum([
  "eq", "neq", "in", "not_in",
  "contains", "starts_with", "ends_with",
  "gte", "lte", "matches",
]);

export const PqlRuleSchema = z.object({
  field: PqlFieldSchema,
  sign: PqlSignSchema,
  value: z.union([z.string(), z.array(z.string()), z.number()]),
  caseSensitive: z.boolean().default(false),
});

export const PqlGateSchema = z.object({
  rules: z.array(PqlRuleSchema).min(1),
  logic: z.enum(["AND", "OR"]).default("AND"),
});

// NEW: SmartPool node
export const SmartPoolNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("SmartPool"),
  label: z.string().max(120).optional(),
  maxHop: z.number().int().min(1).max(10).default(5),
  triggers: FallbackTriggersSchema,  // reuse existing shape
  meta: NodeMetaSchema,
});

// NEW: ComparingSplit node
export const ComparingSplitNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("ComparingSplit"),
  label: z.string().max(120).optional(),
  compareMetric: z.enum(["push_rate", "accept_rate", "ftd_rate", "revenue_per_lead"]),
  sampleSize: z.number().int().min(50).max(100_000).default(500),
  meta: NodeMetaSchema,
});

// MODIFIED: BrokerTarget gains optional per-target PQL + active + description
export const BrokerTargetNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("BrokerTarget"),
  brokerId: z.string().min(1),
  weight: z.number().int().min(1).max(1000).optional(),
  slots: z.number().int().min(1).max(10_000).optional(),
  chance: z.number().min(0.01).max(100).optional(),
  label: z.string().max(120).optional(),
  description: z.string().max(500).optional(),  // NEW
  active: z.boolean().default(true),              // NEW
  pqlGate: PqlGateSchema.optional(),              // NEW
  meta: NodeMetaSchema,
});

// MODIFIED: Filter replaces FilterCondition[] with PqlRule[]
export const FilterNodeSchema = z.object({
  id: NodeIdSchema,
  kind: z.literal("Filter"),
  label: z.string().max(120).optional(),
  rules: z.array(PqlRuleSchema).min(1),           // was: conditions
  logic: z.enum(["AND", "OR"]).default("AND"),
  meta: NodeMetaSchema,
});
```

### 4.2 Prisma schema deltas

```prisma
model CapDefinition {
  // ... existing fields ...
  rejectedLimit          Int?
  rejectedLimitAsPercent Boolean @default(false)
  rejectionsInARow       Int?
  pqlScope               Json?
  behaviorPattern        CapBehaviorPattern @default(REGULAR)
}

enum CapBehaviorPattern {
  REGULAR
}

model CapCounter {
  // ... existing fields ...
  kind CapCounterKind @default(PUSHED)
  @@unique([scope, scopeId, window, bucketKey, country, kind])
}

enum CapCounterKind {
  PUSHED
  REJECTED
}

// NEW: aggregation rows for ComparingSplit buckets
model ComparingBucketStat {
  id            String   @id @default(cuid())
  flowVersionId String
  nodeId        String   // the ComparingSplit node id
  branchNodeId  String   // the chosen child (BrokerTarget)
  bucketStart   DateTime
  sampleN       Int      @default(0)
  pushed        Int      @default(0)
  accepted      Int      @default(0)
  ftds          Int      @default(0)
  revenueCents  Int      @default(0)

  flowVersion   FlowVersion @relation(fields: [flowVersionId], references: [id], onDelete: Cascade)
  @@unique([flowVersionId, nodeId, branchNodeId, bucketStart])
  @@index([flowVersionId, nodeId])
}
```

### 4.3 Backward-compat migration

- `FilterNode.conditions` → `FilterNode.rules`: a one-shot transform in `src/server/routing/flow/migrations/2026-04-22-filter-to-pql.ts` walks every non-archived `FlowVersion.graph`, renames the field, and defaults `caseSensitive: false`. The Zod schema accepts both shapes for one release, then the legacy key is dropped.
- `BrokerTarget.active` defaults to `true` → no visible behavior change on existing flows.
- `CapCounter.kind` defaults to `PUSHED` → no counting change; the new unique index is safe because the old rows all take `kind = PUSHED`.

---

## 5. Node semantics

### 5.1 SmartPool

**Shape.** A node with N outgoing edges, each ending on a `BrokerTarget` or nested folder. Edges carry `rank: 1..N`.

**Authoring.** In the graph canvas: drop a SmartPool, draw edges to broker targets, drag edges to reorder rank (the UI writes `rank` onto the edge). In the tree-list: an ordered sub-list with drag handles.

**Publish-time expansion.** `publishFlow()` walks every SmartPool, emits `FallbackStep` rows `(from = child[i], to = child[i+1], hopOrder = i)`, and sets the first child as the routing entry target. Cycle detection already lives in `detectFallbackCycle` — reuse.

**Runtime.** No engine change: the push-lead worker already consumes `FallbackStep`. On first-child failure per `classifyPushResult`, it hops to child 2, etc., up to `SmartPool.maxHop`.

**Authoring the user's scenario.** From a `Filter(geo=UA)` draw one edge into a SmartPool; inside the pool drop 3 `BrokerTarget` children ranked 1–3. Publish. Done.

### 5.2 ComparingSplit

**Shape.** A node with 2–4 outgoing edges to `BrokerTarget` children; each branch carries a share (`0 < share ≤ 1`, sum = 1 ± 0.001). A `compareMetric` declares the win criterion; `sampleSize` declares how much traffic per branch before the comparison is considered statistically meaningful.

**Publish-time expansion.** Emits an `Algorithm(WRR)` node with weights derived from shares × 1000 plus a `FlowAlgorithmConfig` row (`scope: BRANCH, params: { compareMetric, sampleSize, isComparison: true }`).

**Runtime.** Engine selects via WRR as usual. A post-decision hook (`src/server/routing/compare/record.ts`) writes a `ComparingBucketStat` row for the chosen branch, keyed by the current hour bucket.

**Comparison UI.** A chart under the node in the canvas shows cumulative `compareMetric` per branch over the last 24h; a badge highlights the leading branch once both branches have `≥ sampleSize` rows.

### 5.3 BrokerTarget PQL gate

When `pqlGate` is set, the engine evaluates the gate **after cap check** and **before algorithm selection**. A target with a failing gate is removed from the `available[]` candidate set. Rationale for post-cap: a PQL miss shouldn't consume a cap slot.

Failure is traced as `{ step: "pql_gate", nodeId, ok: false, detail: { failed_rule_index, field } }` so the simulator trace shows why a broker was excluded.

---

## 6. PQL vocabulary & evaluator

### 6.1 Field registry

`src/server/routing/pql/fields.ts`:

```ts
export interface PqlFieldDef {
  key: string;
  label: string;
  valueType: "string" | "number" | "stringArray" | "timeRange";
  legalSigns: PqlSign[];
  extract(lead: LeadSnapshot): unknown;
}

export const PQL_FIELDS: PqlFieldDef[] = [
  { key: "geo", label: "GEO", valueType: "string",
    legalSigns: ["eq", "neq", "in", "not_in", "matches"],
    extract: l => l.geo },
  { key: "phone", label: "Phone Number", valueType: "string",
    legalSigns: ["eq", "neq", "contains", "starts_with", "ends_with", "matches"],
    extract: l => l.phone },
  { key: "hourOfDay", label: "Hour of Day", valueType: "number",
    legalSigns: ["eq", "neq", "gte", "lte", "in", "not_in"],
    extract: l => new Date().getUTCHours() },
  // ... subId, utm_source, utm_medium, affiliateId, timeOfDay
];
```

A new field costs: one entry in `PQL_FIELDS` + one entry in `PqlFieldSchema` enum. No editor code changes — the UI iterates the registry.

### 6.2 Evaluator

Pure function `evaluatePqlGate(rules, logic, lead, caseSensitiveDefault = false)` in `src/server/routing/pql/evaluate.ts`. For each rule: extract left-hand value, coerce to declared `valueType`, apply sign. `caseSensitive=false` lowercases both sides for `eq / neq / contains / starts_with / ends_with / matches`. Array ops (`in / not_in`) apply the same transform to each element.

Unit tests cover every `(field × sign)` legal pair per registry and reject every illegal pair at schema level.

---

## 7. Cap enhancements

### 7.1 Rejected capacity

Push-lead worker increments `CapCounter(kind=PUSHED)` on successful push (existing behavior). On explicit rejection (broker postback = declined, or fallback path exhausted to manual-queue), increment `CapCounter(kind=REJECTED)`. The cap check compares:

- `pushedCount vs limit` → blocks pushes.
- `rejectedCount vs effectiveRejectedLimit` (where `effectiveRejectedLimit = rejectedLimitAsPercent ? floor(limit × rejectedLimit / 100) : rejectedLimit`) → blocks rejects (over-reject marks the target temporarily unavailable, but doesn't consume pushes).

### 7.2 Rejections in a row

A Redis counter keyed `cap:streak:{brokerId}:{flowVersionId}`. Incremented on each rejection, reset on each successful push. When it hits `rejectionsInARow`, emit `BROKER_REJECTION_STREAK_PAUSED` Telegram event and set `Broker.isActive = false` with an audit log entry. Requires manual reactivation — matches iREV's "auto-pause" pattern.

### 7.3 PQL-scoped windows

When `pqlScope` is set on a `CapDefinition`, `consumeCap` evaluates the scope against the incoming lead first. On miss → skip the cap check entirely for that lead. On hit → consume as usual, with the `bucketKey` salted by `sha256(pqlScope)` so multiple PQL-scoped caps on the same target don't collide. Enables iREV patterns like "10 leads/day only during 10:00–19:00 local" as a single cap.

---

## 8. Tree-list editor (new surface)

### 8.1 Page

`/dashboard/routing/flows/:flowId/tree` — sibling of the existing canvas editor. A toggle button in the header switches views; the Draft/Publish state badge is shared.

### 8.2 Row shape

| Column | Content |
|---|---|
| Expand/collapse | Chevron for folder-kind rows (SmartPool, ComparingSplit, nested Filter) |
| Kind glyph | RO / AD / SP / SM / CO / CA icon |
| Name | Editable inline |
| Passing rule | Compact rendering of top-level PQL rules (truncated; tooltip shows full) |
| Shares / ranks | Inline editor: `w=150` for WRR, `#1` for SmartPool rank, `30%` for ComparingSplit |
| Live cap bar | `7/10 pushed` bar + resets-at timestamp |
| Status | `Active` / `Paused` toggle |
| Actions | `…` menu → Edit (modal), Duplicate, Delete |

### 8.3 Shared inspectors

`AlgorithmInspector`, `CapInspector`, `FilterConditionEditor` (renamed `PqlRuleEditor`), and a new `ComparingMetricInspector` are extracted into `src/components/routing-editor/inspectors/` so both the canvas right-panel and the tree-list row-modal reuse them.

### 8.4 Inline-editable fields

Only low-risk fields get inline edit: `cap.limit`, `brokerTarget.weight`, `brokerTarget.active`, rank order, `pqlRule.value` (when single scalar). Every other change opens the shared inspector modal. Rationale: inline edits are undo-safe (single field, one save signature); complex edits stay in the richer modal that already has validation.

---

## 9. Simulator upgrade

### 9.1 Batch mode

Accepts `{ count, template, brokerAcceptProbabilities: Record<brokerId, number> }`. Runs `count` synthetic leads through the current FlowVersion, simulating broker responses per probability. Outputs per-broker counts, mean decision time, trace of the first 10 routed leads.

### 9.2 SmartPool trace

For each lead that hits a SmartPool, the trace shows ordered attempts: `try broker-A (simulated: reject) → try broker-B (simulated: accept)`. This is what makes the user's scenario verifiable.

### 9.3 Comparison preview

For `ComparingSplit` nodes, the simulator shows the projected share assigned to each branch given `count` leads, plus a warning if `count < sampleSize`.

---

## 10. Public API additions

Minimal — almost all changes are internal to the visual editor + engine.

- `POST /api/v1/routing/simulate` — extend request schema to accept `brokerAcceptProbabilities`.
- tRPC `routing.treeView` — returns the `flowToTree(graph)` projection for the tree-list surface.
- tRPC `routing.applyTreePatch` — accepts a list of diff ops from tree-list inline edits (rank change, toggle active, edit cap limit); the server rebuilds the graph and persists via the existing `updateDraftGraph`.

No REST surface changes outside `simulate`. OpenAPI regeneration runs as part of the release.

---

## 11. Rollout — three sprints

### S3.1 (2 weeks) — Backend + schema

- Zod model additions (SmartPool, ComparingSplit, BrokerTarget.pqlGate, Filter.rules).
- `src/server/routing/pql/` — field registry + evaluator + unit tests.
- Prisma migration: `CapDefinition.rejectedLimit/AsPercent/rejectionsInARow/pqlScope/behaviorPattern`, `CapCounter.kind`, `ComparingBucketStat`.
- Engine integration: SmartPool → FallbackStep expansion in `publishFlow`; ComparingSplit → WRR expansion; BrokerTarget.pqlGate evaluation in `executeFlow`; cap reject-tracking + streak-pause + pqlScope.
- Data migration for `FilterNode.conditions → rules`.
- Regression tests: all existing routing tests still pass (`pnpm test` green baseline).

### S3.2 (2 weeks) — Canvas editor + simulator

- New node renderers in `src/components/routing-editor/nodes.tsx` for SmartPool + ComparingSplit.
- BrokerTarget inspector gains a `PqlGate` section + `active` toggle + `description` field.
- FilterConditionEditor renamed to `PqlRuleEditor`; renders from the field registry; adds `caseSensitive` toggle + new signs (`contains / starts_with / ends_with / gte / lte`).
- CapInspector gains rejected-capacity section + streak-pause number input + pqlScope editor (reuses PqlRuleEditor).
- Simulator page: batch mode UI + broker-accept-probability grid + sequential-trace view.
- End-to-end test: author the user's scenario via RTL, publish, simulate, assert trace shows sequential try.

### S3.3 (2 weeks) — Tree-list editor

- `src/app/dashboard/routing/flows/[flowId]/tree/page.tsx`.
- `src/components/routing-editor/tree/` — row components per kind, inline-edit widgets, modal hosts.
- tRPC `routing.treeView` + `routing.applyTreePatch`.
- Cross-surface test: round-trip 5 real v1.0 flow shapes through `flowToTree → treeToFlow` byte-equal; inline edit a cap limit in tree-list and verify it persists and the canvas reflects it.
- Polish: keyboard shortcuts for expand/collapse/reorder, empty-state CTA, header toggle between canvas / tree.

---

## 12. Success criteria (sign-off gates)

1. **User's UA → 3 brokers scenario passes the simulator.** Authoring: two clicks to drop a SmartPool, three to assign brokers, zero config beyond order. Verification: simulator with `accept = [0, 0, 1]` shows a trace with three attempts and the third marked "accepted".
2. **5 real v1.0 flows round-trip through the tree-list.** Pick 5 published flows from prod; `flowToTree → treeToFlow` is byte-equal; tree-list renders every node kind without crashing.
3. **PQL vocabulary parity.** Case-sensitive toggle honored by the engine; all 8 signs covered by unit tests per field; at least `phone`, `hourOfDay`, `affiliateId`, `geo` covered in integration.
4. **Cap rejection-streak auto-pause fires.** Integration test: configure `rejectionsInARow = 3`, submit 3 rejecting postbacks, assert `Broker.isActive = false` + Telegram event emitted + audit log row written.
5. **ComparingSplit records accurate buckets.** Unit test: 1000 synthetic leads split 50/50 lands within ±3% per branch in `ComparingBucketStat`.
6. **Zero regressions.** `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` zero failures, pentest suite still 22/22.

---

## 13. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| SmartPool compile-time expansion drifts from `FallbackStep` runtime semantics | high | Pure helper `smartPoolToFallbackSteps(node)` + round-trip test against the existing fallback orchestrator unit suite |
| PQL evaluator becomes a hot-path perf hog | medium | Case-insensitive lowercasing cached per request; field extraction memoized; benchmark with `perf/routing-stress.js` before and after — fail build if p95 regresses > 10% |
| Tree-list / canvas desync on concurrent edits | medium | Both surfaces read/write through `updateDraftGraph` with an `updatedAt` version; conflicting save returns 409; UI refetches + merges |
| Migration of `Filter.conditions → rules` breaks prod drafts mid-session | medium | Zod accepts both shapes for one release; migration script also live-updates any unsaved draft at next load |
| Rejection-streak false positives (transient broker 5xx triggers pause) | medium | Only count explicit `rejectReason` postbacks in the streak, not 5xx / network errors; 5xx hits the existing fallback chain instead |
| User confused by two editors | low | Header toggle makes it clear they are projections of the same thing; tree-list shows a link "Open complex node in canvas" for deeply nested structures |

---

## 14. Open questions (none blocking)

- **SMART vs Fallback distinction in UX.** Today we have a `Fallback` node kind and a new `SmartPool` kind — both are priority failover primitives. Proposal: **deprecate `Fallback` node after S3.2**; auto-migrate any existing Fallback node to SmartPool. Deferred to S3.3 so S3.1/S3.2 can ship safely; final decision at S3.2 sign-off.
- **ComparingSplit winner auto-promotion.** Should a branch that wins decisively for N days auto-adjust shares? Not v1 of this spec — surface the data, let ops decide.
- **Per-broker accept-probability persistence.** Simulator values are session-only; persisting named "probability profiles" for reuse is a nice-to-have for S3.3 polish.

---

## 15. References

- Current engine: `src/server/routing/engine.ts`
- Current Zod model: `src/server/routing/flow/model.ts`
- Current cap logic: `src/server/routing/constraints/caps.ts`
- Current fallback orchestrator: `src/server/routing/fallback/orchestrator.ts`
- Current filter editor: `src/components/routing-editor/filter-conditions.ts` + `FilterConditionEditor.tsx`
- Prior multi-version roadmap: `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md`
- Readiness checklist: `docs/superpowers/READINESS_CHECKLIST.md`

---

## 16. Execution

Upon approval of this spec, the `superpowers:writing-plans` skill will produce `docs/superpowers/plans/2026-04-22-routing-irev-parity-plan.md` with three per-sprint plan files, each decomposed into TDD-ordered bite-sized tasks.
