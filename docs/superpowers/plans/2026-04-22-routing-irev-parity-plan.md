# Routing iREV Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the rotation/flow subsystem to iREV feature-parity while keeping the graph canvas as the authoring source of truth. Add SmartPool + ComparingSplit node kinds, per-target PQL gate, richer caps, and a tree-list editor surface.

**Architecture:** Two surfaces (graph + tree-list) projecting the same `FlowVersion.graph`. SmartPool compiles to existing `FallbackStep` chain; ComparingSplit compiles to `Algorithm(WRR) + FlowAlgorithmConfig`. PQL is a structured predicate with a registry-driven field catalogue. Engine code surface grows minimally (gate evaluation + cap reject-tracking + streak-pause).

**Tech Stack:** Next.js 15 (App Router), tRPC v11, Prisma 5 (Postgres), Zod 3, @xyflow/react v12, Biome, Vitest. No new runtime deps.

**Spec:** [`../specs/2026-04-22-routing-irev-parity-design.md`](../specs/2026-04-22-routing-irev-parity-design.md)

**Release tags:** `v2.0.0-s3.1-routing-backend`, `v2.0.0-s3.2-routing-canvas`, `v2.0.0-s3.3-routing-tree`.

---

## File Structure

### New files
- `src/server/routing/pql/fields.ts` — field registry
- `src/server/routing/pql/evaluate.ts` — pure evaluator
- `src/server/routing/pql/evaluate.test.ts` — op × field unit matrix
- `src/server/routing/flow/compile-smartpool.ts` — SmartPool → FallbackStep expansion
- `src/server/routing/flow/compile-comparing.ts` — ComparingSplit → Algorithm expansion
- `src/server/routing/flow/migrations/2026-04-22-filter-to-pql.ts` — graph field rename
- `src/server/routing/flow/tree.ts` — `flowToTree` / `treeToFlow` projection
- `src/server/routing/compare/record.ts` — `ComparingBucketStat` writer
- `src/server/routing/constraints/rejection-streak.ts` — Redis streak counter
- `src/components/routing-editor/PqlRuleEditor.tsx` — renamed+extended `FilterConditionEditor`
- `src/components/routing-editor/inspectors/SmartPoolInspector.tsx`
- `src/components/routing-editor/inspectors/ComparingSplitInspector.tsx`
- `src/components/routing-editor/inspectors/BrokerTargetInspector.tsx` — extracted from Inspector.tsx
- `src/components/routing-editor/tree/TreeRoot.tsx`
- `src/components/routing-editor/tree/TreeRow.tsx`
- `src/components/routing-editor/tree/row-*.tsx` (per kind)
- `src/app/dashboard/routing/flows/[flowId]/tree/page.tsx`

### Modified files
- `src/server/routing/flow/model.ts` — new Zod schemas + expanded PQL
- `src/server/routing/flow/publish.ts` — call SmartPool + ComparingSplit compilers
- `src/server/routing/flow/validator.ts` — validate new nodes
- `src/server/routing/engine.ts` — pqlGate + active filter on BrokerTarget
- `src/server/routing/constraints/caps.ts` — kind + pqlScope + rejection streak
- `src/server/routing/simulator.ts` — batch mode with accept probabilities
- `src/components/routing-editor/Canvas.tsx` — register new node types
- `src/components/routing-editor/nodes.tsx` — SmartPool + ComparingSplit renderers
- `src/components/routing-editor/Inspector.tsx` — route by node kind to new inspectors
- `src/components/routing-editor/CapInspector.tsx` — rejected capacity + streak + pqlScope
- `src/components/routing-editor/FilterConditionEditor.tsx` — re-export from `PqlRuleEditor`
- `src/server/routers/routing.ts` — add `treeView` + `applyTreePatch`
- `src/app/api/v1/routing/simulate/route.ts` — accept `brokerAcceptProbabilities`
- `prisma/schema.prisma` — cap fields + `CapCounter.kind` + `ComparingBucketStat`

---

# SPRINT S3.1 — Backend + schema

