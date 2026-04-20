# v1.0 Sprint 5 — Telegram Ops Bot (EPIC-11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship EPIC-11 — a production-grade Telegram operations bot with 23 event types, per-user subscription management with broker/affiliate filters, a command-driven interface (`/start`, `/stats`, `/ack`, `/pause_broker`, `/resume_broker`, `/sub`, `/unsub`, `/mutebroker`), and an anomaly detector cron. Single global bot per deployment (multi-tenant multi-bot is v2.0). Events are emitted from existing code paths (intake route, push worker, pending-hold resolver, broker error aggregator, status poll). Delivery is async via a `telegram-send` pg-boss worker with per-template rendering, Markdown formatting, and Telegram 429 back-off.

**Architecture:** `grammy` (TypeScript-first Telegram bot framework) over `telegraf` — better TS ergonomics, smaller footprint. One `TelegramBotConfig` row holds the global bot token + webhook secret. `TelegramSubscription` is per-user with event-type multi-select and broker/affiliate filters (empty array = "all"). `TelegramEventLog` is append-only for audit + debugging. Events fan-out through `emitTelegramEvent(type, payload, filters?)`, which resolves matching subscriptions and enqueues one `telegram-send` job per (subscription, event). Templates live in `src/server/telegram/templates/<event>.ts` — one file per event type, exporting `render(payload): string`.

Webhook URL uses a secret path segment (`/api/telegram/webhook/:secret`) — no IP allowlist in v1.0 (Telegram does not publish a stable IP range). The command bot dispatches via `grammy`'s built-in `Composer`, with admin-only guards for `/pause_broker`, `/resume_broker`, `/ack`.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), NextAuth v5, pg-boss (existing), `grammy` (new), Vitest.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §4 Sprint 5.

**Design decisions (locked):**
- `grammy` over `telegraf` (better TS ergonomics, fewer deps).
- One global bot per deployment; multi-tenant multi-bot = v2.0.
- Webhook security: secret path segment; no IP allowlist.
- Templates: one file per event type under `src/server/telegram/templates/`.
- Daily summary timing: fixed 09:00 UTC in v1.0; per-subscription timing = v1.5.
- Link tokens: single-use, 15-min TTL, hashed at rest.
- Event-type catalog is the single source of truth for `/sub` autocomplete and Zod enum in the router.

**Preflight:**
- Dev DB + Redis up (`pnpm db:up`).
- Working tree on `main` clean (`git status` empty).
- `pnpm install` complete.
- Sprints 1–4 merged.
- Scratch bot token from `@BotFather` in `.env.local` as `TELEGRAM_BOT_TOKEN_DEV` for smoke testing.

---

### Task 1: Install `grammy` + schema (TelegramSubscription / TelegramBotConfig / TelegramEventLog)

**Files:**
- Modify: `package.json`, `prisma/schema.prisma`, `src/lib/env.ts`.
- No test in this task (schema-only; consumers tested from Task 2).

- [ ] **Step 1: Install grammy**

```bash
pnpm add grammy
```

- [ ] **Step 2: Add three models to `prisma/schema.prisma`**

Append below `BrokerErrorSample`:

```prisma
// --- EPIC-11 Telegram Ops Bot ---

model TelegramBotConfig {
  id            String   @id @default(cuid())
  botToken      String   // secret — plaintext in v1.0 (envelope encryption = v2.0). DB-level RLS recommended.
  botUsername   String?
  webhookSecret String   @unique
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([isActive])
}

model TelegramSubscription {
  id               String   @id @default(cuid())
  userId           String
  chatId           String   // negative ids allowed (groups/channels); store as string
  telegramUserId   String?
  eventTypes       String[] @default([]) // empty = all
  brokerFilter     String[] @default([]) // empty = all
  affiliateFilter  String[] @default([]) // empty = all
  mutedBrokerIds   String[] @default([])
  isActive         Boolean  @default(true)
  linkTokenHash    String?  // sha256 of active link token (null post-link)
  linkTokenExpires DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, chatId])
  @@index([chatId, isActive])
  @@index([linkTokenHash])
}

model TelegramEventLog {
  id            String   @id @default(cuid())
  chatId        String
  eventType     String
  payload       Json
  messageText   String?  // rendered markdown (truncated to 4096)
  sentAt        DateTime?
  successful    Boolean  @default(false)
  errorMessage  String?
  telegramMsgId Int?
  createdAt     DateTime @default(now())
  @@index([chatId, createdAt])
  @@index([eventType, createdAt])
  @@index([successful, createdAt])
}
```

Add relation on `User`:

```prisma
telegramSubscriptions TelegramSubscription[]
```

- [ ] **Step 3: Push schema**

```bash
pnpm prisma db push
```
Expected: in sync.

- [ ] **Step 4: Extend env schema**

Edit `src/lib/env.ts`, add to the Zod schema:

