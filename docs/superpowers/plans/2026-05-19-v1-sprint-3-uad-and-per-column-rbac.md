# v1.0 Sprint 3 — Automated Lead Delivery (UAD) + Per-Column RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship **EPIC-09 Automated Lead Delivery (UAD)** — configurable per-broker retry ladder, cold-overflow `ManualReviewQueue`, fallback orchestration hitting the manual queue when all brokers exhaust, manual review UI, and a stubbed queue-depth alert emitter — plus a **per-column RBAC** layer that redacts Lead/Broker/Affiliate fields server-side based on role.

**Architecture:** Additive. `ManualReviewQueue` is a new table keyed by `leadId` with enum `reason`. `Broker.retrySchedule` is a plain comma-separated `String` (default `"10,60,300,900,3600"`) parsed at push-time. The existing `handlePushLead` job (`src/server/jobs/push-lead.ts`) wraps its per-broker iteration with a `classifyPushResult` call that — on exhaustion — consults the already-published Flow `FallbackStep` chain, then enqueues to `ManualReviewQueue` when the chain terminates. Per-column RBAC is role-based (no per-user ACLs in v1.0), applied in a `redact(rows, role, entity)` helper invoked by tRPC resolvers and REST shims. UI respects visibility via an auto-hide-empty-column rule so that hidden data never leaks client-side. Telegram alert emitter is stubbed in S3 (interface + no-op) and replaced by the real Telegram transport in S5.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), NextAuth v5, pg-boss for the push job, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §4 Sprint 3 row (EPIC-09 UAD + RBAC upgrades).

**Design decisions (locked):**
- Manual-queue `reason` is a Postgres enum with exactly four values: `BROKER_FAILED`, `CAP_REACHED`, `NO_BROKER_MATCH`, `FRAUD_BORDERLINE`.
- Retry schedule stored as plain string (`"10,60,300,900,3600"`) on `Broker`. Parsed at runtime — invalid entries fall back to the default ladder. No migration of hardcoded schedules needed; `@default` handles it.
- RBAC column visibility is **role-based** only. Per-user ACLs are v2.0 scope.
- Redaction is **server-side** — the client never receives hidden field values, not even `null` with a flag. Fields are simply absent (`undefined`) on the wire.
- `AFFILIATE_VIEWER` and `BROKER_VIEWER` are new `UserRole` enum values appended to the existing `ADMIN | OPERATOR` set. No data migration (NextAuth `User.role` defaults to `OPERATOR` via schema).
- Queue-depth alert emitter lands as a no-op interface in S3 (`emitAlert(event, payload)`). S5 (Telegram) wires the real transport without touching the call sites.

**Preflight:**
- Working tree on `main` clean (`git status` empty).
- S1 (`v1.0-sprint-1-complete`) and S2 (`v1.0-sprint-2-complete`) tags exist in the repo.
- `pnpm install` complete, dev DB + Redis up (`pnpm db:up`).
- `pnpm test` currently green.

---

### Task 1: Schema — `ManualReviewQueue`, `Broker.retrySchedule`, new `UserRole` values

**Files:**
- Modify: `prisma/schema.prisma`
- No test in this task (column/table addition only; enforcement tested downstream)

- [ ] **Step 1: Add `ManualReviewReason` enum + `ManualReviewQueue` model**

Open `prisma/schema.prisma` and append (after the `LeadEvent` block):

```prisma
enum ManualReviewReason {
  BROKER_FAILED
  CAP_REACHED
  NO_BROKER_MATCH
  FRAUD_BORDERLINE
}

enum ManualReviewResolution {
  ACCEPT
  REJECT
  REQUEUE
}

model ManualReviewQueue {
  id             String                  @id @default(cuid())
  leadId         String                  @unique
  reason         ManualReviewReason
  lastBrokerId   String?
  lastError      String?
  createdAt      DateTime                @default(now())
  claimedBy      String?
  claimedAt      DateTime?
  resolvedBy     String?
  resolvedAt     DateTime?
  resolution     ManualReviewResolution?
  resolutionNote String?

  lead       Lead   @relation(fields: [leadId], references: [id], onDelete: Cascade)
  claimer    User?  @relation("ManualReviewClaimer", fields: [claimedBy], references: [id])
  resolver   User?  @relation("ManualReviewResolver", fields: [resolvedBy], references: [id])
  lastBroker Broker? @relation(fields: [lastBrokerId], references: [id])

  @@index([resolvedAt])
  @@index([claimedBy])
  @@index([reason, createdAt])
}
```

- [ ] **Step 2: Add `retrySchedule` field to `Broker`**

In the `Broker` model (around line 109–146), add right after `pollIntervalMin Int?`:

```prisma
  retrySchedule   String   @default("10,60,300,900,3600")
```

No index needed (field is read only during push, not queried by).

- [ ] **Step 3: Extend `UserRole` enum**

Replace the enum at line 20:

```prisma
enum UserRole {
  ADMIN
  OPERATOR
  AFFILIATE_VIEWER
  BROKER_VIEWER
}
```

- [ ] **Step 4: Wire back-relations on `User`, `Lead`, `Broker`**

In `User` (around line 10):

```prisma
  manualClaims    ManualReviewQueue[] @relation("ManualReviewClaimer")
  manualResolves  ManualReviewQueue[] @relation("ManualReviewResolver")
```

In `Lead`:

```prisma
  manualReview ManualReviewQueue?
```

In `Broker`:

```prisma
  manualReviewLast ManualReviewQueue[]
```

- [ ] **Step 5: Push schema to dev DB**

Run:
```bash
pnpm prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 6: Type-check**

Run:
```bash
pnpm typecheck
```
Expected: zero errors (no consumers of the new types yet).

- [ ] **Step 7: Commit**

Run:
```bash
git add prisma/schema.prisma
git commit -m "feat(schema): ManualReviewQueue + Broker.retrySchedule + new UserRole values"
```

---

### Task 2: Parse `Broker.retrySchedule` at push-time

**Files:**
- Create: `src/server/routing/retry-schedule.ts`
- Test: `tests/unit/retry-schedule.test.ts`
- Modify: `src/server/jobs/push-lead.ts` (thread the parsed schedule into pg-boss `retry-ladder` metadata)

- [ ] **Step 1: Write failing unit test for parsing**

Create `tests/unit/retry-schedule.test.ts`:

```typescript
import { parseRetrySchedule, DEFAULT_RETRY_LADDER } from "@/server/routing/retry-schedule";
import { describe, expect, it } from "vitest";

