# v1.0 Sprint 4 — EPIC-10 Analytics v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Analytics v1 (EPIC-10): pre-aggregated rollups (`LeadDailyRoll` + `LeadHourlyRoll`) refreshed by pg-boss cron, an `analytics` tRPC router with four drill-down procedures (metric / conversions / rejects / revenue) including period-compare, a shareable tokenized link system (30-day TTL), user-scoped save-filter presets, a new `/dashboard/analytics` page built with **recharts** (4 metric tiles + full-width line chart + 2-column breakdown grid), and a CSV export endpoint that streams directly from the rollup tables.

**Architecture:** All analytics reads go through the rollup tables — **the `Lead` table is never queried from the analytics service**. Rollups are real Prisma tables (not Postgres `MATERIALIZED VIEW`) so we can inspect, index, and debug them with normal Prisma tooling. Cron jobs do `INSERT ... ON CONFLICT DO UPDATE` — idempotent replays are safe. A 60s Redis LRU cache sits in front of the service (key = SHA-256 of normalized params). Share tokens are 16-byte hex strings stored in `AnalyticsShareLink` with `expiresAt = now + 30d`. Presets are per-user rows in `AnalyticsPreset`.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), ioredis, pg-boss 12, recharts (new dep), NextAuth v5, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §4 Sprint 4.
**Design reference:** `crm-design/project/SPEC.md` §1 `/dashboard` (tile row + full-width chart + 2-column grid below).
**Prior sprint:** `docs/superpowers/plans/2026-04-21-v1-sprint-1-wave1-merge-and-hardening.md`.

**Design decisions (locked):**
- **Charts:** `recharts` ^2.x. Rationale: smaller bundle than visx, declarative React API, sparklines/line/horizontal-bar all built-in, good enough for v1. We commit to recharts everywhere — no mixing.
- **Materialized views are Prisma tables, not `MATERIALIZED VIEW`.** Easier to debug, indexable, doesn't need `REFRESH MATERIALIZED VIEW`, can be queried via Prisma client. Cost: we own the upsert logic (cron jobs).
- **Rollup cadence:** `LeadHourlyRoll` cron every 5 min (refreshing the current + previous hour). `LeadDailyRoll` cron every 15 min (refreshing today + yesterday). Skip weekly/monthly rollups — compute on the fly from daily rows (≤366 rows/year → cheap).
- **All analytics reads hit rollup tables only.** The `Lead` table is off-limits to the analytics service. If someone needs fresher-than-5-minute data they extend the rollup windows, not the query paths.
- **Cache TTL:** 60s. Redis LRU (existing ioredis connection). Key = `analytics:v1:<proc>:<sha256(normalized-params)>`.
- **Share tokens:** `crypto.randomBytes(16).toString('hex')` — 32-char hex, ~128 bits entropy. 30-day expiry enforced at read time (expired token → 410 Gone).
- **CSV export:** server-streamed `text/csv` via `ReadableStream`. No batching — rollup rows are bounded (≤366 days × N groups) so single-pass streaming is fine.
- **Period-compare:** each procedure accepts `compareTo: "previous_period" | "year_ago" | "custom" | null`. When non-null, the service runs two queries and returns `{ current, compare, deltaPct }`. `custom` requires explicit `compareFrom`/`compareTo` params.

**Preflight:**
- `main` contains Sprints 1–3 (Wave1 merge + hardening, Autologin + SLA, UAD + per-column RBAC).
- `git status` clean.
- Dev DB + Redis running (`pnpm db:up`).
- `pnpm install` done.

---

### Task 1: Add rollup + share + preset tables to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`
- No test file (schema only — correctness validated by Tasks 2–7)

- [ ] **Step 1: Open `prisma/schema.prisma` and append four new models**

Append at the bottom of the file (after `BrokerErrorSample`):

```prisma
// --- EPIC-10 Analytics v1 ---

model LeadDailyRoll {
  id              String   @id @default(cuid())
  date            DateTime // UTC midnight for the day
  affiliateId     String
  brokerId        String   @default("__none__") // sentinel keeps unique tuple intact for brokerless rejects
  geo             String
  totalReceived   Int      @default(0)
  totalValidated  Int      @default(0)
  totalRejected   Int      @default(0)
  totalPushed     Int      @default(0)
  totalAccepted   Int      @default(0)
  totalDeclined   Int      @default(0)
  totalFtd        Int      @default(0)
  sumRevenue      Decimal  @default(0) @db.Decimal(18, 4)
  updatedAt       DateTime @updatedAt

  @@unique([date, affiliateId, brokerId, geo])
  @@index([date])
  @@index([affiliateId, date])
  @@index([brokerId, date])
  @@index([geo, date])
}

model LeadHourlyRoll {
  // Same shape as LeadDailyRoll with `hour` (UTC on-the-hour) replacing `date`.
  // Same sentinel on brokerId, same unique `(hour, affiliateId, brokerId, geo)`,
  // same 4 indexes `(hour)`, `(affiliateId, hour)`, `(brokerId, hour)`, `(geo, hour)`.
  id              String   @id @default(cuid())
  hour            DateTime
  affiliateId     String
  brokerId        String   @default("__none__")
  geo             String
  totalReceived   Int      @default(0)
  totalValidated  Int      @default(0)
  totalRejected   Int      @default(0)
  totalPushed     Int      @default(0)
  totalAccepted   Int      @default(0)
  totalDeclined   Int      @default(0)
  totalFtd        Int      @default(0)
  sumRevenue      Decimal  @default(0) @db.Decimal(18, 4)
  updatedAt       DateTime @updatedAt

  @@unique([hour, affiliateId, brokerId, geo])
  @@index([hour])
  @@index([affiliateId, hour])
  @@index([brokerId, hour])
  @@index([geo, hour])
}

model AnalyticsShareLink {
  id         String    @id @default(cuid())
  token      String    @unique
  query      Json
  createdBy  String
  createdAt  DateTime  @default(now())
  expiresAt  DateTime

  @@index([expiresAt])
  @@index([createdBy, createdAt])
}

model AnalyticsPreset {
  id         String    @id @default(cuid())
  userId     String
  name       String
  query      Json
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([userId, name])
  @@index([userId, createdAt])
}
```

**Why sentinel `"__none__"` on `brokerId` instead of `String?`:** Postgres treats `NULL`s as distinct in unique indexes, so two brokerless rollups for the same `(date, affiliate, geo)` would both insert. Making `brokerId` required with a default sentinel keeps the uniqueness constraint honest. API responses map `"__none__"` back to `null`.

- [ ] **Step 2: Push schema to dev DB**

Run:
```bash
pnpm prisma db push
```
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Typecheck**

Run:
```bash
pnpm typecheck
```
Expected: zero errors (no consumers yet).

- [ ] **Step 4: Commit**

Run:
```bash
git add prisma/schema.prisma
git commit -m "feat(analytics): LeadDailyRoll + LeadHourlyRoll + share + preset tables"
```

---

### Task 2: Implement the rollup upsert routine

**Files:**
- Create: `src/server/analytics/rollup.ts`
- Test: `tests/unit/analytics/rollup.test.ts`

- [ ] **Step 1: Write failing unit test**

Create `tests/unit/analytics/rollup.test.ts`. Four cases (use `resetDb()` + helper to seed one affiliate + one broker):