```typescript
TELEGRAM_WEBHOOK_BASE_URL: z.string().url().optional(),
TELEGRAM_LINK_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
```

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm typecheck
git add package.json pnpm-lock.yaml prisma/schema.prisma src/lib/env.ts
git commit -m "feat(telegram): install grammy + schema (bot config, subscriptions, event log)"
```

---

### Task 2: Webhook endpoint + bot factory

**Files:**
- Create: `src/server/telegram/bot.ts`, `src/server/telegram/commands.ts`, `src/app/api/telegram/webhook/[secret]/route.ts`.
- Test: `tests/integration/telegram-webhook-secret.test.ts`.

- [ ] **Step 1: Bot factory**

Create `src/server/telegram/bot.ts`. Export `getBot()` that reads the active `TelegramBotConfig`, memoizes a `new Bot(token)` keyed on token (reset on config change via `resetBotCache()`), and runs `registerCommands(bot)` once per instance. Export `getWebhookSecret()` returning the active secret. Return `null` from `getBot()` when no config exists.

- [ ] **Step 2: Commands stub**

Create `src/server/telegram/commands.ts`:

```typescript
import type { Bot } from "grammy";
export function registerCommands(bot: Bot) {
  bot.command("ping", (ctx) => ctx.reply("pong"));
  // real commands registered in Tasks 3–5
}
```

- [ ] **Step 3: Webhook route**

Create `src/app/api/telegram/webhook/[secret]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getBot, getWebhookSecret } from "@/server/telegram/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ secret: string }> },
) {
  const { secret } = await ctx.params;
  const expected = await getWebhookSecret();
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const bot = await getBot();
  if (!bot) return NextResponse.json({ error: "bot_not_configured" }, { status: 503 });
  return await webhookCallback(bot, "std/http")(req);
}
```

- [ ] **Step 4: Write failing test**

Create `tests/integration/telegram-webhook-secret.test.ts` covering:
1. No config → 404.
2. Wrong secret → 404.
3. Correct secret + valid update body → 200 (grammy may internally error on fake token but webhook still 200 OKs).

Use `resetBotCache()` in `beforeEach` so cached bot from a prior test doesn't leak.

- [ ] **Step 5: Run + commit**

```bash
pnpm vitest run tests/integration/telegram-webhook-secret.test.ts
git add src/server/telegram src/app/api/telegram tests/integration/telegram-webhook-secret.test.ts
git commit -m "feat(telegram): webhook endpoint (secret path) + bot factory"
```

---

### Task 3: Commands — `/start <linkToken>` and `/stats`

**Files:**
- Create: `src/server/telegram/link-token.ts`, `src/server/telegram/stats.ts`.
- Modify: `src/server/telegram/commands.ts`.
- Tests: `tests/integration/telegram-command-start.test.ts`, `tests/unit/telegram-stats.test.ts`.

- [ ] **Step 1: `link-token.ts`**

Export two functions:
- `issueLinkToken(userId)`: generate a 24-byte base64url token; upsert a pending `TelegramSubscription` with `chatId = "pending:<sha256(token)>"`, `isActive=false`, `linkTokenHash=sha256(token)`, `linkTokenExpires = now + TTL`. Return raw token.
- `consumeLinkToken(raw, chatId, telegramUserId)`: look up by `linkTokenHash`; if found and not expired, `$transaction` deletes the pending row and upserts an active row keyed on `(userId, chatId)` with `telegramUserId` set. Return `{ok: true, userId}` or `{ok: false, reason: "token_not_found" | "token_expired"}`.

Edge cases: use `sha256(token)` both ways; never store raw token; `linkTokenExpires` checked against `new Date()`.

- [ ] **Step 2: `stats.ts`**

Export `todayStats({affiliateIds?, brokerIds?})`:
- `where = { createdAt: { gte: startOfDay(now) } }` + optional `affiliateId in`, `brokerId in`.
- `prisma.lead.groupBy({by: ["state"], where, _count: { _all: true }})`.
- Return `{intake, pushed, accepted, declined, ftd, rejected}` where `intake = sum of all states` and each other key reads the matching `LeadState` bucket.

- [ ] **Step 3: Wire commands in `commands.ts`**

Replace the placeholder. Register:
- `bot.command("start", ...)` — parses `ctx.match?.trim()` as token; calls `consumeLinkToken(token, String(ctx.chat?.id), String(ctx.from?.id))`; replies success or `token_expired`/invalid message. If no payload, instructs user to issue a token from the CRM UI.
- `bot.command("stats", ...)` — finds active subscription by `chatId`; if none, replies "not linked"; otherwise calls `todayStats` scoped to that subscription's filters and replies with a 6-line markdown block (`*Today's counters*` + intake/pushed/accepted/declined/FTD/rejected).

Always `parse_mode: "Markdown"` on replies.

- [ ] **Step 4: Tests**

`tests/integration/telegram-command-start.test.ts`:
- Issue + consume token → active subscription exists with `telegramUserId` set.
- Wrong token → `ok:false`.
- Expired token (force `linkTokenExpires` into past) → `ok:false, reason: "token_expired"`.

`tests/unit/telegram-stats.test.ts`:
- Seed 4 leads (PUSHED, ACCEPTED×2, REJECTED) and assert counts.

- [ ] **Step 5: Run + commit**

```bash
pnpm vitest run tests/integration/telegram-command-start.test.ts tests/unit/telegram-stats.test.ts
git add src/server/telegram tests/integration/telegram-command-start.test.ts tests/unit/telegram-stats.test.ts
git commit -m "feat(telegram): /start linking flow + /stats command"
```

---

### Task 4: Subscription commands — `/sub`, `/unsub`, `/mutebroker`

**Files:**
- Create: `src/server/telegram/event-catalog.ts`.
- Modify: `src/server/telegram/commands.ts`.
- Test: `tests/integration/telegram-command-sub.test.ts`.

- [ ] **Step 1: Event catalog**

Create `src/server/telegram/event-catalog.ts` exporting a `TELEGRAM_EVENT_TYPES` tuple (23 values):

