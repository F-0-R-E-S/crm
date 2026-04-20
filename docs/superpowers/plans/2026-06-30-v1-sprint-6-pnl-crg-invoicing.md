# v1.0 Sprint 6 — P&L + CRG + Back-to-Back Invoicing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship EPIC-12 MVP — conversion-level revenue/payout tracking, a P&L service callable by dashboard and APIs, native CRG (Cost-per-Registration Guarantee) cohort settlement with shortfall calculation, and a back-to-back broker↔affiliate invoicing pipeline (single-currency USD, full-invoice, 1:1 linkage). Ship the three finance dashboard pages (`/dashboard/finance/pnl`, `/invoices`, `/crg-cohorts`) plus broker and affiliate payout-rule editors.

**Architecture:** Pure additive. New Prisma models (`Conversion`, `BrokerPayoutRule`, `AffiliatePayoutRule`, `CRGCohort`, `BrokerInvoice`, `AffiliateInvoice`) hang off existing `Lead`, `Broker`, `Affiliate`. The existing broker postback handler (`src/app/api/v1/postbacks/[brokerId]/route.ts`) gets a new emit step that writes a `Conversion` row on FTD / REDEPOSIT / REGISTRATION transitions — no behavioral change to the lead state machine. The P&L service is a pure TypeScript computation over `Conversion` × `BrokerPayoutRule` × `AffiliatePayoutRule` joined by broker/affiliate/period. The CRG cron closes cohorts older than 30 days and writes a shortfall figure when the FTD rate is below the guaranteed threshold. Invoice generation is a pair of deterministic builders callable from tRPC; linkage is set when `brokerInvoiceId` is matched on same broker × overlapping period.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), NextAuth v5, Vitest for tests, `Decimal.js` via Prisma's `Decimal` runtime for money math, `node-cron` already present in repo for scheduled jobs.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §4 Sprint 6.

**Design decisions (locked — do not revisit in this sprint):**
- All money fields `Decimal(12,2)`.
- Single currency `USD` for v1.0. The `currency` column exists but is enforced to `"USD"` at write time.
- Conversions ingested only via broker postbacks; manual entry is deferred to v1.5.
- Invoice linkage is 1:1 (one broker invoice → one affiliate invoice); many:many is v2.0.
- PDF export returns a structured JSON placeholder. Real PDF rendering is v2.0.
- No partial payments, no chargebacks — invoices are MVP full-invoice only.

**Preflight:**
- Sprint 5 (Telegram ops bot) merged to `main`; `git status` clean.
- Dev DB + Redis up (`pnpm db:up`).
- `pnpm install` run; Prisma client regenerated.
- Seeded broker + affiliate exist (for smoke at end of sprint).

---

### Task 1: Add Prisma models — Conversion, BrokerPayoutRule, AffiliatePayoutRule, CRGCohort, BrokerInvoice, AffiliateInvoice

**Files:**
- Modify: `prisma/schema.prisma`
- Test: none in this task (schema-only; behavior tested in later tasks)

- [ ] **Step 1: Add the `ConversionKind` enum**

Open `prisma/schema.prisma` and add near the other enums at the bottom of the file:

```prisma
enum ConversionKind {
  REGISTRATION
  FTD
  REDEPOSIT
}

enum PayoutRuleKind {
  CPA_FIXED
  CPA_CRG
  REV_SHARE
  HYBRID
}

enum CRGCohortStatus {
  PENDING
  MET
  SHORTFALL
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
}
```

- [ ] **Step 2: Add the `Conversion` model**

```prisma
model Conversion {
  id               String         @id @default(cuid())
  leadId           String
  kind             ConversionKind
  amount           Decimal        @db.Decimal(12, 2)
  currency         String         @default("USD")
  occurredAt       DateTime
  brokerReportedAt DateTime
  createdAt        DateTime       @default(now())
  lead             Lead           @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([leadId, kind])
  @@index([occurredAt])
  @@index([kind, occurredAt])
}
```

Also add a back-relation to `Lead`:

```prisma
// Inside Lead model, alongside events/outboundPostbacks
conversions Conversion[]
```

- [ ] **Step 3: Add `BrokerPayoutRule` model**

```prisma
model BrokerPayoutRule {
  id                   String         @id @default(cuid())
  brokerId             String
  kind                 PayoutRuleKind
  cpaAmount            Decimal?       @db.Decimal(12, 2)
  crgRate              Decimal?       @db.Decimal(5, 4)
  revShareRate         Decimal?       @db.Decimal(5, 4)
  minQualifiedDeposit  Decimal?       @db.Decimal(12, 2)
  currency             String         @default("USD")
  activeFrom           DateTime
  activeTo             DateTime?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  broker               Broker         @relation(fields: [brokerId], references: [id], onDelete: Cascade)

  @@index([brokerId, activeFrom])
  @@index([brokerId, activeTo])
}
```

Add `payoutRules BrokerPayoutRule[]` back-relation on `Broker`.

- [ ] **Step 4: Add `AffiliatePayoutRule` model**

```prisma
model AffiliatePayoutRule {
  id                   String         @id @default(cuid())
  affiliateId          String
  brokerId             String?
  kind                 PayoutRuleKind
  cpaAmount            Decimal?       @db.Decimal(12, 2)
  crgRate              Decimal?       @db.Decimal(5, 4)
  revShareRate         Decimal?       @db.Decimal(5, 4)
  currency             String         @default("USD")
  activeFrom           DateTime
  activeTo             DateTime?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  affiliate            Affiliate      @relation(fields: [affiliateId], references: [id], onDelete: Cascade)

  @@index([affiliateId, brokerId, activeFrom])
  @@index([affiliateId, activeTo])
}
```

Add `payoutRules AffiliatePayoutRule[]` back-relation on `Affiliate`.

**Note:** no FK to `Broker`. `brokerId` on `AffiliatePayoutRule` is a scoped pointer; `null` means "applies to all brokers for this affiliate". This avoids cascade weirdness when a broker is archived.

- [ ] **Step 5: Add `CRGCohort` model**

```prisma
model CRGCohort {
  id               String          @id @default(cuid())
  brokerId         String
  cohortStart      DateTime
  cohortEnd        DateTime
  cohortSize       Int             @default(0)
  ftdCount         Int             @default(0)
  ftdRate          Decimal?        @db.Decimal(5, 4)
  status           CRGCohortStatus @default(PENDING)
  shortfallAmount  Decimal?        @db.Decimal(12, 2)
  guaranteedRate   Decimal?        @db.Decimal(5, 4)
  settledAt        DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@unique([brokerId, cohortStart, cohortEnd])
  @@index([status, cohortEnd])
  @@index([brokerId, status])
}
```

- [ ] **Step 6: Add `BrokerInvoice` and `AffiliateInvoice` models**

```prisma
model BrokerInvoice {
  id               String          @id @default(cuid())
  brokerId         String
  periodStart      DateTime
  periodEnd        DateTime
  amount           Decimal         @db.Decimal(12, 2)
  currency         String          @default("USD")
  lineItems        Json            @default("[]")
  status           InvoiceStatus   @default(DRAFT)
  sentAt           DateTime?
  paidAt           DateTime?
  notes            String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  affiliateInvoice AffiliateInvoice?

  @@unique([brokerId, periodStart, periodEnd])
  @@index([status, periodEnd])
  @@index([brokerId, periodEnd])
}

model AffiliateInvoice {
  id               String          @id @default(cuid())
  affiliateId      String
  brokerInvoiceId  String?         @unique
  periodStart      DateTime
  periodEnd        DateTime
  amount           Decimal         @db.Decimal(12, 2)
  currency         String          @default("USD")
  lineItems        Json            @default("[]")
  status           InvoiceStatus   @default(DRAFT)
  sentAt           DateTime?
  paidAt           DateTime?
  notes            String?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  brokerInvoice    BrokerInvoice?  @relation(fields: [brokerInvoiceId], references: [id])

  @@unique([affiliateId, periodStart, periodEnd])
  @@index([status, periodEnd])
  @@index([affiliateId, periodEnd])
}
```

- [ ] **Step 7: Push schema + regenerate client**

Run:
```bash
pnpm prisma db push
pnpm prisma generate
```
Expected: `Your database is now in sync with your Prisma schema.` Prisma client regenerated with `Conversion`, `BrokerPayoutRule`, `AffiliatePayoutRule`, `CRGCohort`, `BrokerInvoice`, `AffiliateInvoice` delegates.

- [ ] **Step 8: Type-check**

Run:
```bash
pnpm typecheck
```
Expected: zero errors.

- [ ] **Step 9: Commit**

Run:
```bash
git add prisma/schema.prisma
git commit -m "feat(finance): schema — Conversion, PayoutRule×2, CRGCohort, Invoice×2"
```

---

### Task 2: Extend postback handler to emit Conversions

**Files:**
- Read: `src/app/api/v1/postbacks/[brokerId]/route.ts` (identify transition points)
- Create: `src/server/finance/emit-conversion.ts`
- Modify: `src/app/api/v1/postbacks/[brokerId]/route.ts`
- Test: `tests/integration/finance-conversion-emit.test.ts` (create)

- [ ] **Step 1: Read the postback handler and locate status-mapping transitions**

Open `src/app/api/v1/postbacks/[brokerId]/route.ts`. Locate the section where the broker's raw status is mapped (`statusMapping` on `Broker`) to a canonical `LeadEventKind` and where `lead.ftdAt` is set on FTD. This is where conversion emission hooks in.

Canonical transitions to emit conversions for:
- raw status → maps to `REGISTRATION` (first time lead is registered in broker system)
- raw status → maps to `FTD` (first-time deposit)
- raw status → maps to `REDEPOSIT` (subsequent deposits — broker must include amount in postback)

- [ ] **Step 2: Create the emit helper**

Create `src/server/finance/emit-conversion.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { ConversionKind } from "@prisma/client";

export type EmitConversionInput = {
  leadId: string;
  kind: ConversionKind;
  amount: Prisma.Decimal | number | string;
  currency?: string;
  occurredAt: Date;
  brokerReportedAt: Date;
};

/**
 * Idempotent conversion emit. A (leadId, kind) pair is unique for
 * REGISTRATION and FTD (first-time events). For REDEPOSIT we allow
 * multiple rows; caller must guarantee the broker-side dedup key is
 * enforced via `brokerReportedAt` + amount in the absence of a broker
 * event id.
 */
export async function emitConversion(input: EmitConversionInput) {
  const { leadId, kind, amount, currency = "USD", occurredAt, brokerReportedAt } = input;

  if (currency !== "USD") {
    throw new Error(`multi-currency not supported in v1.0 (got ${currency})`);
  }

  if (kind === "REGISTRATION" || kind === "FTD") {
    const existing = await prisma.conversion.findFirst({
      where: { leadId, kind },
      select: { id: true },
    });
    if (existing) return existing;
  }

  return prisma.conversion.create({
    data: {
      leadId,
      kind,
      amount: new Prisma.Decimal(amount),
      currency,
      occurredAt,
      brokerReportedAt,
    },
  });
}
```