1. **Aggregates 3 FTD leads into a single daily row** — creates 3 leads with same `(affiliateId, brokerId, geo=US)` in the current day, calls `refreshDailyRollups({from: dayStart, to: dayEnd})`, asserts one row with `totalReceived=3`, `totalFtd=3`.
2. **Idempotency** — seeds one `ACCEPTED` lead, calls `refreshDailyRollups` twice, asserts still one row with `totalAccepted=1`.
3. **Sentinel brokerId** — seeds one `REJECTED` lead with `brokerId=null`, asserts the resulting rollup row has `brokerId="__none__"` and `totalRejected=1`.
4. **Hourly bucketing** — seeds a lead at `2026-06-15T10:23Z`, calls `refreshHourlyRollups({from: 10:00Z, to: 11:00Z})`, asserts one row with `hour=10:00:00Z` and `totalPushed=1`.

Helpers: inline `dayStart(d)` / `dayEnd(d)` in the file (UTC `setUTCHours(0,0,0,0)` / `setUTCHours(23,59,59,999)`).

- [ ] **Step 2: Run test to confirm failure**

Run:
```bash
pnpm vitest run tests/unit/analytics/rollup.test.ts
```
Expected: FAIL — file `src/server/analytics/rollup.ts` does not exist.

- [ ] **Step 3: Implement `refreshDailyRollups` + `refreshHourlyRollups`**

Create `src/server/analytics/rollup.ts`. Export `refreshDailyRollups({from, to})` and `refreshHourlyRollups({from, to})`. Both walk the range bucket-by-bucket (enumerate helpers `enumerateUtcDays` / `enumerateUtcHours` step in 1-day / 1-hour increments) and run one `prisma.$executeRaw` per bucket with the following shape — the daily variant (hourly is identical with `date` → `hour`, `'day'` → `'hour'` in `date_trunc`, and `ON CONFLICT (hour, ...)`):

```sql
INSERT INTO "LeadDailyRoll" (
  id, date, "affiliateId", "brokerId", geo,
  "totalReceived", "totalValidated", "totalRejected",
  "totalPushed", "totalAccepted", "totalDeclined", "totalFtd",
  "sumRevenue", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  date_trunc('day', "receivedAt"),
  "affiliateId",
  COALESCE("brokerId", '__none__'),
  geo,
  COUNT(*)::int,
  SUM(CASE WHEN state <> 'REJECTED' THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN state  = 'REJECTED' THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN state IN ('PUSHED','ACCEPTED','DECLINED','FTD') THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN state IN ('ACCEPTED','FTD') THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN state  = 'DECLINED' THEN 1 ELSE 0 END)::int,
  SUM(CASE WHEN state  = 'FTD'      THEN 1 ELSE 0 END)::int,
  0,
  NOW()
FROM "Lead"
WHERE "receivedAt" >= $dayStart AND "receivedAt" < $dayEnd
GROUP BY 2, "affiliateId", COALESCE("brokerId", '__none__'), geo
ON CONFLICT (date, "affiliateId", "brokerId", geo) DO UPDATE SET
  "totalReceived"  = EXCLUDED."totalReceived",
  "totalValidated" = EXCLUDED."totalValidated",
  "totalRejected"  = EXCLUDED."totalRejected",
  "totalPushed"    = EXCLUDED."totalPushed",
  "totalAccepted"  = EXCLUDED."totalAccepted",
  "totalDeclined"  = EXCLUDED."totalDeclined",
  "totalFtd"       = EXCLUDED."totalFtd",
  "sumRevenue"     = EXCLUDED."sumRevenue",
  "updatedAt"      = NOW();
```