**Deliverable:** all new Zod schemas, Prisma migration, engine integration, compilers, tests — zero UI changes. Publish still works; existing flows still execute identically; new node kinds are valid and compile at publish time.

---

### Task 1.1: Prisma schema deltas

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new cap fields + enums**

```prisma
// Under CapDefinition:
  rejectedLimit          Int?
  rejectedLimitAsPercent Boolean            @default(false)
  rejectionsInARow       Int?
  pqlScope               Json?
  behaviorPattern        CapBehaviorPattern @default(REGULAR)

// Top-level enums:
enum CapBehaviorPattern { REGULAR }
enum CapCounterKind { PUSHED REJECTED }

// Under CapCounter — new column + new unique index:
  kind CapCounterKind @default(PUSHED)
  @@unique([scope, scopeId, window, bucketKey, country, kind])
```

- [ ] **Step 2: Add ComparingBucketStat model**

```prisma
model ComparingBucketStat {
  id            String      @id @default(cuid())
  flowVersionId String
  nodeId        String
  branchNodeId  String
  bucketStart   DateTime
  sampleN       Int         @default(0)
  pushed        Int         @default(0)
  accepted      Int         @default(0)
  ftds          Int         @default(0)
  revenueCents  Int         @default(0)
  flowVersion   FlowVersion @relation(fields: [flowVersionId], references: [id], onDelete: Cascade)
  @@unique([flowVersionId, nodeId, branchNodeId, bucketStart])
  @@index([flowVersionId, nodeId])
}
```

And add the back-relation `comparingBuckets ComparingBucketStat[]` on `FlowVersion`.

- [ ] **Step 3: Drop the old CapCounter unique index + create migration**

Run: `pnpm prisma migrate dev --name s3_1_routing_irev_parity_schema`
Expected: SQL includes the new columns + unique index swap + new table.

- [ ] **Step 4: Regenerate Prisma client**

Run: `pnpm prisma generate`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(routing): prisma schema for cap + comparing-bucket additions (S3.1 T1)"
```

---

### Task 1.2: PQL Zod schemas

**Files:**
- Modify: `src/server/routing/flow/model.ts`
- Test: `src/server/routing/flow/model.test.ts`

- [ ] **Step 1: Add Pql* schemas + replace FilterConditionSchema in Filter**

Add new `PqlFieldSchema`, `PqlSignSchema`, `PqlRuleSchema`, `PqlGateSchema`. `FilterNode` switches `conditions` → `rules`. Leave the legacy `FilterConditionSchema` exported (alias to new) for one release so prod drafts load.

- [ ] **Step 2: Extend FlowNode discriminated union**

Add `SmartPoolNodeSchema` + `ComparingSplitNodeSchema`. Extend `BrokerTargetNodeSchema` with `description`, `active` (default true), `pqlGate`.

- [ ] **Step 3: Add accept-both transform for Filter back-compat**

Zod `.transform` that coerces `{conditions: [...]}` shape → `{rules: [...]}`. Both valid on the input side, canonical on output.

- [ ] **Step 4: Update FlowGraphSchema**

Bump node count max to 300 (adds room for unified SmartPool + Comparing). Keep edges.max at 500.

- [ ] **Step 5: Run model tests**

Run: `pnpm vitest run src/server/routing/flow/model.test.ts`
Expected: PASS (includes 4 new cases for new nodes).

- [ ] **Step 6: Commit**

```bash
git add src/server/routing/flow/model.ts src/server/routing/flow/model.test.ts
git commit -m "feat(routing): PQL + SmartPool + ComparingSplit Zod schemas (S3.1 T2)"
```

---

### Task 1.3: PQL field registry + evaluator

**Files:**
- Create: `src/server/routing/pql/fields.ts`
- Create: `src/server/routing/pql/evaluate.ts`
- Create: `src/server/routing/pql/evaluate.test.ts`

- [ ] **Step 1: Registry** — 8 fields (`geo, subId, utm_source, utm_medium, affiliateId, timeOfDay, phone, hourOfDay`) with `{ key, label, valueType, legalSigns, extract(lead) }`.

- [ ] **Step 2: Evaluator** — `evaluatePqlGate(rules, logic, lead)` returns `{ ok: boolean, failedRuleIndex?: number }`. Handles case-sensitive per rule. Supports all 10 signs.

- [ ] **Step 3: Tests** — one test per `(field, sign)` legal pair = 8 fields × ~6 avg signs = ~48 cases. Plus: case-sensitive on vs off, AND vs OR, unknown field rejected at schema layer.

- [ ] **Step 4: Run** — `pnpm vitest run src/server/routing/pql/`. All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/routing/pql/
git commit -m "feat(routing): PQL field registry + pure evaluator (S3.1 T3)"
```