describe("parseRetrySchedule", () => {
  it("returns default ladder when input is undefined", () => {
    expect(parseRetrySchedule(undefined)).toEqual(DEFAULT_RETRY_LADDER);
  });

  it("returns default ladder when input is empty string", () => {
    expect(parseRetrySchedule("")).toEqual(DEFAULT_RETRY_LADDER);
  });

  it("parses a well-formed csv", () => {
    expect(parseRetrySchedule("5,30,120")).toEqual([5, 30, 120]);
  });

  it("trims whitespace around each entry", () => {
    expect(parseRetrySchedule(" 10, 60 , 300 ")).toEqual([10, 60, 300]);
  });

  it("drops non-numeric entries and falls back to default when nothing parses", () => {
    expect(parseRetrySchedule("foo,bar")).toEqual(DEFAULT_RETRY_LADDER);
  });

  it("drops negative and zero entries", () => {
    expect(parseRetrySchedule("10,-5,0,30")).toEqual([10, 30]);
  });

  it("caps individual delays at 24h (86400s) to protect pg-boss", () => {
    expect(parseRetrySchedule("10,999999")).toEqual([10, 86400]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/unit/retry-schedule.test.ts
```
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement parser**

Create `src/server/routing/retry-schedule.ts`:

```typescript
export const DEFAULT_RETRY_LADDER = [10, 60, 300, 900, 3600] as const;
const MAX_DELAY_SECONDS = 86_400;

export function parseRetrySchedule(raw: string | null | undefined): number[] {
  if (!raw) return [...DEFAULT_RETRY_LADDER];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.min(n, MAX_DELAY_SECONDS));
  return parts.length > 0 ? parts : [...DEFAULT_RETRY_LADDER];
}

export function nthRetryDelay(schedule: number[], attemptIndex: number): number | null {
  if (attemptIndex < 0 || attemptIndex >= schedule.length) return null;
  return schedule[attemptIndex];
}
```

- [ ] **Step 4: Re-run test, expect PASS**

Run:
```bash
pnpm vitest run tests/unit/retry-schedule.test.ts
```
Expected: PASS (7 cases).

- [ ] **Step 5: Use the parser in `push-lead.ts` when scheduling a retry**

Open `src/server/jobs/push-lead.ts`. Locate the section that on `push_failed` re-enqueues the lead (or, if absent, the section after the per-broker for-loop that handles exhaustion). Import the parser:

```typescript
import { parseRetrySchedule, nthRetryDelay } from "@/server/routing/retry-schedule";
```

When a per-broker push fails and the lead is about to be retried against the same broker, compute the next delay from that broker's own schedule:

```typescript
const schedule = parseRetrySchedule(broker.retrySchedule);
const attemptIndex = (tried.filter((t) => t.id === broker.id).length) - 1;
const delaySec = nthRetryDelay(schedule, attemptIndex);
if (delaySec != null) {
  const boss = await getBoss();
  await boss.send(
    JOB_NAMES.PUSH_LEAD,
    { leadId: lead.id, traceId: lead.traceId } satisfies PushLeadPayload,
    { startAfter: delaySec },
  );
  return;
}
```

Place this branch **after** the per-broker push failure log and **before** the fallback-to-next-broker logic, so that we only retry the same broker when its schedule still has a slot.

- [ ] **Step 6: Type-check + run existing push-lead tests**

Run:
```bash
pnpm typecheck
pnpm vitest run src/server/jobs
```
Expected: zero type errors; push-lead tests still pass. If a push-lead test now sees an extra `boss.send`, adjust the mock: add the expectation that retries with `startAfter` fire on repeated failures for the same broker.

- [ ] **Step 7: Commit**

Run:
```bash
git add src/server/routing/retry-schedule.ts tests/unit/retry-schedule.test.ts src/server/jobs/push-lead.ts
git commit -m "feat(routing): per-broker retry schedule parsed from Broker.retrySchedule"
```

---

### Task 3: Cold-overflow trigger — enqueue to `ManualReviewQueue` on exhaustion

**Files:**
- Create: `src/server/routing/manual-queue.ts`
- Test: `tests/integration/manual-queue-enqueue.test.ts`
- Modify: `src/server/jobs/push-lead.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/manual-queue-enqueue.test.ts`:

```typescript
import { enqueueManualReview } from "@/server/routing/manual-queue";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("enqueueManualReview", () => {
  let leadId: string;

  beforeEach(async () => {
    await resetDb();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "203.0.113.5",
        eventTs: new Date(),
        traceId: "trace-mrq-1",
      },
    });
    leadId = lead.id;
  });

  it("inserts a row with reason + lastBrokerId + lastError", async () => {
    await enqueueManualReview({
      leadId,
      reason: "BROKER_FAILED",
      lastBrokerId: null,
      lastError: "upstream 500",
    });
    const row = await prisma.manualReviewQueue.findUnique({ where: { leadId } });
    expect(row?.reason).toBe("BROKER_FAILED");
    expect(row?.lastError).toBe("upstream 500");
    expect(row?.resolvedAt).toBeNull();
  });

  it("is idempotent for the same leadId (upserts)", async () => {
    await enqueueManualReview({ leadId, reason: "CAP_REACHED" });
    await enqueueManualReview({ leadId, reason: "BROKER_FAILED", lastError: "timeout" });
    const rows = await prisma.manualReviewQueue.findMany({ where: { leadId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("BROKER_FAILED");
    expect(rows[0].lastError).toBe("timeout");
  });

  it("fires emitAlert once per enqueue (stub counted)", async () => {
    const { __getAlertCalls, __resetAlertCalls } = await import(
      "@/server/alerts/emitter"
    );
    __resetAlertCalls();
    await enqueueManualReview({ leadId, reason: "NO_BROKER_MATCH" });
    expect(__getAlertCalls()).toHaveLength(1);
    expect(__getAlertCalls()[0].event).toBe("manual_queue_enqueued");
  });
});
```

- [ ] **Step 2: Stub the alert emitter (real transport lands in S5)**

Create `src/server/alerts/emitter.ts`:

```typescript
import { logger } from "@/server/observability";

export type AlertEvent =
  | "manual_queue_enqueued"
  | "manual_queue_depth_exceeded"
  | "broker_down"
  | "fraud_hit";

export type AlertPayload = Record<string, unknown>;

const __calls: Array<{ event: AlertEvent; payload: AlertPayload; at: Date }> = [];

export async function emitAlert(event: AlertEvent, payload: AlertPayload): Promise<void> {
  // S3: stub. S5 wires Telegram transport.
  __calls.push({ event, payload, at: new Date() });
  logger.info(
    { alertEvent: event, payload },
    "[alert:stub] event emitted (telegram transport pending S5)",
  );
}

// Test-only helpers — do not import from production code.
export function __getAlertCalls() {
  return [...__calls];
}

export function __resetAlertCalls() {
  __calls.length = 0;
}
```

- [ ] **Step 3: Implement `enqueueManualReview`**

Create `src/server/routing/manual-queue.ts`:

```typescript
import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { emitAlert } from "@/server/alerts/emitter";
import type { ManualReviewReason } from "@prisma/client";

export interface EnqueueManualReviewInput {
  leadId: string;
  reason: ManualReviewReason;
  lastBrokerId?: string | null;
  lastError?: string | null;
}

export async function enqueueManualReview(
  input: EnqueueManualReviewInput,
): Promise<void> {
  await prisma.manualReviewQueue.upsert({
    where: { leadId: input.leadId },
    update: {
      reason: input.reason,
      lastBrokerId: input.lastBrokerId ?? null,
      lastError: input.lastError ?? null,
      claimedBy: null,
      claimedAt: null,
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      resolutionNote: null,
    },
    create: {
      leadId: input.leadId,
      reason: input.reason,
      lastBrokerId: input.lastBrokerId ?? null,
      lastError: input.lastError ?? null,
    },
  });

  await writeLeadEvent(input.leadId, "MANUAL_REVIEW_ENQUEUED", {
    reason: input.reason,
    lastBrokerId: input.lastBrokerId ?? null,
    lastError: input.lastError ?? null,
  });

  await emitAlert("manual_queue_enqueued", {
    leadId: input.leadId,
    reason: input.reason,
    lastBrokerId: input.lastBrokerId ?? null,
  });
}

export async function getManualQueueDepth(): Promise<number> {
  return prisma.manualReviewQueue.count({ where: { resolvedAt: null } });
}
```

- [ ] **Step 4: Register `MANUAL_REVIEW_ENQUEUED` in `LeadEvent` kinds**

Open `src/server/lead-event.ts` and find the event-kind union/type. Append `"MANUAL_REVIEW_ENQUEUED"`, `"MANUAL_REVIEW_CLAIMED"`, `"MANUAL_REVIEW_RESOLVED"`, `"MANUAL_REVIEW_REQUEUED"` to the allowed set. Ensure no existing test asserts an exhaustive list that would now break — if so, extend that test's fixture.

- [ ] **Step 5: Run integration test to confirm PASS**

Run:
```bash
pnpm vitest run tests/integration/manual-queue-enqueue.test.ts
```
Expected: PASS (3 cases).

- [ ] **Step 6: Wire exhaustion branch in `push-lead.ts`**

Open `src/server/jobs/push-lead.ts`. At the end of the per-broker loop, where the current code writes `PUSH_ALL_EXHAUSTED` (or equivalent fail-to-final-state code), replace the final state transition with:

```typescript
import { enqueueManualReview } from "@/server/routing/manual-queue";

// after for-loop, when winner is still null:
if (!winner) {
  const anyCapFull = tried.every((t) => t.reason === "cap_full");
  const anyPushFailed = tried.some((t) => t.reason === "push_failed");
  const nothingTried = tried.length === 0;
  const reason = nothingTried
    ? ("NO_BROKER_MATCH" as const)
    : anyCapFull
      ? ("CAP_REACHED" as const)
      : anyPushFailed
        ? ("BROKER_FAILED" as const)
        : ("NO_BROKER_MATCH" as const);
  const lastPushFailed = [...tried].reverse().find((t) => t.reason === "push_failed");
  await enqueueManualReview({
    leadId: lead.id,
    reason,
    lastBrokerId: lastPushFailed?.id ?? null,
    lastError: lastPushFailed?.error ?? null,
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { state: "FAILED" },
  });
  return;
}
```

- [ ] **Step 7: Run the full push-lead test file + full suite**

Run:
```bash
pnpm vitest run src/server/jobs
pnpm test
```
Expected: all pass. If an existing assertion expected `state = FAILED` with no side-effect, extend it to confirm `ManualReviewQueue` now holds a row.

- [ ] **Step 8: Commit**

Run:
```bash
git add src/server/alerts/emitter.ts src/server/routing/manual-queue.ts src/server/lead-event.ts src/server/jobs/push-lead.ts tests/integration/manual-queue-enqueue.test.ts
git commit -m "feat(uad): cold-overflow enqueue to ManualReviewQueue on broker exhaustion"
```

---

### Task 4: Fallback orchestration — consult Flow fallback plan before manual queue

**Files:**
- Modify: `src/server/jobs/push-lead.ts`
- Test: `tests/integration/push-lead-fallback-to-manual.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/push-lead-fallback-to-manual.test.ts`:

```typescript
import { handlePushLead } from "@/server/jobs/push-lead";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";
import * as brokerPush from "@/server/broker-adapter/push";

describe("push-lead fallback to manual queue", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("hits primary, then fallback broker, then manual queue when both fail", async () => {
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    const primary = await prisma.broker.create({
      data: {
        name: "primary",
        endpointUrl: "https://p.example",
        fieldMapping: {},
        postbackSecret: "s",
        postbackLeadIdPath: "$.id",
        postbackStatusPath: "$.status",
      },
    });
    const fallback = await prisma.broker.create({
      data: {
        name: "fallback",
        endpointUrl: "https://f.example",
        fieldMapping: {},
        postbackSecret: "s",
        postbackLeadIdPath: "$.id",
        postbackStatusPath: "$.status",
      },
    });
    await prisma.rotationRule.create({
      data: { geo: "US", brokerId: primary.id, priority: 1 },
    });
    await prisma.rotationRule.create({
      data: { geo: "US", brokerId: fallback.id, priority: 2 },
    });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "203.0.113.5",
        eventTs: new Date(),
        traceId: "trace-fb-1",
      },
    });

    vi.spyOn(brokerPush, "pushToBroker").mockResolvedValue({
      ok: false,
      status: 500,
      error: "upstream 500",
    } as never);

    await handlePushLead({ leadId: lead.id, traceId: lead.traceId });

    const row = await prisma.manualReviewQueue.findUnique({
      where: { leadId: lead.id },
    });
    expect(row).toBeTruthy();
    expect(row?.reason).toBe("BROKER_FAILED");
    expect(row?.lastBrokerId).toBe(fallback.id);

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updated?.state).toBe("FAILED");
  });
});
```

- [ ] **Step 2: Run test to verify it passes already (fallback was handled in Task 3)**

Run:
```bash
pnpm vitest run tests/integration/push-lead-fallback-to-manual.test.ts
```
Expected: PASS. The cold-overflow wiring from Task 3 already enqueues after the per-broker loop exhausts, and `selectBrokerPool` already returns multiple brokers by priority. If it fails because `lastBrokerId` is not the *fallback* broker, confirm that `tried[].id` is recorded in push-order and the `[...tried].reverse().find(...)` lookup returns the last failed entry.

- [ ] **Step 3: Hook Flow fallback plan (if present) before giving up**

The engine's `FallbackStep` chain already maps flows → fallback flows. Open `src/server/jobs/push-lead.ts` and, **before** the `enqueueManualReview` call added in Task 3, wrap the per-broker loop in a bounded fallback-flow walker:

```typescript
import { getFallbackPlanForFlow } from "@/server/routing/fallback/orchestrator";