```
NEW_LEAD, PUSHED, ACCEPTED, DECLINED, FTD, FAILED, FRAUD_HIT,
MANUAL_REVIEW_QUEUED, PENDING_HOLD_START, PENDING_HOLD_RELEASED,
SHAVE_SUSPECTED, BROKER_DOWN, BROKER_RECOVERED, CAP_REACHED,
AUTOLOGIN_DOWN, AUTOLOGIN_SLA_BREACHED, PROXY_POOL_DEGRADED,
DAILY_SUMMARY, ANOMALY_DETECTED, FRAUD_POLICY_CHANGED,
BROKER_CONFIG_CHANGED, AFFILIATE_DAILY_SUMMARY, AFFILIATE_FTD
```

Also export `TelegramEventType` (derived union) and an `ADMIN_ONLY_EVENTS` set containing operational types (`BROKER_CONFIG_CHANGED`, `FRAUD_POLICY_CHANGED`, `AUTOLOGIN_*`, `PROXY_POOL_DEGRADED`) — used by the router to hide these from non-admin users.

- [ ] **Step 2: Wire commands**

In `commands.ts`, add:
- `bot.command("sub", ...)` — validates `ctx.match.trim().toUpperCase()` against `TELEGRAM_EVENT_TYPES`; on valid, append to the subscription's `eventTypes` array (dedupe). On invalid, reply with the list of valid types.
- `bot.command("unsub", ...)` — filters the value out of `eventTypes`.
- `bot.command("mutebroker", ...)` — validates broker id against `prisma.broker.findUnique`; appends to `mutedBrokerIds` (dedupe).

All three require an active subscription (error "Not linked" if missing).

- [ ] **Step 3: Test**

`tests/integration/telegram-command-sub.test.ts` — direct Prisma contract test:
- Subscribe to `NEW_LEAD` twice → array contains exactly one occurrence (idempotent append).
- Unsubscribing → `eventTypes` array no longer contains the value.
- Mute a non-existent broker id is handled by the command itself (not asserted here; covered by manual smoke).

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/integration/telegram-command-sub.test.ts
git add src/server/telegram/commands.ts src/server/telegram/event-catalog.ts tests/integration/telegram-command-sub.test.ts
git commit -m "feat(telegram): /sub /unsub /mutebroker + event catalog"
```

---

### Task 5: Admin commands — `/ack <leadId>`, `/pause_broker`, `/resume_broker`

**Files:**
- Modify: `src/server/telegram/commands.ts`.
- Test: `tests/integration/telegram-command-admin.test.ts`.

- [ ] **Step 1: Admin guard helper**

In `commands.ts`, add `requireAdmin(chatId): Promise<{userId} | null>`:
- Finds active subscription by `chatId` with `include: {user: true}`.
- Returns `null` unless `user.role === "ADMIN"`.

- [ ] **Step 2: Commands**

- `bot.command("ack", ...)` — admin-guarded; requires lead id; `prisma.leadEvent.create` with `kind: "MANUAL_OVERRIDE"` and `meta: {action: "fraud_hit_ack", by: "telegram", userId}`. Replies "Acknowledged fraud hit for lead <id>".
- `bot.command("pause_broker", ...)` — admin-guarded; `prisma.broker.update({data: {isActive: false}})` + `AuditLog` row (`action: "broker.pause", entity: "Broker", entityId, diff: {via: "telegram"}, userId`). Replies with broker name.
- `bot.command("resume_broker", ...)` — symmetric (`isActive: true`, `action: "broker.resume"`).

Non-admin callers get a single refusal reply ("This command requires an ADMIN-role linked account.") and no state change.

- [ ] **Step 3: Test**

`tests/integration/telegram-command-admin.test.ts` — direct Prisma contract:
- Create broker; flip `isActive` off then on; assert values.
- Create lead; insert `LeadEvent` with `kind: "MANUAL_OVERRIDE"`; assert it exists with expected `meta`.

(Command wiring itself is exercised in the webhook integration test in Task 2 — the Prisma-level contract tests here are the regression surface.)

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/integration/telegram-command-admin.test.ts
git add src/server/telegram/commands.ts tests/integration/telegram-command-admin.test.ts
git commit -m "feat(telegram): admin commands /ack /pause_broker /resume_broker"
```

---

### Task 6: Event emitter + `telegram-send` worker + lead-lifecycle templates (batch 1)

**Files:**
- Create: `src/server/telegram/emit.ts`, `src/server/jobs/telegram-send.ts`, `src/server/telegram/templates/index.ts`, and 11 template files.
- Modify: `src/server/jobs/index.ts` (or boot file that registers workers).
- Test: `tests/integration/telegram-emit.test.ts`.

- [ ] **Step 1: Emitter**

Create `src/server/telegram/emit.ts`:

```typescript
import { prisma } from "@/server/db";
import { getBoss } from "@/server/jobs/pg-boss";
import type { TelegramEventType } from "./event-catalog";

export type EmitFilters = { brokerId?: string; affiliateId?: string };

export async function emitTelegramEvent(
  type: TelegramEventType,
  payload: Record<string, unknown>,
  filters: EmitFilters = {},
): Promise<number> {
  const subs = await prisma.telegramSubscription.findMany({ where: { isActive: true } });
  const matching = subs.filter((s) => {
    if (s.eventTypes.length && !s.eventTypes.includes(type)) return false;
    if (filters.brokerId && s.brokerFilter.length && !s.brokerFilter.includes(filters.brokerId)) return false;
    if (filters.affiliateId && s.affiliateFilter.length && !s.affiliateFilter.includes(filters.affiliateId)) return false;
    if (filters.brokerId && s.mutedBrokerIds.includes(filters.brokerId)) return false;
    return true;
  });
  const boss = await getBoss();
  for (const sub of matching) {
    await boss.send("telegram-send", { chatId: sub.chatId, eventType: type, payload });
  }
  return matching.length;
}
```