---

### Task 1.4: SmartPool compiler

**Files:**
- Create: `src/server/routing/flow/compile-smartpool.ts`
- Create: `src/server/routing/flow/compile-smartpool.test.ts`

- [ ] **Step 1: Pure helper**

```ts
export function smartPoolToFallbackSteps(
  pool: SmartPoolNode,
  children: string[],   // BrokerTarget ids in rank order
): FallbackStepSpec[] {
  return children.slice(0, -1).map((from, i) => ({
    fromNodeId: from,
    toNodeId: children[i + 1],
    hopOrder: i,
    triggers: pool.triggers,
  })).slice(0, pool.maxHop);
}
```

- [ ] **Step 2: Cycle safety** — invoke existing `detectFallbackCycle` against the composed list; fail the compile on cycle.

- [ ] **Step 3: Tests** — 3 brokers → 2 steps; maxHop cap honored; empty pool → []; cycle detection round-trip with existing orchestrator tests.

- [ ] **Step 4: Commit**

```bash
git add src/server/routing/flow/compile-smartpool.ts src/server/routing/flow/compile-smartpool.test.ts
git commit -m "feat(routing): SmartPool → FallbackStep compiler (S3.1 T4)"
```

---

### Task 1.5: ComparingSplit compiler

**Files:**
- Create: `src/server/routing/flow/compile-comparing.ts`
- Create: `src/server/routing/flow/compile-comparing.test.ts`

- [ ] **Step 1: Pure helper**

```ts
export function comparingSplitToAlgoConfig(
  node: ComparingSplitNode,
  branches: Array<{ nodeId: string; share: number }>,
): {
  algoNode: AlgorithmNode;
  algoConfigParams: Record<string, unknown>;
  weights: Array<{ nodeId: string; weight: number }>;
} {
  const weights = branches.map(b => ({ nodeId: b.nodeId, weight: Math.round(b.share * 1000) }));
  return {
    algoNode: { id: `${node.id}_wrr`, kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    algoConfigParams: {
      compareMetric: node.compareMetric,
      sampleSize: node.sampleSize,
      isComparison: true,
      sourceComparingNodeId: node.id,
    },
    weights,
  };
}
```

- [ ] **Step 2: Validate shares sum to 1 ± 0.001; reject < 2 branches.**

- [ ] **Step 3: Tests** — 50/50 → 500/500 weights; 30/30/40 → 300/300/400; unbalanced rejected; sample size preserved.

- [ ] **Step 4: Commit**

```bash
git add src/server/routing/flow/compile-comparing.ts src/server/routing/flow/compile-comparing.test.ts
git commit -m "feat(routing): ComparingSplit → Algorithm(WRR) compiler (S3.1 T5)"
```

---

### Task 1.6: publishFlow integration

**Files:**
- Modify: `src/server/routing/flow/publish.ts`
- Test: `src/server/routing/flow/publish.test.ts`

- [ ] **Step 1: In publishFlow, after Zod-validate and before persist:**
  - Walk nodes; for each SmartPool, compile to FallbackStep rows (added to the `FallbackStep` create list).
  - For each ComparingSplit, compile to Algorithm + FlowAlgorithmConfig.
  - Run `detectFallbackCycle` on the combined list.

- [ ] **Step 2: Update `flowToGraph` / `graphToFlow`** to pass through the new node kinds without transformation.

