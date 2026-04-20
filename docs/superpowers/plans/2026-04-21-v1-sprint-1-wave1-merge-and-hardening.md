# v1.0 Sprint 1 — Wave1 Merge + Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the `wave1-parity-gaps` branch into `main` (per-country caps, `PENDING_HOLD` / anti-shave, fraud score + auto-reject enforcement) and add remaining v1.0 security hardening: idempotency on bulk intake, API-key IP whitelist and expiry, and a nullable `tenantId` forward-compat column on primary tables.

**Architecture:** Performed directly on `crm-node/main`. No architectural rewrites: wave1 merge is additive, IP-whitelist + expiry extend the existing `ApiKey` row, `tenantId` is a nullable column pre-seeded as `NULL` for all rows (populated in v2.0 when white-label ships). Bulk idempotency reuses the existing `IdempotencyKey` table and `x-idempotency-key` header convention from the single-lead route.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), NextAuth v5, ioredis for rate limits, Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §4 Sprint 1.

**Preflight:**
- Dev DB + Redis up (`pnpm db:up`).
- Working tree on `main` clean (`git status` empty).
- `pnpm install` complete.

---

### Task 1: Merge `wave1-parity-gaps` into `main`

**Files:**
- Modify: entire repo (merge commit)
- No test file for this task itself (merge correctness validated by Task 2)

- [ ] **Step 1: Confirm current branch and clean state**

Run:
```bash
git status
git branch --show-current
```
Expected: `On branch main\nnothing to commit, working tree clean` and branch `main`.

- [ ] **Step 2: Fetch latest refs and inspect divergence**

Run:
```bash
git fetch --all --prune
git log --oneline main..wave1-parity-gaps | wc -l
git log --oneline wave1-parity-gaps..main | wc -l
```
Expected: first number ≈ 21 (wave1 ahead of main); second ≈ 0 (no main-only commits). If second > 0, note which commits — they are safe because merge will preserve both lineages.

- [ ] **Step 3: Tag current main for rollback**

Run:
```bash
git tag pre-wave1-merge main
```
Expected: tag created silently. This lets us `git reset --hard pre-wave1-merge` if the merge breaks production.

- [ ] **Step 4: Merge wave1 into main (no fast-forward)**

Run:
```bash
git merge --no-ff wave1-parity-gaps -m "feat: merge wave1-parity-gaps (per-country caps, PENDING_HOLD, fraud score + enforcement)"
```
Expected: merge succeeds. If conflicts — stop, do not commit, resolve each conflict file by reading both sides and preserving the wave1 additions (the wave1 branch is the source of new features). After resolving: `git add <files>` then `git commit --no-edit`.

- [ ] **Step 5: Apply Prisma schema to dev DB**

Run:
```bash
pnpm prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.` If a data-loss warning appears, verify via SQL that no rows use the removed values, then re-run with `--accept-data-loss`.

- [ ] **Step 6: Regenerate Prisma client + type-check**

Run:
```bash
pnpm typecheck
```
Expected: zero errors.

- [ ] **Step 7: Run the full test suite**

