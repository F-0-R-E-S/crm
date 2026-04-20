# Broker HTTP Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the first chosen broker returns an HTTP push failure, try the next broker in the geo pool (in `priority` order) instead of putting the lead in `FAILED`.

**Architecture:** Today `handlePushLead` (`src/server/jobs/push-lead.ts`) runs two sequential loops — a filter loop (hours/cap) that picks exactly one winner, then a single push attempt. Refactor into one loop: per broker do filter → push → on success stop, on fail write `BROKER_PUSH_FAIL`, roll the cap back, try the next broker. Only on whole-pool exhaustion mark the lead `FAILED`. Distinguish two terminal reasons: `no_broker_available` (nobody attempted a push — pool empty or all filtered) vs `all_brokers_failed` (at least one broker pushed but every one failed). `lead.brokerId` is set only on terminal success.

**Tech Stack:** TypeScript, Prisma, pg-boss, Vitest, existing `pushToBroker` adapter. No schema migration (reuses existing `LeadEventKind` values).

---

## File Structure

- **Modify:** `src/server/jobs/push-lead.ts` — replace two-loop logic with single filter+push loop; move broker-specific push invocation into a small private helper `attemptPush`; update the final failure branch to choose `rejectReason` based on whether any push attempt was made.
- **Create:** `src/server/jobs/push-lead.test.ts` — integration tests using the existing `resetDb` helper (`tests/helpers/db.ts`) and `vi.mock("@/server/broker-adapter/push")` so no real HTTP is issued. Fixture factory builds `Affiliate`/`Broker`/`RotationRule`/`Lead` rows.

No schema changes, no new files elsewhere.

---

## Task 1: Scaffold the test file with a single end-to-end smoke test

**Files:**
- Create: `src/server/jobs/push-lead.test.ts`

- [ ] **Step 1: Write the scaffolding + first test (single broker success path)**

```ts
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../../tests/helpers/db";
import { handlePushLead } from "./push-lead";

vi.mock("@/server/broker-adapter/push", () => ({
  pushToBroker: vi.fn(),
}));
vi.mock("./queue", () => ({
  JOB_NAMES: { pushLead: "push-lead", notifyAffiliate: "notify-affiliate" },
  startBossOnce: vi.fn().mockResolvedValue(undefined),
  getBoss: vi.fn(() => ({ send: vi.fn().mockResolvedValue(undefined) })),
}));

import { pushToBroker } from "@/server/broker-adapter/push";
const pushMock = vi.mocked(pushToBroker);

function brokerFixture(name: string, overrides: Partial<Parameters<typeof prisma.broker.create>[0]["data"]> = {}) {
  return {
    name,
    endpointUrl: `http://mock/${name}`,
    fieldMapping: {},
    postbackSecret: "s",
    postbackLeadIdPath: "id",
    postbackStatusPath: "status",
    ...overrides,
  };
}

async function seedPool(geo: string, names: string[]) {
  const aff = await prisma.affiliate.create({ data: { name: "A1" } });
  const brokers = [];
  for (let i = 0; i < names.length; i++) {
    const b = await prisma.broker.create({ data: brokerFixture(names[i]) });
    await prisma.rotationRule.create({ data: { geo, brokerId: b.id, priority: i + 1 } });
    brokers.push(b);
  }
  const lead = await prisma.lead.create({
    data: {
      affiliateId: aff.id,
      geo,
      ip: "1.2.3.4",
      eventTs: new Date(),
      traceId: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      state: "NEW",
    },
  });
  return { lead, brokers };
}