- [ ] **Step 3: Wire emission into the postback handler**

In `src/app/api/v1/postbacks/[brokerId]/route.ts`, after the canonical status is determined and the lead's FTD/state transition is persisted, add a branch:

```typescript
import { emitConversion } from "@/server/finance/emit-conversion";

// … inside POST, after status mapping + lead update
const brokerReportedAt = new Date();
if (canonical === "FTD") {
  await emitConversion({
    leadId: lead.id,
    kind: "FTD",
    amount: body.deposit_amount ?? body.ftd_amount ?? 0,
    occurredAt: lead.ftdAt ?? brokerReportedAt,
    brokerReportedAt,
  });
} else if (canonical === "REGISTRATION") {
  await emitConversion({
    leadId: lead.id,
    kind: "REGISTRATION",
    amount: 0,
    occurredAt: lead.acceptedAt ?? brokerReportedAt,
    brokerReportedAt,
  });
} else if (canonical === "REDEPOSIT") {
  await emitConversion({
    leadId: lead.id,
    kind: "REDEPOSIT",
    amount: body.deposit_amount ?? 0,
    occurredAt: brokerReportedAt,
    brokerReportedAt,
  });
}
```

**Note:** the exact field names (`deposit_amount`, `ftd_amount`) depend on the broker's postback schema. The current broker model allows arbitrary JSON via `statusMapping`; when a broker template author defines a mapping, they also declare the amount field. For v1.0 MVP, read `body.amount ?? body.deposit_amount ?? body.ftd_amount ?? 0`.

- [ ] **Step 4: Write integration test**

Create `tests/integration/finance-conversion-emit.test.ts`:

```typescript
import { POST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedBroker, seedLead } from "../helpers/seed";
import { signPostback } from "../helpers/postback-signature";

describe("postback → conversion emission", () => {
  beforeEach(async () => { await resetDb(); });

  it("emits an FTD conversion when canonical status is FTD", async () => {
    const broker = await seedBroker({
      statusMapping: { dep_1: "FTD" },
      postbackSecret: "s3cret",
    });
    const lead = await seedLead({ brokerId: broker.id, brokerExternalId: "brx-1" });

    const body = JSON.stringify({
      broker_lead_id: "brx-1",
      status: "dep_1",
      deposit_amount: "250.00",
    });
    const sig = signPostback(body, broker.postbackSecret);

    const req = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body,
    });
    await POST(req, { params: Promise.resolve({ brokerId: broker.id }) });

    const conv = await prisma.conversion.findFirst({ where: { leadId: lead.id, kind: "FTD" } });
    expect(conv).not.toBeNull();
    expect(conv?.amount.toString()).toBe("250");
  });

  it("is idempotent on FTD re-post (no duplicate row)", async () => {
    const broker = await seedBroker({
      statusMapping: { dep_1: "FTD" },
      postbackSecret: "s3cret",
    });
    const lead = await seedLead({ brokerId: broker.id, brokerExternalId: "brx-2" });

    const body = JSON.stringify({
      broker_lead_id: "brx-2",
      status: "dep_1",
      deposit_amount: "100.00",
    });
    const sig = signPostback(body, broker.postbackSecret);
    const req1 = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body,
    });
    const req2 = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-signature": sig },
      body,
    });
    await POST(req1, { params: Promise.resolve({ brokerId: broker.id }) });
    await POST(req2, { params: Promise.resolve({ brokerId: broker.id }) });

    const count = await prisma.conversion.count({ where: { leadId: lead.id, kind: "FTD" } });
    expect(count).toBe(1);
  });

  it("allows multiple REDEPOSIT rows on the same lead", async () => {
    const broker = await seedBroker({
      statusMapping: { redep: "REDEPOSIT" },
      postbackSecret: "s3cret",
    });
    const lead = await seedLead({ brokerId: broker.id, brokerExternalId: "brx-3" });

    for (const amount of ["50.00", "75.00", "100.00"]) {
      const body = JSON.stringify({
        broker_lead_id: "brx-3",
        status: "redep",
        deposit_amount: amount,
      });
      const sig = signPostback(body, broker.postbackSecret);
      const req = new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": sig },
        body,
      });
      await POST(req, { params: Promise.resolve({ brokerId: broker.id }) });
    }

    const count = await prisma.conversion.count({ where: { leadId: lead.id, kind: "REDEPOSIT" } });
    expect(count).toBe(3);
  });
});
```

If `tests/helpers/seed.ts` does not have `seedBroker`/`seedLead` helpers, create thin wrappers that produce a minimal valid record.

- [ ] **Step 5: Run test**

Run:
```bash
pnpm vitest run tests/integration/finance-conversion-emit.test.ts
```
Expected: all three cases PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add src/server/finance/emit-conversion.ts src/app/api/v1/postbacks/[brokerId]/route.ts tests/integration/finance-conversion-emit.test.ts
git commit -m "feat(finance): emit Conversion rows on REGISTRATION / FTD / REDEPOSIT postbacks"
```

---

### Task 3: P&L service — `computePnL`

**Files:**
- Create: `src/server/finance/pnl.ts`
- Create: `src/server/finance/payout-rule-resolver.ts`
- Test: `tests/unit/finance-pnl.test.ts` (create)

- [ ] **Step 1: Payout rule resolver**

Create `src/server/finance/payout-rule-resolver.ts`:

```typescript
import type { BrokerPayoutRule, AffiliatePayoutRule } from "@prisma/client";

/**
 * Pick the payout rule active at `at` from a list. If multiple rules
 * overlap, the most recent `activeFrom` wins (caller is expected to
 * disallow overlapping rules in the editor; this is a defence-in-depth
 * resolver).
 */
export function resolveRuleAt<T extends { activeFrom: Date; activeTo: Date | null }>(
  rules: T[],
  at: Date,
): T | null {
  const active = rules
    .filter((r) => r.activeFrom <= at && (r.activeTo === null || r.activeTo > at))
    .sort((a, b) => b.activeFrom.getTime() - a.activeFrom.getTime());
  return active[0] ?? null;
}

/**
 * Affiliate rule resolution: prefer a rule scoped to the specific broker,
 * fall back to the broker-agnostic rule.
 */
export function resolveAffiliateRuleAt(
  rules: AffiliatePayoutRule[],
  brokerId: string,
  at: Date,
): AffiliatePayoutRule | null {
  const scoped = rules.filter((r) => r.brokerId === brokerId);
  const global = rules.filter((r) => r.brokerId === null);
  return resolveRuleAt(scoped, at) ?? resolveRuleAt(global, at);
}

export function resolveBrokerRuleAt(
  rules: BrokerPayoutRule[],
  at: Date,
): BrokerPayoutRule | null {
  return resolveRuleAt(rules, at);
}
```

- [ ] **Step 2: Amount-application helper**

Add to `src/server/finance/payout-rule-resolver.ts`:

```typescript
import { Prisma } from "@prisma/client";
import type { ConversionKind } from "@prisma/client";

type AnyRule = {
  kind: "CPA_FIXED" | "CPA_CRG" | "REV_SHARE" | "HYBRID";
  cpaAmount: Prisma.Decimal | null;
  crgRate: Prisma.Decimal | null;
  revShareRate: Prisma.Decimal | null;
};

/**
 * Compute payout owed for a single conversion under a given rule.
 * Returns Prisma.Decimal for exact money math.
 */
export function applyRule(
  rule: AnyRule,
  kind: ConversionKind,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  const zero = new Prisma.Decimal(0);
  switch (rule.kind) {
    case "CPA_FIXED":
      return kind === "FTD" && rule.cpaAmount ? rule.cpaAmount : zero;
    case "CPA_CRG":
      // CPA amount on FTD; CRG top-up / shortfall handled separately by cohort settlement
      return kind === "FTD" && rule.cpaAmount ? rule.cpaAmount : zero;
    case "REV_SHARE":
      if ((kind === "FTD" || kind === "REDEPOSIT") && rule.revShareRate) {
        return amount.mul(rule.revShareRate);
      }
      return zero;
    case "HYBRID":
      if (kind === "FTD" && rule.cpaAmount) {
        const cpa = rule.cpaAmount;
        if (rule.revShareRate) return cpa.add(amount.mul(rule.revShareRate));
        return cpa;
      }
      if (kind === "REDEPOSIT" && rule.revShareRate) {
        return amount.mul(rule.revShareRate);
      }
      return zero;
    default:
      return zero;
  }
}
```

- [ ] **Step 3: P&L computation**

Create `src/server/finance/pnl.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { applyRule, resolveAffiliateRuleAt, resolveBrokerRuleAt } from "./payout-rule-resolver";

export type ComputePnLParams = {
  from: Date;
  to: Date;
  affiliateId?: string;
  brokerId?: string;
  geo?: string;
};

export type PnLResult = {
  revenue: Prisma.Decimal;
  payout: Prisma.Decimal;
  margin: Prisma.Decimal;
  marginPct: number;           // 0..100; 0 when revenue is 0
  conversionCount: number;
  breakdown: {
    byKind: Record<"REGISTRATION" | "FTD" | "REDEPOSIT", {
      count: number;
      revenue: string;
      payout: string;
    }>;
  };
};