- [ ] **Step 3: Test** — publish a flow with each new node kind; assert FallbackStep / FlowAlgorithmConfig rows exist with the correct relations.

- [ ] **Step 4: Commit**

```bash
git add src/server/routing/flow/publish.ts src/server/routing/flow/publish.test.ts src/server/routing/flow/graph.ts
git commit -m "feat(routing): publishFlow compiles SmartPool + ComparingSplit (S3.1 T6)"
```

---

### Task 1.7: Cap engine — reject-tracking + streak + pqlScope

**Files:**
- Modify: `src/server/routing/constraints/caps.ts`
- Create: `src/server/routing/constraints/rejection-streak.ts`
- Modify: `src/server/routing/engine.ts`
- Test: `src/server/routing/engine.test.ts` + new `src/server/routing/constraints/rejection-streak.test.ts`

- [ ] **Step 1: Add `kind: "PUSHED" | "REJECTED"` to CapInput** — default "PUSHED". Thread through `consumeCap` / `releaseCap` / `remainingCap`.

- [ ] **Step 2: PQL-scope support** — when `CapDefinition.pqlScope` is set, `bucketKey` becomes `${baseBucketKey}:${sha256(pqlScope).slice(0,8)}`. Skip counting if the lead fails the pqlScope evaluation.

- [ ] **Step 3: rejection-streak.ts** — Redis counter `cap:streak:{brokerId}:{flowVersionId}`. `bumpRejectionStreak(brokerId, flowVersionId)` returns the new count. `resetRejectionStreak(brokerId, flowVersionId)`.

- [ ] **Step 4: engine.ts** — after cap check, evaluate `BrokerTarget.pqlGate` if present; excluded targets get a trace step `{ step: "pql_gate", ok: false, detail: { failed_rule_index } }`.

- [ ] **Step 5: Tests**
  - `caps.test.ts` — rejected-counter isolates from pushed; pqlScope hash segments buckets.
  - `rejection-streak.test.ts` — bump/reset; threshold trigger returns `true` at N.
  - `engine.test.ts` — broker excluded via pqlGate; trace captures failure.

- [ ] **Step 6: Commit**

```bash
git add src/server/routing/constraints/ src/server/routing/engine.ts src/server/routing/engine.test.ts
git commit -m "feat(routing): cap reject-tracking + streak-pause + pqlScope + pqlGate (S3.1 T7)"
```

---

### Task 1.8: push-lead worker — streak-pause wiring

**Files:**
- Modify: `src/server/jobs/push-lead.ts`

- [ ] **Step 1: On rejection path**, call `bumpRejectionStreak`. If return ≥ `CapDefinition.rejectionsInARow`, update `Broker.isActive = false`, emit Telegram event `BROKER_REJECTION_STREAK_PAUSED`, write audit log.

- [ ] **Step 2: On successful push**, call `resetRejectionStreak`.

- [ ] **Step 3: Add Telegram event template** at `src/server/telegram/templates/broker-rejection-streak-paused.ts` + register in catalog.

- [ ] **Step 4: Tests** — push-lead integration; seed `rejectionsInARow=3`; simulate 3 rejects; assert broker paused + telegram emit.

- [ ] **Step 5: Commit**

```bash
git add src/server/jobs/push-lead.ts src/server/telegram/
git commit -m "feat(routing): auto-pause broker on rejection streak (S3.1 T8)"
```

---

### Task 1.9: Filter.conditions → rules data migration

**Files:**
- Create: `src/server/routing/flow/migrations/2026-04-22-filter-to-pql.ts`
- Create: `scripts/migrate-filter-to-pql.ts`

- [ ] **Step 1: Pure transform** — walk a `FlowGraph`, on each Filter node rename `conditions` → `rules`, default `caseSensitive: false` per rule, preserve everything else.

- [ ] **Step 2: Script** — iterate all non-archived `FlowVersion`, apply transform, update `graph` JSON in a single transaction with a dry-run flag.