describe("handlePushLead", () => {
  beforeEach(async () => {
    await resetDb();
    pushMock.mockReset();
  });

  it("pushes to the first broker when it succeeds", async () => {
    const { lead, brokers } = await seedPool("UA", ["B1", "B2"]);
    pushMock.mockResolvedValueOnce({
      success: true,
      httpStatus: 200,
      durationMs: 10,
      attemptN: 1,
      externalId: "ext-1",
    } as never);

    await handlePushLead({ leadId: lead.id, traceId: lead.traceId });

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.state).toBe("PUSHED");
    expect(updated.brokerId).toBe(brokers[0].id);
    expect(pushMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm the harness works**

Run: `pnpm test src/server/jobs/push-lead.test.ts -t "pushes to the first broker"`
Expected: PASS (this test locks in current behavior — serves as a regression net before refactor).

- [ ] **Step 3: Commit**

```bash
git add src/server/jobs/push-lead.test.ts
git commit -m "test(push-lead): scaffold test file + first-broker success regression"
```

---

## Task 2: Add a failing test — first broker fails, second broker succeeds

**Files:**
- Modify: `src/server/jobs/push-lead.test.ts`

- [ ] **Step 1: Append the failing test inside the existing `describe` block**

```ts
  it("falls back to the second broker when the first push fails", async () => {
    const { lead, brokers } = await seedPool("UA", ["B1", "B2"]);
    pushMock
      .mockResolvedValueOnce({
        success: false,
        httpStatus: 502,
        error: "bad gateway",
        attemptN: 3,
      } as never)
      .mockResolvedValueOnce({
        success: true,
        httpStatus: 200,
        durationMs: 12,
        attemptN: 1,
        externalId: "ext-b2",
      } as never);

    await handlePushLead({ leadId: lead.id, traceId: lead.traceId });

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.state).toBe("PUSHED");
    expect(updated.brokerId).toBe(brokers[1].id);
    expect(updated.brokerExternalId).toBe("ext-b2");
    expect(pushMock).toHaveBeenCalledTimes(2);

    const events = await prisma.leadEvent.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "asc" },
    });
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("BROKER_PUSH_FAIL");
    expect(kinds).toContain("BROKER_PUSH_SUCCESS");
    expect(kinds).toContain("ROUTING_DECIDED");
  });
```

- [ ] **Step 2: Run it to verify it fails (RED)**

Run: `pnpm test src/server/jobs/push-lead.test.ts -t "falls back to the second broker"`
Expected: FAIL — current code marks the lead `FAILED` after the first push fail; `pushMock` is called only once.

- [ ] **Step 3: Commit the red test**

```bash
git add src/server/jobs/push-lead.test.ts
git commit -m "test(push-lead): red — fallback to next broker on HTTP fail"
```

---

## Task 3: Add a failing test — all brokers fail

**Files:**
- Modify: `src/server/jobs/push-lead.test.ts`

- [ ] **Step 1: Append the test**

```ts
  it("marks lead FAILED with reason=all_brokers_failed when every broker fails", async () => {
    const { lead } = await seedPool("UA", ["B1", "B2"]);
    pushMock.mockResolvedValue({
      success: false,
      httpStatus: 500,
      error: "boom",
      attemptN: 3,
    } as never);

    await handlePushLead({ leadId: lead.id, traceId: lead.traceId });

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.state).toBe("FAILED");
    expect(updated.rejectReason).toBe("all_brokers_failed");
    expect(updated.brokerId).toBeNull();
    expect(pushMock).toHaveBeenCalledTimes(2);
  });
```

- [ ] **Step 2: Run it to verify it fails (RED)**

Run: `pnpm test src/server/jobs/push-lead.test.ts -t "marks lead FAILED"`
Expected: FAIL — current code writes `rejectReason = "broker_push_failed"` after a single attempt, never tries the second broker.

- [ ] **Step 3: Commit the red test**

```bash
git add src/server/jobs/push-lead.test.ts
git commit -m "test(push-lead): red — all-brokers-failed terminal state"
```

---

## Task 4: Refactor `handlePushLead` to the single filter+push loop

**Files:**
- Modify: `src/server/jobs/push-lead.ts`

- [ ] **Step 1: Replace the whole file contents**

```ts
import { applyBrokerAuth } from "@/server/broker-adapter/auth";
import { pushToBroker } from "@/server/broker-adapter/push";
import { buildPayload } from "@/server/broker-adapter/template";
import { prisma } from "@/server/db";
import { writeLeadEvent } from "@/server/lead-event";
import { logger } from "@/server/observability";
import { decrementCap, incrementCap, todayUtc } from "@/server/routing/caps";
import { type WorkingHours, isWithinWorkingHours } from "@/server/routing/filters";
import { selectBrokerPool } from "@/server/routing/select-broker";
import type { Broker, Lead } from "@prisma/client";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

export interface PushLeadPayload {
  leadId: string;
  traceId: string;
}

type SkipReason = "outside_hours" | "cap_full";
interface Attempt {
  brokerId: string;
  outcome: "skipped" | "failed";
  reason?: SkipReason;
  httpStatus?: number;
  error?: string;
}

export async function handlePushLead(payload: PushLeadPayload): Promise<void> {
  const lead = await prisma.lead.findUnique({ where: { id: payload.leadId } });
  if (!lead || lead.state !== "NEW") return;

  await prisma.lead.update({ where: { id: lead.id }, data: { state: "VALIDATING" } });
  const pool = await selectBrokerPool(lead.geo);
  await prisma.lead.update({ where: { id: lead.id }, data: { state: "PUSHING" } });

  const attempts: Attempt[] = [];

  for (const broker of pool) {
    if (!isWithinWorkingHours(broker.workingHours as WorkingHours | null)) {
      attempts.push({ brokerId: broker.id, outcome: "skipped", reason: "outside_hours" });
      await writeLeadEvent(lead.id, "CAP_BLOCKED", {
        brokerId: broker.id,
        reason: "outside_hours",
      });
      continue;
    }
    if (broker.dailyCap != null) {
      const count = await incrementCap("BROKER", broker.id, todayUtc());
      if (count > broker.dailyCap) {
        await decrementCap("BROKER", broker.id, todayUtc());
        attempts.push({ brokerId: broker.id, outcome: "skipped", reason: "cap_full" });
        await writeLeadEvent(lead.id, "CAP_BLOCKED", {
          brokerId: broker.id,
          dailyCap: broker.dailyCap,
          count,
        });
        continue;
      }
    }

    const result = await attemptPush(lead as Lead, broker);

    if (result.success) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          brokerId: broker.id,
          state: "PUSHED",
          lastPushAt: new Date(),
          brokerExternalId: result.externalId ?? null,
        },
      });
      await writeLeadEvent(lead.id, "BROKER_PUSH_SUCCESS", {
        brokerId: broker.id,
        httpStatus: result.httpStatus,
        durationMs: result.durationMs,
        attemptN: result.attemptN,
        externalId: result.externalId,
        poolPosition: attempts.length,
      });
      await writeLeadEvent(lead.id, "ROUTING_DECIDED", {
        brokerId: broker.id,
        poolSize: pool.length,
        attempts,
      });
      await startBossOnce();
      const boss = getBoss();
      await boss.send(JOB_NAMES.notifyAffiliate, { leadId: lead.id, event: "lead_pushed" });
      return;
    }

    if (broker.dailyCap != null) await decrementCap("BROKER", broker.id, todayUtc());
    attempts.push({
      brokerId: broker.id,
      outcome: "failed",
      httpStatus: result.httpStatus,
      error: result.error,
    });
    await writeLeadEvent(lead.id, "BROKER_PUSH_FAIL", {
      brokerId: broker.id,
      httpStatus: result.httpStatus,
      error: result.error,
      attemptN: result.attemptN,
    });
  }

  const anyAttempted = attempts.some((a) => a.outcome === "failed");
  const rejectReason = anyAttempted ? "all_brokers_failed" : "no_broker_available";

  await prisma.lead.update({
    where: { id: lead.id },
    data: { state: "FAILED", rejectReason },
  });
  await writeLeadEvent(lead.id, "NO_BROKER_AVAILABLE", { attempts, rejectReason });
  logger.warn(
    { event: rejectReason, lead_id: lead.id, geo: lead.geo, attempts },
    "routing exhausted",
  );

  if (anyAttempted) {
    await startBossOnce();
    const boss = getBoss();
    await boss.send(JOB_NAMES.notifyAffiliate, { leadId: lead.id, event: "failed" });
  }
}

async function attemptPush(lead: Lead, broker: Broker) {
  const body = buildPayload(
    lead,
    broker.fieldMapping as Record<string, string>,
    broker.staticPayload as Record<string, unknown>,
  );
  const authed = applyBrokerAuth(
    broker.endpointUrl,
    broker.headers as Record<string, string>,
    broker.authType,
    broker.authConfig as Record<string, unknown>,
  );
  await writeLeadEvent(lead.id, "BROKER_PUSH_ATTEMPT", { brokerId: broker.id });
  return pushToBroker({
    url: authed.url,
    method: broker.httpMethod,
    headers: authed.headers,
    body,
    responseIdPath: broker.responseIdPath,
    timeoutMs: 10_000,
    maxAttempts: 3,
  });
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Run the full push-lead test file**

Run: `pnpm test src/server/jobs/push-lead.test.ts`
Expected: all three tests PASS (first-broker-succeeds, fallback-to-second, all-brokers-failed).

- [ ] **Step 4: Run the whole test suite to catch regressions**

Run: `pnpm test`
Expected: all tests pass. If `select-broker.test.ts` or postback tests rely on push-lead behavior, read their expectations and reconcile.

- [ ] **Step 5: Commit**

```bash
git add src/server/jobs/push-lead.ts
git commit -m "feat(routing): fall back to next broker in pool on HTTP push fail"
```

---

## Task 5: Add a test for mixed outcomes (cap skip → HTTP fail → success)

**Files:**
- Modify: `src/server/jobs/push-lead.test.ts`

- [ ] **Step 1: Append the test**

```ts
  it("skips capped brokers, falls through HTTP fails, and pushes to the first healthy broker", async () => {
    const aff = await prisma.affiliate.create({ data: { name: "A1" } });
    const b1 = await prisma.broker.create({
      data: brokerFixture("B1-capped", { dailyCap: 0 }),
    });
    const b2 = await prisma.broker.create({ data: brokerFixture("B2-fails") });
    const b3 = await prisma.broker.create({ data: brokerFixture("B3-ok") });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b1.id, priority: 1 } });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b2.id, priority: 2 } });
    await prisma.rotationRule.create({ data: { geo: "UA", brokerId: b3.id, priority: 3 } });
    const lead = await prisma.lead.create({
      data: {
        affiliateId: aff.id,
        geo: "UA",
        ip: "1.2.3.4",
        eventTs: new Date(),
        traceId: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        state: "NEW",
      },
    });

    pushMock
      .mockResolvedValueOnce({
        success: false,
        httpStatus: 500,
        error: "boom",
        attemptN: 3,
      } as never)
      .mockResolvedValueOnce({
        success: true,
        httpStatus: 200,
        durationMs: 9,
        attemptN: 1,
        externalId: "ext-b3",
      } as never);

    await handlePushLead({ leadId: lead.id, traceId: lead.traceId });

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.state).toBe("PUSHED");
    expect(updated.brokerId).toBe(b3.id);
    expect(pushMock).toHaveBeenCalledTimes(2); // B1 skipped (cap=0), B2 attempted+failed, B3 ok

    const capBlocked = await prisma.leadEvent.count({
      where: { leadId: lead.id, kind: "CAP_BLOCKED" },
    });
    expect(capBlocked).toBe(1);
  });