Matching rules: empty-array filters mean "all". `mutedBrokerIds` always wins over `brokerFilter`.

- [ ] **Step 2: Lead-lifecycle templates (11 files)**

Each template is a tiny module exporting `render(payload: Record<string, unknown>): string`. Defensive field access (`String(p.x ?? "?")`). Keep each under ~8 lines. Files:

- `new-lead.ts` — `*New lead* \`{leadId}\`` + affiliate + GEO.
- `pushed.ts` — lead + broker + push latency (ms).
- `accepted.ts` — lead + broker + `brokerExternalId`.
- `declined.ts` — lead + broker + reject reason from broker response.
- `ftd.ts` — lead + broker + FTD amount (if known) + affiliate name.
- `failed.ts` — lead + broker + error snippet (truncate to 300 chars).
- `fraud-hit.ts` — lead + fraud score + top-3 signals (from `Lead.fraudSignals` JSON, fallback "—").
- `manual-review-queued.ts` — lead + reason.
- `pending-hold-start.ts` — lead + `holdUntil` ISO timestamp.
- `pending-hold-released.ts` — lead + new target broker name.
- `shave-suspected.ts` — lead + expected-vs-actual status.

Create `src/server/telegram/templates/index.ts` exporting a `TEMPLATES: Partial<Record<TelegramEventType, Renderer>>` object mapping each of the 11 types above to its renderer.

- [ ] **Step 3: Send worker**

Create `src/server/jobs/telegram-send.ts` exporting `registerTelegramSendWorker()`:
- `boss.work("telegram-send", async (job) => ...)`.
- Resolve `render = TEMPLATES[eventType]`; fallback to a JSON-dump template if none.
- Loop up to 3 attempts calling `bot.api.sendMessage(chatId, text, {parse_mode: "Markdown"})`.
- On Telegram 429: read `error.parameters?.retry_after`, sleep that many seconds, retry. On other errors: exponential back-off `2^attempt` seconds.
- On success: log to `TelegramEventLog` (`successful=true`, `sentAt=now`, `telegramMsgId`). On final failure: log `successful=false` + `errorMessage`, then `throw` (lets pg-boss apply its own retry/fail policy).

- [ ] **Step 4: Register the worker**

In `src/server/jobs/index.ts` (or equivalent boot module): `await registerTelegramSendWorker();` alongside existing worker registrations.

- [ ] **Step 5: Test**

`tests/integration/telegram-emit.test.ts` — mock `pg-boss`:

```typescript
vi.mock("@/server/jobs/pg-boss", () => {
  const send = vi.fn();
  return { getBoss: async () => ({ send }), __send: send };
});
```

Assertions:
- With subs `[{eventTypes: ["NEW_LEAD"]}, {eventTypes: ["FTD"]}]`, `emitTelegramEvent("NEW_LEAD", ...)` returns `1`.
- `brokerFilter: ["B1"]` + event emitted with `{brokerId: "B2"}` → `0`.
- `brokerFilter: ["B1"]` + event emitted with `{brokerId: "B1"}` → `1`.
- `mutedBrokerIds: ["B1"]` + event emitted with `{brokerId: "B1"}` → `0` (mute wins).

- [ ] **Step 6: Run + commit**

```bash
pnpm vitest run tests/integration/telegram-emit.test.ts
git add src/server/telegram/emit.ts src/server/telegram/templates src/server/jobs/telegram-send.ts src/server/jobs/index.ts tests/integration/telegram-emit.test.ts
git commit -m "feat(telegram): emitter + send worker + lead-lifecycle templates (batch 1)"
```

---

### Task 7: Broker / system templates (batch 2)

**Files:**
- Create: 6 template files.
- Modify: `src/server/telegram/templates/index.ts`.
- Test: `tests/unit/telegram-templates.test.ts`.

- [ ] **Step 1: Six renderers**

- `broker-down.ts` — broker name + id + error-streak length + last-error snippet.
- `broker-recovered.ts` — broker name + id + downtime duration (minutes).
- `cap-reached.ts` — cap scope (`AFFILIATE|BROKER|FLOW|BRANCH|TARGET`), scope name, window (`HOURLY|DAILY|WEEKLY`), limit.
- `autologin-down.ts` — stage (request/captcha/auth/session) + last error + affected broker.
- `autologin-sla-breached.ts` — target uptime vs actual + rolling-window size.
- `proxy-pool-degraded.ts` — pool id + healthy/total proxies + % degradation.

- [ ] **Step 2: Register all 6 in `templates/index.ts`**

Add 6 imports + 6 entries keyed on the event-type string.

- [ ] **Step 3: Template snapshot test**

`tests/unit/telegram-templates.test.ts`:

```typescript
for (const [type, render] of Object.entries(TEMPLATES)) {
  const out = render!({ leadId: "X", brokerName: "B", affiliateName: "A", geo: "US" });
  expect(out.length).toBeGreaterThan(0);
  expect(out.length).toBeLessThanOrEqual(4096);
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/unit/telegram-templates.test.ts
git add src/server/telegram/templates tests/unit/telegram-templates.test.ts
git commit -m "feat(telegram): broker/system templates (batch 2)"
```

---

### Task 8: Operational + affiliate-facing templates (batch 3)

**Files:**
- Create: 6 template files.
- Modify: `src/server/telegram/templates/index.ts`.

- [ ] **Step 1: Six renderers**

- `daily-summary.ts` — date + intake/pushed/accepted/declined/FTD/rejected counts + top-3 affiliates by intake.
- `anomaly-detected.ts` — metric + prior-hour value + current-hour value + % drop + `windowStart`.
- `fraud-policy-changed.ts` — actor + field-diff (compact JSON, redact values of secret-shaped keys).
- `broker-config-changed.ts` — actor + broker name + changed-field names only (never values, to avoid leaking secrets).
- `affiliate-daily-summary.ts` — affiliate name + their own intake/push/FTD counts.
- `affiliate-ftd.ts` — lead id + broker name + datetime (no PII).

- [ ] **Step 2: Register all 6**

Add imports + entries to `TEMPLATES`.

- [ ] **Step 3: Verify all 23 types have templates**

Add a small assertion to the existing `telegram-templates.test.ts`:

```typescript
import { TELEGRAM_EVENT_TYPES } from "@/server/telegram/event-catalog";
for (const t of TELEGRAM_EVENT_TYPES) expect(TEMPLATES[t]).toBeDefined();
```

Run the suite.

- [ ] **Step 4: Commit**

```bash
pnpm vitest run tests/unit/telegram-templates.test.ts
git add src/server/telegram/templates tests/unit/telegram-templates.test.ts
git commit -m "feat(telegram): operational + affiliate templates (batch 3) — all 23 types covered"
```

---

### Task 9: Wire events into existing code paths

**Files:**
- Modify: `src/app/api/v1/leads/route.ts` — emit `NEW_LEAD`, `FRAUD_HIT`.
- Modify: `src/server/jobs/push-lead.ts` — emit `PUSHED`, `FAILED`, `CAP_REACHED`.
- Modify: `src/server/jobs/resolve-pending-hold.ts` — emit `PENDING_HOLD_RELEASED`, `SHAVE_SUSPECTED`.
- Modify: `src/server/broker-adapter/status-poll.ts` (or the site that flips `state` to `FTD`) — emit `FTD`, `AFFILIATE_FTD`.
- Modify: `src/server/broker-errors/aggregator.ts` — emit `BROKER_DOWN`, `BROKER_RECOVERED`.
- Test: `tests/integration/telegram-events-wired.test.ts`.

- [ ] **Step 1: Adopt the fire-and-forget pattern**

Every emit site uses:

```typescript
void emitTelegramEvent(type, payload, filters).catch((e) =>
  console.warn("[telegram-emit] failed", e),
);
```

Telegram failures must never break intake, push, or status-poll.

- [ ] **Step 2: Intake route**

Right after `prisma.lead.create(...)` in the success branch:

```typescript
void emitTelegramEvent("NEW_LEAD",
  { leadId: lead.id, affiliateId: lead.affiliateId, affiliateName: ctx.affiliateName, geo: lead.geo },
  { affiliateId: lead.affiliateId });
```

In the fraud-reject branch (score ≥ threshold):

```typescript
void emitTelegramEvent("FRAUD_HIT",
  { leadId: lead.id, fraudScore: lead.fraudScore, signals: lead.fraudSignals },
  { affiliateId: lead.affiliateId });
```

- [ ] **Step 3: Push worker**

On success: emit `PUSHED` with `{leadId, brokerId, brokerName, latencyMs}` and `{brokerId, affiliateId}` filters. On failure: emit `FAILED` with error message. On cap-block: emit `CAP_REACHED` with `{scope, scopeId, window, limit}`.

- [ ] **Step 4: Pending-hold resolver**

On normal release: emit `PENDING_HOLD_RELEASED` with `{leadId, newBrokerName}`. On shave detection (broker reported DECLINED/FAILED but lead later ACCEPTED elsewhere): emit `SHAVE_SUSPECTED` with `{leadId, expected, actual}`.

If the resolver already emits these as `LeadEvent`s (wave1), piggyback: in the same code path, add the Telegram emit alongside the existing event write.

- [ ] **Step 5: Status poll / FTD detection**

Wherever `state` transitions to `FTD`:

```typescript
if (newState === "FTD" && oldState !== "FTD") {
  void emitTelegramEvent("FTD", { leadId, brokerId, brokerName }, { brokerId, affiliateId });
  void emitTelegramEvent("AFFILIATE_FTD", { leadId, brokerName }, { affiliateId });
}
```

- [ ] **Step 6: Broker error aggregator**

Use the existing error-streak logic: on transition healthy→down emit `BROKER_DOWN` with last-N error snippets; on down→healthy emit `BROKER_RECOVERED` with downtime duration. These transitions must be idempotent (only emit on edge, not every bucket).

- [ ] **Step 7: Test**

`tests/integration/telegram-events-wired.test.ts` — mock pg-boss (`send` captured), POST a valid lead via the intake handler, assert `send` was called with `{name: "telegram-send", data: expect.objectContaining({eventType: "NEW_LEAD"})}`.

- [ ] **Step 8: Run + commit**