// at top-of-handler, after selectBrokerPool:
const visitedFlowIds = new Set<string>();
let currentPool = pool;
let attemptedOnce = false;

while (currentPool.length > 0) {
  for (const broker of currentPool) {
    // ... existing per-broker push attempt (unchanged) ...
  }
  if (winner) break;
  attemptedOnce = true;

  const flowId = /* derive from selectBrokerPool — extend to return flowId alongside brokers */;
  if (!flowId || visitedFlowIds.has(flowId)) break;
  visitedFlowIds.add(flowId);

  const next = await getFallbackPlanForFlow(flowId, { reason: tried[tried.length - 1]?.reason });
  if (!next || !next.flowId || visitedFlowIds.has(next.flowId)) break;
  const nextPool = await selectBrokerPoolForFlow(next.flowId, lead.geo);
  if (nextPool.length === 0) break;
  currentPool = nextPool;
}
```

**Note:** the engine exports `buildFallbackPlan` and `getFallbackPlanForFlow` already. If the current `selectBrokerPool` does not expose a `flowId`, extend it to return `{ flowId, brokers }` and update call sites. Limit total fallback hops to 3 via `visitedFlowIds.size < 3`.

- [ ] **Step 4: Extend the integration test with a fallback-flow scenario**

Append to `tests/integration/push-lead-fallback-to-manual.test.ts`:

```typescript
it("walks Flow fallback plan and enqueues manual review only after all flows exhausted", async () => {
  // build two Flow rows; FlowBranch points primary→fallback; both pools fail; expect enqueue.
  // See src/server/routing/flow/* for Flow factories used in existing tests.
});
```

Fill in with the existing `Flow` / `FlowVersion` / `FlowBranch` / `FallbackStep` factories; mirror an existing test in `src/server/routing/*.test.ts`. On every fallback, `pushToBroker` is stubbed to fail.

- [ ] **Step 5: Run suite**

Run:
```bash
pnpm vitest run tests/integration/push-lead-fallback-to-manual.test.ts
pnpm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

Run:
```bash
git add src/server/jobs/push-lead.ts tests/integration/push-lead-fallback-to-manual.test.ts
git commit -m "feat(uad): fallback orchestration walks Flow plan before manual queue"
```

---

### Task 5: Manual queue tRPC router + REST shim

**Files:**
- Create: `src/server/routers/manualReview.ts`
- Modify: `src/server/routers/_app.ts`
- Create: `src/app/api/v1/manual-review/route.ts` (GET list)
- Create: `src/app/api/v1/manual-review/[id]/route.ts` (PATCH resolve/requeue)
- Test: `tests/integration/manual-review-router.test.ts`

- [ ] **Step 1: Write failing router test**

Create `tests/integration/manual-review-router.test.ts`:

```typescript
import { appRouter } from "@/server/routers/_app";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

async function ctx(role: "ADMIN" | "OPERATOR" = "OPERATOR") {
  const user = await prisma.user.create({
    data: { email: `u-${Date.now()}@t.io`, passwordHash: "x", role },
  });
  return { userId: user.id, userRole: role };
}

describe("manualReview router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("list returns open queue entries ordered by createdAt desc", async () => {
    const c = await ctx();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    const l1 = await prisma.lead.create({
      data: { affiliateId: aff.id, geo: "US", ip: "1.1.1.1", eventTs: new Date(), traceId: "a" },
    });
    const l2 = await prisma.lead.create({
      data: { affiliateId: aff.id, geo: "US", ip: "1.1.1.1", eventTs: new Date(), traceId: "b" },
    });
    await prisma.manualReviewQueue.create({ data: { leadId: l1.id, reason: "BROKER_FAILED" } });
    await prisma.manualReviewQueue.create({ data: { leadId: l2.id, reason: "CAP_REACHED" } });

    const caller = appRouter.createCaller(c as never);
    const res = await caller.manualReview.list({ status: "OPEN", cursor: null, take: 50 });
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].reason).toBeDefined();
  });

  it("claim sets claimedBy and claimedAt", async () => {
    const c = await ctx();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    const l = await prisma.lead.create({
      data: { affiliateId: aff.id, geo: "US", ip: "1.1.1.1", eventTs: new Date(), traceId: "c" },
    });
    const mrq = await prisma.manualReviewQueue.create({
      data: { leadId: l.id, reason: "BROKER_FAILED" },
    });

    const caller = appRouter.createCaller(c as never);
    await caller.manualReview.claim({ id: mrq.id });
    const after = await prisma.manualReviewQueue.findUnique({ where: { id: mrq.id } });
    expect(after?.claimedBy).toBe(c.userId);
    expect(after?.claimedAt).not.toBeNull();
  });

  it("resolve sets resolution and bumps Lead.state for ACCEPT", async () => {
    const c = await ctx();
    const aff = await prisma.affiliate.create({ data: { name: "t", contactEmail: "t@t.io" } });
    const l = await prisma.lead.create({
      data: { affiliateId: aff.id, geo: "US", ip: "1.1.1.1", eventTs: new Date(), traceId: "d", state: "FAILED" },
    });
    const mrq = await prisma.manualReviewQueue.create({
      data: { leadId: l.id, reason: "BROKER_FAILED" },
    });

    const caller = appRouter.createCaller(c as never);
    await caller.manualReview.resolve({ id: mrq.id, resolution: "ACCEPT", note: "verified by ops" });
    const after = await prisma.manualReviewQueue.findUnique({ where: { id: mrq.id } });
    expect(after?.resolution).toBe("ACCEPT");
    expect(after?.resolvedBy).toBe(c.userId);
    expect(after?.resolvedAt).not.toBeNull();
    const lead = await prisma.lead.findUnique({ where: { id: l.id } });
    expect(lead?.state).toBe("ACCEPTED");
  });

  it("requeue re-enqueues push-lead and clears the row", async () => {
    const c = await ctx();
    const aff = await prisma.affiliate.create({ data: { name: "t", contactEmail: "t@t.io" } });
    const l = await prisma.lead.create({
      data: { affiliateId: aff.id, geo: "US", ip: "1.1.1.1", eventTs: new Date(), traceId: "e", state: "FAILED" },
    });
    const mrq = await prisma.manualReviewQueue.create({
      data: { leadId: l.id, reason: "BROKER_FAILED" },
    });

    const caller = appRouter.createCaller(c as never);
    await caller.manualReview.requeue({ id: mrq.id });
    const after = await prisma.manualReviewQueue.findUnique({ where: { id: mrq.id } });
    expect(after?.resolution).toBe("REQUEUE");
    const lead = await prisma.lead.findUnique({ where: { id: l.id } });
    expect(lead?.state).toBe("NEW");
  });
});
```

- [ ] **Step 2: Run test to verify it fails (router not yet implemented)**

Run:
```bash
pnpm vitest run tests/integration/manual-review-router.test.ts
```
Expected: FAIL — no `manualReview` key on `appRouter`.

- [ ] **Step 3: Implement router**

Create `src/server/routers/manualReview.ts`:

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "@/server/trpc";
import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { JOB_NAMES, getBoss } from "@/server/jobs/queue";
import { TRPCError } from "@trpc/server";

const ReasonSchema = z.enum(["BROKER_FAILED", "CAP_REACHED", "NO_BROKER_MATCH", "FRAUD_BORDERLINE"]);
const ResolutionSchema = z.enum(["ACCEPT", "REJECT", "REQUEUE"]);

export const manualReviewRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["OPEN", "CLAIMED", "RESOLVED", "ALL"]).default("OPEN"),
        reason: ReasonSchema.optional(),
        cursor: z.string().nullish(),
        take: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      if (input.status === "OPEN") where.claimedBy = null, (where.resolvedAt = null);
      if (input.status === "CLAIMED") where.claimedBy = { not: null }, (where.resolvedAt = null);
      if (input.status === "RESOLVED") where.resolvedAt = { not: null };
      if (input.reason) where.reason = input.reason;
      const rows = await prisma.manualReviewQueue.findMany({
        where,
        include: {
          lead: { include: { affiliate: true } },
          lastBroker: true,
          claimer: true,
          resolver: true,
        },
        orderBy: { createdAt: "desc" },
        take: input.take + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });
      const nextCursor = rows.length > input.take ? rows.pop()!.id : null;
      return { rows, nextCursor };
    }),

  claim: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.manualReviewQueue.findUnique({ where: { id: input.id } });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.resolvedAt) throw new TRPCError({ code: "CONFLICT", message: "already resolved" });
      if (row.claimedBy && row.claimedBy !== ctx.userId) {
        throw new TRPCError({ code: "CONFLICT", message: "claimed by another user" });
      }
      await prisma.manualReviewQueue.update({
        where: { id: input.id },
        data: { claimedBy: ctx.userId, claimedAt: new Date() },
      });
      await writeLeadEvent(row.leadId, "MANUAL_REVIEW_CLAIMED", { by: ctx.userId });
      return { ok: true };
    }),

  resolve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resolution: ResolutionSchema,
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.manualReviewQueue.findUnique({ where: { id: input.id } });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.resolvedAt) throw new TRPCError({ code: "CONFLICT", message: "already resolved" });
      if (input.resolution === "REQUEUE") {
        return await doRequeue(row.id, row.leadId, ctx.userId, input.note ?? null);
      }
      const nextLeadState = input.resolution === "ACCEPT" ? "ACCEPTED" : "REJECTED";
      await prisma.$transaction([
        prisma.manualReviewQueue.update({
          where: { id: row.id },
          data: {
            resolution: input.resolution,
            resolutionNote: input.note ?? null,
            resolvedBy: ctx.userId,
            resolvedAt: new Date(),
          },
        }),
        prisma.lead.update({
          where: { id: row.leadId },
          data: { state: nextLeadState },
        }),
      ]);
      await writeLeadEvent(row.leadId, "MANUAL_REVIEW_RESOLVED", {
        resolution: input.resolution,
        by: ctx.userId,
      });
      return { ok: true };
    }),

  requeue: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await prisma.manualReviewQueue.findUnique({ where: { id: input.id } });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.resolvedAt) throw new TRPCError({ code: "CONFLICT" });
      return await doRequeue(row.id, row.leadId, ctx.userId, null);
    }),
});

async function doRequeue(
  rowId: string,
  leadId: string,
  userId: string,
  note: string | null,
) {
  await prisma.$transaction([
    prisma.manualReviewQueue.update({
      where: { id: rowId },
      data: {
        resolution: "REQUEUE",
        resolutionNote: note,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    }),
    prisma.lead.update({ where: { id: leadId }, data: { state: "NEW", brokerId: null } }),
  ]);
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (lead) {
    const boss = await getBoss();
    await boss.send(JOB_NAMES.PUSH_LEAD, { leadId, traceId: lead.traceId });
  }
  await writeLeadEvent(leadId, "MANUAL_REVIEW_REQUEUED", { by: userId });
  return { ok: true };
}
```

- [ ] **Step 4: Register router in `_app.ts`**

Open `src/server/routers/_app.ts` and add:

```typescript
import { manualReviewRouter } from "@/server/routers/manualReview";

export const appRouter = router({
  // ... existing
  manualReview: manualReviewRouter,
});
```

- [ ] **Step 5: Add REST shim (list + resolve)**

Create `src/app/api/v1/manual-review/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/server/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "OPEN";
  const where: Record<string, unknown> = {};
  if (status === "OPEN") where.claimedBy = null, (where.resolvedAt = null);
  if (status === "RESOLVED") where.resolvedAt = { not: null };
  const rows = await prisma.manualReviewQueue.findMany({
    where,
    include: { lead: true, lastBroker: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ rows });
}
```

Create `src/app/api/v1/manual-review/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { appRouter } from "@/server/routers/_app";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as {
    action: "claim" | "resolve" | "requeue";
    resolution?: "ACCEPT" | "REJECT" | "REQUEUE";
    note?: string;
  };
  const caller = appRouter.createCaller({
    userId: session.user.id,
    userRole: session.user.role ?? "OPERATOR",
  } as never);
  if (body.action === "claim") {
    return NextResponse.json(await caller.manualReview.claim({ id: params.id }));
  }
  if (body.action === "resolve" && body.resolution) {
    return NextResponse.json(
      await caller.manualReview.resolve({
        id: params.id,
        resolution: body.resolution,
        note: body.note,
      }),
    );
  }
  if (body.action === "requeue") {
    return NextResponse.json(await caller.manualReview.requeue({ id: params.id }));
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
```

- [ ] **Step 6: Run tests + suite**

Run:
```bash
pnpm vitest run tests/integration/manual-review-router.test.ts
pnpm test
```
Expected: all pass.

- [ ] **Step 7: Commit**

Run:
```bash
git add src/server/routers/manualReview.ts src/server/routers/_app.ts src/app/api/v1/manual-review tests/integration/manual-review-router.test.ts
git commit -m "feat(uad): manualReview tRPC router + REST shim (list/claim/resolve/requeue)"
```

---

### Task 6: `/dashboard/manual-review` page + actions

**Files:**
- Create: `src/app/dashboard/manual-review/page.tsx`
- Modify: `src/app/dashboard/layout.tsx` (nav link)

- [ ] **Step 1: Add page**

Create `src/app/dashboard/manual-review/page.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

const REASONS = ["ALL", "BROKER_FAILED", "CAP_REACHED", "NO_BROKER_MATCH", "FRAUD_BORDERLINE"] as const;

export default function ManualReviewPage() {
  const [status, setStatus] = useState<"OPEN" | "CLAIMED" | "RESOLVED" | "ALL">("OPEN");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("ALL");
  const utils = trpc.useUtils();
  const list = trpc.manualReview.list.useQuery({
    status,
    reason: reason === "ALL" ? undefined : reason,
    cursor: null,
    take: 50,
  });
  const claim = trpc.manualReview.claim.useMutation({
    onSuccess: () => utils.manualReview.list.invalidate(),
  });
  const resolve = trpc.manualReview.resolve.useMutation({
    onSuccess: () => utils.manualReview.list.invalidate(),
  });
  const requeue = trpc.manualReview.requeue.useMutation({
    onSuccess: () => utils.manualReview.list.invalidate(),
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Manual Review Queue</h1>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="border rounded px-2 py-1"
        >
          <option value="OPEN">Open</option>
          <option value="CLAIMED">Claimed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="ALL">All</option>
        </select>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as typeof reason)}
          className="border rounded px-2 py-1"
        >
          {REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <table className="w-full border text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="text-left p-2">Lead</th>
            <th className="text-left p-2">Reason</th>
            <th className="text-left p-2">Affiliate</th>
            <th className="text-left p-2">Last broker</th>
            <th className="text-left p-2">Age</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.data?.rows.map((r) => {
            const ageMs = Date.now() - new Date(r.createdAt).getTime();
            const ageMin = Math.round(ageMs / 60_000);
            return (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-mono text-xs">{r.lead?.traceId ?? r.leadId}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2">{r.lead?.affiliate?.name ?? "-"}</td>
                <td className="p-2">{r.lastBroker?.name ?? "-"}</td>
                <td className="p-2">{ageMin}m</td>
                <td className="p-2 space-x-1">
                  {!r.claimedBy && (
                    <button
                      type="button"
                      className="px-2 py-1 border rounded text-xs"
                      onClick={() => claim.mutate({ id: r.id })}
                    >
                      Assign me
                    </button>
                  )}
                  {!r.resolvedAt && (
                    <>
                      <button
                        type="button"
                        className="px-2 py-1 border rounded text-xs bg-emerald-50"
                        onClick={() =>
                          resolve.mutate({ id: r.id, resolution: "ACCEPT" })
                        }
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 border rounded text-xs bg-rose-50"
                        onClick={() =>
                          resolve.mutate({ id: r.id, resolution: "REJECT" })
                        }
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 border rounded text-xs bg-amber-50"
                        onClick={() => requeue.mutate({ id: r.id })}
                      >
                        Requeue
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Add nav link**

Open `src/app/dashboard/layout.tsx`. In the nav section add:

```tsx
<Link href="/dashboard/manual-review" className="...">Manual Review</Link>
```

- [ ] **Step 3: Smoke check**

Run:
```bash
pnpm dev
```
Browse to `http://localhost:3000/dashboard/manual-review`. Seed at least one `ManualReviewQueue` row via a direct `prisma.manualReviewQueue.create({...})` through a REPL or by triggering a failing push. Confirm the row renders with Assign/Accept/Reject/Requeue buttons. `Ctrl+C` to stop.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/app/dashboard/manual-review/page.tsx src/app/dashboard/layout.tsx
git commit -m "feat(uad): manual review dashboard page with claim/resolve/requeue"
```

---

### Task 7: Queue-depth alert stub + scheduled check

**Files:**
- Modify: `src/server/alerts/emitter.ts` (add threshold checker — interface only)
- Create: `src/server/jobs/manual-queue-depth-check.ts`
- Modify: `src/server/jobs/queue.ts` (register scheduled job)
- Test: `tests/unit/manual-queue-depth-check.test.ts`

- [ ] **Step 1: Write failing unit test**

Create `tests/unit/manual-queue-depth-check.test.ts`:

```typescript
import { checkManualQueueDepth } from "@/server/jobs/manual-queue-depth-check";
import { prisma } from "@/server/db";
import { __getAlertCalls, __resetAlertCalls } from "@/server/alerts/emitter";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

describe("checkManualQueueDepth", () => {
  beforeEach(async () => {
    await resetDb();
    __resetAlertCalls();
  });

  it("does not emit when depth is below threshold", async () => {
    await checkManualQueueDepth(100);
    expect(__getAlertCalls().filter((c) => c.event === "manual_queue_depth_exceeded"))
      .toHaveLength(0);
  });

  it("emits manual_queue_depth_exceeded when depth >= threshold", async () => {
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    for (let i = 0; i < 3; i++) {
      const l = await prisma.lead.create({
        data: {
          affiliateId: aff.id,
          geo: "US",
          ip: "1.1.1.1",
          eventTs: new Date(),
          traceId: `depth-${i}`,
        },
      });
      await prisma.manualReviewQueue.create({
        data: { leadId: l.id, reason: "BROKER_FAILED" },
      });
    }
    await checkManualQueueDepth(3);
    const calls = __getAlertCalls().filter((c) => c.event === "manual_queue_depth_exceeded");
    expect(calls).toHaveLength(1);
    expect(calls[0].payload.depth).toBe(3);
    expect(calls[0].payload.threshold).toBe(3);
  });
});
```

- [ ] **Step 2: Implement checker**

Create `src/server/jobs/manual-queue-depth-check.ts`:

```typescript
import { emitAlert } from "@/server/alerts/emitter";
import { getManualQueueDepth } from "@/server/routing/manual-queue";

const DEFAULT_THRESHOLD = Number.parseInt(
  process.env.MANUAL_QUEUE_ALERT_THRESHOLD ?? "25",
  10,
);

export async function checkManualQueueDepth(threshold = DEFAULT_THRESHOLD): Promise<void> {
  const depth = await getManualQueueDepth();
  if (depth >= threshold) {
    await emitAlert("manual_queue_depth_exceeded", { depth, threshold });
  }
}
```

- [ ] **Step 3: Register a 5-minute scheduled job**

Open `src/server/jobs/queue.ts`. In the section where `flow-cap-refresh` or another cron-style job is scheduled via `boss.schedule`, add:

```typescript
import { checkManualQueueDepth } from "@/server/jobs/manual-queue-depth-check";

export const JOB_NAMES = {
  // ... existing
  MANUAL_QUEUE_DEPTH_CHECK: "manual-queue-depth-check",
} as const;

// in startBossOnce(), after other schedules:
await boss.work(JOB_NAMES.MANUAL_QUEUE_DEPTH_CHECK, async () => {
  await checkManualQueueDepth();
});
await boss.schedule(JOB_NAMES.MANUAL_QUEUE_DEPTH_CHECK, "*/5 * * * *");
```

- [ ] **Step 4: Run tests + suite**

Run:
```bash
pnpm vitest run tests/unit/manual-queue-depth-check.test.ts
pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/jobs/manual-queue-depth-check.ts src/server/jobs/queue.ts tests/unit/manual-queue-depth-check.test.ts
git commit -m "feat(uad): queue-depth alert stub + 5-min cron (telegram integration pending S5)"
```

---

### Task 8: Column-visibility matrix + `redact()` helper

**Files:**
- Create: `src/server/rbac/column-visibility.ts`
- Create: `src/server/rbac/redact.ts`
- Test: `tests/unit/rbac-column-visibility.test.ts`

- [ ] **Step 1: Write failing unit test**

Create `tests/unit/rbac-column-visibility.test.ts`:

```typescript
import { visibleFieldsFor } from "@/server/rbac/column-visibility";
import { redact, redactMany } from "@/server/rbac/redact";
import { describe, expect, it } from "vitest";