- [ ] **Step 3: Test** — 5 fixture graphs covering every shape (Filter w/ conditions, Filter w/ rules, no Filter, nested structure).

- [ ] **Step 4: Run in dev** — `DATABASE_URL=... pnpm tsx scripts/migrate-filter-to-pql.ts --dry-run` then without.

- [ ] **Step 5: Commit**

```bash
git add src/server/routing/flow/migrations/ scripts/migrate-filter-to-pql.ts
git commit -m "feat(routing): data migration for FilterNode.conditions → rules (S3.1 T9)"
```

---

### Task 1.10: simulator — batch mode + accept probabilities

**Files:**
- Modify: `src/server/routing/simulator.ts`
- Modify: `src/app/api/v1/routing/simulate/route.ts`
- Test: `src/server/routing/simulator.test.ts`

- [ ] **Step 1: Extend `SimulateInput`** with optional `count?: number` (batch) + `brokerAcceptProbabilities?: Record<string, number>`.

- [ ] **Step 2: Batch loop** — in batch mode, run N leads sequentially; for each returned decision, roll a Math.random() against the broker's probability; if fail, follow SmartPool's FallbackStep chain (iterate siblings) until accept or exhausted. Record per-attempt trace.

- [ ] **Step 3: REST** — extend Zod input; surface batch results `{ perBrokerCounts, avgDecisionMs, sampleTraces }`.

- [ ] **Step 4: Tests** — 1000 leads through a 3-broker SmartPool with `[0, 0, 1]` → all land on broker 3 with 2-hop traces; 1000 leads through a WRR `[1, 1]` → ~500/500.

- [ ] **Step 5: Commit**

```bash
git add src/server/routing/simulator.ts src/app/api/v1/routing/simulate/route.ts src/server/routing/simulator.test.ts
git commit -m "feat(routing): simulator batch mode + per-broker accept probability (S3.1 T10)"
```

---

### Task 1.11: S3.1 sign-off

- [ ] **Step 1:** Run `pnpm typecheck` — zero errors.
- [ ] **Step 2:** Run `pnpm lint` — zero errors.
- [ ] **Step 3:** Run `pnpm test` — zero failures. New tests added: ~75.
- [ ] **Step 4:** Tag `v2.0.0-s3.1-routing-backend`.

```bash
git tag v2.0.0-s3.1-routing-backend
```

---

# SPRINT S3.2 — Canvas editor + simulator UI

**Deliverable:** SmartPool + ComparingSplit drop-ready from the Toolbar; PQL editor replaces legacy FilterConditionEditor; CapInspector gets new fields; BrokerTarget inspector gets PQL gate editor; simulator page supports batch with probabilities.

---

### Task 2.1: PqlRuleEditor (replaces FilterConditionEditor)

**Files:**
- Create: `src/components/routing-editor/PqlRuleEditor.tsx`
- Delete: (content of) `src/components/routing-editor/FilterConditionEditor.tsx` — keep file as re-export shim
- Modify: `src/components/routing-editor/filter-conditions.ts` — now `pql-rules.ts` exports
- Test: `src/components/routing-editor/pql-rules.test.ts`

- [ ] **Step 1:** `PqlRuleEditor` renders from `PQL_FIELDS` registry. Per row: field dropdown, sign dropdown (filtered by `legalSigns`), value editor (per valueType), case-sensitive checkbox, delete button. Below: AND/OR toggle + "Add rule" button.

- [ ] **Step 2:** Value editor shapes: single-line text, chip list, numeric input, time range "HH:MM-HH:MM".

- [ ] **Step 3:** Validation: live Zod check on each row; error border + tooltip on invalid rows.

- [ ] **Step 4:** Re-export shim — `FilterConditionEditor.tsx` now just does `export { PqlRuleEditor as FilterConditionEditor } from './PqlRuleEditor'`.

- [ ] **Step 5:** Tests — render, add/remove row, toggle sign updates legal value types, case-sensitive checkbox toggles, Zod rejection surfaces.

- [ ] **Step 6: Commit**