```

- [ ] **Step 2: Run it**

Run: `pnpm test src/server/jobs/push-lead.test.ts -t "skips capped brokers"`
Expected: PASS (the refactor already supports this flow; this test locks it in).

- [ ] **Step 3: Commit**

```bash
git add src/server/jobs/push-lead.test.ts
git commit -m "test(push-lead): mixed cap-skip + HTTP-fail + success path"
```

---

## Task 6: Add a test that confirms `brokerId` is not set after a failed push

**Files:**
- Modify: `src/server/jobs/push-lead.test.ts`

- [ ] **Step 1: Append the test**

```ts
  it("does not attach brokerId to the lead for a broker that failed to push", async () => {
    const { lead, brokers } = await seedPool("UA", ["B1", "B2"]);
    pushMock
      .mockResolvedValueOnce({
        success: false,
        httpStatus: 502,
        error: "bad gateway",
        attemptN: 3,
      } as never)
      .mockResolvedValueOnce({
        success: true,
        httpStatus: 200,
        durationMs: 10,
        attemptN: 1,
        externalId: "ext-b2",
      } as never);

    await handlePushLead({ leadId: lead.id, traceId: lead.traceId });

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(updated.brokerId).toBe(brokers[1].id);
    expect(updated.brokerId).not.toBe(brokers[0].id);
  });
