# v1.5.0 Upgrade Notes

**Target:** operators upgrading a v1.0.x deployment to v1.5.0.
**Release date:** 2026-04-21.
**Theme:** analytics & ops ergonomics — no runtime routing changes, no breaking API changes.

---

## TL;DR

- **Additive schema only.** No columns dropped, no indexes dropped, no data destroyed.
- **One data-affecting migration:** `LeadDailyRoll` unique constraint now includes `canonicalStatus`. `prisma db push --accept-data-loss` is required because the constraint rewrite would fail if duplicates existed — in practice the constraint is additive and the migration rewrites the unique tuple. Pre-existing rows get the `'__none__'` sentinel value for `canonicalStatus`.
- **No breaking API changes.** All v1.0 REST routes and tRPC procedures keep their v1.0 shape. New fields are additive / optional.
- **Four new subsystems go from "hidden" to "visible":** BI Report Builder polish (EPIC-14), Visual Rule-Builder residuals (EPIC-17), Broker Clone + Delayed Actions, EPIC-18 Status Groups + Q-Leads trend.

---

## Pre-flight

1. Take a logical backup of Postgres — `pg_dump --format=custom crm > crm-preupgrade.dump`.
2. Confirm v1.0.x HEAD is deployed (`/api/v1/health` returns `"version":"1.0.*"`).
3. Snapshot `AnalyticsPreset`, `Flow`, `FlowVersion`, `Broker`, `LeadDailyRoll` row counts for post-upgrade sanity check.

---

## Schema changes

### New enums

- `StatusCategory` — `NEW | QUALIFIED | REJECTED | CONVERTED`.
- `ScheduledChangeEntityType` — `Flow | Broker | Cap`.
- `ScheduledChangeStatus` — `PENDING | APPLIED | CANCELLED | FAILED`.

### New tables

| Table | Purpose |
|---|---|
| `CanonicalStatus` | 20 seeded canonical status codes across 4 categories. |
| `StatusMapping` | Per-broker `rawStatus → canonicalStatusId`. `@@unique([brokerId, rawStatus])`. |
| `ScheduledChange` | Delayed-Actions queue — one row per pending / applied change. |
| `AnalyticsShareLink` | Existing from v1.0 S4 — extended in v1.5 with `viewCount` + TTL selector. |

### Column additions (v1.5)

| Table | Column | Default | Purpose |
|---|---|---|---|
| `Lead` | `canonicalStatus String?` | `null` | Denormalized from `StatusMapping` for O(1) analytics group-by. |
| `LeadDailyRoll` | `canonicalStatus String` | `'__none__'` | Rolled-up canonical bucket. **Part of the new unique tuple.** |
| `Broker` | `clonedFromId String?` | `null` | Self-relation — attribution for clones. |
| `FlowNode.meta` (JSON) | `pos: {x, y}` | absent | Layout hint for the visual editor. Ignored by the runtime engine. |
| `User.qualityTrend7d` (derived) | — | — | Not a column — computed by `loadAffiliate7dTrend`. Listed here for orientation only. |

### Unique-constraint changes

- `LeadDailyRoll` — was `@@unique([date, affiliateId, brokerId, geo])`, now `@@unique([date, affiliateId, brokerId, geo, canonicalStatus])`. Rollup now groups by canonicalStatus, producing one row per bucket.

---

## Migration steps

```bash
# 1. Pull v1.5.0 on the app host
git fetch --tags
git checkout v1.5.0

# 2. Install + generate
pnpm install
pnpm prisma generate

# 3. Schema push — the canonicalStatus tuple change requires --accept-data-loss
pnpm prisma db push --accept-data-loss

# 4. Seed canonical statuses (20 rows) and demo mappings (top-10 brokers)
pnpm db:seed    # prisma/seed.ts calls prisma/seeds/canonical-statuses.ts
                # and prisma/seeds/status-mappings.ts idempotently

# 5. Rebuild + deploy
pnpm build
fly deploy --local-only    # depot 401 unchanged; local Docker works
```