Run:
```bash
pnpm test
```
Expected: all tests pass (≥365 tests including wave1's additions). If any fail, stop and investigate before proceeding.

- [ ] **Step 8: Run biome check**

Run:
```bash
pnpm lint
```
Expected: zero errors. Warnings may be tolerated but not silently — if new ones appear, fix them.

- [ ] **Step 9: Commit is already present from Step 4**

No additional commit. Move to Task 2.

---

### Task 2: Verify fraud-score enforcement is active end-to-end

**Files:**
- Read: `src/app/api/v1/leads/route.ts` (verify fraud-score + auto-reject wiring)
- Read: `src/server/intake/fraud-score.ts`, `src/server/intake/fraud-signals.ts`
- Test: `tests/integration/intake-fraud-enforcement.test.ts` (create)

- [ ] **Step 1: Open the merged intake route and confirm fraud-score integration**

Run:
```bash
grep -n "computeFraudScore\|fraudScore\|autoRejectThreshold" src/app/api/v1/leads/route.ts
```
Expected: matches showing fraud-signals built, score computed, threshold compared, and a reject path taken when `score >= autoRejectThreshold`. If missing, investigate the wave1 merge — commit `ceb3020` adds this; it must be present post-merge.

- [ ] **Step 2: Write failing integration test for auto-reject**

Create `tests/integration/intake-fraud-enforcement.test.ts`:

```typescript
import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("intake fraud enforcement", () => {
  let affiliateId: string;
  let apiKey: string;

  beforeEach(async () => {
    await resetDb();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    affiliateId = aff.id;
    apiKey = `ak_${randomBytes(16).toString("hex")}`;
    await prisma.apiKey.create({
      data: {
        affiliateId,
        keyHash: sha256(apiKey),
        keyPrefix: apiKey.slice(0, 12),
        label: "t",
      },
    });
    await prisma.fraudPolicy.upsert({
      where: { name: "global" },
      update: {
        weightBlacklist: 40,
        weightGeoMismatch: 15,
        weightVoip: 20,
        weightDedupHit: 10,
        weightPatternHit: 15,
        autoRejectThreshold: 80,
        borderlineMin: 60,
      },
      create: {
        name: "global",
        weightBlacklist: 40,
        weightGeoMismatch: 15,
        weightVoip: 20,
        weightDedupHit: 10,
        weightPatternHit: 15,
        autoRejectThreshold: 80,
        borderlineMin: 60,
      },
    });
    await prisma.blacklistEntry.create({
      data: { kind: "EMAIL", value: sha256("blocked@evil.io") },
    });
  });

  it("auto-rejects leads whose fraud score >= autoRejectThreshold", async () => {
    const body = JSON.stringify({
      external_lead_id: "f1",
      first_name: "a",
      last_name: "b",
      email: "blocked@evil.io",
      phone: "+15555550100",
      country: "US",
    });
    const req = new Request("http://localhost/api/v1/leads", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-api-version": "2026-01",
      },
      body,
    });
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.reject_reason ?? json.error ?? "").toMatch(/fraud/i);

    const lead = await prisma.lead.findFirst({ where: { affiliateId } });
    expect(lead?.state).toBe("REJECTED");
    expect(lead?.fraudScore).toBeGreaterThanOrEqual(80);
  });
});
```

- [ ] **Step 3: Run test to verify it passes (it should, because wave1 already wired enforcement)**

Run:
```bash
pnpm vitest run tests/integration/intake-fraud-enforcement.test.ts
```
Expected: PASS. If FAIL, the enforcement wiring is missing despite the merge — open `src/app/api/v1/leads/route.ts`, ensure the post-score branch rejects at threshold. Add the missing code; re-run.

- [ ] **Step 4: Commit the new regression test**

Run:
```bash
git add tests/integration/intake-fraud-enforcement.test.ts
git commit -m "test(intake): regression coverage for fraud-score auto-reject"
```

---

### Task 3: Add idempotency support to `/api/v1/leads/bulk`

**Files:**
- Modify: `src/app/api/v1/leads/bulk/route.ts`
- Test: `tests/integration/intake-bulk-idempotency.test.ts` (create)

- [ ] **Step 1: Write failing integration test — same key + same payload returns cached response**

Create `tests/integration/intake-bulk-idempotency.test.ts`:

```typescript
import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/bulk/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

describe("bulk intake idempotency", () => {
  let apiKey: string;

  beforeEach(async () => {
    await resetDb();
    const aff = await prisma.affiliate.create({
      data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
    });
    apiKey = `ak_${randomBytes(16).toString("hex")}`;
    await prisma.apiKey.create({
      data: {
        affiliateId: aff.id,
        keyHash: sha256(apiKey),
        keyPrefix: apiKey.slice(0, 12),
        label: "t",
      },
    });
  });

  function makeReq(idemKey: string, payload: unknown) {
    return new Request("http://localhost/api/v1/leads/bulk", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-api-version": "2026-01",
        "x-idempotency-key": idemKey,
      },
      body: JSON.stringify(payload),
    });
  }

  const payload = {
    leads: [
      {
        external_lead_id: "b1",
        first_name: "a",
        last_name: "b",
        email: "b1@t.io",
        phone: "+15555550111",
        country: "US",
      },
    ],
  };

  it("returns cached response for same key + same payload", async () => {
    const r1 = await POST(makeReq("k1", payload));
    const b1 = await r1.json();
    const r2 = await POST(makeReq("k1", payload));
    const b2 = await r2.json();
    expect(r2.status).toBe(r1.status);
    expect(b2).toEqual(b1);
    const leads = await prisma.lead.count();
    expect(leads).toBe(1);
  });

  it("returns 409 when same key is reused with a different payload", async () => {
    await POST(makeReq("k2", payload));
    const mutated = {
      leads: [{ ...payload.leads[0], email: "different@t.io" }],
    };
    const res = await POST(makeReq("k2", mutated));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error ?? "").toMatch(/idempotency/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (idempotency not wired for bulk)**

Run:
```bash
pnpm vitest run tests/integration/intake-bulk-idempotency.test.ts
```
Expected: FAIL. Both tests fail because bulk route does not honor `x-idempotency-key` yet.

- [ ] **Step 3: Open the bulk route handler and add idempotency logic**

Modify `src/app/api/v1/leads/bulk/route.ts`:

Near the top of the `POST` handler, after API-key verification and before Zod validation, add:

```typescript
import { createHash } from "node:crypto";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// … inside POST(), after verifyApiKey + before body parsing
const bodyText = await req.text();
const payloadHash = sha256(bodyText);
const idemKey = req.headers.get("x-idempotency-key");

if (idemKey) {
  const cached = await prisma.idempotencyKey.findUnique({
    where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
  });
  if (cached) {
    if (cached.expiresAt && cached.expiresAt < new Date()) {
      await prisma.idempotencyKey.delete({ where: { id: cached.id } });
    } else if (cached.payloadHash !== payloadHash) {
      return NextResponse.json(
        { error: "idempotency key reused with different payload" },
        { status: 409 },
      );
    } else {
      return new NextResponse(cached.responseBody, {
        status: cached.responseCode,
        headers: { "content-type": "application/json" },
      });
    }
  }
}

// … existing code replaces `await req.json()` with JSON.parse(bodyText)

// After the response is computed (`const response = NextResponse.json(...);`), persist:
if (idemKey) {
  const responseBody = await response.clone().text();
  await prisma.idempotencyKey.upsert({
    where: { affiliateId_key: { affiliateId: ctx.affiliateId, key: idemKey } },
    update: {
      payloadHash,
      responseCode: response.status,
      responseBody,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    create: {
      affiliateId: ctx.affiliateId,
      key: idemKey,
      payloadHash,
      responseCode: response.status,
      responseBody,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

return response;
```

**Important:** the current route parses JSON via `await req.json()`. After this change, parse from `bodyText` instead, to keep the hash consistent. Replace `await req.json()` with `JSON.parse(bodyText)` in the one call site.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/integration/intake-bulk-idempotency.test.ts
```
Expected: PASS.

- [ ] **Step 5: Re-run full suite to confirm no regression**

Run:
```bash
pnpm test
```
Expected: all pass.

- [ ] **Step 6: Commit**

Run:
```bash
git add src/app/api/v1/leads/bulk/route.ts tests/integration/intake-bulk-idempotency.test.ts
git commit -m "feat(intake): idempotency-key support on bulk endpoint"
```

---

### Task 4: Add `ApiKey.allowedIps` column (schema + migration)

**Files:**
- Modify: `prisma/schema.prisma`
- No test in this task (column addition only; enforcement tested in Task 5)

- [ ] **Step 1: Edit ApiKey model**

Open `prisma/schema.prisma` and find the `ApiKey` model. Add a new field:

```prisma
model ApiKey {
  id          String   @id @default(cuid())
  affiliateId String
  keyHash     String   @unique
  keyPrefix   String
  label       String
  lastUsedAt  DateTime?
  isRevoked   Boolean  @default(false)
  isSandbox   Boolean  @default(false)
  allowedIps  String[] @default([])   // NEW: CIDR or exact IPv4/IPv6; empty = no restriction
  createdAt   DateTime @default(now())
  affiliate   Affiliate @relation(fields: [affiliateId], references: [id])

  @@index([affiliateId, isRevoked])
}
```

- [ ] **Step 2: Push schema to dev DB**

Run:
```bash
pnpm prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Type-check**

Run:
```bash
pnpm typecheck
```
Expected: zero errors (no consumers yet).

- [ ] **Step 4: Commit**

Run:
```bash
git add prisma/schema.prisma
git commit -m "feat(api-key): add allowedIps column (enforcement next)"
```

---

### Task 5: Enforce `ApiKey.allowedIps` in `verifyApiKey`

**Files:**
- Modify: `src/server/auth-api-key.ts`
- Modify: `src/app/api/v1/leads/route.ts` (and/or where `verifyApiKey` is called with request context)
- Test: `tests/integration/intake-api-key-ip-whitelist.test.ts` (create)

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/intake-api-key-ip-whitelist.test.ts`:

```typescript
import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function mkKey(allowedIps: string[]) {
  const aff = await prisma.affiliate.create({
    data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
  });
  const key = `ak_${randomBytes(16).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      affiliateId: aff.id,
      keyHash: sha256(key),
      keyPrefix: key.slice(0, 12),
      label: "t",
      allowedIps,
    },
  });
  return key;
}

function mkReq(key: string, ip: string) {
  return new Request("http://localhost/api/v1/leads", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "x-api-version": "2026-01",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      external_lead_id: "x1",
      first_name: "a",
      last_name: "b",
      email: "x1@t.io",
      phone: "+15555550199",
      country: "US",
    }),
  });
}