export async function computePnL(params: ComputePnLParams): Promise<PnLResult> {
  const { from, to, affiliateId, brokerId, geo } = params;

  const conversions = await prisma.conversion.findMany({
    where: {
      occurredAt: { gte: from, lt: to },
      lead: {
        ...(affiliateId ? { affiliateId } : {}),
        ...(brokerId ? { brokerId } : {}),
        ...(geo ? { geo } : {}),
      },
    },
    include: {
      lead: { select: { affiliateId: true, brokerId: true } },
    },
  });

  // Preload rules: one query per distinct affiliate + one per distinct broker.
  const brokerIds = [...new Set(conversions.map((c) => c.lead.brokerId).filter(Boolean) as string[])];
  const affiliateIds = [...new Set(conversions.map((c) => c.lead.affiliateId))];

  const [brokerRules, affiliateRules] = await Promise.all([
    prisma.brokerPayoutRule.findMany({ where: { brokerId: { in: brokerIds } } }),
    prisma.affiliatePayoutRule.findMany({ where: { affiliateId: { in: affiliateIds } } }),
  ]);

  const brokerRulesByBroker = new Map<string, typeof brokerRules>();
  for (const r of brokerRules) {
    const arr = brokerRulesByBroker.get(r.brokerId) ?? [];
    arr.push(r);
    brokerRulesByBroker.set(r.brokerId, arr);
  }

  const affiliateRulesByAffiliate = new Map<string, typeof affiliateRules>();
  for (const r of affiliateRules) {
    const arr = affiliateRulesByAffiliate.get(r.affiliateId) ?? [];
    arr.push(r);
    affiliateRulesByAffiliate.set(r.affiliateId, arr);
  }

  let revenue = new Prisma.Decimal(0);
  let payout = new Prisma.Decimal(0);
  const byKind = {
    REGISTRATION: { count: 0, revenue: new Prisma.Decimal(0), payout: new Prisma.Decimal(0) },
    FTD:          { count: 0, revenue: new Prisma.Decimal(0), payout: new Prisma.Decimal(0) },
    REDEPOSIT:    { count: 0, revenue: new Prisma.Decimal(0), payout: new Prisma.Decimal(0) },
  };

  for (const c of conversions) {
    const bRules = c.lead.brokerId ? brokerRulesByBroker.get(c.lead.brokerId) ?? [] : [];
    const aRules = affiliateRulesByAffiliate.get(c.lead.affiliateId) ?? [];
    const brokerRule = resolveBrokerRuleAt(bRules, c.occurredAt);
    const affRule = c.lead.brokerId
      ? resolveAffiliateRuleAt(aRules, c.lead.brokerId, c.occurredAt)
      : null;

    const convRevenue = brokerRule ? applyRule(brokerRule, c.kind, c.amount) : new Prisma.Decimal(0);
    const convPayout = affRule ? applyRule(affRule, c.kind, c.amount) : new Prisma.Decimal(0);

    revenue = revenue.add(convRevenue);
    payout = payout.add(convPayout);

    byKind[c.kind].count += 1;
    byKind[c.kind].revenue = byKind[c.kind].revenue.add(convRevenue);
    byKind[c.kind].payout = byKind[c.kind].payout.add(convPayout);
  }

  const margin = revenue.sub(payout);
  const marginPct = revenue.isZero() ? 0 : margin.div(revenue).mul(100).toNumber();

  return {
    revenue,
    payout,
    margin,
    marginPct,
    conversionCount: conversions.length,
    breakdown: {
      byKind: {
        REGISTRATION: { count: byKind.REGISTRATION.count, revenue: byKind.REGISTRATION.revenue.toString(), payout: byKind.REGISTRATION.payout.toString() },
        FTD:          { count: byKind.FTD.count,          revenue: byKind.FTD.revenue.toString(),          payout: byKind.FTD.payout.toString() },
        REDEPOSIT:    { count: byKind.REDEPOSIT.count,    revenue: byKind.REDEPOSIT.revenue.toString(),    payout: byKind.REDEPOSIT.payout.toString() },
      },
    },
  };
}
```

- [ ] **Step 4: Unit tests**

Create `tests/unit/finance-pnl.test.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { applyRule, resolveAffiliateRuleAt, resolveBrokerRuleAt, resolveRuleAt } from "@/server/finance/payout-rule-resolver";
import { describe, expect, it } from "vitest";

const D = (v: string | number) => new Prisma.Decimal(v);

describe("resolveRuleAt", () => {
  const now = new Date("2026-06-15T00:00:00Z");
  const mk = (from: string, to: string | null) => ({ activeFrom: new Date(from), activeTo: to ? new Date(to) : null });

  it("picks most recent overlapping rule", () => {
    const rules = [
      mk("2026-01-01", null),
      mk("2026-06-01", null),
      mk("2026-05-01", "2026-06-10"),
    ];
    const r = resolveRuleAt(rules, now);
    expect(r?.activeFrom.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns null when no rule is active", () => {
    const r = resolveRuleAt([mk("2027-01-01", null)], now);
    expect(r).toBeNull();
  });
});

describe("applyRule", () => {
  it("CPA_FIXED pays cpaAmount only on FTD", () => {
    const rule = { kind: "CPA_FIXED" as const, cpaAmount: D(100), crgRate: null, revShareRate: null };
    expect(applyRule(rule, "FTD", D(0)).toString()).toBe("100");
    expect(applyRule(rule, "REGISTRATION", D(0)).toString()).toBe("0");
    expect(applyRule(rule, "REDEPOSIT", D(500)).toString()).toBe("0");
  });

  it("REV_SHARE pays rate * amount on FTD and REDEPOSIT", () => {
    const rule = { kind: "REV_SHARE" as const, cpaAmount: null, crgRate: null, revShareRate: D("0.3") };
    expect(applyRule(rule, "FTD", D(1000)).toString()).toBe("300");
    expect(applyRule(rule, "REDEPOSIT", D(500)).toString()).toBe("150");
    expect(applyRule(rule, "REGISTRATION", D(0)).toString()).toBe("0");
  });

  it("HYBRID pays CPA + rev-share on FTD, rev-share on REDEPOSIT", () => {
    const rule = { kind: "HYBRID" as const, cpaAmount: D(100), crgRate: null, revShareRate: D("0.2") };
    expect(applyRule(rule, "FTD", D(500)).toString()).toBe("200");          // 100 + 0.2 * 500
    expect(applyRule(rule, "REDEPOSIT", D(250)).toString()).toBe("50");     // 0.2 * 250
  });
});
```

Create `tests/integration/finance-pnl-compute.test.ts` for the full `computePnL`:

```typescript
import { Prisma } from "@prisma/client";
import { computePnL } from "@/server/finance/pnl";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

describe("computePnL", () => {
  beforeEach(async () => { await resetDb(); });

  it("aggregates revenue and payout across multiple conversions", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    const lead1 = await seedLead({ brokerId: broker.id, affiliateId: aff.id });
    const lead2 = await seedLead({ brokerId: broker.id, affiliateId: aff.id });

    await prisma.brokerPayoutRule.create({
      data: { brokerId: broker.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(200), activeFrom: new Date("2026-01-01") },
    });
    await prisma.affiliatePayoutRule.create({
      data: { affiliateId: aff.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(150), activeFrom: new Date("2026-01-01") },
    });

    const t = new Date("2026-06-15T10:00:00Z");
    await prisma.conversion.createMany({
      data: [
        { leadId: lead1.id, kind: "FTD", amount: new Prisma.Decimal(500), occurredAt: t, brokerReportedAt: t },
        { leadId: lead2.id, kind: "FTD", amount: new Prisma.Decimal(800), occurredAt: t, brokerReportedAt: t },
      ],
    });

    const r = await computePnL({ from: new Date("2026-06-01"), to: new Date("2026-07-01") });

    expect(r.revenue.toString()).toBe("400");   // 200 * 2
    expect(r.payout.toString()).toBe("300");    // 150 * 2
    expect(r.margin.toString()).toBe("100");
    expect(Math.round(r.marginPct)).toBe(25);
    expect(r.conversionCount).toBe(2);
    expect(r.breakdown.byKind.FTD.count).toBe(2);
  });

  it("filters by affiliate", async () => {
    const aff1 = await seedAffiliate();
    const aff2 = await seedAffiliate();
    const broker = await seedBroker();
    const lead1 = await seedLead({ brokerId: broker.id, affiliateId: aff1.id });
    const lead2 = await seedLead({ brokerId: broker.id, affiliateId: aff2.id });
    await prisma.brokerPayoutRule.create({
      data: { brokerId: broker.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(100), activeFrom: new Date("2026-01-01") },
    });
    const t = new Date("2026-06-15T10:00:00Z");
    await prisma.conversion.createMany({
      data: [
        { leadId: lead1.id, kind: "FTD", amount: new Prisma.Decimal(0), occurredAt: t, brokerReportedAt: t },
        { leadId: lead2.id, kind: "FTD", amount: new Prisma.Decimal(0), occurredAt: t, brokerReportedAt: t },
      ],
    });

    const r = await computePnL({ from: new Date("2026-06-01"), to: new Date("2026-07-01"), affiliateId: aff1.id });
    expect(r.conversionCount).toBe(1);
    expect(r.revenue.toString()).toBe("100");
  });
});
```

- [ ] **Step 5: Run tests**

Run:
```bash
pnpm vitest run tests/unit/finance-pnl.test.ts tests/integration/finance-pnl-compute.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

Run:
```bash
git add src/server/finance/pnl.ts src/server/finance/payout-rule-resolver.ts tests/unit/finance-pnl.test.ts tests/integration/finance-pnl-compute.test.ts
git commit -m "feat(finance): computePnL service + payout rule resolver"
```

---

### Task 4: tRPC finance router

**Files:**
- Create: `src/server/routers/finance.ts`
- Modify: `src/server/routers/_app.ts` (register)
- Test: `tests/integration/finance-router.test.ts` (create)

- [ ] **Step 1: Router skeleton**

Create `src/server/routers/finance.ts`:

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { computePnL } from "@/server/finance/pnl";
import { prisma } from "@/server/db";

const pnlParams = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  affiliateId: z.string().optional(),
  brokerId: z.string().optional(),
  geo: z.string().length(2).optional(),
});