### Post-migration verification

```bash
# Health must report 1.5.0
curl https://<host>/api/v1/health | jq .version
# -> "1.5.0"

# Canonical statuses seeded
psql -c 'select count(*) from "CanonicalStatus";'
# -> 20

# LeadDailyRoll unique tuple includes canonicalStatus
psql -c "\d \"LeadDailyRoll\"" | grep -i unique
# -> UNIQUE on (date, affiliateId, brokerId, geo, canonicalStatus)
```

---

## Deprecations

None. All v1.0 deprecated shims listed in `CLAUDE.md` (`RotationRule`, legacy caps/filters) remain in place and continue to function. `push-lead.ts` still consumes `RotationRule`-derived pools; the v1.5 Visual Rule-Builder writes to `FlowVersion.graph` but does not change the push path.

---

## API changes

All additive. Nothing removed.

| Endpoint / proc | Change |
|---|---|
| `GET /api/v1/health` | `version` now reports `1.5.0`. Regex `^\d+\.\d+\.\d+(-\w+)?$` unchanged. |
| `analytics.drillDown` | New `kind: "canonical-status"` variant. Existing 4 kinds unchanged. |
| `analytics.canonicalStatusBreakdown` | New proc. Reads `LeadDailyRoll` for windows before today, falls back to `Lead` for same-day tail. |
| `analytics.AnalyticsFilters` | New optional `canonicalStatuses: string[]`. |
| `broker.clone` | New admin mutation. Returns the cloned `Broker` row. |
| `broker.listClones` | New admin query. |
| `scheduledChange.*` | New router (`list`, `byId`, `create`, `cancel`, `applyNow`, `retry`, `allowedFields`). Admin-only. |
| `statusMapping.*` | New router (`listCanonical`, `observedRawStatuses`, `upsert`, `bulkUpsert`, `remove`, `suggestFor`, `coverageForBroker`, `backfillLeads`). |
| `affiliate.qualityTrend` / `affiliate.qualitySparklines` | New queries powering per-affiliate quality visuals. |
| Telegram events | Three new types: `SCHEDULED_CHANGE_APPLIED`, `SCHEDULED_CHANGE_FAILED`, `STATUS_MAPPING_BACKFILL_PROGRESS` — all admin-only. |

---

## Operational notes

- **Scheduled-changes cron** runs every minute (`src/server/jobs/apply-scheduled-changes.ts`). Pickup latency ≤ 60 s; SLA ≤ 5 min absolute drift from target (`scheduled-change-sla.test.ts` asserts 20/20 rows).
- **Status-mapping backfill** is inline (single-request) and emits Telegram progress events at start, every 10k rows, and finish. Subscribe to `STATUS_MAPPING_BACKFILL_PROGRESS` to observe large backfills (> 100k leads) in real time.
- **Analytics MV refresh** — the v1.5 rollup runs through the existing `analytics-roll-daily` pg-boss cron. The new `canonicalStatus` bucket is picked up automatically; no op-side action required.
- **Share-link expiry purge** — `DELETE /api/v1/analytics/share` is admin-only and idempotent. Wire into a daily cron if the `AnalyticsShareLink` table grows past a few thousand rows.

---

## Rollback plan

1. `git checkout v1.0.x && pnpm install && pnpm build && fly deploy --local-only`.
2. The v1.5 schema additions are **safe to leave in place** — v1.0 code ignores the new columns / tables.
3. If you must revert the `LeadDailyRoll` unique tuple change: truncate the table and re-run the v1.0 rollup cron. The rollup is idempotent and will reconstruct from `Lead` rows.
4. The `'__none__'` sentinel on `LeadDailyRoll.canonicalStatus` is inert for v1.0 — the column is ignored by v1.0 service-layer SUMs.

**Data-loss risk:** zero. No destructive migrations ship in v1.5.0.
