# Docs Subsite Plan #3 — User-Facing MDX Content (v1 Scope: Top 10 Blocks)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder MDX pages from plan #2 with real human-layer documentation for the 10 operator-facing blocks that block sales + onboarding, plus 3 cross-cutting top-level pages (getting-started, glossary, architecture overview). Each block ships 3 artifacts: `index.mdx` (overview, 3–5 min read), `how-to-*.mdx` (recipe with concrete example), `concepts.mdx` (glossary + deep-concept explanation). Everything lives in `content/docs/<block>/`, audience=`human`.

**Architecture:** Pure content. No new code. Each task writes or revises MDX for one block. All pages cross-link: `index.mdx` links to the block's recipe and concepts pages plus the corresponding auto-generated `_deep/*` files (rendered as "API reference" cards that deep-link to the sidebar-hidden deep pages — plan #2 ensures `_deep/` isn't in nav, but authors still link directly to `_deep/*` anchors when needed). Each page uses the same MDX components defined in plan #2 (`docsMdxComponents`). Callouts (`<Callout type="warning">…</Callout>`) are added as shared components here.

**Tech Stack:** MDX + existing pipeline. One new shared component: `<Callout>`.

**Spec:** Depends on plan #2 (subsite skeleton) merged. Parallel-friendly with plans #4/#5/#6 (they don't block on content).

**v1 block scope (10):**
1. `intake` — external lead push
2. `routing-engine` — Flow / WRR / Slots-Chance / caps
3. `broker-push` — what happens after routing picks a broker
4. `postback-status-groups` — how brokers tell us about lead status
5. `autologin` — auto-session to the broker for affiliates
6. `conversions-crg` — conversion ingest, P&L, CRG
7. `billing-subscription` — platform billing (Stripe)
8. `multi-tenancy` — for white-label admins
9. `webhooks-outbound` — affiliate postbacks
10. `analytics` — BI report builder

**Cross-cutting:** `getting-started/index.mdx`, `glossary/index.mdx`, `architecture/index.mdx` (these 3 need a minor block-catalog extension; see Task 1).

**Preflight:** Plans #1 and #2 merged. `pnpm dev` serves `/docs` with placeholder pages. `content/docs/<block>/_deep/*.md` files exist for every block.

---

### Task 1: Extend block catalog with 3 cross-cutting meta blocks

**Files:**
- Modify: `crm-node/scripts/docs-regen/block-catalog.ts`
- Modify: `crm-node/tests/unit/docs-regen/block-catalog.test.ts`

- [ ] **Step 1: Add meta blocks to catalog**

Append to `BLOCK_CATALOG` in `block-catalog.ts`:
```ts
  {
    id: "getting-started",
    title: "Getting Started",
    order: 0,
    oneLineDescription: "Landing pages — install, first lead push, glossary, architecture tour.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: [],
    jobNames: [],
  },
  {
    id: "glossary",
    title: "Glossary",
    order: 99,
    oneLineDescription: "Canonical terminology — affiliate, broker, flow, cap, shave, postback, …",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: [],
    jobNames: [],
  },
  {
    id: "architecture",
    title: "Architecture Tour",
    order: 100,
    oneLineDescription: "System diagram + data flow + module map.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: [],
    jobNames: [],
  },
```

- [ ] **Step 2: Update catalog test**

Modify `block-catalog.test.ts` — extend the expected ids array to include the three new entries (sorted): add `"architecture"`, `"getting-started"`, `"glossary"`.

- [ ] **Step 3: Run**

Run: `pnpm vitest run tests/unit/docs-regen/block-catalog.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add crm-node/scripts/docs-regen/block-catalog.ts crm-node/tests/unit/docs-regen/block-catalog.test.ts
git commit -m "feat(docs): add getting-started + glossary + architecture meta blocks"
```

---

### Task 2: Shared `<Callout>` + `<DeepRefCard>` MDX components

**Files:**
- Create: `crm-node/src/components/docs/Callout.tsx`
- Create: `crm-node/src/components/docs/DeepRefCard.tsx`
- Modify: `crm-node/src/components/docs/mdx.tsx`
- Test: `crm-node/tests/unit/docs-callout.test.tsx`

- [ ] **Step 1: Implement Callout**

```tsx
// crm-node/src/components/docs/Callout.tsx
import { cn } from "@/lib/utils";

const STYLES = {
  info:    "border-sky-500/50 bg-sky-500/5 text-sky-800 dark:text-sky-100",
  warning: "border-amber-500/50 bg-amber-500/5 text-amber-900 dark:text-amber-100",
  danger:  "border-rose-500/50 bg-rose-500/5 text-rose-900 dark:text-rose-100",
  success: "border-emerald-500/50 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100",
} as const;

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: keyof typeof STYLES;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={cn("my-4 rounded-md border-l-4 p-4", STYLES[type])}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="text-sm leading-6">{children}</div>
    </aside>
  );
}
```

- [ ] **Step 2: Implement DeepRefCard**