export const financeRouter = createTRPCRouter({
  pnl: protectedProcedure.input(pnlParams).query(async ({ input }) => {
    const r = await computePnL(input);
    return {
      revenue: r.revenue.toString(),
      payout: r.payout.toString(),
      margin: r.margin.toString(),
      marginPct: r.marginPct,
      conversionCount: r.conversionCount,
      breakdown: r.breakdown,
    };
  }),

  listBrokerPayoutRules: protectedProcedure
    .input(z.object({ brokerId: z.string() }))
    .query(({ input }) =>
      prisma.brokerPayoutRule.findMany({
        where: { brokerId: input.brokerId },
        orderBy: { activeFrom: "desc" },
      }),
    ),

  upsertBrokerPayoutRule: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      brokerId: z.string(),
      kind: z.enum(["CPA_FIXED", "CPA_CRG", "REV_SHARE", "HYBRID"]),
      cpaAmount: z.string().optional(),
      crgRate: z.string().optional(),
      revShareRate: z.string().optional(),
      minQualifiedDeposit: z.string().optional(),
      activeFrom: z.coerce.date(),
      activeTo: z.coerce.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return id
        ? prisma.brokerPayoutRule.update({ where: { id }, data })
        : prisma.brokerPayoutRule.create({ data });
    }),

  listAffiliatePayoutRules: protectedProcedure
    .input(z.object({ affiliateId: z.string() }))
    .query(({ input }) =>
      prisma.affiliatePayoutRule.findMany({
        where: { affiliateId: input.affiliateId },
        orderBy: { activeFrom: "desc" },
      }),
    ),

  upsertAffiliatePayoutRule: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      affiliateId: z.string(),
      brokerId: z.string().nullable().optional(),
      kind: z.enum(["CPA_FIXED", "CPA_CRG", "REV_SHARE", "HYBRID"]),
      cpaAmount: z.string().optional(),
      crgRate: z.string().optional(),
      revShareRate: z.string().optional(),
      activeFrom: z.coerce.date(),
      activeTo: z.coerce.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return id
        ? prisma.affiliatePayoutRule.update({ where: { id }, data })
        : prisma.affiliatePayoutRule.create({ data });
    }),

  listInvoices: protectedProcedure
    .input(z.object({
      tab: z.enum(["broker", "affiliate"]),
      status: z.enum(["DRAFT", "SENT", "PAID"]).optional(),
    }))
    .query(async ({ input }) => {
      if (input.tab === "broker") {
        return prisma.brokerInvoice.findMany({
          where: input.status ? { status: input.status } : {},
          orderBy: { periodEnd: "desc" },
          take: 200,
        });
      }
      return prisma.affiliateInvoice.findMany({
        where: input.status ? { status: input.status } : {},
        orderBy: { periodEnd: "desc" },
        take: 200,
      });
    }),

  markInvoicePaid: protectedProcedure
    .input(z.object({
      kind: z.enum(["broker", "affiliate"]),
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const now = new Date();
      return input.kind === "broker"
        ? prisma.brokerInvoice.update({ where: { id: input.id }, data: { status: "PAID", paidAt: now } })
        : prisma.affiliateInvoice.update({ where: { id: input.id }, data: { status: "PAID", paidAt: now } });
    }),

  exportInvoicePdf: protectedProcedure
    .input(z.object({ kind: z.enum(["broker", "affiliate"]), id: z.string() }))
    .query(async ({ input }) => {
      const inv = input.kind === "broker"
        ? await prisma.brokerInvoice.findUniqueOrThrow({ where: { id: input.id } })
        : await prisma.affiliateInvoice.findUniqueOrThrow({ where: { id: input.id } });
      return {
        placeholder: true,
        format: "pdf-v2.0-pending",
        invoice: {
          id: inv.id,
          periodStart: inv.periodStart,
          periodEnd: inv.periodEnd,
          amount: inv.amount.toString(),
          currency: inv.currency,
          lineItems: inv.lineItems,
          status: inv.status,
        },
      };
    }),

  listCrgCohorts: protectedProcedure
    .input(z.object({ brokerId: z.string().optional() }))
    .query(({ input }) =>
      prisma.cRGCohort.findMany({
        where: input.brokerId ? { brokerId: input.brokerId } : {},
        orderBy: { cohortEnd: "desc" },
        take: 100,
      }),
    ),
});
```

- [ ] **Step 2: Register in root router**

Modify `src/server/routers/_app.ts`:

```typescript
import { financeRouter } from "./finance";

export const appRouter = createTRPCRouter({
  // … existing routers
  finance: financeRouter,
});
```

- [ ] **Step 3: Integration test**

Create `tests/integration/finance-router.test.ts`:

```typescript
import { appRouter } from "@/server/routers/_app";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAdminSession, seedAffiliate, seedBroker } from "../helpers/seed";

describe("finance tRPC router", () => {
  beforeEach(async () => { await resetDb(); });

  it("pnl returns zero envelope when no conversions exist", async () => {
    const ctx = await seedAdminSession();
    const caller = appRouter.createCaller(ctx);
    const r = await caller.finance.pnl({ from: new Date("2026-06-01"), to: new Date("2026-07-01") });
    expect(r.conversionCount).toBe(0);
    expect(r.revenue).toBe("0");
    expect(r.payout).toBe("0");
    expect(r.marginPct).toBe(0);
  });

  it("upsertBrokerPayoutRule creates and then updates a rule", async () => {
    const ctx = await seedAdminSession();
    const broker = await seedBroker();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.finance.upsertBrokerPayoutRule({
      brokerId: broker.id, kind: "CPA_FIXED", cpaAmount: "100", activeFrom: new Date("2026-01-01"),
    });
    expect(created.id).toBeTruthy();

    const updated = await caller.finance.upsertBrokerPayoutRule({
      id: created.id, brokerId: broker.id, kind: "CPA_FIXED", cpaAmount: "150", activeFrom: new Date("2026-01-01"),
    });
    expect(updated.cpaAmount?.toString()).toBe("150");
  });
});
```

- [ ] **Step 4: Run**

Run:
```bash
pnpm vitest run tests/integration/finance-router.test.ts
pnpm typecheck
```
Expected: PASS + zero errors.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/routers/finance.ts src/server/routers/_app.ts tests/integration/finance-router.test.ts
git commit -m "feat(finance): tRPC router (pnl, payout rules, invoices, CRG cohorts)"
```

---

### Task 5: CRG cohort settlement cron

**Files:**
- Create: `src/server/finance/crg-settle.ts`
- Create: `src/server/jobs/crg-cohort-settle.ts`
- Modify: cron registration site (e.g. `src/server/jobs/index.ts` or worker entrypoint)
- Test: `tests/integration/finance-crg-settle.test.ts` (create)

- [ ] **Step 1: Cohort builder + settlement logic**

Create `src/server/finance/crg-settle.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/**
 * Policy: cohort = calendar week of accepted leads per broker.
 * Cohort settlement window: 30 days after `cohortEnd`.
 *
 * For each broker with an active CPA_CRG payout rule:
 * - Compute total accepted leads in the cohort window (cohortSize).
 * - Compute FTD count within the settlement window (ftdCount).
 * - ftdRate = ftdCount / cohortSize.
 * - If ftdRate < guaranteedRate → SHORTFALL, compute shortfallAmount =
 *   (guaranteedRate - ftdRate) * cohortSize * cpaAmount
 *   (i.e. the broker undercharged for leads whose implied quality they
 *   guaranteed; we clawback the difference).
 * - Otherwise MET.
 */
export async function settleCohortsBefore(cutoffEnd: Date) {
  const pending = await prisma.cRGCohort.findMany({
    where: { status: "PENDING", cohortEnd: { lte: cutoffEnd } },
  });

  const results: { cohortId: string; status: "MET" | "SHORTFALL"; shortfallAmount: string }[] = [];

  for (const cohort of pending) {
    const ftdCount = await prisma.conversion.count({
      where: {
        kind: "FTD",
        occurredAt: { gte: cohort.cohortStart, lt: new Date(cohort.cohortEnd.getTime() + 30 * 24 * 3600_000) },
        lead: { brokerId: cohort.brokerId },
      },
    });

    const ftdRate = cohort.cohortSize > 0
      ? new Prisma.Decimal(ftdCount).div(cohort.cohortSize)
      : new Prisma.Decimal(0);

    const guaranteed = cohort.guaranteedRate ?? new Prisma.Decimal(0);
    const status: "MET" | "SHORTFALL" = ftdRate.gte(guaranteed) ? "MET" : "SHORTFALL";

    let shortfallAmount: Prisma.Decimal = new Prisma.Decimal(0);
    if (status === "SHORTFALL") {
      const activeRule = await prisma.brokerPayoutRule.findFirst({
        where: {
          brokerId: cohort.brokerId,
          kind: "CPA_CRG",
          activeFrom: { lte: cohort.cohortStart },
          OR: [{ activeTo: null }, { activeTo: { gt: cohort.cohortEnd } }],
        },
      });
      const cpa = activeRule?.cpaAmount ?? new Prisma.Decimal(0);
      // Shortfall = (guaranteed - actual) * cohortSize * cpa
      shortfallAmount = guaranteed.sub(ftdRate).mul(cohort.cohortSize).mul(cpa);
    }

    await prisma.cRGCohort.update({
      where: { id: cohort.id },
      data: {
        ftdCount,
        ftdRate,
        status,
        shortfallAmount: status === "SHORTFALL" ? shortfallAmount : null,
        settledAt: new Date(),
      },
    });

    results.push({
      cohortId: cohort.id,
      status,
      shortfallAmount: shortfallAmount.toString(),
    });
  }

  return results;
}

/**
 * Create PENDING cohorts for each broker with a CPA_CRG rule whose
 * cohort window has passed but no cohort row exists yet.
 * Cohort window: Monday 00:00 UTC → following Monday 00:00 UTC.
 */
export async function ensureCohortsUpTo(cutoffEnd: Date) {
  const crgBrokers = await prisma.brokerPayoutRule.findMany({
    where: { kind: "CPA_CRG", activeFrom: { lte: cutoffEnd } },
    select: { brokerId: true, crgRate: true, activeFrom: true, activeTo: true },
  });

  for (const rule of crgBrokers) {
    // Materialize weekly cohorts between the rule's activeFrom and cutoffEnd,
    // skipping ones that already exist.
    let cursor = startOfWeekUTC(rule.activeFrom);
    const stopAt = rule.activeTo && rule.activeTo < cutoffEnd ? rule.activeTo : cutoffEnd;
    while (cursor < stopAt) {
      const cohortEnd = new Date(cursor.getTime() + 7 * 24 * 3600_000);
      const exists = await prisma.cRGCohort.findUnique({
        where: { brokerId_cohortStart_cohortEnd: { brokerId: rule.brokerId, cohortStart: cursor, cohortEnd } },
      });
      if (!exists) {
        const cohortSize = await prisma.lead.count({
          where: {
            brokerId: rule.brokerId,
            acceptedAt: { gte: cursor, lt: cohortEnd },
          },
        });
        await prisma.cRGCohort.create({
          data: {
            brokerId: rule.brokerId,
            cohortStart: cursor,
            cohortEnd,
            cohortSize,
            guaranteedRate: rule.crgRate,
            status: "PENDING",
          },
        });
      }
      cursor = cohortEnd;
    }
  }
}

function startOfWeekUTC(d: Date): Date {
  const ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const wd = new Date(ms).getUTCDay(); // 0 = Sun
  const shift = (wd + 6) % 7;           // Monday = 0
  return new Date(ms - shift * 24 * 3600_000);
}
```

- [ ] **Step 2: Cron job wrapper**

Create `src/server/jobs/crg-cohort-settle.ts`:

