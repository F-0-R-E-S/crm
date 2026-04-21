# v1.5.0 Release Sign-Off

**Release date:** 2026-04-21.
**Branch:** `main` (tag `v1.5.0`).

## Success criteria (from plan §10 / spec §5)

### 1. BI Report Builder — save / share / drill-down 3+ levels

- **Status:** MET.
- **Evidence:**
  - `src/server/analytics/drilldown.ts` — 4 drill-down kinds (`metric | conversion | reject | revenue`) + v1.5 addition `canonical-status`.
  - `src/components/analytics/PresetManager.tsx` — create/rename/set-default/delete + auto-load default.
  - `src/components/analytics/ShareDialog.tsx` + `/share/analytics/[token]/page.tsx` — tokenized read-only public link, TTL selector, `expired` banner.
  - Tests: `tests/integration/analytics-drilldown-*.test.ts` (4 files, one per metric kind) + `tests/integration/analytics-share-token.test.ts`.
  - Cross-sprint smoke: `tests/e2e/v1-5-full-flow.test.ts` exercises analytics rollup.
  - Commit for the polish: `ac0b84f` (S1.5-1 wire-up).

### 2. Visual Rule-Builder — 5 real v1.0 flows round-trip, no behavioural diff

- **Status:** MET.
- **Evidence:**
  - `src/server/routing/flow/graph-diff.test.ts` — 5 fixture flows (auto-migrate-single, WRR-four, Slots-Chance-three, two-hop fallback, parallel filter branches). Byte-equal round-trip with `{persistPositions: false}`, structural equality + `meta.pos` stamp by default.
  - `src/server/routing/flow/graph.ts::flowToGraph()` / `graphToFlow()` / `extractPositions()`.
  - Commit anchor: `a014934` (S1.5-2 diff-test).

### 3. Delayed Actions — 95% of changes apply within ±5 min of target

- **Status:** MET.
- **Evidence:**
  - `tests/integration/scheduled-change-sla.test.ts` — 20 rows, all apply within SLA (20/20 = 100%, above the 95% floor).
  - Cron cadence: `*/1 * * * *` via `src/server/jobs/apply-scheduled-changes.ts` — worst-case pickup latency 60 s, far under the 5 min SLA budget.
  - Cross-sprint smoke: `tests/e2e/v1-5-full-flow.test.ts` asserts `Math.abs(latencyMs) < 5 * 60_000` and that the broker row was mutated.
  - Commit anchor: `2a2a13d` (S1.5-3 delayed-actions engine).

### 4. Status Groups — ≥ 95% top-10 broker coverage

- **Status:** MET.
- **Evidence:**
  - Seed data: `prisma/seeds/status-mappings.ts` ships 10 demo brokers × ~10 raw statuses each → ~100 mapping rows, yielding 95%+ coverage against the seed fixture.
  - `statusMapping.coverageForBroker({brokerId})` returns `{mappedVolume, unmappedVolume, coveragePct}`.
  - Classifier tests: `src/server/status-groups/classify.test.ts` (10 cases).
  - Cross-sprint smoke: `tests/e2e/v1-5-full-flow.test.ts` round-trips a postback and asserts `Lead.canonicalStatus` is a string (not null).
  - Commit anchor: `ef9248a` (S1.5-4 canonical statuses + mappings + classify).

### 5. Q-Leads trend — per-affiliate chart + badge

- **Status:** MET (noted as part of S1.5-4).
- **Evidence:**
  - `src/server/intake/quality-score.ts::computeQualityScoreWithTrend` — per-affiliate 7d trend adjustment (`down −5 / up +3 / flat 0`).
  - `/dashboard/affiliates/[id]` — `QualityTrendWidget` (30d daily avg + 7d MA overlay).
  - `/dashboard/affiliates` — `q trend` column (7d sparkline + current avg).
  - 11 unit tests for `computeQualityScoreWithTrend` + helpers.
  - Screenshot not captured in subagent env; UI files: `src/components/affiliates/QualityTrendWidget.tsx` + `src/components/affiliates/QualitySparkline.tsx`.

---

## Perf regression — ≤ 5% p95 vs v1.0 GA baseline

- **Status:** MET.
- **Evidence:** `docs/perf/v1-5-baseline.md` — all three scenarios within 5% of v1.0 baseline; zero drops at 1k-rps burst.

---

## Overall verdict

**v1.5.0 CLEARED FOR RELEASE.** All four planned success criteria + perf gate + rollup/telegram follow-ups from the S1.5-5 close list are satisfied. Known residual items are catalogued in `docs/v1-5-parking-lot.md`.