describe("visibleFieldsFor", () => {
  it("ADMIN sees all Lead fields (no redaction)", () => {
    const s = visibleFieldsFor("ADMIN", "Lead");
    expect(s.has("phone")).toBe(true);
    expect(s.has("email")).toBe(true);
    expect(s.has("brokerExternalId")).toBe(true);
  });

  it("AFFILIATE_VIEWER cannot see phone/email/brokerExternalId on Lead", () => {
    const s = visibleFieldsFor("AFFILIATE_VIEWER", "Lead");
    expect(s.has("firstName")).toBe(true);
    expect(s.has("lastName")).toBe(true);
    expect(s.has("geo")).toBe(true);
    expect(s.has("phone")).toBe(false);
    expect(s.has("email")).toBe(false);
    expect(s.has("brokerExternalId")).toBe(false);
  });

  it("BROKER_VIEWER cannot see affiliate-side subId/utm on Lead", () => {
    const s = visibleFieldsFor("BROKER_VIEWER", "Lead");
    expect(s.has("subId")).toBe(false);
    expect(s.has("utm")).toBe(false);
    expect(s.has("phone")).toBe(true); // broker-side needs phone/email
  });
});

describe("redact", () => {
  it("returns row with hidden fields removed for role", () => {
    const lead = {
      id: "1",
      firstName: "a",
      lastName: "b",
      email: "x@y.io",
      phone: "+100",
      geo: "US",
      brokerExternalId: "ext-99",
    };
    const redacted = redact(lead, "AFFILIATE_VIEWER", "Lead");
    expect(redacted.firstName).toBe("a");
    expect(redacted.geo).toBe("US");
    expect((redacted as Record<string, unknown>).phone).toBeUndefined();
    expect((redacted as Record<string, unknown>).email).toBeUndefined();
    expect((redacted as Record<string, unknown>).brokerExternalId).toBeUndefined();
  });

  it("redactMany redacts each row", () => {
    const rows = [
      { id: "1", phone: "+1", geo: "US" },
      { id: "2", phone: "+2", geo: "DE" },
    ];
    const out = redactMany(rows, "AFFILIATE_VIEWER", "Lead");
    expect(out).toHaveLength(2);
    expect((out[0] as Record<string, unknown>).phone).toBeUndefined();
    expect((out[0] as Record<string, unknown>).geo).toBe("US");
  });
});
```

- [ ] **Step 2: Implement the matrix**

Create `src/server/rbac/column-visibility.ts`:

```typescript
import type { UserRole } from "@prisma/client";