```typescript
import { ensureCohortsUpTo, settleCohortsBefore } from "@/server/finance/crg-settle";

export async function runCrgCohortSettle(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 3600_000);
  await ensureCohortsUpTo(now);
  const results = await settleCohortsBefore(cutoff);
  return results;
}
```

Register a daily cron (03:30 UTC) wherever the existing job registry lives. Search for `node-cron` usage or `registerJob(` in `src/server/jobs/` to find the pattern, and add:

```typescript
cron.schedule("30 3 * * *", () => runCrgCohortSettle());
```

- [ ] **Step 3: Integration test**

Create `tests/integration/finance-crg-settle.test.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { runCrgCohortSettle } from "@/server/jobs/crg-cohort-settle";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

describe("crg cohort settlement", () => {
  beforeEach(async () => { await resetDb(); });

  it("marks a cohort MET when FTD rate >= guaranteed", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: {
        brokerId: broker.id, kind: "CPA_CRG",
        cpaAmount: new Prisma.Decimal(100), crgRate: new Prisma.Decimal("0.10"),
        activeFrom: new Date("2026-01-01"),
      },
    });

    // 10 accepted leads, 2 FTD → 20% rate, above 10% guaranteed
    const cohortStart = new Date("2026-06-01T00:00:00Z"); // Monday
    for (let i = 0; i < 10; i++) {
      const lead = await seedLead({ brokerId: broker.id, affiliateId: aff.id, acceptedAt: new Date("2026-06-02T12:00:00Z") });
      if (i < 2) {
        await prisma.conversion.create({
          data: { leadId: lead.id, kind: "FTD", amount: new Prisma.Decimal(250), occurredAt: new Date("2026-06-10T12:00:00Z"), brokerReportedAt: new Date() },
        });
      }
    }

    const now = new Date("2026-07-15T04:00:00Z");
    const results = await runCrgCohortSettle(now);

    const cohort = await prisma.cRGCohort.findFirst({ where: { brokerId: broker.id, cohortStart } });
    expect(cohort?.status).toBe("MET");
    expect(cohort?.shortfallAmount).toBeNull();
  });

  it("marks a cohort SHORTFALL and computes clawback when FTD rate < guaranteed", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: {
        brokerId: broker.id, kind: "CPA_CRG",
        cpaAmount: new Prisma.Decimal(100), crgRate: new Prisma.Decimal("0.20"),
        activeFrom: new Date("2026-01-01"),
      },
    });

    // 10 accepted, 1 FTD → 10% vs 20% guaranteed → shortfall 10 pp
    // Shortfall = 0.10 * 10 * 100 = 100
    for (let i = 0; i < 10; i++) {
      const lead = await seedLead({ brokerId: broker.id, affiliateId: aff.id, acceptedAt: new Date("2026-06-02T12:00:00Z") });
      if (i < 1) {
        await prisma.conversion.create({
          data: { leadId: lead.id, kind: "FTD", amount: new Prisma.Decimal(250), occurredAt: new Date("2026-06-10T12:00:00Z"), brokerReportedAt: new Date() },
        });
      }
    }

    await runCrgCohortSettle(new Date("2026-07-15T04:00:00Z"));

    const cohort = await prisma.cRGCohort.findFirst({ where: { brokerId: broker.id, cohortStart: new Date("2026-06-01T00:00:00Z") } });
    expect(cohort?.status).toBe("SHORTFALL");
    expect(cohort?.shortfallAmount?.toString()).toBe("100");
  });
});
```

- [ ] **Step 4: Run**

Run:
```bash
pnpm vitest run tests/integration/finance-crg-settle.test.ts
```
Expected: PASS on both cases.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/finance/crg-settle.ts src/server/jobs/crg-cohort-settle.ts tests/integration/finance-crg-settle.test.ts
git commit -m "feat(finance): CRG cohort settlement cron + shortfall clawback"
```

---

### Task 6: Invoice generation + linkage

**Files:**
- Create: `src/server/finance/invoice-generate.ts`
- Modify: `src/server/routers/finance.ts` (add `generateInvoices` mutation)
- Test: `tests/integration/finance-invoice-generate.test.ts` (create)

- [ ] **Step 1: Invoice builders**

Create `src/server/finance/invoice-generate.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { applyRule, resolveAffiliateRuleAt, resolveBrokerRuleAt } from "./payout-rule-resolver";

type Period = { start: Date; end: Date };

export type InvoiceLineItem = {
  conversionId: string;
  leadId: string;
  kind: "REGISTRATION" | "FTD" | "REDEPOSIT";
  amount: string;        // raw deposit amount
  payoutAmount: string;  // amount owed under the rule
  occurredAt: string;
};

export async function generateBrokerInvoice(brokerId: string, period: Period) {
  const conversions = await prisma.conversion.findMany({
    where: {
      occurredAt: { gte: period.start, lt: period.end },
      lead: { brokerId },
    },
  });

  const rules = await prisma.brokerPayoutRule.findMany({ where: { brokerId } });
  let total = new Prisma.Decimal(0);
  const lineItems: InvoiceLineItem[] = [];

  for (const c of conversions) {
    const rule = resolveBrokerRuleAt(rules, c.occurredAt);
    const payout = rule ? applyRule(rule, c.kind, c.amount) : new Prisma.Decimal(0);
    total = total.add(payout);
    lineItems.push({
      conversionId: c.id,
      leadId: c.leadId,
      kind: c.kind,
      amount: c.amount.toString(),
      payoutAmount: payout.toString(),
      occurredAt: c.occurredAt.toISOString(),
    });
  }

  // Add CRG shortfall as a line item if any settled cohorts in the period
  const shortfallCohorts = await prisma.cRGCohort.findMany({
    where: {
      brokerId,
      status: "SHORTFALL",
      cohortEnd: { gte: period.start, lt: period.end },
      shortfallAmount: { not: null },
    },
  });
  for (const sc of shortfallCohorts) {
    if (sc.shortfallAmount) {
      total = total.add(sc.shortfallAmount);
      lineItems.push({
        conversionId: `crg-cohort-${sc.id}`,
        leadId: "",
        kind: "FTD",
        amount: "0",
        payoutAmount: sc.shortfallAmount.toString(),
        occurredAt: sc.cohortEnd.toISOString(),
      });
    }
  }

  return prisma.brokerInvoice.upsert({
    where: { brokerId_periodStart_periodEnd: { brokerId, periodStart: period.start, periodEnd: period.end } },
    update: { amount: total, lineItems: lineItems as unknown as Prisma.InputJsonValue },
    create: {
      brokerId,
      periodStart: period.start,
      periodEnd: period.end,
      amount: total,
      currency: "USD",
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
    },
  });
}

export async function generateAffiliateInvoice(affiliateId: string, period: Period) {
  const conversions = await prisma.conversion.findMany({
    where: {
      occurredAt: { gte: period.start, lt: period.end },
      lead: { affiliateId },
    },
    include: { lead: { select: { brokerId: true } } },
  });

  const rules = await prisma.affiliatePayoutRule.findMany({ where: { affiliateId } });
  let total = new Prisma.Decimal(0);
  const lineItems: InvoiceLineItem[] = [];
  const brokerIdsSeen = new Set<string>();

  for (const c of conversions) {
    const brokerId = c.lead.brokerId;
    if (!brokerId) continue;
    brokerIdsSeen.add(brokerId);
    const rule = resolveAffiliateRuleAt(rules, brokerId, c.occurredAt);
    const payout = rule ? applyRule(rule, c.kind, c.amount) : new Prisma.Decimal(0);
    total = total.add(payout);
    lineItems.push({
      conversionId: c.id,
      leadId: c.leadId,
      kind: c.kind,
      amount: c.amount.toString(),
      payoutAmount: payout.toString(),
      occurredAt: c.occurredAt.toISOString(),
    });
  }

  // 1:1 linkage to a broker invoice: only set when exactly one broker is
  // represented and its invoice for the same period exists.
  let brokerInvoiceId: string | null = null;
  if (brokerIdsSeen.size === 1) {
    const [only] = [...brokerIdsSeen];
    const bi = await prisma.brokerInvoice.findUnique({
      where: { brokerId_periodStart_periodEnd: { brokerId: only, periodStart: period.start, periodEnd: period.end } },
    });
    if (bi && bi.affiliateInvoiceId === null) {
      brokerInvoiceId = bi.id;
    }
  }

  return prisma.affiliateInvoice.upsert({
    where: { affiliateId_periodStart_periodEnd: { affiliateId, periodStart: period.start, periodEnd: period.end } },
    update: { amount: total, lineItems: lineItems as unknown as Prisma.InputJsonValue, brokerInvoiceId },
    create: {
      affiliateId,
      periodStart: period.start,
      periodEnd: period.end,
      amount: total,
      currency: "USD",
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      brokerInvoiceId,
      status: "DRAFT",
    },
  });
}
```

**Note on the linkage check:** `affiliateInvoiceId === null` isn't a direct column; use the relation: `await prisma.affiliateInvoice.findUnique({ where: { brokerInvoiceId: bi.id } })` → if not found, reserve it. Simpler replacement:

```typescript
if (bi) {
  const existingLink = await prisma.affiliateInvoice.findUnique({ where: { brokerInvoiceId: bi.id } });
  if (!existingLink) brokerInvoiceId = bi.id;
}
```

- [ ] **Step 2: Extend finance router**

Add to `src/server/routers/finance.ts`:

```typescript
import { generateBrokerInvoice, generateAffiliateInvoice } from "@/server/finance/invoice-generate";