```tsx
// crm-node/src/components/docs/DeepRefCard.tsx
// Human-layer card that points the reader to an AI-deep anchor (or rather to a non-nav file),
// used by authors when they want to acknowledge "deep details live over there — for AI & power users".
import Link from "next/link";

export function DeepRefCard({
  title,
  description,
  block,
  kind,
  anchor,
}: {
  title: string;
  description?: string;
  block: string;
  kind: "prisma" | "trpc" | "rest" | "env" | "errors" | "telegram" | "jobs" | "invariants";
  anchor?: string;
}) {
  const filename =
    kind === "prisma" ? "db-schema"
      : kind === "trpc" ? "trpc-surface"
      : kind === "rest" ? "rest-surface"
      : kind === "env" ? "env-vars"
      : kind === "errors" ? "error-catalog"
      : kind === "telegram" ? "telegram-events"
      : kind === "jobs" ? "jobs"
      : "invariants";
  const href = `/docs/${block}/_deep/${filename}${anchor ? `#${anchor}` : ""}`;
  return (
    <Link
      href={href}
      className="my-4 flex items-center justify-between rounded-md border p-4 hover:bg-muted"
    >
      <div>
        <div className="font-medium">{title}</div>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      <span className="text-sm text-muted-foreground">Deep reference →</span>
    </Link>
  );
}
```

**Important:** `_deep/` routes are blocked by the dynamic page in plan #2 (Task 5: `if (joined.includes("_deep")) notFound()`). Relax that guard to _allow_ human deep-links when `DeepRefCard` emits them — but **only** when the path resolves to an actual `_deep/*` page that the content loader knows about. See Task 3.

- [ ] **Step 3: Register in MDX components + unit test**

Modify `crm-node/src/components/docs/mdx.tsx`:
```ts
import { Callout } from "./Callout";
import { DeepRefCard } from "./DeepRefCard";

export const docsMdxComponents: MDXComponents = {
  // ... existing keys ...
  Callout,
  DeepRefCard,
};
```

Write test:
```tsx
// crm-node/tests/unit/docs-callout.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Callout } from "@/components/docs/Callout";
import { DeepRefCard } from "@/components/docs/DeepRefCard";

describe("Callout", () => {
  it("renders title + body with the right style", () => {
    const { container, getByText } = render(
      <Callout type="warning" title="Heads up">body</Callout>,
    );
    expect(getByText("Heads up")).toBeDefined();
    expect(container.querySelector("aside")?.className).toMatch(/amber/);
  });
});

describe("DeepRefCard", () => {
  it("builds a /docs/<block>/_deep/<kind> href", () => {
    const { container } = render(
      <DeepRefCard block="intake" kind="prisma" title="Lead model" anchor="db-lead" />,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/docs/intake/_deep/db-schema#db-lead");
  });
});
```

Install test deps if missing:
```bash
pnpm add -D @testing-library/react @testing-library/dom jsdom
```
Update `vitest.config.ts` to use `environment: "jsdom"` for `.test.tsx`.

- [ ] **Step 4: Run**

Run: `pnpm vitest run tests/unit/docs-callout.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/src/components/docs crm-node/tests/unit/docs-callout.test.tsx crm-node/vitest.config.ts crm-node/package.json crm-node/pnpm-lock.yaml
git commit -m "feat(docs): Callout + DeepRefCard MDX components"
```

---

### Task 3: Allow human routing to `_deep/*` files via explicit opt-in

**Files:**
- Modify: `crm-node/src/app/(docs)/docs/[...slug]/page.tsx`
- Modify: `crm-node/src/lib/docs-content.ts`
- Test: `crm-node/tests/integration/docs-deep-optin.test.ts`

**Rationale:** Plan #2 blocks `_deep/*` to keep robots/sitemap/nav clean. But `DeepRefCard` needs to link there for power users. We keep it out of nav + sitemap but allow direct route access when the target MDX/MD exists.

- [ ] **Step 1: Modify content loader to expose a single-file getter**

Add to `docs-content.ts`:
```ts
export async function findDocAnywhere(opts: {
  root: string; cwd?: string; slug: string;
}): Promise<DocsPage | null> {
  const full = await loadDocsTree({ ...opts, includeDeep: true });
  const flat = full.flatMap((n) => n.pages);
  return flat.find((p) => p.slug === opts.slug) ?? null;
}
```

- [ ] **Step 2: Replace the blunt 404 with a loader check**

In `[...slug]/page.tsx`:
```tsx
// replace:
//   if (joined.includes("_deep")) notFound();
//   const tree = await loadDocsTree({ root: "content/docs" });
//   const page = findDoc(tree, joined);
// with:
const tree = await loadDocsTree({ root: "content/docs" });
const page =
  findDoc(tree, joined) ??
  (joined.includes("_deep")
    ? await findDocAnywhere({ root: "content/docs", slug: joined })
    : null);
if (!page) notFound();
```

Also: when rendering a deep page, show a banner reminding the reader this is AI-deep reference:
```tsx
{page.audience === "ai-deep" && (
  <Callout type="info" title="AI-deep reference">
    This page is auto-generated granular reference, primarily for the AI assistant.
    For a human-friendly explanation, see the {block.title} overview.
  </Callout>
)}
```

- [ ] **Step 3: Integration test**