Notes:
- Use `prisma.$executeRaw`-style tagged template with interpolated `${dayStart}` / `${dayEnd}` so Prisma parameterizes properly.
- The per-bucket loop keeps each statement's work unit small (one day / one hour) — predictable latency vs a single statement over 90 days.
- Log each iteration with `logger.debug({event:"rollup_daily", day:...})` for cron observability.
- Enumerators clone the range start and step `setUTCDate+1` / `setUTCHours+1` so DST is irrelevant (we're in UTC).

**Note:** `sumRevenue` is placeholder-zero in v1 — we don't yet have a revenue source on `Lead`. EPIC-12 (Sprint 6, P&L + CRG) adds `Lead.revenueAmount`. Leave the column in place; wire it then.

- [ ] **Step 4: Run tests**

Run:
```bash
pnpm vitest run tests/unit/analytics/rollup.test.ts
```
Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/analytics/rollup.ts tests/unit/analytics/rollup.test.ts
git commit -m "feat(analytics): rollup upsert routine (idempotent ON CONFLICT)"
```

---

### Task 3: Wire pg-boss cron jobs for rollups

**Files:**
- Modify: `src/server/jobs/queue.ts` (add two job names)
- Create: `src/server/jobs/analytics-roll-daily.ts`
- Create: `src/server/jobs/analytics-roll-hourly.ts`
- Modify: `worker.ts` (register schedules)

- [ ] **Step 1: Add job-name constants**

Edit `src/server/jobs/queue.ts`. In the `JOB_NAMES` object, add:

```typescript
  analyticsRollDaily: "analytics-roll-daily",
  analyticsRollHourly: "analytics-roll-hourly",
```

- [ ] **Step 2: Create the two handlers**

Create `src/server/jobs/analytics-roll-daily.ts` and `src/server/jobs/analytics-roll-hourly.ts`. Both accept `Job<{from?: string, to?: string}>`:
- Default `to = new Date()`.
- Default `from` = `now - 24h` (daily) / `now - 2h` (hourly).
- Start a timer; call `refreshDailyRollups({from, to})` / `refreshHourlyRollups({from, to})`.
- `logger.info({event: "analytics_roll_daily_done" | "analytics_roll_hourly_done", from, to, duration_ms})` on completion.

Optional `from`/`to` overrides let an operator replay historical windows via `psql -c "SELECT pgboss.send('analytics-roll-daily', '{\"from\":\"...\",\"to\":\"...\"}')"` when a prior run failed or a backfill is needed.

- [ ] **Step 4: Register pg-boss schedules in `worker.ts`**

Open `worker.ts`. After the existing `boss.work(...)` calls, add:

```typescript
import { handleAnalyticsRollDaily } from "@/server/jobs/analytics-roll-daily";
import { handleAnalyticsRollHourly } from "@/server/jobs/analytics-roll-hourly";

await boss.work(JOB_NAMES.analyticsRollDaily, handleAnalyticsRollDaily);
await boss.work(JOB_NAMES.analyticsRollHourly, handleAnalyticsRollHourly);

// Schedules — pg-boss uses cron syntax
await boss.schedule(JOB_NAMES.analyticsRollDaily, "*/15 * * * *", {});   // every 15 min
await boss.schedule(JOB_NAMES.analyticsRollHourly, "*/5 * * * *", {});   // every 5 min
```

If the existing `worker.ts` does not import `JOB_NAMES` and `boss`, copy the pattern from the nearest existing `boss.work` call.

- [ ] **Step 5: Manual smoke — run worker, verify rollup rows appear**

Run (in terminal 1):
```bash
pnpm db:seed && pnpm worker
```

Run (in terminal 2):
```bash
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "LeadDailyRoll";'
```

Send a test lead via the intake route, wait ~5 min (or trigger the job manually: `psql -c 'INSERT INTO pgboss.job ...'`), re-query. Expected: rows appear.

Kill worker with Ctrl+C.

- [ ] **Step 6: Typecheck + lint**

Run:
```bash
pnpm typecheck && pnpm lint
```
Expected: zero errors.

- [ ] **Step 7: Commit**

Run:
```bash
git add src/server/jobs/queue.ts src/server/jobs/analytics-roll-daily.ts src/server/jobs/analytics-roll-hourly.ts worker.ts
git commit -m "feat(analytics): pg-boss cron jobs for hourly + daily rollups"
```

---

### Task 4: Implement `metricSeries` + period-compare in the analytics service

**Files:**
- Create: `src/server/analytics/service.ts`
- Create: `src/server/analytics/params.ts` (Zod schema + hash helper)
- Test: `tests/unit/analytics/metric-series.test.ts`

- [ ] **Step 1: Define shared param types**

Create `src/server/analytics/params.ts`. Export:

- `MetricKey = z.enum(["leads","ftds","accepted","revenue","acceptanceRate"])`.
- `GroupBy = z.enum(["affiliate","broker","geo","hour","day","week"])`.
- `AnalyticsFilters = z.object({affiliateIds: z.array(z.string()).default([]), brokerIds: z.array(z.string()).default([]), geos: z.array(z.string()).default([])})`.
- `CompareTo = z.enum(["previous_period","year_ago","custom"]).nullable().default(null)`.
- `AnalyticsParams = z.object({from: z.coerce.date(), to: z.coerce.date(), groupBy: GroupBy.default("day"), filters: AnalyticsFilters.default({...}), compareTo: CompareTo, compareFrom: z.coerce.date().optional(), compareToEnd: z.coerce.date().optional(), metric: MetricKey.default("leads")})`.
- `hashParams(obj)` → `sha256(JSON.stringify(obj, <sorted-keys-replacer>))`. Sorted-keys replacer makes the cache key stable across param-order permutations.
- `computeComparePeriod(from, to, compareTo, explicitFrom?, explicitEnd?) -> {from,to} | null`:
  - `null` → `null`.
  - `"custom"` → return `{from: explicitFrom, to: explicitEnd}`; throw if either missing.
  - `"previous_period"` → subtract `(to - from)` span from both endpoints.
  - `"year_ago"` → clone each endpoint and `setUTCFullYear(year - 1)`.

- [ ] **Step 2: Write failing test for `metricSeries` + period-compare**

Create `tests/unit/analytics/metric-series.test.ts`. Seed directly into `leadDailyRoll` (skip the Lead → rollup round-trip — Task 2 covered it). Three cases:

1. **Day-bucket series** — seed 3 daily rows with `totalReceived=10/15/20` on `2026-06-01/02/03` (same affiliate/broker/geo). Call `metricSeries({from:06-01, to:06-03T23:59Z, groupBy:"day", metric:"leads", compareTo:null, filters:{...}})`. Assert `series.length=3`, `series.map(.value)=[10,15,20]`, `total=45`, `compare=null`.
2. **`previous_period` compare with `deltaPct`** — seed compare window (`05-30/31` → 10+10=20) and current window (`06-01/02` → 15+15=30). Call with `compareTo:"previous_period"`. Assert `total=30`, `compare.total=20`, `deltaPct≈50` (`(30-20)/20*100`).
3. **Filter by `affiliateIds`** — seed rows for two affiliates on the same day (10 for A, 99 for B). Filter to `[A.id]`. Assert `total=10`.

- [ ] **Step 3: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/unit/analytics/metric-series.test.ts
```
Expected: FAIL — `src/server/analytics/service.ts` missing.

- [ ] **Step 4: Implement `metricSeries`**

Create `src/server/analytics/service.ts` exporting `metricSeries(p: AnalyticsParams): Promise<MetricSeriesResult>` where `MetricSeriesResult = {series: SeriesPoint[], total: number, compare: {series, total} | null, deltaPct: number | null}` and `SeriesPoint = {bucket: string, value: number}`.

**`metricSeries(p)`:**
- `current = await runMetricQuery(p.from, p.to, p.groupBy, p.metric, p.filters)`.
- `comparePeriod = computeComparePeriod(p.from, p.to, p.compareTo, p.compareFrom, p.compareToEnd)`.
- If non-null, run `runMetricQuery` a second time for that window. `deltaPct = compare.total === 0 ? null : (current.total - compare.total) / compare.total * 100`.
- Return `{...current, compare, deltaPct}`.

**`runMetricQuery(from, to, groupBy, metric, filters)`:**
- Pick `table = groupBy === "hour" ? "LeadHourlyRoll" : "LeadDailyRoll"`, `bucketCol = "hour" | "date"` to match.
- Choose truncation: `groupBy === "week"` → `'week'`; `"hour"` → `'hour'`; otherwise `'day'`.
- Build SQL conditions starting with `"${bucketCol}" >= $1 AND "${bucketCol}" < $2` and tack on `"affiliateId" = ANY($N::text[])`, `"brokerId" = ANY($N::text[])`, `geo = ANY($N::text[])` only for non-empty filter arrays; push positional params in order.
- `groupExpr` = `"affiliateId"` / `"brokerId"` / `geo` when `groupBy` is one of those scalars, otherwise `date_trunc('${trunc}', "${bucketCol}")`.
- `valueExpr` from `metricExpr(metric)` (below).
- Issue `prisma.$queryRawUnsafe(\`SELECT ${groupExpr} AS bucket, ${valueExpr} AS value FROM "${table}" WHERE ${conds.join(" AND ")} GROUP BY 1 ORDER BY 1 ASC\`, ...params)`.
- Coerce `bucket` to ISO string (handle `Date` instance vs raw string). Map `value` to `Number(v) || 0`. Reduce for `total`.

**`metricExpr(m)`:**
- `"leads"` → `SUM("totalReceived")::int`
- `"ftds"` → `SUM("totalFtd")::int`
- `"accepted"` → `SUM("totalAccepted")::int`
- `"revenue"` → `COALESCE(SUM("sumRevenue"),0)::float`
- `"acceptanceRate"` → `CASE WHEN SUM("totalPushed")=0 THEN 0 ELSE SUM("totalAccepted")::float / SUM("totalPushed")::float END` (fraction 0..1; UI multiplies by 100).

**Why `$queryRawUnsafe` over tagged template:** `groupBy` and `metric` are enums (not user free text), so whitelist→interpolate is safe. Filter arrays go through proper positional params to keep injection-proof.

- [ ] **Step 5: Run test — expect PASS**

Run:
```bash
pnpm vitest run tests/unit/analytics/metric-series.test.ts
```
Expected: PASS (all 3 cases).

- [ ] **Step 6: Commit**

Run:
```bash
git add src/server/analytics/service.ts src/server/analytics/params.ts tests/unit/analytics/metric-series.test.ts
git commit -m "feat(analytics): metricSeries + period-compare from daily/hourly rollups"
```

---

### Task 5: Implement `conversionBreakdown`, `rejectBreakdown`, `revenueBreakdown`

**Files:**
- Modify: `src/server/analytics/service.ts` (append)
- Test: `tests/unit/analytics/breakdowns.test.ts`

- [ ] **Step 1: Write failing test for the three breakdowns**

Create `tests/unit/analytics/breakdowns.test.ts`. `beforeEach` seeds one affiliate + one broker and inserts one `LeadDailyRoll` row for `2026-06-01` with `{received:100, validated:80, rejected:20, pushed:70, accepted:40, declined:10, ftd:15}`. Three cases:

1. **`conversionBreakdown` funnel** — call with `{from:06-01, to:06-01T23:59Z, groupBy:"day", compareTo:null, ...}`. Assert `stages.received=100`, `stages.validated=80`, `stages.pushed=70`, `stages.accepted=40`, `stages.ftd=15`; `rates.validationRate≈0.8`, `rates.acceptanceRate≈40/70`, `rates.ftdRate≈15/40`.
2. **`rejectBreakdown` by reason** — seed three `Lead` rows (state `REJECTED`, `receivedAt=06-01`) with `rejectReason` values `blacklist_email`, `blacklist_email`, `cap_blocked`. Call `rejectBreakdown(...)`. Assert `byReason` contains `{blacklist_email:2, cap_blocked:1}` and `total=3`.
3. **`revenueBreakdown` by broker** — call with `groupBy:"broker", metric:"revenue"`. Assert `rows.length ≥ 1` and each row has `bucket`, `revenue`, `ftds` keys (values will be 0 for `revenue` until EPIC-12 wires a real amount — the shape is what we're locking in).

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/unit/analytics/breakdowns.test.ts
```
Expected: FAIL — helpers do not exist.

- [ ] **Step 3: Append the three functions to `src/server/analytics/service.ts`**

Append to `src/server/analytics/service.ts` (consolidate imports at the top — do **not** re-import `computeComparePeriod`; it's already there from Task 4).

**`conversionBreakdown(p)`:**
- Return type `{stages: {received,validated,rejected,pushed,accepted,declined,ftd}, rates: {validationRate,acceptanceRate,ftdRate}, compare}`.
- Delegates to `runConvQuery(from, to, filters)`: emits one SQL `SELECT COALESCE(SUM("totalReceived"),0)::int AS received, ... FROM "LeadDailyRoll" WHERE "date" >= $1 AND "date" < $2 [AND filters...]` — all seven stage totals in a single row. Filter tacking is the same pattern as `runMetricQuery` (`"affiliateId" = ANY($N::text[])`, etc.).
- Rates: `validationRate = validated/received` (guard /0), `acceptanceRate = accepted/pushed` (guard /0), `ftdRate = ftd/accepted` (guard /0).
- If `computeComparePeriod(...)` returns non-null, run `runConvQuery` a second time and include as `compare`.

**`rejectBreakdown(p)` — the one allowed `Lead` read:**
- Use `prisma.lead.groupBy({ by: ["rejectReason"], where: {state:"REJECTED", receivedAt:{gte:from,lt:to}, ...filters}, _count:{_all:true} })`.
- Map rows to `{reason: r.rejectReason ?? "unknown", count: r._count._all}` and sort desc.
- `total = sum(counts)`.
- Code comment must call out: "This is the one exception to 'never read Lead directly'; bounded by window + `state = REJECTED` so it stays cheap. Move `rejectReason` into the rollup in a follow-up once we have enough data to enumerate reasons."

**`revenueBreakdown(p)`:**
- Return `{rows: Array<{bucket, revenue, ftds, pushed}>, total: {revenue, ftds, pushed}}`.
- Build `groupExpr` = `"brokerId"` if `groupBy="broker"`, `"affiliateId"` if `groupBy="affiliate"`, `geo` if `groupBy="geo"`, else `date_trunc('${groupBy}', "date")`.
- SQL: `SELECT ${groupExpr} AS bucket, COALESCE(SUM("sumRevenue"),0)::float AS revenue, COALESCE(SUM("totalFtd"),0)::int AS ftds, COALESCE(SUM("totalPushed"),0)::int AS pushed FROM "LeadDailyRoll" WHERE ... GROUP BY 1 ORDER BY revenue DESC`.
- Coerce `Date` buckets via `r.bucket instanceof Date ? r.bucket.toISOString() : String(r.bucket ?? "")`.
- Reduce to `total`.

- [ ] **Step 3: Run test**

Run:
```bash
pnpm vitest run tests/unit/analytics/breakdowns.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/server/analytics/service.ts tests/unit/analytics/breakdowns.test.ts
git commit -m "feat(analytics): conversion + reject + revenue breakdowns"
```

---

### Task 6: Build the tRPC `analytics` router with Redis LRU cache

**Files:**
- Create: `src/server/analytics/cache.ts`
- Create: `src/server/routers/analytics.ts`
- Modify: `src/server/routers/_app.ts`
- Test: `tests/unit/analytics/cache.test.ts`

- [ ] **Step 1: Write cache unit test**

Create `tests/unit/analytics/cache.test.ts`. `beforeEach` flushes keys matching `analytics:v1:*` via ioredis. Two cases:

1. **Same key hit** — call `memoizeCached("proc", {x:1}, compute)` twice with a counter-incrementing `compute`. Assert results equal and `compute` ran once.
2. **Different params miss** — call with `{x:1}` then `{x:2}`. Assert `compute` ran twice.

- [ ] **Step 2: Implement the cache helper**

Create `src/server/analytics/cache.ts`. Export `memoizeCached<T>(proc: string, params: unknown, compute: () => Promise<T>): Promise<T>`:
- `TTL_SECONDS = 60`.
- `key = \`analytics:v1:${proc}:${hashParams(params)}\`` (uses `hashParams` from `params.ts`).
- `const hit = await redis.get(key)`; if present, `JSON.parse` inside try/catch — fall through to recompute on corrupt cache.
- Otherwise compute, `redis.set(key, JSON.stringify(value), "EX", TTL_SECONDS)`, return.

Reuse the same ioredis instance as `src/server/intake/metrics.ts` (import `getRedis` from wherever it lives there).

- [ ] **Step 3: Run cache test**

Run:
```bash
pnpm vitest run tests/unit/analytics/cache.test.ts
```
Expected: PASS.

- [ ] **Step 4: Build the tRPC router**

Create `src/server/routers/analytics.ts`. Export `analyticsRouter = router({...})` with four `protectedProcedure`s (`metricSeries`, `conversionBreakdown`, `rejectBreakdown`, `revenueBreakdown`). Each takes `.input(AnalyticsParams)`, `.query(async ({input}) => memoizeCached("<procName>", input, () => <serviceFn>(input)))`. Keep the proc string matching the key actually used in the cache — it's part of the cache key shape, so renames must stay consistent.

- [ ] **Step 5: Register in `_app.ts`**

Edit `src/server/routers/_app.ts`. Add `import { analyticsRouter } from "./analytics";` and a new `analytics: analyticsRouter` entry in the top-level `router({...})` call. The `AppRouter` type export is already set up to pick up the new procs automatically.

- [ ] **Step 6: Typecheck + lint + full suite**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: zero errors, all tests pass.

- [ ] **Step 7: Commit**

Run:
```bash
git add src/server/analytics/cache.ts src/server/routers/analytics.ts src/server/routers/_app.ts tests/unit/analytics/cache.test.ts
git commit -m "feat(analytics): tRPC analytics router + Redis LRU cache (60s TTL)"
```

---

### Task 7: Share-link endpoints (`POST /share`, `GET /share/:token`)

**Files:**
- Create: `src/app/api/v1/analytics/share/route.ts` (POST)
- Create: `src/app/api/v1/analytics/share/[token]/route.ts` (GET)
- Test: `tests/integration/analytics-share.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/analytics-share.test.ts`. Mock `@/auth` to return `{ user: { id: "u1" } }`. `beforeEach`: reset DB, create user `u1`. Three cases:

1. **POST creates token, GET returns saved query** — POST `/api/v1/analytics/share` with body `{query:{proc:"metricSeries", from:"2026-06-01", to:"2026-06-07", metric:"leads"}}`. Assert 200 + `token` matches `/^[a-f0-9]{32}$/`. Then GET `/api/v1/analytics/share/:token` with `ctx.params = Promise.resolve({token})`. Assert 200 + body.query equals the original query.
2. **GET 410 on expired** — seed `analyticsShareLink` with `expiresAt = now - 1s`. Call GET. Assert status 410.
3. **GET 404 on unknown** — call GET with `token:"nope"`. Assert status 404.

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/integration/analytics-share.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement POST handler**

Create `src/app/api/v1/analytics/share/route.ts`:
- `const Body = z.object({ query: z.unknown(), ttlDays: z.number().int().min(1).max(90).optional() })`.
- `POST(req)`: `await auth()` → 401 if no `user.id`. Parse body via `Body.safeParse` → 400 on failure. Generate `token = randomBytes(16).toString("hex")`. `ttlDays = parsed.data.ttlDays ?? 30`. Insert `analyticsShareLink` with `{token, query, createdBy: user.id, expiresAt: now + ttlDays*86400e3}`. Return `{token, expiresAt}`.

- [ ] **Step 4: Implement GET handler**

Create `src/app/api/v1/analytics/share/[token]/route.ts`:
- Signature: `GET(_req, ctx: { params: Promise<{token: string}> })`.
- Lookup via `prisma.analyticsShareLink.findUnique`. 404 if missing; 410 if `expiresAt < now`.
- If `row.query.proc` is present, validate via `AnalyticsParams.safeParse` and re-execute the correct service function (`metricSeries` / `conversionBreakdown` / `rejectBreakdown` / `revenueBreakdown`) — so the recipient sees live data, not a frozen snapshot.
- Respond `{query, data, expiresAt}`.

- [ ] **Step 5: Run test — expect PASS**

Run:
```bash
pnpm vitest run tests/integration/analytics-share.test.ts
```
Expected: PASS (all 3 cases).

- [ ] **Step 6: Commit**

Run:
```bash
git add src/app/api/v1/analytics/share/route.ts "src/app/api/v1/analytics/share/[token]/route.ts" tests/integration/analytics-share.test.ts
git commit -m "feat(analytics): tokenized share links (POST+GET, 30-day TTL, 410 on expiry)"
```

---

### Task 8: Filter-preset CRUD

**Files:**
- Modify: `src/server/routers/analytics.ts` (append preset procedures)
- Test: `tests/unit/analytics/presets.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/unit/analytics/presets.test.ts`. Build a tRPC caller via `appRouter.createCaller({ userId: "u1", session: { user: { id: "u1" } } } as never)`. `beforeEach`: reset DB, create user `u1`. Two cases:

1. **create / list / delete** — `savePreset({name:"last-7-days", query:{...}})` → `id` defined. `listPresets()` length 1. `deletePreset({id})` → `listPresets()` length 0.
2. **unique `(userId, name)`** — `savePreset({name:"dup", query:{}})` twice; second call rejects (Prisma P2002 from the unique index).

If `appRouter.createCaller` does not exist, fall back to calling service functions directly; the goal is CRUD coverage, not tRPC plumbing.

- [ ] **Step 2: Append the three procedures to `src/server/routers/analytics.ts`**

Add three more members to `analyticsRouter`, all `protectedProcedure`:
- `savePreset`: input `z.object({ name: z.string().min(1).max(64), query: z.unknown() })` → `prisma.analyticsPreset.create({data: {userId: ctx.userId, name, query}})`. The unique `(userId, name)` index throws P2002 on duplicates.
- `listPresets`: query → `prisma.analyticsPreset.findMany({where: {userId: ctx.userId}, orderBy: {createdAt: "desc"}})`.
- `deletePreset`: input `z.object({ id: z.string() })` → `prisma.analyticsPreset.deleteMany({where: {id, userId: ctx.userId}})` (the `userId` guard prevents users from deleting someone else's preset even if they know the id).

- [ ] **Step 3: Run test**

Run:
```bash
pnpm vitest run tests/unit/analytics/presets.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/server/routers/analytics.ts tests/unit/analytics/presets.test.ts
git commit -m "feat(analytics): user-scoped filter presets CRUD"
```

---

### Task 9: Install recharts + scaffold `/dashboard/analytics` layout with metric tiles

**Files:**
- Modify: `package.json` (add recharts)
- Create: `src/app/dashboard/analytics/page.tsx`
- Create: `src/components/analytics/MetricTile.tsx`
- Create: `src/components/analytics/FilterBar.tsx`

- [ ] **Step 1: Install recharts**

Run:
```bash
pnpm add recharts
```
Expected: `recharts` in dependencies.

- [ ] **Step 2: Create the page (client component)**

Create `src/app/dashboard/analytics/page.tsx` — `"use client"`. Shape:

```tsx
"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MetricTile } from "@/components/analytics/MetricTile";
import { FilterBar, type FilterState } from "@/components/analytics/FilterBar";

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters());
  const leads = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "leads" });
  const ftds = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "ftds" });
  const revenue = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "revenue" });
  const acceptance = trpc.analytics.metricSeries.useQuery({ ...filters, metric: "acceptanceRate" });
  return (
    <div className="flex flex-col gap-4 p-4">
      <FilterBar value={filters} onChange={setFilters} />
      <div className="grid grid-cols-4 gap-3">
        <MetricTile label="Leads"           value={leads.data?.total ?? 0}      deltaPct={leads.data?.deltaPct}      series={leads.data?.series ?? []} />
        <MetricTile label="FTDs"            value={ftds.data?.total ?? 0}       deltaPct={ftds.data?.deltaPct}       series={ftds.data?.series ?? []} />
        <MetricTile label="Revenue"         value={revenue.data?.total ?? 0}    deltaPct={revenue.data?.deltaPct}    series={revenue.data?.series ?? []}    format="currency" />
        <MetricTile label="Acceptance rate" value={acceptance.data?.total ?? 0} deltaPct={acceptance.data?.deltaPct} series={acceptance.data?.series ?? []} format="percent" />
      </div>
      {/* Line chart placeholder — replaced in Task 10 */}
      <div id="analytics-line" />
      {/* Breakdowns placeholder — replaced in Task 11 */}
      <div className="grid grid-cols-2 gap-3" id="analytics-breakdowns" />
    </div>
  );
}
```

Include a `defaultFilters()` helper that returns `{from: today-7 UTC 00:00, to: today UTC 23:59, groupBy:"day", compareTo:"previous_period", filters:{affiliateIds:[],brokerIds:[],geos:[]}}`.

- [ ] **Step 3: Create `MetricTile`**

Create `src/components/analytics/MetricTile.tsx`. Props: `{label, value, deltaPct?: number|null, series, format?: "number"|"currency"|"percent"}`. Layout:
- Outer `<div>` — border, rounded, `p-3`, `flex flex-col gap-1`.
- Top row: `11px` uppercase mono label.
- Middle row: flex `items-end justify-between` — left is `22px` semibold `tabular-nums` (formatted per `format`), right is `11px` mono delta (`+X.X%` green when ≥0, red otherwise), hidden when `deltaPct == null`.
- Bottom row: `h-10` recharts `<ResponsiveContainer><LineChart data={series}><Line dataKey="value" stroke="currentColor" strokeWidth={1.5} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>`.
- `formatValue(v, fmt)` helper: `currency` → `$` + `toLocaleString({maximumFractionDigits:0})`; `percent` → `(v*100).toFixed(1) + "%"`; default → `toLocaleString()`.

- [ ] **Step 4: Create `FilterBar`**

Create `src/components/analytics/FilterBar.tsx`. Export `FilterState = {from, to, groupBy, compareTo, filters}`. Props: `{value, onChange, ...optional onShare/onSavePreset/onLoadPreset/presets (added in Task 12)}`. Layout: `flex items-center gap-2 flex-wrap border-b pb-3`:
- Two `<input type="date">` (from / to), wired via `toDateInput(d) = d.toISOString().slice(0,10)` and `fromDateInput(s) = new Date(s+"T00:00:00Z")`.
- `<select>` for `groupBy` with options `hour/day/week/affiliate/broker/geo`.
- `<label>` wrapping a `<input type="checkbox">` bound to `value.compareTo !== null`; toggling flips `compareTo` between `"previous_period"` and `null`.
- Placeholder comment for the share / preset controls added in Task 12.

Use the same token classes (`border-[var(--border)]`, `bg-[var(--surface)]`, text sizes `[11px]`/`[12px]`) as the rest of the dashboard to match `crm-design/project/SPEC.md` density rules.

- [ ] **Step 5: Add sidebar link**

Open `src/app/dashboard/layout.tsx` (or wherever the sidebar nav lives) and append an `Analytics` link pointing at `/dashboard/analytics` next to `Dashboard`.

- [ ] **Step 6: Typecheck + lint + dev smoke**

Run:
```bash
pnpm typecheck && pnpm lint
pnpm dev
```
Navigate to `http://localhost:3000/dashboard/analytics`. Expected: 4 empty tiles render; no console errors.

Stop dev server.

- [ ] **Step 7: Commit**

Run:
```bash
git add package.json pnpm-lock.yaml src/app/dashboard/analytics/ src/components/analytics/ src/app/dashboard/layout.tsx
git commit -m "feat(analytics): /dashboard/analytics scaffold + 4 metric tiles with sparklines (recharts)"
```

---

### Task 10: Line chart + compare overlay

**Files:**
- Create: `src/components/analytics/LineChartCard.tsx`
- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Create the line chart component**

Create `src/components/analytics/LineChartCard.tsx`. Props: `{title, current: SeriesPoint[], compare?: SeriesPoint[] | null, height?: number = 260}`. Internal:

- `mergeSeries(a, b)` walks ordinal indices up to `max(a.length, b.length)` and emits `{bucket, current, compare}` rows — current series is the primary; compare is overlaid index-by-index (not by real timestamp — the user wants to see "this week vs last week" visually aligned).
- `fmtBucket(v)` returns `v.slice(0,10)` for ISO date-like strings, else `v`.
- Outer card: same `rounded border p-3 bg-[var(--surface)]` chrome as `MetricTile`, `11px` title row on top, recharts `<LineChart>` underneath.
- Chart: `<CartesianGrid vertical={false} strokeDasharray="2 2" stroke="var(--border)" />`, `<XAxis dataKey="bucket" tickFormatter={fmtBucket} minTickGap={30} />`, `<YAxis width={40} />`, `<Tooltip />`, `<Legend />`, one solid `<Line dataKey="current" stroke="var(--accent)" />` and one dashed `<Line dataKey="compare" strokeDasharray="4 3" stroke="var(--fg-dim)" />` rendered only when `compare.length > 0`. Set `isAnimationActive={false}` on both.

- [ ] **Step 2: Wire into the page**

Edit `src/app/dashboard/analytics/page.tsx`. Replace the `<div id="analytics-line" …>` placeholder with:

```tsx
<LineChartCard
  title="Leads over time"
  current={leads.data?.series ?? []}
  compare={leads.data?.compare?.series ?? null}
/>
```

Import `LineChartCard` at the top.

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev
```
Navigate to `/dashboard/analytics`. With seed data present, verify the chart renders and the compare overlay appears (dashed line) when the filter bar's "compare" toggle is on.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/components/analytics/LineChartCard.tsx src/app/dashboard/analytics/page.tsx
git commit -m "feat(analytics): full-width line chart with period-compare overlay"
```

---

### Task 11: Conversions + Rejects breakdown widgets

**Files:**
- Create: `src/components/analytics/ConversionsWidget.tsx`
- Create: `src/components/analytics/RejectsWidget.tsx`
- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Conversions widget (bar-stack funnel)**

Create `src/components/analytics/ConversionsWidget.tsx`. Props: `{data: {stages: {received, validated, pushed, accepted, ftd}} | undefined}`. Render a horizontal recharts `<BarChart layout="vertical">` with 5 rows (`Received/Validated/Pushed/Accepted/FTD`) colored `["#60a5fa","#93c5fd","#a78bfa","#34d399","#22c55e"]` via `<Cell>` children. `YAxis type="category"` with the stage label, `XAxis type="number" hide`, standard `<Tooltip>`. Height 240. Same card chrome as `LineChartCard`.

- [ ] **Step 2: Rejects widget (horizontal bar by reason)**

Create `src/components/analytics/RejectsWidget.tsx`. Props: `{data: {byReason: Array<{reason, count}>, total: number} | undefined}`. Slice `byReason` to top 12 rows. Render horizontal `<BarChart>` — `<YAxis type="category" dataKey="reason" width={120}>`, `<XAxis type="number" hide>`, single `<Bar dataKey="count" fill="var(--danger)">`. Title line includes total count when data present.

- [ ] **Step 3: Wire both into the page**

Edit `src/app/dashboard/analytics/page.tsx`. Add queries:

```tsx
const conv = trpc.analytics.conversionBreakdown.useQuery(filters);
const rej = trpc.analytics.rejectBreakdown.useQuery(filters);
```

Replace the `<div id="analytics-breakdowns" …>` placeholder with:

```tsx
<div className="grid grid-cols-2 gap-3">
  <ConversionsWidget data={conv.data} />
  <RejectsWidget data={rej.data} />
</div>
```

Import both components at the top.

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev
```
Navigate to `/dashboard/analytics`. Expected: bottom row shows two charts; conversion funnel staircase visible.

Stop dev.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/components/analytics/ConversionsWidget.tsx src/components/analytics/RejectsWidget.tsx src/app/dashboard/analytics/page.tsx
git commit -m "feat(analytics): conversions funnel + rejects-by-reason widgets"
```

---

### Task 12: Share button + save-preset UI

**Files:**
- Modify: `src/components/analytics/FilterBar.tsx`
- Modify: `src/app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Extend `FilterBar` props + render controls**

Extend `Props` with four optional callbacks: `onShare`, `onSavePreset: (name) => void`, `onLoadPreset: (id) => void`, and `presets: Array<{id,name,query}>`. Render at the trailing edge of the filter row:

- `<select>` (shown only when `presets.length > 0`) listing preset names — `onChange` calls `onLoadPreset(id)`.
- `<button>save preset</button>` — on click, `prompt("preset name?")` then `onSavePreset(name)`.
- `<button>share</button>` — primary color; on click, `onShare()`.

Use the same `border border-[var(--border)] rounded px-2 py-1 text-[12px] bg-[var(--surface)]` chrome as the other filter controls.

- [ ] **Step 2: Wire share + save-preset in the page**

In `page.tsx`:
- Add `const utils = trpc.useUtils();` and `const presetsQuery = trpc.analytics.listPresets.useQuery();`.
- Add `const savePreset = trpc.analytics.savePreset.useMutation({ onSuccess: () => utils.analytics.listPresets.invalidate() });`.
- Implement `handleShare()`: `POST /api/v1/analytics/share` with body `{query: {proc:"metricSeries", ...filters, metric:"leads"}}`, read `{token}`, build `${location.origin}/dashboard/analytics?share=${token}`, `navigator.clipboard.writeText(url)`, `alert(...)`.
- Pass the four new callbacks to `<FilterBar>`: `onShare={handleShare}`, `onSavePreset={(name) => savePreset.mutateAsync({name, query: filters})}`, `presets={presetsQuery.data ?? []}`, `onLoadPreset={(id) => { const p = presetsQuery.data?.find(x => x.id === id); if (p) setFilters(p.query as FilterState); }}`.

- [ ] **Step 3: Handle `?share=<token>` URL param on mount**

Add a `useEffect(() => { ... }, [])` at the top of the page component:
- Read `new URLSearchParams(location.search).get("share")`. Bail if null.
- `fetch(`/api/v1/analytics/share/${token}`)` → `.json()` → if `data.query`, coerce stringified `from`/`to` back to `Date` and `setFilters(data.query as FilterState)`.
- Wrap in `.catch(() => {})` so a stale/404 token doesn't surface as an uncaught promise.

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev
```

1. Go to `/dashboard/analytics`.
2. Click `save preset`, name it `test`. Refresh — dropdown shows it.
3. Click `share`. Copy the URL. Open it in an incognito window (still authenticated). Expected: filters restored.

Stop dev.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/components/analytics/FilterBar.tsx src/app/dashboard/analytics/page.tsx
git commit -m "feat(analytics): share button + save/load presets in filter bar"
```

---

### Task 13: CSV export endpoint

**Files:**
- Create: `src/app/api/v1/analytics/export/route.ts`
- Modify: `src/app/dashboard/analytics/page.tsx` (add export button per breakdown)
- Test: `tests/integration/analytics-export.test.ts`

- [ ] **Step 1: Write failing integration test**

Create `tests/integration/analytics-export.test.ts`. Mock `@/auth` to return `{user:{id:"u1"}}`. `beforeEach`: reset DB, seed user, one affiliate, one `LeadDailyRoll` row for `2026-06-01` with `totalReceived=10`.

One case: **metricSeries CSV** — build `query = encodeURIComponent(JSON.stringify({proc:"metricSeries", from:"2026-06-01", to:"2026-06-02", groupBy:"day", metric:"leads", filters:{...}, compareTo:null}))`. Call `GET(new Request("http://localhost/api/v1/analytics/export?query="+query))`. Assert status 200, `content-type` contains `text/csv`, body first line `bucket,value`, total lines ≥ 2.

- [ ] **Step 2: Run — expect failure**

Run:
```bash
pnpm vitest run tests/integration/analytics-export.test.ts
```
Expected: FAIL (route missing).

- [ ] **Step 3: Implement the export route**

Create `src/app/api/v1/analytics/export/route.ts`:

- `GET(req)`: `await auth()` → 401 if unauthed. Read `url.searchParams.get("query")` → 400 if missing; `JSON.parse` inside try/catch → 400 on `SyntaxError`. `AnalyticsParams.safeParse(parsed)` → 400 on fail.
- Switch on `parsed.proc` (the JSON query must include a `proc` field):
  - `"metricSeries"` → `{ header: "bucket,value", rows: series.map(p => \`${p.bucket},${p.value}\`) }`.
  - `"conversionBreakdown"` → 7 fixed rows (`received/validated/rejected/pushed/accepted/declined/ftd`), header `stage,value`.
  - `"rejectBreakdown"` → rows of `reason,count` from `byReason`, header `reason,count`.
  - `"revenueBreakdown"` → rows of `bucket,revenue,ftds,pushed`, header `bucket,revenue,ftds,pushed`.
  - anything else → 400 `unknown_proc`.
- Build `csv = header + "\n" + rows.join("\n") + "\n"`. Escape cells containing `"`, `,`, or `\n` via `v.replace(/"/g, '""')` wrapped in double quotes.
- Return `new NextResponse(csv, { status: 200, headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": \`attachment; filename="${filename}"\` } })` with per-proc filenames (`metric-series.csv`, `conversions.csv`, etc.).

**On streaming:** the spec says "server-side stream". In practice `metricSeries`/rollups return ≤366 rows — a single in-memory `NextResponse` is fine. If row counts ever exceed ~10k, swap to a `ReadableStream` and push line-by-line. Leave a TODO comment.

- [ ] **Step 4: Run test — expect PASS**

Run:
```bash
pnpm vitest run tests/integration/analytics-export.test.ts
```
Expected: PASS.

- [ ] **Step 5: Wire export buttons in the page**

In `page.tsx`, add a small `<ExportButton />` helper:

```tsx
function ExportButton({ proc, filters, label }: { proc: string; filters: FilterState; label: string }) {
  return (
    <a
      href={`/api/v1/analytics/export?query=${encodeURIComponent(JSON.stringify({ proc, ...filters, metric: "leads" }))}`}
      className="text-[11px] font-mono text-[var(--fg-dim)] hover:text-[var(--fg)] underline"
    >
      {label}
    </a>
  );
}
```

Place one next to each breakdown's title.

- [ ] **Step 6: Commit**

Run:
```bash
git add "src/app/api/v1/analytics/export/route.ts" src/app/dashboard/analytics/page.tsx tests/integration/analytics-export.test.ts
git commit -m "feat(analytics): CSV export endpoint for all four drill-downs"
```

---

### Task 14: Update `CLAUDE.md` + final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append an Analytics v1 section to `CLAUDE.md`**

Edit `crm-node/CLAUDE.md`, append below the "v1.0 Sprint 1 hardening" section (or the last S-block):

```markdown
## Analytics v1 (EPIC-10, Sprint 4)

- **Rollup tables:** `LeadDailyRoll` + `LeadHourlyRoll` (real Prisma tables, not PG MATERIALIZED VIEWs). Unique on `(bucket, affiliateId, brokerId, geo)`. `brokerId` sentinel `"__none__"` for brokerless (rejected) leads.
- **Cron:** pg-boss schedules — `analytics-roll-daily` every 15 min, `analytics-roll-hourly` every 5 min. Idempotent via `INSERT ... ON CONFLICT DO UPDATE`. Handlers: `src/server/jobs/analytics-roll-daily.ts`, `src/server/jobs/analytics-roll-hourly.ts`.
- **Service:** `src/server/analytics/service.ts` — `metricSeries`, `conversionBreakdown`, `rejectBreakdown`, `revenueBreakdown`. Period-compare (`previous_period` / `year_ago` / `custom`) baked in. Reads only from rollups (exception: `rejectBreakdown` reads `Lead.rejectReason` directly — bounded by window + state).
- **Router:** `analytics` in `src/server/routers/analytics.ts`. Cache: Redis LRU, 60s TTL, key = `analytics:v1:<proc>:<sha256(params)>`. Presets: `savePreset`/`listPresets`/`deletePreset`.
- **Share links:** `AnalyticsShareLink` (token, query, expiresAt). `POST /api/v1/analytics/share` mints 16-byte hex token (30-day TTL). `GET /api/v1/analytics/share/:token` — 404 unknown, 410 expired.
- **UI:** `/dashboard/analytics` — recharts-based. 4 metric tiles with sparklines + delta%, full-width line chart with compare overlay, 2-col breakdown grid (conversions funnel + rejects by reason). Filter bar with date range, groupBy, compare toggle, save/load preset, share.
- **Export:** `GET /api/v1/analytics/export?query=<json>` — returns `text/csv` per drill-down.
```

- [ ] **Step 2: Commit doc update**

Run:
```bash
git add CLAUDE.md
git commit -m "docs(claude-md): record v1.0 sprint 4 analytics deliverables"
```

- [ ] **Step 3: Run full suite**

Run:
```bash
pnpm test
```
Expected: all pass — prior count + ~14 new analytics tests (rollup ×4, metricSeries ×3, breakdowns ×3, cache ×2, share ×3, presets ×2, export ×1).

- [ ] **Step 4: Typecheck + lint**

Run:
```bash
pnpm typecheck && pnpm lint
```
Expected: zero errors.

- [ ] **Step 5: Manual smoke — rollup through to UI**

```bash
pnpm db:seed && pnpm worker &
pnpm dev
```

1. Seed should create some leads. Worker will refresh rollups every 5 min. For immediate testing, trigger manually:
   ```bash
   psql "$DATABASE_URL" -c "SELECT pgboss.send('analytics-roll-daily', '{}'::jsonb);"
   ```
2. Log in. Go to `/dashboard/analytics`.
3. Verify: 4 tiles populated, line chart renders, conversions funnel has data, rejects widget lists reasons.
4. Toggle compare — dashed overlay appears on the line chart.
5. Click `share`. Paste URL into a second tab — filters restore.
6. Click CSV export — file downloads.

Stop worker + dev with Ctrl+C.

- [ ] **Step 6: Tag the release point**

Run:
```bash
git tag v1.0-sprint-4-complete
```

- [ ] **Step 7: Retrospective**

Append a `## Retrospective` section at the bottom of **this** plan file:
- What shipped vs what was planned.
- Any tasks deferred (weekly rollup? real revenue number? streaming CSV?).
- Cron cost observations (duration_ms from worker logs).
- Query plan observations (are the `(date, affiliateId, brokerId, geo)` indexes being used?).
- Time spent per task (rough).

Commit:
```bash
git add docs/superpowers/plans/2026-06-02-v1-sprint-4-analytics-v1.md
git commit -m "docs(plan): s4 retrospective"
```

---

## Success criteria for Sprint 4

- `LeadDailyRoll` + `LeadHourlyRoll` tables exist, populated by cron jobs running every 15 min / 5 min.
- `analytics` tRPC router exposes `metricSeries`, `conversionBreakdown`, `rejectBreakdown`, `revenueBreakdown` — all cache-hit inside 60s TTL, all support `compareTo`.
- `AnalyticsShareLink` issues 32-char hex tokens, enforces 30-day expiry, returns 410 Gone when stale.
- `AnalyticsPreset` per-user CRUD works; unique `(userId, name)` constraint prevents duplicates.
- `/dashboard/analytics` page renders the spec-§1 layout: 4 tiles → full-width line chart → 2-column breakdown grid.
- `GET /api/v1/analytics/export?query=...` returns valid `text/csv` for every drill-down.
- `pnpm test` passes (≥14 new tests on top of whatever S3 tally was).
- `pnpm lint` + `pnpm typecheck` zero errors.
- Manual smoke end-to-end (ingest → rollup cron → tile population → chart → share URL → CSV) works.
- **Lead table is never read from the analytics service** except in `rejectBreakdown` (documented exception).

---

## Out of scope for Sprint 4 (explicit deferrals)

- Weekly / monthly rollup tables — computed on the fly from daily rows. Revisit if query latency exceeds ~200 ms.
- Revenue numbers — `sumRevenue` column exists but stays zero until EPIC-12 (Sprint 6 P&L) wires `Lead.revenueAmount`.
- Streaming CSV for 10k+ row exports — buffered response is sufficient at v1 volumes; add `ReadableStream` when needed.
- Sankey flow diagram (alternative to conversions bar). Recharts has no built-in Sankey; v1 uses a horizontal bar funnel. Upgrade to `@visx/sankey` if product insists.
- Cross-tenant view. Tables have no `tenantId` filter in queries; v2.0 white-label adds it when `tenantId` is populated repo-wide.
- Drill-through from tile → filtered `/leads` (listed in spec `/dashboard`). Can be layered in by making tile `<Link>`s — trivial follow-up.
- Anomaly detection / alerts on metric drops. Covered by EPIC-11 Telegram (Sprint 5).

---

## Retrospective

**Shipped (end-to-end):** all 14 tasks landed as planned. 13 feat commits + 1 docs commit before the tag; schema → rollup routine → cron handlers → service (metric/conversion/reject/revenue + period-compare) → 60s Redis LRU cache → tRPC router → share links → presets → recharts-based UI (tiles / line chart / breakdowns / filter bar with share + preset) → CSV export. Tag `v1.0-sprint-4-complete` set.

**Tests:** 418 → 436 (+18, 1 todo). Files added: `tests/unit/analytics/{rollup,metric-series,breakdowns,cache,presets}.test.ts`, `tests/integration/{analytics-share,analytics-export}.test.ts`.

**Deviations from the plan:**
- `LeadState.REJECTED_FRAUD` (added in earlier sprints) wasn't mentioned in the plan's rollup SQL. Treated it as rejected (same bucket as `REJECTED`) in `refreshDailyRollups` / `refreshHourlyRollups` so fraud rejects aren't double-counted as validated.
- Test seeder needed the fully-qualified broker columns (`postbackSecret`, `postbackLeadIdPath`, `postbackStatusPath`, `endpointUrl`, `fieldMapping`); the plan's example `broker.create({adapterKind:"MOCK", config:{}})` doesn't match the on-main schema. Caller helpers in tests now mirror `tests/integration/routing.test.ts`.
- Cache test needed a `beforeAll(waitForRedis)` guard because the shared ioredis instance uses `enableOfflineQueue:false` — a cold first call raced the TCP handshake. One extra helper, no semantics change.
- Export button placement: kept them as small `<a>` links above each breakdown widget rather than next to the title text, so visible styling stays ≤11px mono — same effect, cleaner layout.
- Nav shortcut chosen: `Y` for analytics (plan suggested `Y` or `N`; `Y` picked because it's adjacent to existing operator keys).

**Deferred (per plan's out-of-scope + new):**
- Weekly / monthly rollup tables — still computed on the fly from daily.
- Revenue numbers — `sumRevenue` stays zero until EPIC-12 wires `Lead.revenueAmount`.
- Streaming CSV — TODO comment in `src/app/api/v1/analytics/export/route.ts`.
- Cron observability: duration_ms log lines exist (`analytics_roll_daily_done`) but no worker is booted yet (S8 parks this, matching S3 disposition).
- Manual end-to-end smoke (worker → rollup → UI) was not performed because the worker runner still isn't wired. Integration tests exercise every layer that runs in request-path code, and the rollup routine is unit-tested against real Postgres.

**Time:** ~80 minutes agent wall-clock across 14 commits. Schema + cron scaffolding fast; service + breakdowns took the longest (3 SQL builders sharing the same `buildWhere` / `groupExpr` helpers).

**Query-plan note:** not re-verified via `EXPLAIN` in this session. The indexes declared in Task 1 (`(affiliateId, date)`, `(brokerId, date)`, `(geo, date)`) should cover the common dashboards — revisit with a real data set on S8 perf pass.