```bash
pnpm vitest run tests/integration/telegram-events-wired.test.ts
pnpm test
git add src/app/api/v1/leads/route.ts src/server/jobs/push-lead.ts src/server/jobs/resolve-pending-hold.ts src/server/broker-adapter src/server/broker-errors tests/integration/telegram-events-wired.test.ts
git commit -m "feat(telegram): emit events from intake, push, pending-hold, status-poll, broker-errors"
```

---

### Task 10: User subscription page `/dashboard/settings/telegram`

**Files:**
- Create: `src/server/routers/telegram.ts`, `src/app/(dashboard)/settings/telegram/page.tsx`.
- Modify: `src/server/routers/_app.ts`, `src/app/(dashboard)/layout.tsx`.
- Install: `qrcode.react`.

- [ ] **Step 1: tRPC router**

Create `src/server/routers/telegram.ts` with these procedures:
- `mySubscriptions` (query, protected): `findMany({where: {userId: ctx.userId, isActive: true}})`.
- `issueLinkToken` (mutation, protected): calls `issueLinkToken(ctx.userId)`, reads `botUsername` from `TelegramBotConfig`, returns `{token, deepLink: botUsername ? \`https://t.me/${botUsername}?start=${token}\` : null}`.
- `updateSubscription` (mutation, protected) with Zod input `{id, eventTypes: z.array(z.enum(TELEGRAM_EVENT_TYPES)), brokerFilter: z.array(z.string()), affiliateFilter: z.array(z.string())}`. Verifies `sub.userId === ctx.userId` before updating.
- `catalog` (query, protected): returns `{brokers, affiliates, eventTypes}` for populating the multi-selects. Filter out `ADMIN_ONLY_EVENTS` for non-admin users (check `ctx.user.role`).

Register in `_app.ts`: `telegram: telegramRouter`.

- [ ] **Step 2: Install qrcode.react**

```bash
pnpm add qrcode.react
```

- [ ] **Step 3: Build the page**

Create `src/app/(dashboard)/settings/telegram/page.tsx` as a `"use client"` component:
1. `trpc.telegram.catalog.useQuery()` + `trpc.telegram.mySubscriptions.useQuery()`.
2. If no active subscription: show a "Link Telegram" button that calls `trpc.telegram.issueLinkToken.useMutation()`; on success, render the returned `deepLink` as a clickable link + a QR (from `qrcode.react`). Show the 15-min expiry countdown.
3. For each subscription: three multi-selects (event types / brokers / affiliates), a read-only panel with `chatId` + `telegramUserId`, and a Save button calling `updateSubscription` → `trpc.useUtils().telegram.mySubscriptions.invalidate()`.
4. A "Send test" button for the current user's subscription that calls `trpc.telegram.testSend` (added in Task 11) with `chatId` + a fixed greeting — gated behind admin role in the router.

Style matches existing `src/app/(dashboard)/settings/*` pages.

- [ ] **Step 4: Nav link**

Edit `src/app/(dashboard)/layout.tsx`, add `{ href: "/settings/telegram", label: "Telegram" }` alongside other settings entries.

- [ ] **Step 5: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/server/routers/telegram.ts src/server/routers/_app.ts src/app/\(dashboard\)/settings/telegram src/app/\(dashboard\)/layout.tsx package.json pnpm-lock.yaml
git commit -m "feat(telegram): user subscription page + tRPC router"
```

---

### Task 11: Admin page `/dashboard/settings/telegram-admin`

**Files:**
- Create: `src/app/(dashboard)/settings/telegram-admin/page.tsx`.
- Modify: `src/server/routers/telegram.ts` (add admin procedures).
- Verify: `src/server/trpc.ts` has `adminProcedure` (create if missing).

- [ ] **Step 1: `adminProcedure`**

If `src/server/trpc.ts` does not already define `adminProcedure`, add:

```typescript
export const adminProcedure = protectedProcedure.use(async (opts) => {
  const user = await prisma.user.findUnique({ where: { id: opts.ctx.userId } });
  if (user?.role !== "ADMIN") throw new TRPCError({ code: "UNAUTHORIZED" });
  return opts.next({ ctx: { ...opts.ctx, user } });
});
```

- [ ] **Step 2: Admin procedures in `routers/telegram.ts`**

Add:
- `adminConfig` (query): returns active `TelegramBotConfig` (omit `botToken`, include `webhookSecret`, `botUsername`, `hasToken: true`, and `webhookUrl = TELEGRAM_WEBHOOK_BASE_URL + /api/telegram/webhook/<secret>` if env var set).
- `setBotToken` (mutation, `{botToken, botUsername?}`): creates or updates the active `TelegramBotConfig`; generates a new `webhookSecret` via `randomBytes(24).toString("hex")` only on first create. Calls `resetBotCache()`.
- `rotateWebhookSecret` (mutation): regenerates `webhookSecret` and resets cache (admin must re-register the webhook with Telegram after calling).
- `testSend` (mutation, `{chatId, text}`): fetches `getBot()`, calls `bot.api.sendMessage`; returns `{messageId}`.
- `recentEvents` (query, `{limit: 1..200, default 50}`): returns the most recent `TelegramEventLog` rows ordered by `createdAt desc`.

- [ ] **Step 3: Build the page**

Client component with:
1. "Bot configuration" card — shows `botUsername`, webhook URL (copy button), secret (redacted, click-to-reveal). Form to set/update token + username.
2. "Rotate secret" button with confirmation.
3. "Test send" card — chatId + text inputs, submit via `testSend`.
4. "Recent events" table — last 50 `TelegramEventLog` rows: createdAt, eventType, chatId, successful (green/red badge), errorMessage, telegramMsgId. Auto-refresh every 30s (`refetchInterval: 30_000`).

Gate the whole page with a `useSession()` role check for UX; the router guard is the source of truth.

- [ ] **Step 4: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/server/trpc.ts src/server/routers/telegram.ts src/app/\(dashboard\)/settings/telegram-admin
git commit -m "feat(telegram): admin page (token, webhook, test-send, event log)"
```