```ts
// crm-node/tests/integration/docs-deep-optin.test.ts
import { describe, it, expect } from "vitest";

describe("direct _deep route access", () => {
  it("200s on a real _deep file", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/_deep/db-schema");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/AI-deep reference/);
  });
  it("404s on a fake _deep file", async () => {
    const res = await fetch("http://localhost:3000/docs/intake/_deep/does-not-exist");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 4: Run**

Run:
```bash
pnpm dev
pnpm vitest run tests/integration/docs-deep-optin.test.ts
```
Expected: PASS.

- [ ] **Step 5: Confirm sitemap still excludes deep**

Re-run `tests/integration/docs-sitemap.test.ts` — the sitemap/robots test from plan #2 must still PASS.

- [ ] **Step 6: Commit**

```bash
git add crm-node/src/lib/docs-content.ts crm-node/src/app/\(docs\) crm-node/tests/integration/docs-deep-optin.test.ts
git commit -m "feat(docs): allow direct _deep route access but keep it off-nav/sitemap"
```

---

### Task 4: Cross-cutting content — `getting-started/`

**Files:**
- Create: `crm-node/content/docs/getting-started/index.mdx`
- Create: `crm-node/content/docs/getting-started/push-your-first-lead.mdx`

- [ ] **Step 1: Write `getting-started/index.mdx`**

```mdx
---
audience: human
block: getting-started
source: hand
title: "Getting Started"
description: "What GambChamp CRM is, who it is for, and the fastest path to your first live lead."
order: 1
---

# Getting Started

GambChamp CRM is a **B2B lead-distribution platform** for the crypto/forex affiliate vertical. Affiliates push leads via REST, the platform scores and routes them through broker pools, and every conversion (REGISTRATION / FTD / REDEPOSIT) flows back as a **postback** that settles into the affiliate's payout and the platform's P&L.

## Who uses this product

- **Affiliate managers** publish API keys, tune intake settings, watch lead quality trends.
- **Routing operators** build flows, tune WRR / Slots-Chance algorithms, set per-GEO and per-schedule caps.
- **Finance admins** review CRG cohorts, approve invoices, reconcile with brokers.
- **Super-admins** (white-label) manage tenants and branding.

## The two golden paths

1. **Affiliate push → broker → postback → conversion.** See [Push your first lead](/docs/getting-started/push-your-first-lead).
2. **Admin builds a flow → publishes → leads start routing.** See [Routing overview](/docs/routing-engine/index).

## What to read next

- [Concepts: affiliate, broker, flow, cap, shave](/docs/glossary/index) — 3 minutes.
- [Architecture tour](/docs/architecture/index) — how the pieces fit.
- [Full API reference](/docs/api) — OpenAPI, Scalar-rendered.

<Callout type="info" title="AI assistant (⌥K)">
Every page has a floating chat widget. It answers questions grounded in this documentation; it never invents facts. Click the icon in the bottom-right or use the keyboard shortcut.
</Callout>
```

- [ ] **Step 2: Write `push-your-first-lead.mdx`**

```mdx
---
audience: human
block: getting-started
source: hand
title: "Push your first lead"
description: "End-to-end recipe: get an API key, push a lead, watch the broker postback settle."
order: 2
---

# Push your first lead

This recipe takes you from zero to a live lead + a confirmed broker acknowledgment in under 5 minutes. It assumes you've already signed up via `/signup`.

## 1. Mint an API key

1. Open **Dashboard → Affiliates → \{your affiliate\} → API keys**.
2. Click **New key**. Copy the value; it's shown only once.
3. (Optional) Scope it: IP whitelist + `expiresAt` date.

<Callout type="warning" title="Sandbox first">
Flip **Is sandbox** on the key. Sandbox leads never hit real brokers; outcomes are deterministic by `external_lead_id` prefix. Read [Sandbox behaviour](/docs/intake/concepts#sandbox) to learn the prefix contract.
</Callout>

## 2. Push the lead

```bash
curl -X POST https://api.your-tenant.gambchamp.com/api/v1/leads \
  -H "Authorization: Bearer ak_live_••••••••" \
  -H "X-API-Version: 2026-01" \
  -H "Content-Type: application/json" \
  -d '{
    "external_lead_id": "sandbox-accept-001",
    "email":  "jane.doe@example.com",
    "phone":  "+14155551234",
    "first_name": "Jane",
    "last_name":  "Doe",
    "geo": "US",
    "source": "landing-page-a"
  }'
```

Response on success:

```json
{ "status": "accepted", "lead_id": "ld_••••", "routed_to": "broker-alpha" }
```

## 3. Watch the route

Open **Dashboard → Leads**, filter by your affiliate id, and the lead appears within a second. Click the row — the drawer shows `LeadEvent` history end-to-end: `NEW → FRAUD_SCORED → ROUTED → PUSHED → ACCEPTED`.

## 4. Simulate a postback

Because you're in sandbox, the broker responds within ~1s. The canonical status is mapped via [Status Groups](/docs/postback-status-groups/index). For live keys, the broker pushes to `POST /api/v1/postbacks/<brokerId>` — format is per-broker (see that broker's integration page).

## Common pitfalls