```bash
git add src/components/routing-editor/PqlRuleEditor.tsx src/components/routing-editor/pql-rules.ts src/components/routing-editor/FilterConditionEditor.tsx src/components/routing-editor/pql-rules.test.ts
git commit -m "feat(routing-editor): PqlRuleEditor w/ registry + case-sensitive (S3.2 T1)"
```

---

### Task 2.2: SmartPool + ComparingSplit node renderers

**Files:**
- Modify: `src/components/routing-editor/nodes.tsx`
- Modify: `src/components/routing-editor/Canvas.tsx`
- Modify: `src/components/routing-editor/Toolbar.tsx`

- [ ] **Step 1:** Add `SmartPoolNode` renderer — title + glyph + `maxHop` chip + a child-count badge + target handle (left) + source handle (right).

- [ ] **Step 2:** Add `ComparingSplitNode` renderer — title + glyph + `compareMetric` pill + `sampleSize` chip + 1 target handle + 1 source handle.

- [ ] **Step 3:** Register new types in `Canvas.nodeTypes`.

- [ ] **Step 4:** Toolbar "Add node" dropdown gains two entries.

- [ ] **Step 5:** Visual smoke — open editor, drop each new node, verify render + move.

- [ ] **Step 6: Commit**

```bash
git add src/components/routing-editor/nodes.tsx src/components/routing-editor/Canvas.tsx src/components/routing-editor/Toolbar.tsx
git commit -m "feat(routing-editor): SmartPool + ComparingSplit renderers (S3.2 T2)"
```

---

### Task 2.3: Per-node inspectors

**Files:**
- Create: `src/components/routing-editor/inspectors/SmartPoolInspector.tsx`
- Create: `src/components/routing-editor/inspectors/ComparingSplitInspector.tsx`
- Create: `src/components/routing-editor/inspectors/BrokerTargetInspector.tsx` (extracted)
- Modify: `src/components/routing-editor/Inspector.tsx` — dispatch by kind

- [ ] **Step 1:** `BrokerTargetInspector` — label, description, active toggle, weight/slots/chance (conditional by flow algo mode), `pqlGate` editor (reuses `PqlRuleEditor` inside a collapsible section).

- [ ] **Step 2:** `SmartPoolInspector` — maxHop slider 1–10, triggers editor (reuse existing triggers editor from Fallback inspector), ordered child list with drag-to-reorder.

- [ ] **Step 3:** `ComparingSplitInspector` — compareMetric select, sampleSize numeric, child branches with share editor (must sum to 1 or UI shows warning).

- [ ] **Step 4:** `Inspector.tsx` switches on `selectedNode.kind` to render the right inspector.

- [ ] **Step 5:** Smoke — click each node kind, verify right inspector renders with editable fields.

- [ ] **Step 6: Commit**

```bash
git add src/components/routing-editor/inspectors/ src/components/routing-editor/Inspector.tsx
git commit -m "feat(routing-editor): SmartPool + ComparingSplit + BrokerTarget inspectors (S3.2 T3)"
```

---

### Task 2.4: CapInspector upgrades

**Files:**
- Modify: `src/components/routing-editor/CapInspector.tsx`
- Test: `src/components/routing-editor/cap-inspector.test.ts` (new)

- [ ] **Step 1:** Add fields — `rejectedLimit` number + "as % of pushed" checkbox + `rejectionsInARow` number + `behaviorPattern` select + collapsible `pqlScope` section using `PqlRuleEditor`.

- [ ] **Step 2:** Zod-validated save — surfaces errors inline.

- [ ] **Step 3:** Tests — empty/filled/invalid cases; PQL scope round-trip through tRPC save.

- [ ] **Step 4: Commit**

```bash
git add src/components/routing-editor/CapInspector.tsx src/components/routing-editor/cap-inspector.test.ts
git commit -m "feat(routing-editor): cap inspector gains rejected/streak/pql (S3.2 T4)"
```

---

### Task 2.5: Simulator page — batch UI

**Files:**
- Modify: `src/app/dashboard/routing/flows/[flowId]/simulator/page.tsx`