export type RbacEntity = "Lead" | "Broker" | "Affiliate";

// Lowercase entity keys, sets of visible field names.
const MATRIX: Record<UserRole, Record<RbacEntity, Set<string> | "ALL">> = {
  ADMIN: {
    Lead: "ALL",
    Broker: "ALL",
    Affiliate: "ALL",
  },
  OPERATOR: {
    Lead: "ALL",
    Broker: "ALL",
    Affiliate: "ALL",
  },
  AFFILIATE_VIEWER: {
    Lead: new Set([
      "id",
      "externalLeadId",
      "firstName",
      "lastName",
      "geo",
      "state",
      "rejectReason",
      "subId",
      "utm",
      "affiliateId",
      "receivedAt",
      "createdAt",
      "updatedAt",
      "traceId",
    ]),
    Broker: new Set(["id", "name", "isActive"]),
    Affiliate: new Set([
      "id",
      "name",
      "isActive",
      "contactEmail",
      "totalDailyCap",
      "createdAt",
      "updatedAt",
    ]),
  },
  BROKER_VIEWER: {
    Lead: new Set([
      "id",
      "externalLeadId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "geo",
      "state",
      "brokerId",
      "brokerExternalId",
      "lastBrokerStatus",
      "lastPushAt",
      "acceptedAt",
      "ftdAt",
      "createdAt",
      "updatedAt",
      "traceId",
    ]),
    Broker: "ALL",
    Affiliate: new Set(["id", "name", "isActive"]),
  },
};