- **400 `rate_limited`** — your signup is rate-limited to 5/hour/IP. Production API keys have per-tenant quotas; see [Billing & subscription](/docs/billing-subscription/index).
- **409 `duplicate_lead`** — the email+phone combination already exists today. Read [Dedup strategies](/docs/intake/concepts#dedup).
- **422 `needs_review`** — fraud score is borderline. The lead is accepted but flagged; see [Manual review](/docs/intake/concepts#borderline).

<DeepRefCard block="intake" kind="rest" title="POST /api/v1/leads — every field, every response" />
```

- [ ] **Step 3: Confirm the pages render**

Run:
```bash
pnpm dev
# browser: http://localhost:3000/docs/getting-started/index
# browser: http://localhost:3000/docs/getting-started/push-your-first-lead
```

- [ ] **Step 4: Commit**

```bash
git add crm-node/content/docs/getting-started
git commit -m "docs(content): getting-started + first-lead recipe"
```

---

### Task 5: Cross-cutting — `glossary/index.mdx`

**Files:**
- Create: `crm-node/content/docs/glossary/index.mdx`

- [ ] **Step 1: Write glossary**

```mdx
---
audience: human
block: glossary
source: hand
title: "Glossary"
description: "Canonical terminology used across the platform."
order: 1
---

# Glossary

## Affiliate
A traffic partner who pushes leads to the platform. Holds one or more API keys. Has payout rules (CPA / REV_SHARE / HYBRID) and intake settings. See [Intake overview](/docs/intake/index).

## API key
A Bearer token scoped to one affiliate + one tenant. Optional IP whitelist, optional expiry, optional sandbox flag. Minted under Dashboard → Affiliates → API keys.

## Broker
A downstream partner that accepts leads and pays for them. Holds its own payout rule, postback signing secret, and status mapping. May support autologin and/or anti-shave (`PENDING_HOLD`). See [Broker push](/docs/broker-push/index).

## Cap
An upper bound on leads routed to a broker, per hour / day / week. Supports per-country discrimination (e.g. "5 US/day, 3 BR/day"). See [Routing — caps](/docs/routing-engine/concepts#caps).

## Conversion
A monetizable event: `REGISTRATION` (broker-side signup), `FTD` (first-time deposit), `REDEPOSIT` (subsequent deposit). Emitted from postbacks. Drives both broker revenue and affiliate payout.

## CRG (Conversion Rate Guarantee)
A broker commitment: "I will convert at least X% of the cohort's leads to FTD; if not, I pay the shortfall." Weekly cohorts (Monday 00:00 UTC → next Monday). See [Conversions & CRG](/docs/conversions-crg/index).

## Flow
A versioned routing policy. A `FlowVersion` holds the graph (branches, algorithms, constraints). Only one version per flow is published at a time.

## Fraud score
A 0–100 integer assembled from signals (blacklist, dedup, VoIP, phone-vs-GEO). `>= autoRejectThreshold` → auto-reject; borderline → `needsReview`. See [Intake concepts](/docs/intake/concepts#fraud).

## Lead
An individual the affiliate wants to monetize. Carries contact info, GEO, source, and a growing event log (LeadEvent). Can be in states `NEW / ROUTED / PUSHED / PENDING_HOLD / ACCEPTED / FTD / REJECTED / REJECTED_FRAUD / FAILED`.

## Postback
An async HTTP callback. **Inbound postback** = broker tells us a lead's state changed. **Outbound postback** = we tell the affiliate a lead's state changed (HMAC-signed, 5-retry ladder).

## Quality score (Q-Leads)
A 0–100 integer computed per lead, based on fraud score + affiliate history + geo/broker fit + (v1.5) affiliate 7-day trend. Used for ranking and UI hints; does not reject leads by itself.

## Shave
Broker fraudulently declining a real lead (to keep the lead + avoid the payout). Detected by the `PENDING_HOLD → DECLINED` transition pattern; sets `Lead.shaveSuspected=true`. See [Anti-shave](/docs/broker-push/concepts#anti-shave).

## Slots-Chance
A routing algorithm. Each eligible broker is assigned a slot weight; a CSPRNG draw picks one. Complements `WRR` (smooth weighted round-robin) for use cases where strict proportions matter.

## Tenant
A white-label customer. Each tenant owns its own affiliates, brokers, leads, flows, etc. Hostname-routed: `network.<slug>.<root>` for the dashboard, `api.<slug>.<root>` for REST intake. See [Multi-tenancy](/docs/multi-tenancy/index).

## WRR (Weighted Round-Robin)
A routing algorithm. Nginx-style smooth-WRR via Redis Lua — each broker's share of routed leads matches its weight over time.
```

- [ ] **Step 2: Commit**

```bash
git add crm-node/content/docs/glossary
git commit -m "docs(content): glossary"
```

---

### Task 6: `intake/` — overview + how-to + concepts

**Files:**
- Create: `crm-node/content/docs/intake/index.mdx` (replaces placeholder)
- Create: `crm-node/content/docs/intake/how-to-send-bulk-leads.mdx`
- Create: `crm-node/content/docs/intake/concepts.mdx`

- [ ] **Step 1: `index.mdx` (overview)**

```mdx
---
audience: human
block: intake
source: hand
title: "Lead intake — overview"
description: "Single lead push, bulk push, dedup, idempotency, sandbox."
order: 1
---

# Lead intake

The intake pipeline is the **only** ingress for affiliate traffic. It validates, scores, and hands off to the [routing engine](/docs/routing-engine/index).

## What happens on a push

```
Affiliate → POST /api/v1/leads (or /bulk)
         ↓ verifyApiKey (IP + expiry + sandbox)
         ↓ rate-limit (Redis sliding-window)
         ↓ quota (billing plan)
         ↓ Zod validation (+ schema registry version)
         ↓ dedup (multi-strategy)
         ↓ idempotency (x-idempotency-key + payload hash)
         ↓ fraud score
         ↓ quality score
         ↓ persist Lead + LeadEvent.NEW
         ↓ enqueue push-lead job (unless auto-rejected)
```

## The three intake endpoints

- **`POST /api/v1/leads`** — single lead, synchronous response with routed-to or rejection.
- **`POST /api/v1/leads/bulk`** — up to 50 leads synchronously (207 multi-status), larger batches async via `POST /api/v1/leads/bulk/:jobId`.
- **`GET /api/v1/schema/leads?version=2026-01`** — discover the Zod schema for a given version.

<Callout type="info" title="Versioning">
We use date-based schema versions (`X-API-Version: 2026-01`). New fields are additive; breaking changes mint a new version. Clients can pin and upgrade at their own pace.
</Callout>

## Recipes

- [Push a single lead](/docs/getting-started/push-your-first-lead)
- [Push a bulk batch safely](/docs/intake/how-to-send-bulk-leads)

## Deep reference

<DeepRefCard block="intake" kind="rest" title="REST surface" description="Every endpoint, every field, every response." />
<DeepRefCard block="intake" kind="prisma" title="Database schema" description="Lead, LeadEvent, IntakeSettings, IdempotencyKey, ApiKey, Affiliate models." />
<DeepRefCard block="intake" kind="errors" title="Error catalog" description="Every rejection code with trigger conditions." />
```

- [ ] **Step 2: `how-to-send-bulk-leads.mdx`**

```mdx
---
audience: human
block: intake
source: hand
title: "How to send bulk leads safely"
description: "Batching, idempotency, sync vs async, partial-failure handling."
order: 2
---

# How to send bulk leads safely

Bulk pushes are for **daily batch reconciliation** (e.g. overnight feeds) or **campaign bursts**. For trickle traffic, use single `/api/v1/leads`.

## Size limits

| Batch size | Behavior                      | Response                          |
|-----------:|:------------------------------|:----------------------------------|
|  1 – 50    | Sync — processed inline       | `207 Multi-Status` with per-lead outcomes |
| 51 – 1000  | Async — enqueued              | `202 Accepted` with `job_id`      |
| >1000      | Rejected                      | `413 Payload Too Large`           |

Async batches: poll `GET /api/v1/leads/bulk/:jobId` for progress until `status=done`.

## Idempotency

Always send an `x-idempotency-key` header. If you retry with the same key + same payload → cached response. Same key + different payload → `409 idempotency_conflict`. Keys live 24h.

```bash
curl -X POST https://api.your-tenant.gambchamp.com/api/v1/leads/bulk \
  -H "Authorization: Bearer ak_live_••••••••" \
  -H "X-API-Version: 2026-01" \
  -H "X-Idempotency-Key: batch-2026-04-22-morning-feed" \
  -H "Content-Type: application/json" \
  -d @leads.json
```

## Partial failures

A `207` response always has shape:

```json
{
  "results": [
    { "index": 0, "status": "accepted", "lead_id": "ld_..." },
    { "index": 1, "status": "rejected", "reason": "duplicate_lead" },
    { "index": 2, "status": "needs_review", "lead_id": "ld_...", "reason_codes": ["phone_country_mismatch"] }
  ]
}
```

**Never** retry a 207 whole-batch on any error — process `results[]` and retry only `rejected` rows with a **different** idempotency key.

## Tuning throughput

- Use keep-alive (`Connection: keep-alive`).
- Batch at 50 for maximum sync throughput.
- Use the schema registry to pin — async clients break if we release a new default version.

<DeepRefCard block="intake" kind="errors" title="Every rejection reason" />
```

- [ ] **Step 3: `concepts.mdx`**

```mdx
---
audience: human
block: intake
source: hand
title: "Concepts: dedup, fraud, borderline, sandbox"
description: "How the intake pipeline decides accept / reject / needs-review."
order: 3
---

# Intake concepts

## Dedup

The pipeline runs several dedup strategies in order. Each strategy is togglable per affiliate via `IntakeSettings`:

1. **`email_phone_daily`** — same `(email, phone)` seen today → `duplicate_lead`.
2. **`external_lead_id_forever`** — same `external_lead_id` ever seen for this affiliate → `duplicate_lead`.
3. **`phone_daily`** — same normalized phone seen today → `duplicate_lead`.
4. **`email_daily`** — same email seen today → `duplicate_lead`.

<Callout type="warning" title="Phone normalization">
Phones are normalized to E.164 before comparing. Clients sending `(415) 555-1234` and `+14155551234` hit the same record.
</Callout>

<a id="dedup" />

## Fraud

Each lead gets a 0–100 `fraudScore` from a policy-weighted sum of **signals**:

| Signal             | Meaning                                                | Default weight |
|:-------------------|:-------------------------------------------------------|---------------:|
| `blacklist_hit`    | Email/phone/IP on platform blacklist                   | 100            |
| `dedup_strong`     | Same email+phone seen today                            | 70             |
| `voip_phone`       | Phone is a VoIP carrier                                | 40             |
| `phone_geo_mismatch`| E.164 country code ≠ provided `geo`                   | 30             |
| `dedup_weak`       | Same email OR phone seen today                         | 20             |

If `score >= autoRejectThreshold` (default 80) → lead is rejected with `state=REJECTED_FRAUD`. If `borderlineMin ≤ score < autoRejectThreshold` → `state=NEW` + `needsReview=true` → the lead routes but is flagged for human review.

<Callout type="info" title="We never expose weights">
API responses include `reason_codes: [<signal.kind>, …]` only — never the numeric score or weights. That's by policy: affiliates shouldn't game the model.
</Callout>

<a id="fraud" />

## Borderline

Borderline leads look like normal leads on the wire (they still route), but the `LeadDrawer` UI shows a yellow ⚠️ badge. Operators can override in the [Manual review queue](/docs/intake/_deep/rest-surface#rest-get--api-v1-manual-review). If the borderline lead later converts to FTD, the affiliate's 7-day quality trend adjusts upward — see [Quality score v1.5 trend](/docs/glossary/index#q-leads).

<a id="borderline" />

## Sandbox

Sandbox API keys never reach real brokers. Outcomes are deterministic by `external_lead_id` prefix:

| Prefix               | Outcome                                    |
|:---------------------|:-------------------------------------------|
| `sandbox-accept-*`   | Accepted; broker replies with ACCEPTED    |
| `sandbox-decline-*`  | Accepted; broker replies with DECLINED    |
| `sandbox-ftd-*`      | Accepted; broker replies with FTD         |
| `sandbox-fraud-*`    | Auto-rejected as fraud                    |
| `sandbox-dupe-*`     | Dedup short-circuit                        |

<a id="sandbox" />

<DeepRefCard block="intake" kind="invariants" title="Invariants — hidden rules you should know" />
```

- [ ] **Step 4: Render-check in browser**

Open `/docs/intake/index`, `/docs/intake/how-to-send-bulk-leads`, `/docs/intake/concepts` — all three render, internal anchor links work.

- [ ] **Step 5: Commit**

```bash
git add crm-node/content/docs/intake
git commit -m "docs(content): intake overview + bulk recipe + concepts"
```

---

### Task 7: `routing-engine/` — overview + how-to-build-a-flow + concepts

**Files:**
- Create: `crm-node/content/docs/routing-engine/index.mdx`
- Create: `crm-node/content/docs/routing-engine/how-to-build-a-flow.mdx`
- Create: `crm-node/content/docs/routing-engine/concepts.mdx`

Content outline (write in full as MDX, same style as Task 6, 3–5 minute reads each):

- **index.mdx** — what the routing engine does, the Flow/FlowVersion/FlowBranch model, DRAFT→PUBLISHED lifecycle, when to use WRR vs Slots-Chance, how constraints (GEO, schedule, caps) compose.
- **how-to-build-a-flow.mdx** — step-by-step: open the Visual editor (`/dashboard/routing/flows/:id`), add a branch, pick algorithm, set constraints, click Publish. Include screenshots directory placeholder (`/public/docs/routing/flow-editor.png` — image assets tracked in a follow-up task).
- **concepts.mdx** — three anchors: `#wrr`, `#slots-chance`, `#caps` (with the per-country cap example). Link to `_deep/db-schema` and `_deep/trpc-surface` via `DeepRefCard`.

- [ ] **Step 1: Write index.mdx**
- [ ] **Step 2: Write how-to-build-a-flow.mdx**
- [ ] **Step 3: Write concepts.mdx**
- [ ] **Step 4: Browser check + commit**

```bash
git add crm-node/content/docs/routing-engine
git commit -m "docs(content): routing-engine overview + how-to + concepts"
```

---

### Task 8: `broker-push/` — overview + how-to-retry-ladder + concepts

**Files:**
- Create: `crm-node/content/docs/broker-push/index.mdx`
- Create: `crm-node/content/docs/broker-push/how-to-tune-retry-ladder.mdx`
- Create: `crm-node/content/docs/broker-push/concepts.mdx`

Content outline:
- **index.mdx** — the `push-lead` pg-boss job, HTTP adapters per broker, retry ladder, manual review on exhaustion, `PENDING_HOLD` hook.
- **how-to-tune-retry-ladder.mdx** — editing `Broker.retrySchedule` (`"10,60,300,900,3600"`), when to tighten vs loosen, operational impact on manual-queue depth.
- **concepts.mdx** — three anchors: `#broker-pool-selection`, `#anti-shave`, `#pending-hold`. Cover the classifyPushResult → FallbackPlan orchestration.

- [ ] **Step 1–3: write MDX, same style as Task 6**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/broker-push
git commit -m "docs(content): broker-push overview + retry-ladder recipe + concepts"
```

---

### Task 9: `postback-status-groups/` — overview + how-to-add-mapping + concepts

**Files:**
- Create: `crm-node/content/docs/postback-status-groups/index.mdx`
- Create: `crm-node/content/docs/postback-status-groups/how-to-map-broker-status.mdx`
- Create: `crm-node/content/docs/postback-status-groups/concepts.mdx`

Content outline:
- **index.mdx** — the postback route (`POST /api/v1/postbacks/:brokerId`), HMAC verification, status mapping (raw → `CanonicalStatus`), coverage metrics, inline backfill.
- **how-to-map-broker-status.mdx** — Dashboard → Broker → Status mapping → observed raw-status table → suggest (Levenshtein) → bulk-apply → backfill.
- **concepts.mdx** — CanonicalStatus × 20 rows × 4 categories; unmapped semantics; cache invalidation; `canonicalStatus` vs `state` relationship.

- [ ] **Step 1–3: write MDX**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/postback-status-groups
git commit -m "docs(content): postback + status-groups trio"
```

---

### Task 10: `autologin/` — overview + how-to-configure + concepts

**Files:**
- Create: `crm-node/content/docs/autologin/index.mdx`
- Create: `crm-node/content/docs/autologin/how-to-configure-broker-autologin.mdx`
- Create: `crm-node/content/docs/autologin/concepts.mdx`

Content outline:
- **index.mdx** — what autologin does (Playwright → broker → session token → affiliate deep-link), when to enable, SLA page.
- **how-to-configure-broker-autologin.mdx** — Broker settings → autologinEnabled + loginUrl + captcha policy; proxy pool requirements; testing with the SlaTile.
- **concepts.mdx** — proxy pool, state machine (`INITIATING → CAPTCHA → AUTHENTICATING → SESSION_READY`), captcha stub vs 2captcha (v1.5), failure modes per stage.

- [ ] **Step 1–3: write MDX**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/autologin
git commit -m "docs(content): autologin overview + setup + concepts"
```

---

### Task 11: `conversions-crg/` — overview + how-to-crg-cohort + concepts

**Files:**
- Create: `crm-node/content/docs/conversions-crg/index.mdx`
- Create: `crm-node/content/docs/conversions-crg/how-to-set-up-crg.mdx`
- Create: `crm-node/content/docs/conversions-crg/concepts.mdx`

Content outline:
- **index.mdx** — Conversion emit on REGISTRATION / FTD / REDEPOSIT; P&L service; weekly invoicing.
- **how-to-set-up-crg.mdx** — creating a `CPA_CRG` broker payout rule, cohort window semantics (Monday 00:00 UTC), settlement 30 days after cohort end.
- **concepts.mdx** — CPA_FIXED / CPA_CRG / REV_SHARE / HYBRID explained; shortfall formula `(guaranteed − actual) × cohortSize × cpaAmount`; 1:1 invoice linkage constraint.

- [ ] **Step 1–3: write MDX**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/conversions-crg
git commit -m "docs(content): conversions-crg trio"
```

---

### Task 12: `billing-subscription/` — overview + how-to-change-plan + concepts

**Files:**
- Create: `crm-node/content/docs/billing-subscription/index.mdx`
- Create: `crm-node/content/docs/billing-subscription/how-to-change-plan.mdx`
- Create: `crm-node/content/docs/billing-subscription/concepts.mdx`

Content outline:
- **index.mdx** — plans (Trial / Starter $399 / Growth $599 / Pro $899); monthly lead quota; Stripe portal for payment methods + invoices; quota gate returns `429 plan_quota_exceeded` when exceeded.
- **how-to-change-plan.mdx** — Dashboard → Settings → Billing → Plan → Checkout flow; mid-cycle prorations (Stripe handles); cancel behavior (stays active until period end).
- **concepts.mdx** — TRIAL / ACTIVE / PAST_DUE / CANCELED states; what "Stripe not configured" means; `BrokerInvoice` / `AffiliateInvoice` vs platform `Invoice` distinction.

- [ ] **Step 1–3: write MDX**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/billing-subscription
git commit -m "docs(content): billing-subscription trio"
```

---

### Task 13: `multi-tenancy/` — overview + concepts (how-to deferred — ops-only)

**Files:**
- Create: `crm-node/content/docs/multi-tenancy/index.mdx`
- Create: `crm-node/content/docs/multi-tenancy/concepts.mdx`

Content outline:
- **index.mdx** — white-label model: one tenant = one slug = three domain roles (`network`, `autologin`, `api`). Each tenant has own branding, theme, affiliates, brokers, leads.
- **concepts.mdx** — `withTenant` AsyncLocalStorage; `$use` Prisma middleware default-deny; `ROOT_DOMAIN` env = kill-switch; super-admin vs tenant admin roles.

- [ ] **Step 1–2: write MDX**
- [ ] **Step 3: commit**

```bash
git add crm-node/content/docs/multi-tenancy
git commit -m "docs(content): multi-tenancy overview + concepts"
```

---

### Task 14: `webhooks-outbound/` — overview + how-to-verify + concepts

**Files:**
- Create: `crm-node/content/docs/webhooks-outbound/index.mdx`
- Create: `crm-node/content/docs/webhooks-outbound/how-to-verify-hmac.mdx`
- Create: `crm-node/content/docs/webhooks-outbound/concepts.mdx`

Content outline:
- **index.mdx** — affiliate-bound postbacks (lead state changes), HMAC-signing, 5-retry ladder `(10s, 60s, 5m, 15m, 1h)`, auto-pause on HTTP 410.
- **how-to-verify-hmac.mdx** — pseudocode + language snippets (Node, Python, Go) for verifying the `X-GambChamp-Signature` header against the shared secret.
- **concepts.mdx** — `AffiliateIntakeWebhook` + `WebhookDelivery` lifecycle; replay protection (`X-GambChamp-Timestamp`, 5-minute window); retry idempotency.

- [ ] **Step 1–3: write MDX**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/webhooks-outbound
git commit -m "docs(content): outbound webhooks trio"
```

---

### Task 15: `analytics/` — overview + how-to-build-preset + concepts

**Files:**
- Create: `crm-node/content/docs/analytics/index.mdx`
- Create: `crm-node/content/docs/analytics/how-to-build-a-preset.mdx`
- Create: `crm-node/content/docs/analytics/concepts.mdx`

Content outline:
- **index.mdx** — BI Report Builder at `/dashboard/analytics`, tiles + line chart + breakdowns, period-compare, presets, share-links.
- **how-to-build-a-preset.mdx** — filter bar → groupBy → save preset → star as default → share via 30-day token.
- **concepts.mdx** — rollups (`LeadDailyRoll`, `LeadHourlyRoll`); cache (Redis LRU 60s); drill-down (`bucketToRange` → lead drawer).

- [ ] **Step 1–3: write MDX**
- [ ] **Step 4: commit**

```bash
git add crm-node/content/docs/analytics
git commit -m "docs(content): analytics trio"
```

---

### Task 16: `architecture/` top-level tour

**Files:**
- Create: `crm-node/content/docs/architecture/index.mdx`

Content outline — one page, 7–10 minute read:
- ASCII system diagram (intake → fraud → quality → routing → broker-push → postback → conversion → CRG → invoice).
- Storage: Postgres (54 models, Prisma 5) + Redis + pg-boss same-Postgres queue.
- Runtime: Next.js 15 monolith + separate `pnpm worker` process.
- Multi-tenancy summary with the 3-domain pattern.
- Auth model (NextAuth credentials, JWT, UserRole enum).
- Observability (pino structured logs, `/api/v1/health`, `/api/v1/metrics/summary`, Telegram alerts).

- [ ] **Step 1: write the page** (including a mermaid or ASCII diagram inside triple-backticks).
- [ ] **Step 2: commit**

```bash
git add crm-node/content/docs/architecture
git commit -m "docs(content): architecture tour"
```

---

### Task 17: Link-integrity check

**Files:**
- Create: `crm-node/scripts/docs-regen/check-links.ts`
- Create: `crm-node/tests/integration/docs-links.test.ts`

- [ ] **Step 1: Write link checker**

```ts
// crm-node/scripts/docs-regen/check-links.ts
import { readFile } from "node:fs/promises";
import fg from "fast-glob";

const LINK_RE = /\]\((\/docs\/[^)#]+)(?:#[^)]+)?\)/g;

export async function checkLinks(cwd = process.cwd()): Promise<string[]> {
  const files = await fg("content/docs/**/*.{md,mdx}", { cwd, absolute: true });
  const allSlugs = new Set<string>();
  for (const f of files) {
    const slug = "/docs/" + f.slice(cwd.length + 1)
      .replace(/^content\/docs\//, "")
      .replace(/\.(md|mdx)$/, "");
    allSlugs.add(slug);
  }
  const broken: string[] = [];
  for (const f of files) {
    const src = await readFile(f, "utf8");
    let m;
    while ((m = LINK_RE.exec(src)) !== null) {
      const target = m[1].replace(/\/$/, "");
      if (!allSlugs.has(target) && !allSlugs.has(target + "/index")) {
        broken.push(`${f}: ${target}`);
      }
    }
  }
  return broken;
}

if (require.main === module) {
  checkLinks().then((bad) => {
    if (bad.length) {
      console.error(`[docs-links] ${bad.length} broken:`);
      for (const b of bad) console.error("  " + b);
      process.exit(1);
    } else {
      console.log("[docs-links] OK");
    }
  });
}
```

- [ ] **Step 2: Register script**

In `crm-node/package.json`, add:
```json
"docs:links": "tsx scripts/docs-regen/check-links.ts"
```

- [ ] **Step 3: Run**

Run: `pnpm docs:links`
Expected: "OK". If broken — fix the offending MDX.

- [ ] **Step 4: Wire into CI**

Append to the CI workflow step that already runs `pnpm docs:regen:check`:
```yaml
- name: docs-links check
  run: pnpm docs:links
```

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/check-links.ts crm-node/package.json crm-node/.github/workflows
git commit -m "ci: fail PR on broken internal docs links"
```

---

### Task 18: CHANGELOG + READINESS

- [ ] **Step 1: Append CHANGELOG**

```markdown
## Unreleased — Docs content wave 1

- **User-facing content for top 10 blocks.** `index.mdx` + `how-to-*.mdx` + `concepts.mdx` for intake, routing-engine, broker-push, postback-status-groups, autologin, conversions-crg, billing-subscription, multi-tenancy, webhooks-outbound, analytics. Cross-cutting getting-started + glossary + architecture tour.
- **Shared MDX components.** `<Callout>` + `<DeepRefCard>`.
- **CI link check.** `pnpm docs:links` fails PRs on broken internal `/docs/...` links.
```

- [ ] **Step 2: READINESS flip**

Add:
```markdown
- [x] Docs content — top 10 user-facing blocks (+ cross-cutting pages) — #2026-04-22-docs-03
```

- [ ] **Step 3: typecheck + lint + tests + link-check**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm docs:links && pnpm vitest run tests/unit/docs tests/integration/docs
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: record content wave 1 (top 10 blocks)"
```

---

### Task 19: Self-review

- [ ] **Step 1: Spec coverage**

Each of the 10 scoped blocks has 3 artifacts (or 2 for multi-tenancy, by design). Glossary + getting-started + architecture top-level pages present. Shared Callout + DeepRefCard components implemented. Link checker active in CI. v1 content scope met.

- [ ] **Step 2: Hand off**

Print: "Plan #3 complete. Docs content is live for the v1 user-facing scope. Remaining 14 blocks (alerts, scheduled-changes, broker-clone, observability, etc.) ship in v1.1. Proceed to plans #4 (search) and #5 (API reference) — they only depend on this tree existing."