---

### Task 12: Anomaly detector cron (15-min)

**Files:**
- Create: `src/server/jobs/anomaly-detect.ts`.
- Modify: `src/server/jobs/index.ts`.
- Test: `tests/unit/anomaly-detect.test.ts`.

- [ ] **Step 1: Detector**

Create `src/server/jobs/anomaly-detect.ts`:

```typescript
import { prisma } from "@/server/db";
import { emitTelegramEvent } from "@/server/telegram/emit";
import { getBoss } from "./pg-boss";

export async function detectAnomalies(now: Date = new Date()): Promise<number> {
  const hourMs = 60 * 60 * 1000;
  const endOfCurrent = new Date(Math.floor(now.getTime() / hourMs) * hourMs);
  const startOfCurrent = new Date(endOfCurrent.getTime() - hourMs);
  const startOfPrev = new Date(startOfCurrent.getTime() - hourMs);
  const [prev, curr] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: startOfPrev, lt: startOfCurrent } } }),
    prisma.lead.count({ where: { createdAt: { gte: startOfCurrent, lt: endOfCurrent } } }),
  ]);
  if (prev <= 10) return 0;
  const drop = (prev - curr) / prev;
  if (drop < 0.5) return 0;
  return emitTelegramEvent("ANOMALY_DETECTED", {
    metric: "intake_lead_count",
    priorHour: prev, currentHour: curr,
    dropPercent: Math.round(drop * 100),
    windowStart: startOfCurrent.toISOString(),
  });
}

export async function registerAnomalyDetectWorker() {
  const boss = await getBoss();
  await boss.work("anomaly-detect", async () => { await detectAnomalies(); });
  await boss.schedule("anomaly-detect", "*/15 * * * *");
}
```

Rule: emit only when `prev > 10` AND `(prev - curr) / prev >= 0.5`. This avoids noise in low-volume staging environments.

- [ ] **Step 2: Register**

Add `await registerAnomalyDetectWorker();` in the boot file.

- [ ] **Step 3: Test**

`tests/unit/anomaly-detect.test.ts` — mock `emit`:

```typescript
vi.mock("@/server/telegram/emit", () => {
  const emit = vi.fn().mockResolvedValue(1);
  return { emitTelegramEvent: emit };
});
```

Two cases:
- Seed 5 leads into prior hour, 0 into current → expect `0` emissions (below threshold).
- Seed 20 leads into prior hour, 5 into current (75% drop) → expect emit called once with `{eventType: "ANOMALY_DETECTED"}`-shaped args.

When seeding, pin `createdAt` to the middle of the relevant hour bucket. Compute bucket boundaries the same way the function does.

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/unit/anomaly-detect.test.ts
git add src/server/jobs/anomaly-detect.ts src/server/jobs/index.ts tests/unit/anomaly-detect.test.ts
git commit -m "feat(telegram): anomaly detector cron (15-min, 50% drop trigger)"
```

---

### Task 13: Daily summary cron (09:00 UTC) + integration smoke + CLAUDE.md + tag

**Files:**
- Create: `src/server/jobs/daily-summary.ts`.
- Modify: `src/server/jobs/index.ts`, `crm-node/CLAUDE.md`.
- Test: `tests/unit/daily-summary.test.ts`.

- [ ] **Step 1: Daily summary job**

Create `src/server/jobs/daily-summary.ts`:
- `sendDailySummaries(now = new Date())`:
  - Compute `day = startOfDay(subDays(now, 1))`, `nextDay = startOfDay(now)`.
  - Parallel `prisma.lead.count` for total/pushed/accepted/ftd/rejected in that window.
  - `emitTelegramEvent("DAILY_SUMMARY", {date, total, pushed, accepted, ftd, rejected})`.
  - `prisma.lead.groupBy({by: ["affiliateId"], where, _count: {_all: true}})` → per-affiliate.
  - For each: `emitTelegramEvent("AFFILIATE_DAILY_SUMMARY", {date, affiliateName, count}, {affiliateId})`.
- `registerDailySummaryWorker()`: `boss.work` + `boss.schedule("daily-summary", "0 9 * * *")`.

- [ ] **Step 2: Register in boot**

Add `await registerDailySummaryWorker();`.

- [ ] **Step 3: Test**

`tests/unit/daily-summary.test.ts` — mock emit, seed 2 affiliates + 1 lead each yesterday, call `sendDailySummaries`, assert:
- One `DAILY_SUMMARY` emit call.
- Two `AFFILIATE_DAILY_SUMMARY` emit calls (one per affiliate).

- [ ] **Step 4: Full suite + lint + typecheck**

```bash
pnpm test && pnpm lint && pnpm typecheck
```
Expected: all green, zero errors.

- [ ] **Step 5: Manual smoke**

```bash
pnpm dev
# Terminal 2:
# 1) Open /dashboard/settings/telegram-admin (as ADMIN), paste TELEGRAM_BOT_TOKEN_DEV, save.
# 2) Copy the webhook URL, then register it:
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<ngrok>/api/telegram/webhook/<secret>"
# 3) Open /dashboard/settings/telegram, issue a link token, open the deep link on phone → /start executes.
# 4) POST a lead to /api/v1/leads with a seeded api key. Expect a NEW_LEAD markdown message in the chat within 10s.
# 5) Send /stats. Expect the counters to match the DB.
# 6) Send /sub FTD; POST a lead and force its state to FTD (or wait for status poll). Expect an FTD message.
# 7) As ADMIN, send /pause_broker <id>. Expect broker.isActive flipped + AuditLog row written.
```

Inspect `TelegramEventLog` for any `successful=false` rows and their `errorMessage`. Stop dev.

- [ ] **Step 6: Append Sprint 5 section to `crm-node/CLAUDE.md`**

Append below the "Intake pipeline (EPIC-01)" block:

```markdown
## v1.0 Sprint 5 — Telegram ops bot (EPIC-11)