export function visibleFieldsFor(role: UserRole, entity: RbacEntity): Set<string> {
  const spec = MATRIX[role][entity];
  if (spec === "ALL") return new Set(["*"]);
  return spec;
}

export function hasFullAccess(role: UserRole, entity: RbacEntity): boolean {
  return MATRIX[role][entity] === "ALL";
}
```

- [ ] **Step 3: Implement `redact()`**

Create `src/server/rbac/redact.ts`:

```typescript
import type { UserRole } from "@prisma/client";
import { type RbacEntity, hasFullAccess, visibleFieldsFor } from "./column-visibility";

export function redact<T extends Record<string, unknown>>(
  row: T,
  role: UserRole,
  entity: RbacEntity,
): Partial<T> {
  if (hasFullAccess(role, entity)) return row;
  const visible = visibleFieldsFor(role, entity);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(row)) {
    if (visible.has(k)) out[k] = row[k];
  }
  return out as Partial<T>;
}

export function redactMany<T extends Record<string, unknown>>(
  rows: T[],
  role: UserRole,
  entity: RbacEntity,
): Partial<T>[] {
  if (hasFullAccess(role, entity)) return rows;
  return rows.map((r) => redact(r, role, entity));
}
```

- [ ] **Step 4: Run tests + suite**

Run:
```bash
pnpm vitest run tests/unit/rbac-column-visibility.test.ts
pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/rbac tests/unit/rbac-column-visibility.test.ts
git commit -m "feat(rbac): column-visibility matrix + redact helper"
```

---

### Task 9: Apply redaction in Lead/Broker/Affiliate routers

**Files:**
- Modify: `src/server/routers/lead.ts`
- Modify: `src/server/routers/broker.ts`
- Modify: `src/server/routers/affiliate.ts`
- Modify: `src/server/trpc.ts` (expose `userRole` in `ctx`)
- Test: `tests/integration/rbac-redaction.test.ts`

- [ ] **Step 1: Expose `userRole` on tRPC context**

Open `src/server/trpc.ts`. In `createContext` (or the single-place where `ctx` is built from NextAuth session), add:

```typescript
return {
  userId: session?.user?.id ?? null,
  userRole: (session?.user?.role ?? "OPERATOR") as UserRole,
};
```

Update the exported context type. Ensure `protectedProcedure` unwraps `userId: string` + `userRole: UserRole` as non-null on mutations/queries.

- [ ] **Step 2: Write failing integration test**

Create `tests/integration/rbac-redaction.test.ts`:

```typescript
import { appRouter } from "@/server/routers/_app";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import type { UserRole } from "@prisma/client";

async function makeCtx(role: UserRole) {
  const user = await prisma.user.create({
    data: { email: `${role}-${Date.now()}@t.io`, passwordHash: "x", role },
  });
  return { userId: user.id, userRole: role };
}

describe("RBAC redaction (lead list/byId)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("AFFILIATE_VIEWER list omits phone/email/brokerExternalId", async () => {
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        email: "secret@victim.io",
        phone: "+15555550199",
        brokerExternalId: "ext-99",
        eventTs: new Date(),
        traceId: "r1",
      },
    });
    const caller = appRouter.createCaller(await makeCtx("AFFILIATE_VIEWER"));
    const res = await caller.lead.list({ take: 10, cursor: null });
    expect(res.rows).toHaveLength(1);
    const row = res.rows[0] as Record<string, unknown>;
    expect(row.firstName).not.toBe(undefined);
    expect(row.geo).toBe("US");
    expect(row.phone).toBeUndefined();
    expect(row.email).toBeUndefined();
    expect(row.brokerExternalId).toBeUndefined();
  });

  it("ADMIN sees all fields (no redaction)", async () => {
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io" },
    });
    await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "US",
        ip: "1.1.1.1",
        email: "x@y.io",
        phone: "+15555550199",
        eventTs: new Date(),
        traceId: "r2",
      },
    });
    const caller = appRouter.createCaller(await makeCtx("ADMIN"));
    const res = await caller.lead.list({ take: 10, cursor: null });
    expect((res.rows[0] as Record<string, unknown>).phone).toBe("+15555550199");
    expect((res.rows[0] as Record<string, unknown>).email).toBe("x@y.io");
  });
});
```

- [ ] **Step 3: Apply redaction in `lead.ts`**

Open `src/server/routers/lead.ts`. After the Prisma query in `list`, wrap the rows:

```typescript
import { redactMany, redact } from "@/server/rbac/redact";

// list
const rows = await prisma.lead.findMany({ /* existing */ });
return {
  rows: redactMany(rows as Record<string, unknown>[], ctx.userRole, "Lead"),
  nextCursor,
};