// inside createTRPCRouter({ ... })
generateBrokerInvoice: protectedProcedure
  .input(z.object({ brokerId: z.string(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() }))
  .mutation(({ input }) => generateBrokerInvoice(input.brokerId, { start: input.periodStart, end: input.periodEnd })),

generateAffiliateInvoice: protectedProcedure
  .input(z.object({ affiliateId: z.string(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() }))
  .mutation(({ input }) => generateAffiliateInvoice(input.affiliateId, { start: input.periodStart, end: input.periodEnd })),
```

- [ ] **Step 3: Integration test**

Create `tests/integration/finance-invoice-generate.test.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { generateBrokerInvoice, generateAffiliateInvoice } from "@/server/finance/invoice-generate";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAffiliate, seedBroker, seedLead } from "../helpers/seed";

const PERIOD = { start: new Date("2026-06-01"), end: new Date("2026-07-01") };

describe("invoice generation", () => {
  beforeEach(async () => { await resetDb(); });

  it("builds a broker invoice and links a matching affiliate invoice 1:1", async () => {
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: { brokerId: broker.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(200), activeFrom: new Date("2026-01-01") },
    });
    await prisma.affiliatePayoutRule.create({
      data: { affiliateId: aff.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(150), activeFrom: new Date("2026-01-01") },
    });
    const lead = await seedLead({ affiliateId: aff.id, brokerId: broker.id });
    await prisma.conversion.create({
      data: { leadId: lead.id, kind: "FTD", amount: new Prisma.Decimal(500), occurredAt: new Date("2026-06-15"), brokerReportedAt: new Date() },
    });

    const bi = await generateBrokerInvoice(broker.id, PERIOD);
    expect(bi.amount.toString()).toBe("200");

    const ai = await generateAffiliateInvoice(aff.id, PERIOD);
    expect(ai.amount.toString()).toBe("150");
    expect(ai.brokerInvoiceId).toBe(bi.id);
  });

  it("does not link when conversions span multiple brokers (MVP 1:1 rule)", async () => {
    const aff = await seedAffiliate();
    const broker1 = await seedBroker();
    const broker2 = await seedBroker();
    await prisma.brokerPayoutRule.createMany({
      data: [
        { brokerId: broker1.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(100), activeFrom: new Date("2026-01-01") },
        { brokerId: broker2.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(100), activeFrom: new Date("2026-01-01") },
      ],
    });
    await prisma.affiliatePayoutRule.create({
      data: { affiliateId: aff.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(50), activeFrom: new Date("2026-01-01") },
    });
    const l1 = await seedLead({ affiliateId: aff.id, brokerId: broker1.id });
    const l2 = await seedLead({ affiliateId: aff.id, brokerId: broker2.id });
    await prisma.conversion.createMany({
      data: [
        { leadId: l1.id, kind: "FTD", amount: new Prisma.Decimal(0), occurredAt: new Date("2026-06-10"), brokerReportedAt: new Date() },
        { leadId: l2.id, kind: "FTD", amount: new Prisma.Decimal(0), occurredAt: new Date("2026-06-12"), brokerReportedAt: new Date() },
      ],
    });
    await generateBrokerInvoice(broker1.id, PERIOD);
    await generateBrokerInvoice(broker2.id, PERIOD);

    const ai = await generateAffiliateInvoice(aff.id, PERIOD);
    expect(ai.brokerInvoiceId).toBeNull();
  });
});
```

- [ ] **Step 4: Run**

Run:
```bash
pnpm vitest run tests/integration/finance-invoice-generate.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/finance/invoice-generate.ts src/server/routers/finance.ts tests/integration/finance-invoice-generate.test.ts
git commit -m "feat(finance): generateBrokerInvoice / generateAffiliateInvoice + 1:1 linkage"
```

---

### Task 7: `/dashboard/finance/pnl` page

**Files:**
- Create: `src/app/(dashboard)/finance/pnl/page.tsx`
- Create: `src/app/(dashboard)/finance/_components/filter-bar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` (add Finance nav group)

- [ ] **Step 1: Add nav links**

In `src/app/(dashboard)/layout.tsx`, add a "Finance" section to the sidebar with entries:
- P&L → `/dashboard/finance/pnl`
- Invoices → `/dashboard/finance/invoices`
- CRG Cohorts → `/dashboard/finance/crg-cohorts`

Follow the existing nav-item pattern already established for Leads / Routing / Brokers. Keyboard shortcut `F` reserved for Finance (verify it is not already taken; if taken, pick the next free letter).

- [ ] **Step 2: Filter bar component**

Create `src/app/(dashboard)/finance/_components/filter-bar.tsx`:

```typescript
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export type FinanceFilters = {
  from: Date;
  to: Date;
  affiliateId?: string;
  brokerId?: string;
  geo?: string;
};

export function FinanceFilterBar({ value, onChange }: {
  value: FinanceFilters;
  onChange: (v: FinanceFilters) => void;
}) {
  // Load affiliate and broker options for the selects
  const affiliates = trpc.affiliates.list.useQuery({});
  const brokers = trpc.brokers.list.useQuery({});

  return (
    <div className="flex gap-2 items-end py-2 border-b border-[var(--line)]">
      {/* date range, affiliate select, broker select, geo input, apply button */}
      {/* follow crm-design SPEC.md density conventions (13px body, compact padding) */}
      {/* wire each field to onChange({ ...value, <field>: next }) */}
    </div>
  );
}
```

- [ ] **Step 3: P&L page**

Create `src/app/(dashboard)/finance/pnl/page.tsx`:

```typescript
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FinanceFilterBar, type FinanceFilters } from "../_components/filter-bar";

export default function PnLPage() {
  const [filters, setFilters] = useState<FinanceFilters>({
    from: new Date(Date.now() - 30 * 24 * 3600_000),
    to: new Date(),
  });
  const pnl = trpc.finance.pnl.useQuery(filters);

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-3">
        <h1 className="text-[15px] font-semibold">P&L</h1>
      </header>
      <FinanceFilterBar value={filters} onChange={setFilters} />
      {pnl.isLoading ? (
        <div className="p-6 text-[13px] opacity-60">Computing…</div>
      ) : pnl.data ? (
        <div className="grid grid-cols-4 gap-3 p-4">
          <Tile label="Revenue" value={`$${pnl.data.revenue}`} />
          <Tile label="Payout" value={`$${pnl.data.payout}`} />
          <Tile label="Margin" value={`$${pnl.data.margin}`} />
          <Tile label="Margin %" value={`${pnl.data.marginPct.toFixed(1)}%`} />
          <BreakdownTable byKind={pnl.data.breakdown.byKind} />
        </div>
      ) : null}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] p-3">
      <div className="text-[11px] uppercase opacity-60">{label}</div>
      <div className="text-[18px] font-mono mt-1">{value}</div>
    </div>
  );
}