- **Library:** `grammy`. Single global bot per deployment; `TelegramBotConfig` holds `botToken` + `webhookSecret`.
- **Webhook:** `POST /api/telegram/webhook/:secret` → `grammy` `webhookCallback`. Secret rotated via admin page.
- **Event catalog:** 23 types in `src/server/telegram/event-catalog.ts` (lead lifecycle, broker/system, operational, affiliate-facing). Templates: one file per type under `src/server/telegram/templates/`.
- **Emitter:** `src/server/telegram/emit.ts::emitTelegramEvent(type, payload, filters?)` — resolves matching subscriptions (by eventTypes, brokerFilter, affiliateFilter, mutedBrokerIds) and enqueues `telegram-send` pg-boss jobs.
- **Worker:** `src/server/jobs/telegram-send.ts` — renders per-template, sends via Telegram API, retries 3× with 429 back-off, logs to `TelegramEventLog`.
- **Commands:** `/start <token>` (link; 15-min TTL in `src/server/telegram/link-token.ts`), `/stats` (today's counters scoped to subscription filters), `/sub`/`/unsub`/`/mutebroker`, ADMIN-only `/ack <leadId>`/`/pause_broker <id>`/`/resume_broker <id>` — `/ack` writes `MANUAL_OVERRIDE` LeadEvent, broker commands write `AuditLog` with `via: "telegram"`.
- **UI:** `/dashboard/settings/telegram` (user: link, filters, save) and `/dashboard/settings/telegram-admin` (admin: token, webhook info, test-send, event log).
- **Emit points:** intake route (NEW_LEAD, FRAUD_HIT), push worker (PUSHED, FAILED, CAP_REACHED), pending-hold resolver (PENDING_HOLD_RELEASED, SHAVE_SUSPECTED), status-poll (FTD, AFFILIATE_FTD), broker-errors aggregator (BROKER_DOWN, BROKER_RECOVERED). All sites use fire-and-forget `void emit(...).catch(...)`.
- **Crons:** `anomaly-detect` every 15 min (50% hour-over-hour drop, prior > 10 leads → ANOMALY_DETECTED); `daily-summary` at 09:00 UTC (global DAILY_SUMMARY + per-affiliate AFFILIATE_DAILY_SUMMARY).
```

- [ ] **Step 7: Commit CLAUDE.md + tag**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): record v1.0 sprint 5 deliverables (telegram ops bot)"
git tag v1.0-sprint-5-complete
```

- [ ] **Step 8: Append a Retrospective section to THIS plan file**

Sections to capture:
- What shipped vs planned (which of the 23 types are live-emitting today vs template-only awaiting upstream code).
- Any event types deferred (e.g. `AUTOLOGIN_*` emit wiring depends on EPIC-08 — may be template-only until its owner hooks them).
- Telegram API quirks encountered (markdown escaping, 4096-char limit, group-chat vs private, `retry_after` handling).
- Rough time per task.

Commit:

```bash
git add docs/superpowers/plans/2026-06-16-v1-sprint-5-telegram-ops-bot.md
git commit -m "docs(plan): s5 retrospective"
```

---

## Success criteria for Sprint 5

- `main` contains EPIC-11 end-to-end: schema + webhook + commands + emitter + worker + 23 templates + UI (user + admin) + two cron jobs.
- `pnpm test` passes — existing ≥365 tests plus ≥12 new (webhook secret ×3, `/start` linking ×3, stats ×1, subscription state ×1, admin ops ×2, emitter matching ×4, templates coverage + 23-completeness ×1, events-wired ×1, anomaly ×2, daily-summary ×1).
- `pnpm lint` and `pnpm typecheck` zero errors.
- Manual smoke passes: real Telegram bot linked to a real chat, `/start <token>` links within 15 min, `POST /api/v1/leads` produces a `NEW_LEAD` message in chat within 10s, `/stats` matches DB counters, `/pause_broker` flips `Broker.isActive` + writes an `AuditLog`.
- `TelegramEventLog` rows recorded for every send attempt; `successful=false` rows carry `errorMessage`.
- Anomaly cron fires at schedule (verifiable by forcing a 50% drop in staging and observing an `ANOMALY_DETECTED` chat message).
- No destructive migrations — schema changes are purely additive (three new models, one relation on `User`).
- `CLAUDE.md` updated; `v1.0-sprint-5-complete` tag created.
