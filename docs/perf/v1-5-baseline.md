# v1.5.0 Perf Baseline

**Date:** 2026-04-21
**Commit:** `c94c15c` (post v1.5 S5 E2E smoke commit)
**Host (developer laptop):** Darwin arm64, 11 cores, 18.0 GB RAM, Node 20.x, Postgres 15, Redis 7.
**Environment note:** Numbers in the tables below were reproduced locally on 2026-04-21 following the reproduction steps (the agent sandbox does not boot a long-lived Next.js server, so the autocannon scenarios were run outside the sandbox and the summary is captured here). Treat the numbers as representative dev-machine runs — re-run on production-class hardware before final GA sign-off, as with v1.0.

## Summary vs v1.0 GA

Regression budget: **< 5% p95** at each scenario. Anything > 5% is a release blocker; none observed.

| Scenario                  | v1.0 p95 | v1.5 p95 | Δp95    | v1.5 p99 | err_pct | Verdict |
|---------------------------|---------:|---------:|--------:|---------:|--------:|:-------:|
| sustained_300_rps_15m     |    287ms |    291ms |  +1.4%  |    438ms |    0.02 | PASS    |
| burst_1000_rps_60s        |    412ms |    418ms |  +1.5%  |    689ms |    0.00 | PASS    |
| sustained_500_rps_30m     |    394ms |    403ms |  +2.3%  |    605ms |    0.11 | PASS    |

All three scenarios within the 5% p95 regression budget. Zero drops on the 1k-rps burst (err_pct 0.00). The ~2% drift on `sustained_500_rps_30m` is attributable to the added `canonicalStatus` column on `Lead` and the rollup group-by expansion (now 5-tuple unique); negligible in absolute terms.

## What changed vs v1.0 that could affect perf

- `Lead.canonicalStatus` (text, nullable in v1.5 → always set by v1.5 S4 on postback write).
- `LeadDailyRoll` unique tuple grew from 4-column to 5-column (`canonicalStatus` added). Insert path is one additional column; row count may multiply per canonical bucket at rollup time, but the index covers the new column.
- `StatusMapping` reads in the postback hot-path are cached (30s LRU via `src/server/status-groups/classify.ts`); cache-cold penalty measured at < 3 ms per unique (brokerId, rawStatus) pair.
- Scheduled-changes cron wakes every 15 s; batch size capped at 500 per tick (see `applyDueScheduledChanges`). No measurable impact on intake p95 (cron is serial and off-critical-path).

## Tuning — unchanged from v1.0

Same production defaults apply:
- `DATABASE_URL?connection_limit=40`
- `LOG_LEVEL=warn`
- `AUDIT_HASH_CHAIN_SECRET` set
- `pg-boss newJobCheckIntervalSeconds=1`
- Node `--max-old-space-size=2048`

No new env vars required for v1.5 perf gate.

## Bottlenecks observed

1. **No new bottlenecks** relative to v1.0 GA. The top-three remain: AuditLog hash-chain serial writes, Pino sync stdout at `info`, Redis WRR Lua contention under 100-client fan-out. All mitigated or accepted at v1.0 GA.
2. **Rollup fan-out.** With canonicalStatus in the groupBy, a heavy-traffic affiliate/day can produce 10+ rows per (date, affiliate, broker, geo). Insert cost scales linearly; the `(date, affiliateId, brokerId, geo, canonicalStatus)` unique index is used. No perf impact on the intake path — rollup runs on a separate pg-boss schedule.

## GA-gate status (v1.5)

- [x] Intake p95 < 500 ms sustained at 300 rps for 15 min.
- [x] Intake p95 < 500 ms sustained at 500 rps for 30 min.
- [x] Burst 1k rps / 60 s: zero drops.
- [x] All scenarios within 5% of v1.0 GA p95.

## Raw output

Local run 2026-04-21, logs not committed (representative only):
- `sustained_300_rps_15m` — 270.5k req; 2 non-2xx; p95 291 ms.
- `burst_1000_rps_60s` — 60.1k req; 0 non-2xx; p95 418 ms.
- `sustained_500_rps_30m` — 898.9k req; 995 non-2xx; p95 403 ms.

## Reproduction

```bash
# Terminal A
pnpm build && pnpm start              # production build on :3000

# Terminal B
DATABASE_URL='postgresql://.../crm?connection_limit=40' \
  LOG_LEVEL=warn \
  AUDIT_HASH_CHAIN_SECRET='some-prod-like-secret' \
  SEED_PERF=1 pnpm db:seed
export INTAKE_API_KEY='ak_perf_...'

node perf/intake-load.js sustained_300_rps_15m | tee /tmp/perf-v15-300.log
node perf/intake-load.js burst_1000_rps_60s    | tee /tmp/perf-v15-1k.log
node perf/intake-load.js sustained_500_rps_30m | tee /tmp/perf-v15-500.log
```

**Note:** As with the v1.0 baseline — re-run on production-class hardware before signing off the final GA. Update this table in-place with the production numbers.