function BreakdownTable({ byKind }: { byKind: Record<string, { count: number; revenue: string; payout: string }> }) {
  return (
    <div className="col-span-4 mt-3">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase opacity-60 border-b border-[var(--line)]">
            <th className="py-2">Kind</th><th>Count</th><th>Revenue</th><th>Payout</th><th>Margin</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byKind).map(([k, v]) => {
            const margin = (parseFloat(v.revenue) - parseFloat(v.payout)).toFixed(2);
            return (
              <tr key={k} className="border-b border-[var(--line)]">
                <td className="py-2 font-mono">{k}</td>
                <td>{v.count}</td>
                <td className="font-mono">${v.revenue}</td>
                <td className="font-mono">${v.payout}</td>
                <td className="font-mono">${margin}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Smoke**

Run:
```bash
pnpm dev
```
Navigate to `/dashboard/finance/pnl`. Expected: page renders with zero-state tiles when DB is empty. Seed a few conversions and confirm values update on refetch.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/app/(dashboard)/finance/pnl/page.tsx src/app/(dashboard)/finance/_components/filter-bar.tsx src/app/(dashboard)/layout.tsx
git commit -m "feat(finance-ui): P&L dashboard page + filter bar"
```

---

### Task 8: `/dashboard/finance/invoices` page

**Files:**
- Create: `src/app/(dashboard)/finance/invoices/page.tsx`
- Create: `src/app/(dashboard)/finance/invoices/_components/invoice-drawer.tsx`

- [ ] **Step 1: List + tabs + drawer**

Create `src/app/(dashboard)/finance/invoices/page.tsx`:

```typescript
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { InvoiceDrawer } from "./_components/invoice-drawer";

export default function InvoicesPage() {
  const [tab, setTab] = useState<"broker" | "affiliate">("broker");
  const [openId, setOpenId] = useState<string | null>(null);
  const invoices = trpc.finance.listInvoices.useQuery({ tab });

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-3 flex items-center gap-3">
        <h1 className="text-[15px] font-semibold">Invoices</h1>
        <Tabs value={tab} onChange={setTab} />
      </header>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase opacity-60 border-b border-[var(--line)]">
              <th className="py-2 pl-4">Period</th><th>Amount</th><th>Currency</th><th>Status</th><th>Linked</th><th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.data?.map((inv) => (
              <tr
                key={inv.id}
                onClick={() => setOpenId(inv.id)}
                className="cursor-pointer hover:bg-[var(--hover)] border-b border-[var(--line)]"
              >
                <td className="py-2 pl-4 font-mono">
                  {inv.periodStart.toISOString().slice(0, 10)} → {inv.periodEnd.toISOString().slice(0, 10)}
                </td>
                <td className="font-mono">${inv.amount.toString()}</td>
                <td>{inv.currency}</td>
                <td>
                  <StatusBadge status={inv.status} />
                </td>
                <td>{"brokerInvoiceId" in inv && inv.brokerInvoiceId ? "✓" : ""}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InvoiceDrawer id={openId} kind={tab} onClose={() => setOpenId(null)} />
    </div>
  );
}

function Tabs({ value, onChange }: { value: "broker" | "affiliate"; onChange: (v: "broker" | "affiliate") => void }) {
  return (
    <div className="flex gap-0 text-[12px]">
      {(["broker", "affiliate"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-3 py-1 border-b-2 ${value === t ? "border-[var(--accent)]" : "border-transparent opacity-60"}`}
        >{t}</button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "DRAFT" | "SENT" | "PAID" }) {
  return <span className={`px-2 py-0.5 rounded text-[11px] bg-[var(--status-${status.toLowerCase()})]`}>{status}</span>;
}
```

- [ ] **Step 2: Invoice drawer**

Create `src/app/(dashboard)/finance/invoices/_components/invoice-drawer.tsx`:

```typescript
"use client";
import { trpc } from "@/lib/trpc";

export function InvoiceDrawer({ id, kind, onClose }: {
  id: string | null;
  kind: "broker" | "affiliate";
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const markPaid = trpc.finance.markInvoicePaid.useMutation({
    onSuccess: () => { utils.finance.listInvoices.invalidate(); onClose(); },
  });
  const pdf = trpc.finance.exportInvoicePdf.useQuery({ kind, id: id ?? "" }, { enabled: id !== null });

  if (id === null) return null;
  return (
    <aside className="fixed right-0 top-0 w-[540px] h-full bg-[var(--bg-drawer)] border-l border-[var(--line)] overflow-auto">
      <header className="p-4 flex items-center justify-between border-b border-[var(--line)]">
        <h2 className="text-[14px] font-semibold">Invoice {id}</h2>
        <button type="button" onClick={onClose} aria-label="close">×</button>
      </header>
      <div className="p-4 space-y-3 text-[13px]">
        {pdf.data ? (
          <>
            <div className="flex gap-2">
              <span className="opacity-60">Period:</span>
              <span className="font-mono">
                {new Date(pdf.data.invoice.periodStart).toISOString().slice(0, 10)} → {new Date(pdf.data.invoice.periodEnd).toISOString().slice(0, 10)}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="opacity-60">Amount:</span>
              <span className="font-mono">${pdf.data.invoice.amount}</span>
            </div>
            <pre className="bg-[var(--bg-alt)] p-3 rounded text-[11px] overflow-auto">
              {JSON.stringify(pdf.data.invoice.lineItems, null, 2)}
            </pre>
            <div className="flex gap-2">
              <button type="button" disabled={markPaid.isPending} onClick={() => markPaid.mutate({ kind, id })}>Mark paid</button>
              <button type="button" onClick={() => alert("PDF export is a JSON placeholder in v1.0 — see console")}>Export PDF</button>
            </div>
          </>
        ) : (
          <div className="opacity-60">Loading…</div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Smoke + commit**

Run:
```bash
pnpm dev
```
Navigate to `/dashboard/finance/invoices`. Expected: tabs switch between Broker / Affiliate, invoice row opens drawer, Mark Paid transitions status.

Commit:
```bash
git add src/app/(dashboard)/finance/invoices/page.tsx src/app/(dashboard)/finance/invoices/_components/invoice-drawer.tsx
git commit -m "feat(finance-ui): invoices page (tabs, drawer, mark paid, export stub)"
```

---

### Task 9: `/dashboard/finance/crg-cohorts` page

**Files:**
- Create: `src/app/(dashboard)/finance/crg-cohorts/page.tsx`

- [ ] **Step 1: Cohort list + status**

```typescript
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function CrgCohortsPage() {
  const [brokerId, setBrokerId] = useState<string | undefined>(undefined);
  const brokers = trpc.brokers.list.useQuery({});
  const cohorts = trpc.finance.listCrgCohorts.useQuery({ brokerId });

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 pt-3 flex items-center gap-3">
        <h1 className="text-[15px] font-semibold">CRG Cohorts</h1>
        <select
          value={brokerId ?? ""}
          onChange={(e) => setBrokerId(e.target.value || undefined)}
          className="border border-[var(--line)] rounded px-2 py-1 text-[12px]"
        >
          <option value="">All brokers</option>
          {brokers.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </header>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase opacity-60 border-b border-[var(--line)]">
              <th className="py-2 pl-4">Broker</th>
              <th>Period</th>
              <th>Size</th>
              <th>FTD</th>
              <th>Rate</th>
              <th>Guaranteed</th>
              <th>Status</th>
              <th>Shortfall</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.data?.map((c) => (
              <tr key={c.id} className="border-b border-[var(--line)]">
                <td className="py-2 pl-4 font-mono">{c.brokerId.slice(0, 8)}</td>
                <td className="font-mono">{c.cohortStart.toISOString().slice(0, 10)}</td>
                <td>{c.cohortSize}</td>
                <td>{c.ftdCount}</td>
                <td className="font-mono">{c.ftdRate ? `${(Number(c.ftdRate) * 100).toFixed(1)}%` : "—"}</td>
                <td className="font-mono">{c.guaranteedRate ? `${(Number(c.guaranteedRate) * 100).toFixed(1)}%` : "—"}</td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-[11px] bg-[var(--status-${c.status.toLowerCase()})]`}>
                    {c.status}
                  </span>
                </td>
                <td className="font-mono">{c.shortfallAmount ? `$${c.shortfallAmount.toString()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/app/(dashboard)/finance/crg-cohorts/page.tsx
git commit -m "feat(finance-ui): CRG cohorts page (status + shortfall)"
```

---

### Task 10: Broker payout rule editor

**Files:**
- Create: `src/app/(dashboard)/brokers/[id]/payout/page.tsx`
- Create: `src/app/(dashboard)/brokers/[id]/payout/_components/payout-rule-form.tsx`
- Modify: `src/app/(dashboard)/brokers/[id]/page.tsx` or layout (add tab link)

- [ ] **Step 1: Payout rule form**

Create `src/app/(dashboard)/brokers/[id]/payout/_components/payout-rule-form.tsx`:

```typescript
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

type Kind = "CPA_FIXED" | "CPA_CRG" | "REV_SHARE" | "HYBRID";

export function PayoutRuleForm({ brokerId, onSaved }: { brokerId: string; onSaved: () => void }) {
  const [kind, setKind] = useState<Kind>("CPA_FIXED");
  const [cpaAmount, setCpaAmount] = useState("");
  const [crgRate, setCrgRate] = useState("");
  const [revShareRate, setRevShareRate] = useState("");
  const [minQualifiedDeposit, setMinQualifiedDeposit] = useState("");
  const [activeFrom, setActiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [activeTo, setActiveTo] = useState("");

  const upsert = trpc.finance.upsertBrokerPayoutRule.useMutation({ onSuccess: onSaved });

  return (
    <form
      className="space-y-2 text-[13px]"
      onSubmit={(e) => {
        e.preventDefault();
        upsert.mutate({
          brokerId,
          kind,
          cpaAmount: cpaAmount || undefined,
          crgRate: crgRate || undefined,
          revShareRate: revShareRate || undefined,
          minQualifiedDeposit: minQualifiedDeposit || undefined,
          activeFrom: new Date(activeFrom),
          activeTo: activeTo ? new Date(activeTo) : undefined,
        });
      }}
    >
      <label className="block">
        <span className="text-[11px] opacity-60 uppercase">Kind</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="block w-full border border-[var(--line)] rounded px-2 py-1">
          <option value="CPA_FIXED">CPA (fixed)</option>
          <option value="CPA_CRG">CPA with CRG</option>
          <option value="REV_SHARE">Revenue share</option>
          <option value="HYBRID">Hybrid (CPA + rev share)</option>
        </select>
      </label>
      {(kind === "CPA_FIXED" || kind === "CPA_CRG" || kind === "HYBRID") && (
        <label className="block">
          <span className="text-[11px] opacity-60 uppercase">CPA amount (USD)</span>
          <input type="number" step="0.01" value={cpaAmount} onChange={(e) => setCpaAmount(e.target.value)} className="block w-full border border-[var(--line)] rounded px-2 py-1 font-mono" />
        </label>
      )}
      {kind === "CPA_CRG" && (
        <label className="block">
          <span className="text-[11px] opacity-60 uppercase">Guaranteed FTD rate (0..1)</span>
          <input type="number" step="0.0001" min="0" max="1" value={crgRate} onChange={(e) => setCrgRate(e.target.value)} className="block w-full border border-[var(--line)] rounded px-2 py-1 font-mono" />
        </label>
      )}
      {(kind === "REV_SHARE" || kind === "HYBRID") && (
        <label className="block">
          <span className="text-[11px] opacity-60 uppercase">Revenue share (0..1)</span>
          <input type="number" step="0.0001" min="0" max="1" value={revShareRate} onChange={(e) => setRevShareRate(e.target.value)} className="block w-full border border-[var(--line)] rounded px-2 py-1 font-mono" />
        </label>
      )}
      {(kind === "CPA_FIXED" || kind === "CPA_CRG" || kind === "HYBRID") && (
        <label className="block">
          <span className="text-[11px] opacity-60 uppercase">Min qualified deposit (USD)</span>
          <input type="number" step="0.01" value={minQualifiedDeposit} onChange={(e) => setMinQualifiedDeposit(e.target.value)} className="block w-full border border-[var(--line)] rounded px-2 py-1 font-mono" />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] opacity-60 uppercase">Active from</span>
          <input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className="block w-full border border-[var(--line)] rounded px-2 py-1 font-mono" />
        </label>
        <label className="block">
          <span className="text-[11px] opacity-60 uppercase">Active to (optional)</span>
          <input type="date" value={activeTo} onChange={(e) => setActiveTo(e.target.value)} className="block w-full border border-[var(--line)] rounded px-2 py-1 font-mono" />
        </label>
      </div>
      <button type="submit" disabled={upsert.isPending} className="px-3 py-1 bg-[var(--accent)] text-white rounded">
        {upsert.isPending ? "Saving…" : "Save rule"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Page**

Create `src/app/(dashboard)/brokers/[id]/payout/page.tsx`:

```typescript
"use client";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { PayoutRuleForm } from "./_components/payout-rule-form";

export default function BrokerPayoutPage() {
  const params = useParams<{ id: string }>();
  const brokerId = params?.id;
  const utils = trpc.useUtils();
  const rules = trpc.finance.listBrokerPayoutRules.useQuery({ brokerId: brokerId! }, { enabled: !!brokerId });

  if (!brokerId) return null;

  return (
    <div className="p-4 space-y-4 text-[13px]">
      <h1 className="text-[15px] font-semibold">Payout rules</h1>
      <section>
        <h2 className="text-[12px] uppercase opacity-60 mb-2">Active & historical</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase opacity-60 border-b border-[var(--line)]">
              <th>Kind</th><th>CPA</th><th>CRG</th><th>Rev share</th><th>From</th><th>To</th>
            </tr>
          </thead>
          <tbody>
            {rules.data?.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)]">
                <td className="py-1 font-mono">{r.kind}</td>
                <td className="font-mono">{r.cpaAmount?.toString() ?? "—"}</td>
                <td className="font-mono">{r.crgRate?.toString() ?? "—"}</td>
                <td className="font-mono">{r.revShareRate?.toString() ?? "—"}</td>
                <td className="font-mono">{r.activeFrom.toISOString().slice(0, 10)}</td>
                <td className="font-mono">{r.activeTo?.toISOString().slice(0, 10) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="text-[12px] uppercase opacity-60 mb-2">Add / update rule</h2>
        <PayoutRuleForm brokerId={brokerId} onSaved={() => utils.finance.listBrokerPayoutRules.invalidate({ brokerId })} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Wire tab in broker detail layout**

In the broker detail layout (`src/app/(dashboard)/brokers/[id]/layout.tsx` or the existing drawer / tab nav), add a link labelled "Payout" routing to `/dashboard/brokers/<id>/payout`.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/app/(dashboard)/brokers/[id]/payout/page.tsx src/app/(dashboard)/brokers/[id]/payout/_components/payout-rule-form.tsx src/app/(dashboard)/brokers/[id]/layout.tsx
git commit -m "feat(finance-ui): broker payout rule editor"
```

---

### Task 11: Affiliate payout rule editor

**Files:**
- Create: `src/app/(dashboard)/affiliates/[id]/payout/page.tsx`
- Create: `src/app/(dashboard)/affiliates/[id]/payout/_components/affiliate-payout-rule-form.tsx`
- Modify: affiliate detail layout (add tab)

- [ ] **Step 1: Form (same shape as broker editor but with optional `brokerId` scoping)**

Create `src/app/(dashboard)/affiliates/[id]/payout/_components/affiliate-payout-rule-form.tsx`:

Structure is identical to the broker form in Task 10, with these differences:
- Add a `brokerId` select above Kind: "Applies to: (all brokers) | <broker-name>…". Empty → `null` on the input.
- Remove `minQualifiedDeposit` — that field is broker-side only.
- Call `trpc.finance.upsertAffiliatePayoutRule` instead of the broker variant.

- [ ] **Step 2: Page**

Create `src/app/(dashboard)/affiliates/[id]/payout/page.tsx`. Mirror the broker payout page structure, calling `trpc.finance.listAffiliatePayoutRules` and passing `affiliateId`.

- [ ] **Step 3: Wire tab in affiliate detail layout**

Add "Payout" link to the affiliate detail layout.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/app/(dashboard)/affiliates/[id]/payout/page.tsx src/app/(dashboard)/affiliates/[id]/payout/_components/affiliate-payout-rule-form.tsx src/app/(dashboard)/affiliates/[id]/layout.tsx
git commit -m "feat(finance-ui): affiliate payout rule editor"
```

---

### Task 12: Sprint 6 integration smoke + final wiring

**Files:**
- Create: `tests/integration/sprint6-smoke.test.ts`
- Modify: `CLAUDE.md` (record sprint deliverables)

- [ ] **Step 1: End-to-end smoke test**

Create `tests/integration/sprint6-smoke.test.ts`:

```typescript
import { Prisma } from "@prisma/client";
import { POST as postbackPOST } from "@/app/api/v1/postbacks/[brokerId]/route";
import { appRouter } from "@/server/routers/_app";
import { runCrgCohortSettle } from "@/server/jobs/crg-cohort-settle";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";
import { seedAdminSession, seedAffiliate, seedBroker, seedLead } from "../helpers/seed";
import { signPostback } from "../helpers/postback-signature";

describe("sprint 6 smoke — end-to-end finance pipeline", () => {
  beforeEach(async () => { await resetDb(); });

  it("postback → conversion → pnl → invoice round trip", async () => {
    const ctx = await seedAdminSession();
    const aff = await seedAffiliate();
    const broker = await seedBroker({
      statusMapping: { dep_1: "FTD" },
      postbackSecret: "s3cret",
    });
    const lead = await seedLead({ affiliateId: aff.id, brokerId: broker.id, brokerExternalId: "brx-1" });

    await prisma.brokerPayoutRule.create({
      data: { brokerId: broker.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(200), activeFrom: new Date("2026-01-01") },
    });
    await prisma.affiliatePayoutRule.create({
      data: { affiliateId: aff.id, kind: "CPA_FIXED", cpaAmount: new Prisma.Decimal(150), activeFrom: new Date("2026-01-01") },
    });

    // 1) postback emits FTD conversion
    const body = JSON.stringify({ broker_lead_id: "brx-1", status: "dep_1", deposit_amount: "500" });
    const sig = signPostback(body, broker.postbackSecret);
    await postbackPOST(
      new Request(`http://localhost/api/v1/postbacks/${broker.id}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-signature": sig },
        body,
      }),
      { params: Promise.resolve({ brokerId: broker.id }) },
    );

    // 2) pnl reflects
    const caller = appRouter.createCaller(ctx);
    const pnl = await caller.finance.pnl({ from: new Date("2026-01-01"), to: new Date("2030-01-01") });
    expect(pnl.revenue).toBe("200");
    expect(pnl.payout).toBe("150");
    expect(pnl.margin).toBe("50");
    expect(pnl.conversionCount).toBe(1);

    // 3) generate invoices + link
    const bi = await caller.finance.generateBrokerInvoice({ brokerId: broker.id, periodStart: new Date("2026-01-01"), periodEnd: new Date("2030-01-01") });
    const ai = await caller.finance.generateAffiliateInvoice({ affiliateId: aff.id, periodStart: new Date("2026-01-01"), periodEnd: new Date("2030-01-01") });
    expect(bi.amount.toString()).toBe("200");
    expect(ai.amount.toString()).toBe("150");
    expect(ai.brokerInvoiceId).toBe(bi.id);

    // 4) mark paid transitions status
    const paid = await caller.finance.markInvoicePaid({ kind: "broker", id: bi.id });
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).not.toBeNull();

    // 5) PDF export returns placeholder envelope
    const pdf = await caller.finance.exportInvoicePdf({ kind: "broker", id: bi.id });
    expect(pdf.placeholder).toBe(true);
    expect(pdf.invoice.amount).toBe("200");
  });

  it("crg settlement yields shortfall line item on invoice", async () => {
    const ctx = await seedAdminSession();
    const aff = await seedAffiliate();
    const broker = await seedBroker();
    await prisma.brokerPayoutRule.create({
      data: { brokerId: broker.id, kind: "CPA_CRG", cpaAmount: new Prisma.Decimal(100), crgRate: new Prisma.Decimal("0.20"), activeFrom: new Date("2026-01-01") },
    });
    // 10 leads accepted, 1 FTD
    for (let i = 0; i < 10; i++) {
      const lead = await seedLead({ affiliateId: aff.id, brokerId: broker.id, acceptedAt: new Date("2026-06-02T12:00:00Z") });
      if (i === 0) {
        await prisma.conversion.create({
          data: { leadId: lead.id, kind: "FTD", amount: new Prisma.Decimal(500), occurredAt: new Date("2026-06-10"), brokerReportedAt: new Date() },
        });
      }
    }
    await runCrgCohortSettle(new Date("2026-07-15T04:00:00Z"));

    const caller = appRouter.createCaller(ctx);
    const bi = await caller.finance.generateBrokerInvoice({
      brokerId: broker.id,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-07-01"),
    });
    const items = bi.lineItems as Array<{ conversionId: string; payoutAmount: string }>;
    const crgLine = items.find((li) => li.conversionId.startsWith("crg-cohort-"));
    expect(crgLine).toBeDefined();
    expect(crgLine?.payoutAmount).toBe("100");
  });
});
```

- [ ] **Step 2: Run full suite**

Run:
```bash
pnpm test
pnpm typecheck
pnpm lint
```
Expected: all pass, zero errors.

- [ ] **Step 3: Update `CLAUDE.md`**

Append to `crm-node/CLAUDE.md`:

```markdown
## Finance / P&L / CRG / Invoicing (EPIC-12, v1.0 Sprint 6)

- **Models:** `Conversion`, `BrokerPayoutRule`, `AffiliatePayoutRule`, `CRGCohort`, `BrokerInvoice`, `AffiliateInvoice`.
- **Conversion ingest:** broker postback handler emits `Conversion` on REGISTRATION / FTD / REDEPOSIT via `src/server/finance/emit-conversion.ts`; REGISTRATION + FTD are unique per lead, REDEPOSIT can repeat.
- **P&L service:** `src/server/finance/pnl.ts::computePnL` + `payout-rule-resolver.ts` (time-based resolution + affiliate per-broker scoping + global fallback).
- **CRG cron:** `src/server/jobs/crg-cohort-settle.ts` runs daily at 03:30 UTC; materializes weekly cohorts per broker with CPA_CRG rule; settles cohorts older than 30 days; shortfall = (guaranteed − actual) × size × CPA.
- **Invoice:** `src/server/finance/invoice-generate.ts::generateBrokerInvoice` / `generateAffiliateInvoice`; 1:1 linkage when conversions span exactly one broker for the period; PDF export returns JSON placeholder (real PDF in v2.0).
- **tRPC:** `finance.pnl`, `finance.{list,upsert}{Broker,Affiliate}PayoutRules`, `finance.listInvoices`, `finance.markInvoicePaid`, `finance.exportInvoicePdf`, `finance.{generateBroker,generateAffiliate}Invoice`, `finance.listCrgCohorts`.
- **UI:** `/dashboard/finance/{pnl,invoices,crg-cohorts}` + `/dashboard/brokers/[id]/payout` + `/dashboard/affiliates/[id]/payout`.
- **v1.0 constraints locked:** USD only, 1:1 broker↔affiliate linkage, no partial payments, no chargebacks, no manual conversion entry.
```

- [ ] **Step 4: Commit + tag**

Run:
```bash
git add CLAUDE.md tests/integration/sprint6-smoke.test.ts
git commit -m "test+docs: EPIC-12 sprint 6 smoke + CLAUDE.md deliverables"
git tag v1.0-sprint-6-complete
```

- [ ] **Step 5: Retrospective (append at bottom of this file)**

Append a `## Retrospective` section to this plan covering: what shipped vs planned, deferred items (if any), time per task, surprises. Commit:

```bash
git add docs/superpowers/plans/2026-06-30-v1-sprint-6-pnl-crg-invoicing.md
git commit -m "docs(plan): s6 retrospective"
```

---

## Success criteria for Sprint 6

- `pnpm test` passes — all existing tests plus ≥15 new ones across finance-conversion-emit, finance-pnl (unit + integration), finance-router, finance-crg-settle, finance-invoice-generate, sprint6-smoke.
- `pnpm lint` + `pnpm typecheck` zero errors.
- Manual smoke: with a seeded broker having a `CPA_FIXED` rule and an affiliate with a matching rule, posting a broker FTD postback produces a `Conversion` row, `/dashboard/finance/pnl` shows non-zero revenue/payout/margin, `finance.generateBrokerInvoice` + `finance.generateAffiliateInvoice` produce linked invoices, and the drawer Mark-Paid action transitions both to `PAID`.
- CRG cohort cron: with a seeded `CPA_CRG` broker and a 10-lead cohort yielding 1 FTD against a 20% guarantee, running the cron produces a `SHORTFALL` cohort with `shortfallAmount = 100`.
- No behavioral regression in lead intake, routing, or existing postback handling (existing tests unchanged).

## Operational follow-ups (out of sprint, tracked for v1.5)

- **Manual conversion entry** (admin override for brokers without postback webhooks) — v1.5.
- **Partial payment + chargeback state machine** on invoices — v2.0.
- **Many-to-many invoice linkage** (one broker invoice spans multiple affiliates) — v2.0.
- **Real PDF rendering** (`@react-pdf/renderer` or equivalent) — v2.0.
- **Multi-currency with FX snapshot at invoice time** — v2.0.
- **Conversion backfill job** for historical leads that accumulated before broker postback went live — ad-hoc script, not productized.
- **Clawback invoice** for CRG shortfalls (today the shortfall is a positive line item inside the next broker invoice; v2.0 splits it into a dedicated credit-note document).