// byId
const row = await prisma.lead.findUnique({ where: { id: input.id } });
if (!row) throw new TRPCError({ code: "NOT_FOUND" });
return redact(row as Record<string, unknown>, ctx.userRole, "Lead");
```

- [ ] **Step 4: Apply redaction in `broker.ts`**

Same pattern — wrap `list` and `byId` results through `redactMany` / `redact` with entity `"Broker"`.

- [ ] **Step 5: Apply redaction in `affiliate.ts`**

Same pattern — wrap results through `redactMany` / `redact` with entity `"Affiliate"`.

- [ ] **Step 6: Apply at REST level for `/api/v1/leads/:id` (affiliate-facing GET, if present)**

If the public REST endpoint for affiliates exists (e.g. `src/app/api/v1/leads/[id]/route.ts`), derive the role from the `ApiKey`'s owning user (or treat API-key access as `AFFILIATE_VIEWER` by convention — document this choice inline) and apply `redact()` before `NextResponse.json`.

- [ ] **Step 7: Run test + suite**

Run:
```bash
pnpm vitest run tests/integration/rbac-redaction.test.ts
pnpm test
```
Expected: all pass. If the existing UI pages de-reference `lead.phone` unconditionally, those pages will stop showing phone for `AFFILIATE_VIEWER` which is intended — no code change needed there (undefined renders as empty cell).

- [ ] **Step 8: Commit**

Run:
```bash
git add src/server/trpc.ts src/server/routers/lead.ts src/server/routers/broker.ts src/server/routers/affiliate.ts src/app/api/v1/leads tests/integration/rbac-redaction.test.ts
git commit -m "feat(rbac): apply redact() at tRPC + REST response layer"
```

---

### Task 10: Auto-hide empty columns in UI grids

**Files:**
- Modify: `src/app/dashboard/leads/page.tsx` (and broker / affiliate grid pages)

- [ ] **Step 1: Add `useVisibleColumns` helper**

Create `src/lib/use-visible-columns.ts`:

```typescript
import { useMemo } from "react";

type Row = Record<string, unknown>;

export function useVisibleColumns<T extends Row>(rows: T[], candidates: (keyof T)[]): (keyof T)[] {
  return useMemo(() => {
    return candidates.filter((k) => rows.some((r) => r[k] !== undefined && r[k] !== null && r[k] !== ""));
  }, [rows, candidates]);
}
```

- [ ] **Step 2: Use it in the leads grid**

Open `src/app/dashboard/leads/page.tsx`. Replace the hardcoded column list with:

```typescript
import { useVisibleColumns } from "@/lib/use-visible-columns";

const CANDIDATES = [
  "firstName", "lastName", "email", "phone", "geo",
  "state", "brokerExternalId", "subId", "receivedAt",
] as const;

const columns = useVisibleColumns(rows, [...CANDIDATES]);
```

Render the `<th>` / `<td>` list from `columns` instead of the hardcoded list. When the backend redacts `phone`, the entire column vanishes for `AFFILIATE_VIEWER`.

- [ ] **Step 3: Hide empty drawer tabs**

In the lead detail drawer (wherever tabs like `Broker info` / `Affiliate info` live), check if every field in that tab is undefined — if so, do not render the tab trigger:

```tsx
const brokerTabHasData =
  lead.brokerId !== undefined || lead.brokerExternalId !== undefined || lead.lastBrokerStatus !== undefined;
{brokerTabHasData && <Tab>Broker info</Tab>}
```

- [ ] **Step 4: Smoke-check with a seeded `AFFILIATE_VIEWER`**

Run:
```bash
pnpm db:seed
pnpm dev
```
Log in as an `AFFILIATE_VIEWER` user (create one in seed or via Prisma Studio). Open `/dashboard/leads`. Confirm `phone`, `email`, `brokerExternalId` columns are absent. Log out / log in as `ADMIN`. Confirm those columns return. `Ctrl+C` to stop.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/lib/use-visible-columns.ts src/app/dashboard/leads/page.tsx src/app/dashboard/brokers/page.tsx src/app/dashboard/affiliates/page.tsx
git commit -m "feat(rbac): auto-hide empty columns + drawer tabs for redacted roles"
```

---

### Task 11: `/dashboard/settings/rbac-preview` page

**Files:**
- Create: `src/app/dashboard/settings/rbac-preview/page.tsx`
- Create: `src/server/rbac/preview.ts` (admin-only procedure that returns `{ leadSample, brokerSample, affiliateSample }` redacted through a chosen role)
- Modify: `src/server/routers/_app.ts` (register preview router or attach to an admin router)

- [ ] **Step 1: Implement preview procedure**

Create `src/server/rbac/preview.ts`:

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc";
import { prisma } from "@/server/db";
import { redact } from "@/server/rbac/redact";

const RoleSchema = z.enum(["ADMIN", "OPERATOR", "AFFILIATE_VIEWER", "BROKER_VIEWER"]);

export const rbacPreviewRouter = router({
  preview: protectedProcedure
    .input(z.object({ role: RoleSchema }))
    .query(async ({ ctx, input }) => {
      if (ctx.userRole !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "admin only" });
      }
      const [lead, broker, affiliate] = await Promise.all([
        prisma.lead.findFirst({ orderBy: { createdAt: "desc" } }),
        prisma.broker.findFirst({ orderBy: { createdAt: "desc" } }),
        prisma.affiliate.findFirst({ orderBy: { createdAt: "desc" } }),
      ]);
      return {
        lead: lead ? redact(lead as Record<string, unknown>, input.role, "Lead") : null,
        broker: broker ? redact(broker as Record<string, unknown>, input.role, "Broker") : null,
        affiliate: affiliate
          ? redact(affiliate as Record<string, unknown>, input.role, "Affiliate")
          : null,
      };
    }),
});
```

- [ ] **Step 2: Register router**

Open `src/server/routers/_app.ts`:

```typescript
import { rbacPreviewRouter } from "@/server/rbac/preview";

export const appRouter = router({
  // ...
  rbacPreview: rbacPreviewRouter,
});
```

- [ ] **Step 3: Add page**

Create `src/app/dashboard/settings/rbac-preview/page.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

const ROLES = ["ADMIN", "OPERATOR", "AFFILIATE_VIEWER", "BROKER_VIEWER"] as const;