describe("api-key IP whitelist", () => {
  beforeEach(async () => { await resetDb(); });

  it("allows request when allowedIps is empty", async () => {
    const k = await mkKey([]);
    const res = await POST(mkReq(k, "203.0.113.5"));
    expect([200, 201, 422]).toContain(res.status); // body-level rejection ok; auth passes
  });

  it("allows request when client IP is in allowedIps (exact)", async () => {
    const k = await mkKey(["203.0.113.5"]);
    const res = await POST(mkReq(k, "203.0.113.5"));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("rejects 403 when client IP is not in allowedIps", async () => {
    const k = await mkKey(["203.0.113.5"]);
    const res = await POST(mkReq(k, "198.51.100.7"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error ?? "").toMatch(/ip/i);
  });

  it("allows request when client IP falls inside a CIDR block", async () => {
    const k = await mkKey(["10.0.0.0/8"]);
    const res = await POST(mkReq(k, "10.1.2.3"));
    expect(res.status).not.toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/integration/intake-api-key-ip-whitelist.test.ts
```
Expected: FAIL. Enforcement not implemented.

- [ ] **Step 3: Install CIDR matcher**

Run:
```bash
pnpm add ip-cidr
```
Expected: added to `package.json` dependencies.

- [ ] **Step 4: Update `verifyApiKey` to expose `allowedIps` in the returned context**

Modify `src/server/auth-api-key.ts`:

```typescript
import { createHash } from "node:crypto";
import { prisma } from "@/server/db";

export type ApiKeyCtx = {
  affiliateId: string;
  keyId: string;
  isSandbox: boolean;
  allowedIps: string[];
};

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function verifyApiKey(
  authHeader: string | null | undefined,
): Promise<ApiKeyCtx | null> {
  if (!authHeader) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!m) return null;
  const keyHash = sha256(m[1]);
  const key = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!key || key.isRevoked) return null;
  return {
    affiliateId: key.affiliateId,
    keyId: key.id,
    isSandbox: key.isSandbox,
    allowedIps: key.allowedIps,
  };
}
```

- [ ] **Step 5: Add a client-IP checker helper**

Create `src/server/intake/check-ip.ts`:

```typescript
import IPCIDR from "ip-cidr";

export function clientIpAllowed(clientIp: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  for (const rule of allowed) {
    if (rule === clientIp) return true;
    if (rule.includes("/")) {
      try {
        const cidr = new IPCIDR(rule);
        if (cidr.contains(clientIp)) return true;
      } catch {
        // invalid CIDR — skip
      }
    }
  }
  return false;
}

export function extractClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}
```

- [ ] **Step 6: Enforce IP whitelist in the intake route**

Modify `src/app/api/v1/leads/route.ts`. Right after the line that calls `verifyApiKey` (look for `const ctx = await verifyApiKey(...)`), add:

```typescript
import { clientIpAllowed, extractClientIp } from "@/server/intake/check-ip";

// … after ctx is confirmed non-null
if (ctx.allowedIps.length > 0) {
  const ip = extractClientIp(req);
  if (!ip || !clientIpAllowed(ip, ctx.allowedIps)) {
    return NextResponse.json(
      { error: "source ip not allowed for this api key" },
      { status: 403 },
    );
  }
}
```

Apply the same enforcement to `src/app/api/v1/leads/bulk/route.ts`. Right after its `verifyApiKey` call, add:

```typescript
import { clientIpAllowed, extractClientIp } from "@/server/intake/check-ip";

// … after ctx is confirmed non-null
if (ctx.allowedIps.length > 0) {
  const ip = extractClientIp(req);
  if (!ip || !clientIpAllowed(ip, ctx.allowedIps)) {
    return NextResponse.json(
      { error: "source ip not allowed for this api key" },
      { status: 403 },
    );
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/integration/intake-api-key-ip-whitelist.test.ts
```
Expected: PASS (all 4 cases).

- [ ] **Step 8: Run full suite**

Run:
```bash
pnpm test
```
Expected: all pass.

- [ ] **Step 9: Commit**

Run:
```bash
git add src/server/auth-api-key.ts src/server/intake/check-ip.ts src/app/api/v1/leads/route.ts src/app/api/v1/leads/bulk/route.ts tests/integration/intake-api-key-ip-whitelist.test.ts package.json pnpm-lock.yaml
git commit -m "feat(api-key): enforce allowedIps (exact + CIDR) at intake"
```

---

### Task 6: Add `ApiKey.expiresAt` column + enforcement

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/server/auth-api-key.ts`
- Test: `tests/integration/intake-api-key-expiry.test.ts` (create)

- [ ] **Step 1: Add `expiresAt` to ApiKey model**

Edit `prisma/schema.prisma`:

```prisma
model ApiKey {
  // … existing fields
  expiresAt   DateTime?   // NEW: null = no expiry
  // …
}
```

- [ ] **Step 2: Push schema**

Run:
```bash
pnpm prisma db push
```
Expected: in sync.

- [ ] **Step 3: Write failing integration test**

Create `tests/integration/intake-api-key-expiry.test.ts`:

```typescript
import { createHash, randomBytes } from "node:crypto";
import { POST } from "@/app/api/v1/leads/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function mkKey(expiresAt: Date | null) {
  const aff = await prisma.affiliate.create({
    data: { name: "t", contactEmail: "t@t.io", totalDailyCap: 1000 },
  });
  const key = `ak_${randomBytes(16).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      affiliateId: aff.id,
      keyHash: sha256(key),
      keyPrefix: key.slice(0, 12),
      label: "t",
      expiresAt,
    },
  });
  return key;
}

function mkReq(key: string) {
  return new Request("http://localhost/api/v1/leads", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      "x-api-version": "2026-01",
    },
    body: JSON.stringify({
      external_lead_id: "e1",
      first_name: "a",
      last_name: "b",
      email: "e1@t.io",
      phone: "+15555550100",
      country: "US",
    }),
  });
}

describe("api-key expiry", () => {
  beforeEach(async () => { await resetDb(); });

  it("accepts when expiresAt is null", async () => {
    const k = await mkKey(null);
    const res = await POST(mkReq(k));
    expect(res.status).not.toBe(401);
  });

  it("accepts when expiresAt is in the future", async () => {
    const k = await mkKey(new Date(Date.now() + 60_000));
    const res = await POST(mkReq(k));
    expect(res.status).not.toBe(401);
  });

  it("rejects 401 when expiresAt is in the past", async () => {
    const k = await mkKey(new Date(Date.now() - 60_000));
    const res = await POST(mkReq(k));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run:
```bash
pnpm vitest run tests/integration/intake-api-key-expiry.test.ts
```
Expected: FAIL on the expired-key case (treated as valid).

- [ ] **Step 5: Enforce expiry in `verifyApiKey`**

Modify `src/server/auth-api-key.ts`:

```typescript
export async function verifyApiKey(
  authHeader: string | null | undefined,
): Promise<ApiKeyCtx | null> {
  if (!authHeader) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!m) return null;
  const keyHash = sha256(m[1]);
  const key = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!key || key.isRevoked) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  return {
    affiliateId: key.affiliateId,
    keyId: key.id,
    isSandbox: key.isSandbox,
    allowedIps: key.allowedIps,
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:
```bash
pnpm vitest run tests/integration/intake-api-key-expiry.test.ts
```
Expected: PASS.

- [ ] **Step 7: Full suite**

Run:
```bash
pnpm test
```
Expected: all pass.

- [ ] **Step 8: Commit**

Run:
```bash
git add prisma/schema.prisma src/server/auth-api-key.ts tests/integration/intake-api-key-expiry.test.ts
git commit -m "feat(api-key): expiresAt column + enforcement"
```

---

### Task 7: Add nullable `tenantId` forward-compat column to primary tables

**Files:**
- Modify: `prisma/schema.prisma`
- Test: none (column addition only; enforcement lands in v2.0)

- [ ] **Step 1: Add `tenantId` to Affiliate, Broker, ApiKey, Lead, User, BrokerTemplate**

Edit `prisma/schema.prisma`. For each of these models, add a `tenantId String?` field and an index.

Example for `Affiliate`:

```prisma
model Affiliate {
  id           String   @id @default(cuid())
  tenantId     String?  // NEW: v2.0 white-label; null means "single-tenant legacy"
  // … existing fields
  @@index([tenantId])
  @@index([isActive])
}
```

Apply the same addition (plus `@@index([tenantId])`) to:
- `Broker`
- `ApiKey`
- `Lead`
- `User`
- `BrokerTemplate`

Do **not** make `tenantId` required. Do **not** populate it. Do **not** change any query.

- [ ] **Step 2: Push schema**

Run:
```bash
pnpm prisma db push
```
Expected: in sync.

- [ ] **Step 3: Type-check**

Run:
```bash
pnpm typecheck
```
Expected: zero errors.

- [ ] **Step 4: Full suite**

Run:
```bash
pnpm test
```
Expected: all pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add nullable tenantId to primary tables (forward-compat for v2.0 white-label)"
```

---

### Task 8: Update `CLAUDE.md` with v1.0 Sprint 1 changes

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a new section summarizing S1 deliverables**

Edit `crm-node/CLAUDE.md`, append a section below the existing "Intake pipeline (EPIC-01)" block:

```markdown
## v1.0 Sprint 1 hardening (April 2026)

- **Wave1 merged:** per-country caps (`CapDefinition.perCountry`, `CapCountryLimit`), `PENDING_HOLD` / anti-shave (`Lead.pendingHoldUntil`, `Broker.pendingHoldMinutes`, `resolve-pending-hold` job), fraud score (`FraudPolicy` + `Lead.fraudScore` + `Lead.fraudSignals`) with auto-reject at threshold.
- **Bulk idempotency:** `/api/v1/leads/bulk` honors `x-idempotency-key` via the existing `IdempotencyKey` table; same key + same payload → cached response, same key + different payload → 409.
- **API-key IP whitelist:** `ApiKey.allowedIps` (exact or CIDR); enforced in `src/server/intake/check-ip.ts`. Empty array = no restriction.
- **API-key expiry:** `ApiKey.expiresAt` (nullable); expired keys rejected at `verifyApiKey`.
- **Forward-compat:** nullable `tenantId` on `Affiliate`, `Broker`, `ApiKey`, `Lead`, `User`, `BrokerTemplate`. Unused until v2.0 white-label.
```

- [ ] **Step 2: Commit**

Run:
```bash
git add CLAUDE.md
git commit -m "docs(claude-md): record v1.0 sprint 1 deliverables"
```

---

### Task 9: Sprint 1 final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Re-run full suite**

Run:
```bash
pnpm test
```
Expected: all pass.

- [ ] **Step 2: Re-run lint and typecheck**

Run:
```bash
pnpm lint && pnpm typecheck
```
Expected: zero errors.

- [ ] **Step 3: Manual smoke: start dev, log in, create API key, send a lead**

Run:
```bash
pnpm db:seed        # re-seed for clean admin + sample data
pnpm dev            # start server
```
In a new terminal, use curl:
```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H 'authorization: Bearer <the-seeded-key>' \
  -H 'content-type: application/json' \
  -H 'x-api-version: 2026-01' \
  -d '{"external_lead_id":"smoke1","first_name":"a","last_name":"b","email":"smoke1@t.io","phone":"+15555550123","country":"US"}'
```
Expected: `201 Created` with a `trace_id` in the body.

Stop the dev server with `Ctrl+C`.

- [ ] **Step 4: Confirm git log is clean**

Run:
```bash
git log --oneline main..HEAD
git log --oneline -10
```
Expected: ~7 new commits on top of the merge commit, all with clear feat/test/docs prefixes.

- [ ] **Step 5: Tag the release point**

Run:
```bash
git tag v1.0-sprint-1-complete
```

- [ ] **Step 6: Sprint retrospective note in the plan file**

Append a `## Retrospective` section at the bottom of **this** plan file summarizing:
- What shipped vs what was planned.
- Any tasks deferred to S2.
- Any surprises during merge.
- Time spent per task (rough).

Then:
```bash
git add docs/superpowers/plans/2026-04-21-v1-sprint-1-wave1-merge-and-hardening.md
git commit -m "docs(plan): s1 retrospective"
```

---

## Success criteria for Sprint 1

- `main` contains all wave1 commits plus S1 security hardening.
- `pnpm test` passes — ≥365 existing tests plus ≥10 new ones (fraud enforcement regression, bulk idempotency ×2, IP whitelist ×4, expiry ×3).
- `pnpm lint` and `pnpm typecheck` zero errors.
- Manual smoke of `POST /api/v1/leads` returns `201` against a seeded key.
- Fraud-score enforcement rejects a blacklisted-email lead with `status 422` and `Lead.state = REJECTED`.
- No data was lost during the wave1 merge (verified by `pre-wave1-merge` tag still pointing at the prior HEAD).