- [ ] **Step 1:** New "Batch" tab alongside Single. Controls: N (10–10000), per-broker accept probability grid (one row per BrokerTarget in the flow; slider 0–1).

- [ ] **Step 2:** Run button fires `trpc.routing.simulate` with batch payload; result panel shows per-broker count bars + average decision time.

- [ ] **Step 3:** Sample traces — first 10 traces rendered as a vertical timeline with color-coded hops.

- [ ] **Step 4:** E2E manual: author UA→3 brokers SmartPool with probabilities `[0, 0, 1]`; simulate 100 leads; verify all land on broker 3 with 2-hop sequential trace.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/routing/flows/[flowId]/simulator/
git commit -m "feat(routing-editor): simulator batch mode UI + sequential trace (S3.2 T5)"
```

---

### Task 2.6: S3.2 sign-off

- [ ] **Step 1:** `pnpm typecheck` — clean.
- [ ] **Step 2:** `pnpm lint` — clean.
- [ ] **Step 3:** `pnpm test` — clean. New tests: ~20.
- [ ] **Step 4:** Manual smoke: each new inspector saves; publish works end to end.
- [ ] **Step 5:** Tag `v2.0.0-s3.2-routing-canvas`.

---

# SPRINT S3.3 — Tree-list editor + sign-off

**Deliverable:** New `/dashboard/routing/flows/:flowId/tree` page; round-trip between graph and tree; inline edits persist. User's scenario passes both editors.

---

### Task 3.1: flowToTree / treeToFlow projection

**Files:**
- Create: `src/server/routing/flow/tree.ts`
- Test: `src/server/routing/flow/tree.test.ts`

- [ ] **Step 1:** `flowToTree(graph)` → `TreeRoot { folders: TreeFolder[] }` where folders are RO-like groupings inferred from Filter(geo) or explicit SmartPool / ComparingSplit roots; leaves are BrokerTargets.

- [ ] **Step 2:** `treeToFlow(tree)` → `FlowGraph`. Inverse; stable node-id reuse when possible.

- [ ] **Step 3:** Round-trip test — 5 fixture graphs (the same 5 used in the `graph-diff.test.ts`) round-trip byte-equal.

- [ ] **Step 4: Commit**

```bash
git add src/server/routing/flow/tree.ts src/server/routing/flow/tree.test.ts
git commit -m "feat(routing): flowToTree/treeToFlow projection (S3.3 T1)"
```

---

### Task 3.2: tRPC tree procs

**Files:**
- Modify: `src/server/routers/routing.ts`

- [ ] **Step 1:** `treeView` — `input: { flowId }`, returns `TreeRoot` built from active draft graph.

- [ ] **Step 2:** `applyTreePatch` — `input: { flowId, ops: TreeOp[] }`. Ops: `reorder`, `toggleActive`, `setCapLimit`, `setWeight`, `setPqlRuleValue`. Server re-builds graph via `treeToFlow`, persists via `updateDraftGraph`.

- [ ] **Step 3:** Integration test — seed graph, apply each op, read back.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/routing.ts tests/integration/routing-tree-router.test.ts
git commit -m "feat(routing): tRPC tree view + patch ops (S3.3 T2)"
```

---

### Task 3.3: Tree page + row components

**Files:**
- Create: `src/app/dashboard/routing/flows/[flowId]/tree/page.tsx`
- Create: `src/components/routing-editor/tree/TreeRoot.tsx`
- Create: `src/components/routing-editor/tree/TreeRow.tsx`
- Create: `src/components/routing-editor/tree/row-folder.tsx`, `row-broker-target.tsx`, `row-smart-pool.tsx`, `row-comparing-split.tsx`, `row-filter.tsx`, `row-cap.tsx`

- [ ] **Step 1:** Page shell — header w/ canvas/tree toggle + DraftPublishBadge + "New entity" menu.

- [ ] **Step 2:** `TreeRoot` renders folders and nested rows. `TreeRow` is the common shell (chevron, glyph, name, passing rule, shares, cap bar, status, actions).