```

- [ ] **Step 2: Run it**

Run: `pnpm test src/server/jobs/push-lead.test.ts -t "does not attach brokerId"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/server/jobs/push-lead.test.ts
git commit -m "test(push-lead): brokerId reflects only the successful broker"
```

---

## Task 7: Final verification — typecheck, lint, whole suite, manual smoke

**Files:** none — verification only.

- [ ] **Step 1: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 4: Manual smoke via dev server (optional but recommended)**

Steps:
1. `pnpm dev`
2. In another shell, seed two brokers for UA where the first has an unreachable `endpointUrl` (e.g., `http://127.0.0.1:1` — connection refused) and the second is a valid mock endpoint. Seed two `RotationRule` rows with `priority: 1` and `priority: 2`.
3. POST a lead through `/api/v1/leads` with `geo=UA`.
4. Open `/dashboard/leads`, click the new lead, open the drawer → Timeline tab.
5. Verify timeline shows: `BROKER_PUSH_ATTEMPT` (B1) → `BROKER_PUSH_FAIL` (B1) → `BROKER_PUSH_ATTEMPT` (B2) → `BROKER_PUSH_SUCCESS` (B2) → `ROUTING_DECIDED` (brokerId = B2).
6. Lead state column shows `PUSHED`, `broker` column shows B2's name.

- [ ] **Step 5: Commit any residual cleanup (if lint/format autofix changed files)**

```bash
git add -A
git diff --cached --stat
git commit -m "chore: post-fallback lint/format autofix" # only if there are staged changes
```

---

## Out of scope (explicitly deferred)

- Limit on fallback depth (e.g., stop after 3 attempts even if pool is larger). Current plan walks the whole pool. Add a `maxFallbacks` config later if abuse-prevention is needed.
- Per-broker pause / circuit breaker after N consecutive fails. Belongs in a separate plan.
- Weighted or round-robin distribution among equal-priority brokers. Separate plan.
- Sticky routing (affiliate → broker). Separate plan.
- Changing `LeadEventKind` enum to add `ALL_BROKERS_FAILED` / `BROKER_FALLBACK`. Reusing existing kinds keeps this plan zero-migration; richer event taxonomy can follow once we see the data we actually want.