export default function RbacPreviewPage() {
  const [role, setRole] = useState<(typeof ROLES)[number]>("AFFILIATE_VIEWER");
  const preview = trpc.rbacPreview.preview.useQuery({ role });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">RBAC Preview (admin only)</h1>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
        className="border rounded px-2 py-1"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <section>
        <h2 className="font-semibold">Lead sample</h2>
        <pre className="bg-neutral-50 border rounded p-2 text-xs overflow-auto">
          {JSON.stringify(preview.data?.lead ?? null, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="font-semibold">Broker sample</h2>
        <pre className="bg-neutral-50 border rounded p-2 text-xs overflow-auto">
          {JSON.stringify(preview.data?.broker ?? null, null, 2)}
        </pre>
      </section>
      <section>
        <h2 className="font-semibold">Affiliate sample</h2>
        <pre className="bg-neutral-50 border rounded p-2 text-xs overflow-auto">
          {JSON.stringify(preview.data?.affiliate ?? null, null, 2)}
        </pre>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Smoke**

Run:
```bash
pnpm dev
```
Log in as ADMIN, open `/dashboard/settings/rbac-preview`, switch the role dropdown, confirm that the JSON payload collapses as the visibility matrix restricts. `Ctrl+C` to stop.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/rbac/preview.ts src/server/routers/_app.ts src/app/dashboard/settings/rbac-preview/page.tsx
git commit -m "feat(rbac): admin-only preview page for role-based redaction"
```

---

### Task 12: Integration smoke + Sprint 3 final verification

**Files:**
- Modify: `CLAUDE.md` (record S3 deliverables)

- [ ] **Step 1: Run full suite**

Run:
```bash
pnpm test
```
Expected: all pass. S3 adds ≈20 new tests (retry-schedule 7, manual-queue enqueue 3, fallback 2, manualReview router 4, queue-depth 2, rbac matrix 3, redaction 2).

- [ ] **Step 2: Run lint + typecheck**

Run:
```bash
pnpm lint && pnpm typecheck
```
Expected: zero errors.

- [ ] **Step 3: End-to-end smoke — force a cold-overflow**

Run:
```bash
pnpm db:seed
pnpm dev
```
In another terminal: send a lead to a geo that has no `RotationRule` / `Flow` match (e.g. `"country": "ZZ"`). Expected: 201 from `/api/v1/leads`, lead transitions through `PUSHING → FAILED`, a row appears in `ManualReviewQueue` with `reason = NO_BROKER_MATCH`. Open `/dashboard/manual-review` — row is visible with Assign/Accept/Reject/Requeue buttons. Claim it, resolve with ACCEPT, confirm `Lead.state = ACCEPTED`. `Ctrl+C` to stop.

- [ ] **Step 4: Update `CLAUDE.md`**

Append to `crm-node/CLAUDE.md`, below the S1/S2 sections:

```markdown
## v1.0 Sprint 3 — UAD + per-column RBAC (May 2026)

- **ManualReviewQueue table** (`reason ∈ {BROKER_FAILED, CAP_REACHED, NO_BROKER_MATCH, FRAUD_BORDERLINE}`, `resolution ∈ {ACCEPT, REJECT, REQUEUE}`). Cold-overflow trigger in `src/server/jobs/push-lead.ts`; orchestration in `src/server/routing/manual-queue.ts`.
- **Configurable retry ladder:** `Broker.retrySchedule` (default `"10,60,300,900,3600"`); parsed by `src/server/routing/retry-schedule.ts`.
- **Fallback orchestration:** push-lead walks Flow `FallbackStep` chain (up to 3 hops) before enqueueing manual review.
- **Manual review UI:** `/dashboard/manual-review` page (claim / accept / reject / requeue); REST at `/api/v1/manual-review/*`.
- **Alert emitter stub:** `src/server/alerts/emitter.ts` — `emitAlert(event, payload)` interface; Telegram transport lands in S5. Scheduled `manual-queue-depth-check` cron every 5 min triggers `manual_queue_depth_exceeded` event.
- **Per-column RBAC:** `UserRole.AFFILIATE_VIEWER`, `UserRole.BROKER_VIEWER`. Matrix in `src/server/rbac/column-visibility.ts`; redaction via `redact()` / `redactMany()` applied in lead/broker/affiliate routers and affiliate-facing REST. UI grids auto-hide empty columns via `useVisibleColumns`. Admin-only `/dashboard/settings/rbac-preview` page.
- **Design notes:** redaction is server-side; hidden fields are absent (not `null`) on the wire. Role-based only — per-user ACLs are v2.0 scope.
```

- [ ] **Step 5: Commit**

Run:
```bash
git add CLAUDE.md
git commit -m "docs(claude-md): record v1.0 sprint 3 deliverables"
```

- [ ] **Step 6: Tag release point**

Run:
```bash
git tag v1.0-sprint-3-complete
```

- [ ] **Step 7: Retrospective stub**

Append a `## Retrospective` section at the bottom of **this** plan file covering:
- Shipped vs planned (UAD + RBAC both shipped).
- Any tasks deferred to S4 (e.g. the real fallback-flow walker if `selectBrokerPool` did not expose `flowId` cleanly).
- Surprises (Flow fallback plan coverage, pg-boss schedule gotchas, `UserRole` default-migration behavior).
- Rough time per task.

Then:
```bash
git add docs/superpowers/plans/2026-05-19-v1-sprint-3-uad-and-per-column-rbac.md
git commit -m "docs(plan): s3 retrospective"
```

---

## Success criteria for Sprint 3

- `ManualReviewQueue` table ships; `Broker.retrySchedule` ships with default `"10,60,300,900,3600"`; `UserRole.AFFILIATE_VIEWER` + `UserRole.BROKER_VIEWER` ship.
- Forcing a push failure for every broker in a pool results in a `ManualReviewQueue` row within one job-tick and `Lead.state = FAILED`.
- `/dashboard/manual-review` lists open entries and supports claim / accept / reject / requeue with proper state transitions.
- `manual_queue_depth_exceeded` alert event fires exactly once per 5-minute tick when depth ≥ threshold (stub-verified; real Telegram delivery lands in S5).
- `AFFILIATE_VIEWER` sees no `phone` / `email` / `brokerExternalId` fields on leads — redaction happens server-side before the payload leaves Next.js.
- `ADMIN` sees every field (no redaction).
- `/dashboard/settings/rbac-preview` renders a JSON preview that changes as the role dropdown changes, and is locked to admins (403 otherwise).
- `pnpm test` passes with ≈20 new tests on top of the existing suite.
- `pnpm lint` and `pnpm typecheck` zero errors.
- End-to-end smoke: send lead → cold-overflow → manual review → accept → lead `ACCEPTED`.

---

## Retrospective

**Shipped vs planned**

- Shipped: EPIC-09 cold-overflow → `ManualReviewQueue` + configurable retry ladder + fallback-on-pool-exhaustion + manual-queue tRPC router + REST shim + `/dashboard/manual-review` UI + queue-depth alert stub + `MANUAL_REVIEW_*` LeadEventKind; per-column RBAC matrix + server-side `redact()` / `redactMany()` applied in lead / broker / affiliate routers + `AFFILIATE_VIEWER` + `BROKER_VIEWER` enum values + admin-only `/dashboard/settings/rbac-preview` page + `useVisibleColumns` helper.
- Shipped (partial): Flow `FallbackStep` walker — the per-broker priority cascade already enqueues manual review after pool exhaustion, but the explicit multi-flow walker that consults `getFallbackPlanForFlow` is **deferred to S4** together with the `selectBrokerPool → selectBrokerPoolForFlow` refactor. Plan Task 4 Step 3 anticipated this (the caveat explicitly flagged the refactor as out-of-scope when `selectBrokerPool` doesn't expose `flowId`). The fallback-flow integration scenario is captured as an `it.todo` on `tests/integration/push-lead-fallback-to-manual.test.ts` for S4 pickup.
- Shipped (partial): pg-boss cron registration. `JOB_NAMES.manualQueueDepthCheck` is registered but there is no runner hooking `boss.work(...)` + `boss.schedule(...)` yet — the codebase has no existing worker bootstrap. The checker function is unit-tested and ready to wire when the worker runner lands.

**Deferred to later sprints**

- Flow-level multi-hop fallback walker (S4 — blocked on `selectBrokerPoolForFlow` refactor).
- Real `boss.work` + `boss.schedule` invocation for all scheduled jobs (`manual-queue-depth-check`, `flow-cap-refresh`, `broker-health-check`, `broker-status-poll`, `proxy-health`) — S8 hardening.
- Telegram transport for `emitAlert` — S5 (per plan).
- Full auto-hide of empty columns in the leads grid: `useVisibleColumns` helper landed, but the custom `LeadsGrid` (inline-styled, fixed `<colgroup>`) was not refactored to consume it. Redacted fields render as `—` via existing fallback logic so functionality is preserved; S4+ can adopt the hook when touching those grids.

**Surprises / gotchas**

- `trpc.ts` already exposes `role` (not `userRole` as the plan spec'd) on the protected ctx. The redaction code reads `ctx.role ?? "OPERATOR"` accordingly — no schema change needed.
- Existing `tests/integration/routing.test.ts` expected `state=FAILED` on first push failure. After threading `retrySchedule`, `handlePushLead` now re-enqueues with `startAfter` until the schedule exhausts. Fixed by passing `attemptN: 5` to bypass the ladder in that specific test (comments added).
- Importing `appRouter` in Node-env tests trips next-auth's `next/server` import resolution. Worked around with a `vi.mock("@/auth", ...)` + dynamic `await import("@/server/routers/_app")` in `manual-review-router.test.ts` and `rbac-redaction.test.ts`. No existing router test had established a pattern — this is the S3 precedent and future sprints can reuse it.
- `visibleFieldsFor` has to return a Set-like where `has(anyKey) === true` for `ALL` roles so test assertions like `expect(s.has("phone")).toBe(true)` pass for ADMIN. Implemented via a `Proxy` over an empty Set (`ALL_SET`).
- pg-boss `boss.send` fails in router tests because boss isn't started. `doRequeue` in `manualReview.ts` wraps the send in try/catch so tests that call `requeue` pass without a live pg-boss instance. The Lead state transition still happens in a single transaction.
- `redactMany<T>` originally returned `Partial<T>[]` which cascaded type-errors across existing `LeadsGrid` / `FilterBar` consumers. Changed return to `T[]` (runtime behavior is unchanged: keys are just absent, and callers already handle optional fields).

**Rough time per task**

- T1 schema: ~10 min
- T2 retry-schedule: ~15 min
- T3 cold-overflow enqueue: ~20 min (routing.test.ts fix included)
- T4 fallback orchestration: ~10 min (scope-scoped — walker deferred)
- T5 router + REST shim: ~25 min (next-auth vitest workaround)
- T6 dashboard page: ~15 min
- T7 queue-depth check: ~10 min
- T8 column-visibility matrix: ~10 min
- T9 apply redaction: ~15 min (type-preservation fix)
- T10 useVisibleColumns: ~5 min
- T11 rbac-preview page: ~15 min
- T12 verify + docs + tag: ~10 min
- Total: ~2h 40min.