- [ ] **Step 3:** Per-kind row components — inline editors for low-risk fields; heavy edits open modal (reuses inspectors).

- [ ] **Step 4:** Live cap bar — poll `routing.capStatus` for each cap row (existing tRPC proc).

- [ ] **Step 5:** Smoke — load a real flow via the tree URL; verify all row kinds render.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/routing/flows/[flowId]/tree/ src/components/routing-editor/tree/
git commit -m "feat(routing-editor): tree-list editor page + per-kind rows (S3.3 T3)"
```

---

### Task 3.4: Inline-edit persistence

**Files:**
- Modify: `src/components/routing-editor/tree/row-*.tsx`

- [ ] **Step 1:** Each inline edit calls `trpc.routing.applyTreePatch`; optimistic update via `useMutation` + rollback on 409.

- [ ] **Step 2:** Smoke — edit a cap limit in tree, switch to canvas, verify reflected.

- [ ] **Step 3: Commit**

```bash
git add src/components/routing-editor/tree/
git commit -m "feat(routing-editor): inline-edit persistence via applyTreePatch (S3.3 T4)"
```

---

### Task 3.5: Scenario E2E test

**Files:**
- Create: `tests/e2e/routing-irev-scenario.test.ts`

- [ ] **Step 1:** Via tRPC, create a new draft flow; add Entry → Filter(geo=UA) → SmartPool[3 brokers] → Exit.

- [ ] **Step 2:** Publish.

- [ ] **Step 3:** Simulate 100 leads with `brokerAcceptProbabilities = { b1: 0, b2: 0, b3: 1 }`; assert all 100 landed on b3 with 2-hop traces.

- [ ] **Step 4:** Load the same flow via `treeView`; assert structure matches.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/routing-irev-scenario.test.ts
git commit -m "test(routing): E2E UA→3-brokers sequential-accept scenario (S3.3 T5)"
```

---

### Task 3.6: Deprecate standalone Fallback node (open question §14)

**Decision point:** keep or drop `Fallback` node?

- [ ] **Step 1:** Add a one-line deprecation tooltip on the Toolbar's `Fallback` button: "Use SmartPool — Fallback node is deprecated and will be removed in v2.1".

- [ ] **Step 2:** Do NOT auto-migrate existing Fallback-bearing flows; leave them as-is. Auto-migration moved to a separate v2.1 task.

- [ ] **Step 3: Commit**

```bash
git add src/components/routing-editor/Toolbar.tsx
git commit -m "chore(routing-editor): deprecate standalone Fallback node (S3.3 T6)"
```

---

### Task 3.7: Readiness checklist + CHANGELOG

**Files:**
- Modify: `docs/superpowers/READINESS_CHECKLIST.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `crm-node/CLAUDE.md` — add "v2.0 S3.1 iREV parity" working-notes section

- [ ] **Step 1:** Checklist — add a new `v2.0 S3 Routing iREV parity` section with boxes flipped for what shipped.
- [ ] **Step 2:** CHANGELOG — list the additions.
- [ ] **Step 3:** Bump `package.json` to `2.0.0-s3.3`.
- [ ] **Step 4:** CLAUDE.md — add a working-notes subsection at the top so Claude has it as context next session.
- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/READINESS_CHECKLIST.md CHANGELOG.md package.json CLAUDE.md
git commit -m "docs: routing iREV parity readiness + changelog + working-notes (S3.3 T7)"
git tag v2.0.0-s3.3-routing-tree
```

---

### Task 3.8: Final regression + sign-off

- [ ] **Step 1:** `pnpm typecheck` — zero errors.
- [ ] **Step 2:** `pnpm lint` — zero errors.
- [ ] **Step 3:** `pnpm test` — zero failures.
- [ ] **Step 4:** Tenant-isolation pentest — 22/22 still passing.
- [ ] **Step 5:** Perf harness regression — `perf/routing-stress.js` p95 within 10% of baseline.

Completion when all three tags exist on main and all gates in `specs/2026-04-22-routing-irev-parity-design.md §12` are met.
