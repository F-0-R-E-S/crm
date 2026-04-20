# v2.5 — Intelligence & Platform — Sprint-Level Implementation Plan

> **For agentic workers:** This is a **sprint-level** plan (6 sprints, ~2 weeks each). Task-level, code-granular sub-plans will be produced per sprint in the form `2027-XX-XX-v2-5-sprint-N-*.md` and executed via superpowers:executing-plans / superpowers:subagent-driven-development. Checkbox (`- [ ]`) syntax is used so sprint progress can be tracked at this level.

**Release:** **v2.5.0** — Intelligence & Platform.
**Target GA:** 2027-12-15 (~6 months after v2.0 Q2 2027 GA; 24 working weeks with 12 weeks of implementation + built-in hardening + buffer).
**Sprint 1 start:** 2027-07-01 (W1).
**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md` §7 (scope), §8 (competitive), §10 (success criteria).
**Style reference:** `docs/superpowers/plans/2026-04-21-v1-sprint-1-wave1-merge-and-hardening.md`.

---

## Goal

Close the remaining competitive gap against all 6 benchmarked competitors and add two category-creating wedges: **Provider API** (3rd-party CRMs as upstream lead source) and **Smart Fraud ML with explainability**. Ship a public developer platform (portal, marketplace, PWA) that makes GambChamp CRM self-serve for Pro+ tier customers without sales intervention.

## Architecture overview

v2.5 is **additive on top of v2.0** (white-label, billing, compliance, Telegram Mini App). No breaking changes to v1.0 / v1.5 / v2.0 APIs. All new surfaces sit behind feature flags (`feature.ml_fraud_shadow`, `feature.ml_fraud_enforce`, `feature.cohort_report`, `feature.public_portal`, `feature.provider_api`, `feature.pwa`, `feature.marketplace_v2`) so each sprint's output can ship to production in shadow / gated mode before enforcement.

Key cross-cutting architectural decisions (defaulted here; each sprint may revisit in its Open Design Questions section):

- **ML hosting:** Python FastAPI microservice behind the same VPC as Node API; called via internal HTTP with 50 ms p99 SLO. Rationale: ecosystem (SHAP, LightGBM, pandas) is Python-native; onnxjs viable fallback if SLO is missed. Final decision in S2.5-1 Open Questions.
- **Feature store:** Postgres materialized views (reuse v1.0 analytics roll-ups) + Redis cache for hot features; no separate feature-store product (Feast / Tecton) until data volume justifies it (>10M leads/month).
- **Provider API:** modeled as a reverse of the broker-push adapter pattern — same Zod/Prisma abstractions, opposite direction (remote CRM → GambChamp intake instead of GambChamp → broker).
- **PWA:** no React Native. Service worker caches `/dashboard` shell; read-only offline mode only (mutations require connectivity).

## Dependencies on v1.0–v2.0

- **v1.0:**
  - `Lead`, `FraudScore`, `FraudPolicy`, `LeadEvent` schema (training corpus source).
  - `/api/v1/schema/leads` version registry (public portal consumes this).
  - Per-key rate limiting (`src/server/intake/rate-limit.ts`) — extended in S2.5-4 with tier multipliers.
  - Tokenized shareable links infrastructure from analytics v1 (`src/server/analytics/share-link.ts`) — reused in S2.5-3.
- **v1.5:**
  - Analytics schema (cohort report builds on daily roll-up materialized views).
  - Status Groups (20 canonical statuses) — ML model consumes canonical status as label.
  - Broker templates catalog — marketplace v2 (S2.5-6) extends its schema with `publishedBy`, `rating`, `reviewCount`.
- **v2.0:**
  - `tenantId` enforcement across all tables — marketplace submissions and provider adapters are tenant-scoped.
  - Billing/subscription tiers (`Subscription.plan`) — API token tier gating in S2.5-4 reads from `Subscription.plan`.
  - Compliance audit log UI — SHAP attributions render in the existing lead-drawer audit tab.
  - Telegram Mini App — PWA service worker design cribs from Mini App's offline cache strategy.

## Sprint overview

| Sprint | Weeks | Dates | Focus | Primary epics | Ships behind flag |
|---|---|---|---|---|---|
| **S2.5-1** | W1–2 | 2027-07-01 → 2027-07-14 | ML data pipeline + baseline model | EPIC-23 | — (offline only) |
| **S2.5-2** | W3–4 | 2027-07-15 → 2027-07-28 | Online scoring (shadow) + explainability UI + auto-tune | EPIC-23 | `ml_fraud_shadow` on, `ml_fraud_enforce` off |
| **S2.5-3** | W5–6 | 2027-07-29 → 2027-08-11 | Cohort / retention report | (new analytics) | `cohort_report` on |
| **S2.5-4** | W7–8 | 2027-08-12 → 2027-08-25 | Public API + Developer Portal | EPIC-19 | `public_portal` on |
| **S2.5-5** | W9–10 | 2027-08-26 → 2027-09-08 | Provider API + PWA | EPIC-15 (PWA) + new | `provider_api`, `pwa` |
| **S2.5-6** | W11–12 | 2027-09-09 → 2027-09-22 | Marketplace v2 + hardening + release | EPIC-16 | `marketplace_v2` on |
| **Buffer** | W13–24 | 2027-09-23 → 2027-12-15 | Soft-launch, pilot, pentest remediation, ML enforce rollout | — | — |

**Total implementation:** 12 weeks (S2.5-1..6). **Total calendar:** 24 weeks (implementation + buffer) ending at GA 2027-12-15.

## Preflight (run once at S2.5-1 kickoff)

- `git status` clean on `main`; `v2.0.0` tag present.
- Pilot customer for Provider API (HubSpot OR Bitrix24 adapter) confirmed and sandbox credentials available.
- ≥12 months of production `Lead` rows with final outcome populated (FTD, FAILED_KYC, REJECTED, CANCELLED) — verified via `SELECT COUNT(*) FROM "Lead" WHERE "finalOutcome" IS NOT NULL AND "createdAt" < NOW() - INTERVAL '12 months'`. If < 500k rows, escalate before starting S2.5-1; a smaller training set pushes precision/recall targets out of reach.
- Python 3.11 toolchain on build runners; `uv` installed for dependency management.
- Read `CLAUDE.md` (root + `crm-node/`).
- Read spec §7, §8, §10 and this plan in full before starting S2.5-1.

---

## Sprint S2.5-1 — EPIC-23 Smart Fraud ML: Data Pipeline + Baseline Model

**Dates:** 2027-07-01 → 2027-07-14 (W1–W2).
**Focus:** Build the training pipeline, engineer features, train a baseline model, and stand up the scoring microservice (not wired into intake yet — wiring in S2.5-2).

### Deliverables (acceptance criteria)

- [ ] A reproducible **training dataset export** pipeline that materializes 12+ months of labeled leads (Lead + FraudScore + final outcome) into Parquet under `./data/fraud-ml/train-YYYYMMDD/`. Job is idempotent and resumable.
- [ ] **≥20 engineered features** across 5 families: (a) fraud signal vectors from v1.0, (b) temporal (hour-of-day, day-of-week, lead-velocity-last-1h / 24h), (c) affiliate history (30-day FTD rate, 30-day rejection rate, days-since-onboarded), (d) broker history (30-day push success rate, autologin SLA window), (e) GEO clusters (k-means k=8 on country + language + timezone).
- [ ] Baseline **LightGBM** classifier trained on 80/10/10 train/val/test split with time-series cross-validation (no future leakage).
- [ ] **Offline eval report** at `./data/fraud-ml/eval-YYYYMMDD/report.html` comparing ML vs v1.0 rule-based baseline: precision/recall curve, confusion matrix, AUC-ROC, calibration plot. Success gate: **precision ≥ 0.85 @ recall ≥ 0.75** on held-out test set (per spec §10 v2.5 criteria).
- [ ] **Scoring microservice** (FastAPI, Python 3.11) deployed to staging, exposing `POST /score` returning `{ score: number 0-100, attributions: [{feature, shap_value, direction}], modelVersion: string }`. p95 latency < 50 ms on 100 rps synthetic load.
- [ ] **Model registry**: `FraudModel` Prisma row capturing `version`, `trainedAt`, `trainSize`, `precisionAtRecall75`, `status` (one of `TRAINING | STAGING | SHADOW | PRODUCTION | ARCHIVED`). v2.5 S2.5-1 ships exactly one row in `STAGING` status.

### Files to create/modify

- Create: `ml/fraud-scorer/` (new Python service directory with `pyproject.toml`, `src/app.py`, `src/features.py`, `src/train.py`, `src/evaluate.py`, `Dockerfile`).
- Create: `ml/fraud-scorer/README.md` — runbook for training, evaluating, deploying.
- Create: `scripts/export-fraud-training-set.ts` — Node/Prisma script that emits Parquet via DuckDB.
- Modify: `prisma/schema.prisma` — add `FraudModel` model + `Lead.mlFraudScore Int?` + `Lead.mlModelVersion String?` + `Lead.mlAttributions Json?`.
- Create: `src/server/ml/client.ts` — typed HTTP client for the FastAPI service (not called yet; shadow wiring in S2.5-2).
- Modify: `src/lib/env.ts` — add `FRAUD_ML_URL`, `FRAUD_ML_TIMEOUT_MS` (default 80), `FRAUD_ML_ENABLED` (Zod bool via `zBool`).
- Create: `ops/k8s/fraud-scorer.yaml` (or equivalent Compose fragment) — staging deployment manifest.
- Create: `docs/superpowers/plans/2027-07-01-v2-5-sprint-1-ml-data-and-baseline-tasks.md` — the task-level sub-plan generated **before** coding begins.

### Task list (1–3 days each)

- [ ] **T1 — Schema & scaffolding** (0.5d). Add `FraudModel` + `Lead.ml*` columns. `pnpm db:push`. Scaffold `ml/fraud-scorer/` with FastAPI health-check endpoint + Dockerfile. Smoke `docker build` locally.
- [ ] **T2 — Training-set exporter** (1.5d). Write `scripts/export-fraud-training-set.ts` using Prisma `$queryRaw` → DuckDB → Parquet. Emit columns: raw fraud signals, lead metadata, labels (`outcome`, `wasFraud` = outcome in {FRAUD_REJECTED, CHARGEBACK, DUPLICATE_CONFIRMED}). Resumable via `--since` / `--until` flags. Verify row count matches Postgres `COUNT(*)`.
- [ ] **T3 — Feature engineering module** (2d). Implement `ml/fraud-scorer/src/features.py` producing the 20+ features listed above. Unit tests (`pytest`) for each feature family using fixture Parquet. No DataFrame mutations across feature boundaries — each feature is a pure function of raw row + context (affiliate history, broker history).
- [ ] **T4 — Baseline model training** (2d). `train.py` — LightGBM with early stopping on validation loss. Hyperparam grid: `num_leaves ∈ {31,63,127}`, `learning_rate ∈ {0.05, 0.1}`, `n_estimators` chosen by early stopping. Time-series CV with 5 folds (rolling origin). Persist best model to `models/fraud-v1.lgb`.
- [ ] **T5 — Offline evaluation** (1d). `evaluate.py` — generate `report.html` (via `plotly`): PR curve, ROC curve, confusion matrix @ threshold that maximizes F1, calibration plot, per-GEO performance slice, per-affiliate performance slice. Compare against v1.0 rule-based baseline on identical test set. **Success gate check** — if precision@recall=0.75 < 0.85, iterate on feature engineering (T3) or hyperparams (T4) before proceeding to T6.
- [ ] **T6 — FastAPI scoring service** (1.5d). `src/app.py` with `POST /score` (pydantic input schema mirrors `Lead` + signal vectors), in-process SHAP via `shap.TreeExplainer` (precomputed background set of 200 rows), `GET /healthz`, `GET /readyz`, `GET /metrics` (Prometheus text format). Load model on startup from S3 / filesystem per env.
- [ ] **T7 — Node-side client + env validation** (0.5d). `src/server/ml/client.ts` with circuit breaker (3 consecutive failures → open 60s), retries (2), timeout from `FRAUD_ML_TIMEOUT_MS`. Add to `src/lib/env.ts`. Unit tests with `nock` / `undici` mock agent.
- [ ] **T8 — Staging deployment + load test** (1d). Deploy FastAPI to staging (k8s or Compose). Point staging Node API at it via `FRAUD_ML_URL`. Run k6 / autocannon from Node side: 100 rps for 60s; assert p95 < 50 ms end-to-end. Capture metrics dashboard snapshot.
- [ ] **T9 — Model registry row + runbook** (0.5d). Insert `FraudModel` row (`version='v1.0-baseline'`, `status='STAGING'`). Update `ml/fraud-scorer/README.md` with train-deploy-rollback runbook.
- [ ] **T10 — Sprint close** (0.5d). `pnpm test && pnpm lint && pnpm typecheck`. Commit. Tag `v2.5-s1-baseline-ml`. Retrospective appended to this file.

### Open design questions

- **Python service vs onnxjs in-process?** Default: Python FastAPI. Reconsider in T6 if p95 latency exceeds 50 ms or deployment complexity is judged excessive. Decision recorded in retrospective.
- **SHAP computation cost.** TreeExplainer is fast but explains one row at a time. If p95 > 50 ms due to SHAP, options: (a) compute SHAP only when `score ≥ borderlineMin` (skip for confident passes), (b) batch scoring endpoint, (c) precompute top-K feature importances globally and return the subset per row. Default: (a) — lazy SHAP.
- **Concept drift monitoring.** Not in scope for S2.5-1 (data pipeline + baseline only). Drift detection lands in a later v2.5.x patch or v3.0.
- **Training cadence post-GA.** Proposed: weekly offline retraining with promotion gated on eval gates; finalized in S2.5-2 once shadow telemetry exists.

### Risks

- 12 months of labeled data may be too small in absolute volume. Mitigation: if < 500k labeled rows, supplement with synthetic minority oversampling (SMOTE) on the fraud class; document in eval report.
- Feature drift between training (Parquet export) and serving (live Prisma rows). Mitigation: feature module (`features.py`) and its Node-side mirror (if any) share exact column names; add schema assertion at service startup that refuses to boot if the incoming JSON lacks a required feature.
- **Label leakage.** Features computed at scoring time must not depend on post-decision state (e.g., `Lead.finalOutcome` cannot leak backward). Enforced via two separate feature builders: `features_at_intake.py` (production-safe) and `features_post_hoc.py` (eval-only, used only for label construction). CI refuses to merge if `features_at_intake.py` imports from `features_post_hoc.py`.
- **Class imbalance.** Fraud rate in v1.0 production is ~3%. LightGBM handles this via `is_unbalance=true` or `scale_pos_weight`; cross-validation uses stratified K-fold. Documented in eval report.
- **Training cost.** Baseline LightGBM on 1M rows completes in < 10 min on an 8-vCPU runner; hyperparam grid multiplies this. Cap total training budget at 2 hours per run; fail CI if exceeded.

### Dependencies on prior versions

- v1.0 S1: `FraudPolicy`, `Lead.fraudScore`, `Lead.fraudSignals`, `LeadEvent` are the training labels/features.
- v1.5 S3: `StatusGroup` / canonical status mapping is the final-outcome label source.
- v2.0 S4: `tenantId` column population — training set is scoped per tenant so models can be per-tenant-finetuned in the future (v2.5.0 ships a single global model; per-tenant models are a v2.5.1+ consideration).

---

## Sprint S2.5-2 — EPIC-23 Online Scoring + Explainability UI

**Dates:** 2027-07-15 → 2027-07-28 (W3–W4).
**Focus:** Wire the ML microservice into the intake path in **shadow mode**, persist SHAP attributions, build the lead-drawer explainability UI, and ship the threshold auto-tuning recommender (advisory only, admin approves).

### Deliverables

- [ ] **Shadow-mode scoring active** on `/api/v1/leads` and `/api/v1/leads/bulk`: every lead gets both a rule-based score (v1.0) and an ML score (v2.5). ML score is persisted (`Lead.mlFraudScore`, `Lead.mlAttributions`, `Lead.mlModelVersion`) but does **not** affect the accept/reject decision. Enforcement gated behind `feature.ml_fraud_enforce = false` by default.
- [ ] **SHAP attributions persisted** as JSON — top-10 features by `|shap_value|` with sign, feature name, raw value, plain-text explanation.
- [ ] **Explainability UI** in the existing lead drawer: new "Fraud analysis" tab showing (1) overall score dial (rule vs ML side-by-side), (2) top-3 contributing features as horizontal bar chart with direction (red = towards fraud, green = towards legit), (3) plain-text explanation per feature, (4) model version + trained-at.
- [ ] **Threshold auto-tuning recommender** endpoint (`GET /api/v1/fraud/threshold-recommendation`) that reads the last 30 days of shadow-mode decisions and returns a recommended threshold optimizing F1 against observed final outcomes. Admin-only; surface in the existing `/admin/fraud-policy` settings page as a "suggested" banner above the manual threshold input — **no auto-apply**.
- [ ] **Admin toggle** to flip enforcement on per-policy (`FraudPolicy.mlEnforcementMode ∈ {OFF, SHADOW, ENFORCE}`), still default `OFF` at sprint close.
- [ ] **2 weeks of shadow telemetry collected** — a Grafana dashboard (`fraud-ml-shadow`) showing rule vs ML agreement rate, per-GEO divergence, and distribution of mlFraudScore for accepted vs rejected leads.

### Files to create/modify

- Modify: `src/app/api/v1/leads/route.ts` — call `mlClient.score()` after existing fraud-signals step; persist result; feature-flag guards enforcement branch.
- Modify: `src/app/api/v1/leads/bulk/route.ts` — same wiring for the bulk path (batch scoring endpoint from microservice to reduce N round-trips).
- Modify: `ml/fraud-scorer/src/app.py` — add `POST /score/batch` (max 500 rows/call) returning array of results in input order.
- Modify: `src/server/ml/client.ts` — expose `scoreBatch()`; preserve ordering; partial-failure semantics (one item error doesn't fail the batch).
- Modify: `prisma/schema.prisma` — add `FraudPolicy.mlEnforcementMode` enum, backfill existing rows with `OFF`.
- Create: `src/server/fraud/threshold-recommender.ts` — SQL aggregation over last-30d `Lead` + shadow `mlFraudScore`; returns F1-optimal threshold + PR curve data.
- Create: `src/app/api/v1/fraud/threshold-recommendation/route.ts` — admin-scoped GET endpoint.
- Create: `src/components/fraud/ExplainabilityPanel.tsx` — the new lead-drawer tab. Follows `crm-design/project/SPEC.md` (drawer 540px, 13px body, plotly-free — use Recharts or bespoke SVG for the bar chart, per design-system constraint).
- Modify: `src/app/(dashboard)/admin/fraud-policy/page.tsx` — surface the recommendation banner + mlEnforcementMode toggle.
- Create: `ops/grafana/fraud-ml-shadow.json` — dashboard JSON.
- Create: `docs/superpowers/plans/2027-07-15-v2-5-sprint-2-online-scoring-and-ui-tasks.md` — the task-level sub-plan.

### Task list

- [ ] **T1 — Shadow wiring on single intake** (2d). Call `mlClient.score()` in `/api/v1/leads` after fraud-signals are computed. Persist `mlFraudScore`, `mlAttributions`, `mlModelVersion` on `Lead.create`. Do **not** touch the existing rule-based reject branch. Unit tests: ML client mocked to return a fixed score; verify persistence + that accept/reject decision is unchanged.
- [ ] **T2 — Batch scoring endpoint** (1d). `POST /score/batch` on FastAPI. Validate input via pydantic `conlist(FraudInput, max_items=500)`. Return `[{score, attributions, modelVersion}, ...]` in input order. Pytest covers happy path, partial failure, oversized batch.
- [ ] **T3 — Shadow wiring on bulk intake** (1d). Call `mlClient.scoreBatch()` per chunk (same 50-lead chunk size as v1.0 bulk sync boundary). Graceful degradation: if ML service errors, log a Sentry breadcrumb and proceed with rule-based only — **never** block intake on ML failure.
- [ ] **T4 — Enforcement toggle plumbing** (1d). Add `FraudPolicy.mlEnforcementMode`. Default all existing rows to `OFF`. Intake route reads the policy; when `ENFORCE` and `mlFraudScore ≥ mlRejectThreshold`, reject the lead with a dedicated reason `fraud_ml_enforced` (distinct from rule-based `fraud_rule_*` reasons, for traceability).
- [ ] **T5 — Explainability panel** (2d). `ExplainabilityPanel.tsx` — fetch from `trpc.lead.byId`, render score dial (shared primitive already exists for rule-based score), top-3 bars, plain-text via a `describeFeature(name, value, shap) → string` lookup. i18n-ready (English only for v2.5; keys added to existing i18n registry).
- [ ] **T6 — Drawer integration** (0.5d). Add "Fraud analysis" tab to the lead drawer. Order: Overview | Timeline | Fraud analysis | Audit. Keyboard nav preserved.
- [ ] **T7 — Threshold recommender** (1.5d). `threshold-recommender.ts`: Postgres window function over last 30d pulling `mlFraudScore` and `outcome`; compute precision/recall at 1-point increments; return F1-max + whole PR curve. Endpoint + admin page banner showing recommendation, rationale ("would have caught 12% more fraud at +0.2% FP rate"), and "Apply" CTA which only **pre-fills** the manual input — admin still clicks Save.
- [ ] **T8 — Grafana shadow dashboard** (1d). Panels: rule vs ML agreement %, ML score histogram (accepted/rejected), per-GEO divergence heatmap, p95 latency of /score, error rate of /score. Import JSON to staging + prod Grafana.
- [ ] **T9 — Integration test battery** (1.5d). End-to-end: (a) intake in shadow mode persists both scores; (b) intake in ENFORCE mode with ML score above threshold rejects; (c) intake when ML service is down falls back to rule-based; (d) bulk intake with 500 leads completes under SLA with both scores populated; (e) explainability endpoint returns top-3 features.
- [ ] **T10 — Soak test: 48h of shadow traffic in staging** (2d calendar-time, near-zero dev-time). Deploy on S2.5-2 day 5; let it accumulate shadow telemetry through S2.5-3/4; revisit in S2.5-5 to confirm gates before flipping `ENFORCE` for pilot tenants.
- [ ] **T11 — Sprint close** (0.5d). Tests, lint, typecheck, commit, tag `v2.5-s2-shadow-ml`, retro.

### Open design questions

- **Should we block intake when ML service is unreachable?** Default: no — rule-based fallback preserves v1.0 behavior. Alternative: a per-policy `mlFailurePolicy ∈ {FAIL_OPEN, FAIL_CLOSED}` for high-assurance tenants. Decide based on pilot feedback.
- **Attributions column bloat.** Storing full top-10 SHAP values per lead at 1M leads/month adds ~500 MB/month. Option: store only top-3 (aligned with UI) and regenerate on-demand via the microservice for audit. Recommended: **top-3 in Postgres, full vector regenerable**.
- **Enforcement rollout plan.** Staged: (1) internal tenant enforce for 7 days; (2) pilot tenant enforce for 14 days; (3) GA enforce as opt-in. Each stage gated by divergence thresholds (rule/ML disagreement < 5% absolute).

### Risks

- Latency budget eaten by ML call on the critical path. Mitigation: 80 ms timeout, circuit breaker from S2.5-1 T7, and intake never blocks on ML outcome in SHADOW mode (fire-and-forget via `waitUntil` when on Vercel edge; sync-await on Node to simplify persistence).
- SHAP explanations are numerically correct but hard for ops to interpret. Mitigation: plain-text `describeFeature` mapping reviewed by one non-ML stakeholder before shipping.
- **Recommender churn.** Threshold recommendations flip day-to-day on low-volume tenants, confusing admins. Mitigation: only surface the recommendation if the 30-day sample size exceeds a minimum (default 500 leads); otherwise show "Insufficient data — collect more traffic before tuning." Documented in the admin page copy.
- **Enforcement reversal.** An admin who flips `ENFORCE` then finds the false-positive rate is too high needs a fast rollback. Mitigation: `mlEnforcementMode` is a single-click toggle; audit-logged; reverting to `SHADOW` or `OFF` is always available and takes effect within one request.

### Dependencies on prior versions

- v1.0 S4 share-link infrastructure — not needed directly but the audit-log tab pattern in the lead drawer is reused.
- v2.0 audit log UI — SHAP attributions render in a new tab adjacent to the existing audit tab.
- v2.0 billing / subscription — not a gate; ML is included on all paid plans.

---

## Sprint S2.5-3 — Cohort / Retention Report

**Dates:** 2027-07-29 → 2027-08-11 (W5–W6).
**Focus:** Ship an iREV-style cohort retention analytics view, available on **all plan tiers** (per spec §7 wedge "first in industry available on all plans"). Rows = cohort month, columns = 0d / 7d / 30d / 60d / 90d retention. Drill-down to individual leads. Shareable tokenized links reused from v1.0.

### Deliverables

- [ ] **Cohort table** at `/analytics/cohorts` with selectable dimensions (`affiliate | broker | geo`), date range (12-month rolling window default), and retention windows `[0d, 7d, 30d, 60d, 90d]`. Data rendered as a heatmap-style grid.
- [ ] **Retention definition:** % of converters in cohort month `M` who converted again in window `[M + N days, M + N days + 1d]`. "Converted" = `Lead.finalOutcome = FTD`. Configurable conversion-event filter for future extension (not exposed in UI yet).
- [ ] **Performance:** cohort table for 12 months × any single dimension renders in < 2 s p95 on a tenant with 1M leads/year (achieved via daily materialized view, pre-aggregated).
- [ ] **Drill-down:** clicking a cell opens the existing leads-list drawer pre-filtered by cohort + retention window + dimension value.
- [ ] **Shareable link:** existing `/share/[token]` infrastructure (v1.0 S4) extended with `CohortReport` view type. Shared links are read-only, respect tenant scoping, expire per existing policy (7d default, configurable).
- [ ] **Available on all plans.** No plan-tier gate. (Public API rate limits are tier-gated in S2.5-4; the UI report itself is free.)

### Files to create/modify

- Create: `prisma/schema.prisma` — add `LeadConversionDaily` materialized view (Postgres `MATERIALIZED VIEW` defined via raw migration, not Prisma native). Columns: `tenantId, dimension, dimensionValue, cohortMonth, retentionWindowDays, convertersCount, retainedCount`.
- Create: `prisma/migrations/<ts>_cohort_materialized_view/migration.sql` — the raw SQL for the MV + refresh function + daily cron.
- Create: `src/server/analytics/cohort.ts` — `computeCohort({ tenantId, dimension, from, to, windows })` returning typed grid data.
- Create: `src/server/routers/cohort.ts` — tRPC router with `get` + `drillDown` procedures.
- Modify: `src/server/routers/_app.ts` — register `cohort` router.
- Create: `src/app/(dashboard)/analytics/cohorts/page.tsx` — client page.
- Create: `src/components/analytics/CohortHeatmap.tsx` — grid component.
- Modify: `src/server/analytics/share-link.ts` — extend `ShareableView` enum with `COHORT`.
- Create: `src/app/share/cohort/[token]/page.tsx` — public render.
- Modify: `src/app/(dashboard)/layout.tsx` — nav link "Cohorts" under Analytics.
- Create: `docs/superpowers/plans/2027-07-29-v2-5-sprint-3-cohort-report-tasks.md` — task-level sub-plan.

### Task list

- [ ] **T1 — Materialized view design + migration** (1.5d). Write SQL for `LeadConversionDaily`. Cross-check plan with `EXPLAIN ANALYZE` against a 1M-lead staging dump. Refresh strategy: `REFRESH MATERIALIZED VIEW CONCURRENTLY` nightly via existing cron; partial hourly refresh for the current day via trigger on `Lead.finalOutcome` changes.
- [ ] **T2 — Cohort aggregation module** (1.5d). `computeCohort()` — single SQL query against the MV, grouped by `cohortMonth × retentionWindowDays`. Returns `{ rows: [{ cohort, dimension, values: { '0d': n, '7d': n, ... } }], totals }`. Unit tests with fixture MV data.
- [ ] **T3 — tRPC router + validation** (1d). `cohort.get` with Zod input (`dimension`, `from`, `to`, `windows`); `cohort.drillDown` returning `Lead[]` scoped to cohort + window + dimensionValue. `protectedProcedure`; tenant-scoped via `ctx.tenantId`.
- [ ] **T4 — Heatmap component** (1.5d). `CohortHeatmap.tsx` — SVG grid with oklch color scale (per design system). Hover tooltip shows raw counts, percentage, drill-down CTA. Keyboard nav (arrow keys between cells, Enter to drill). Follows `SPEC.md` density rules (7–12 px padding).
- [ ] **T5 — Page + filters** (1d). `/analytics/cohorts/page.tsx` — dimension selector, date range picker (reuse existing primitive), "Save filter" (v1.0 S4 preset) support.
- [ ] **T6 — Drill-down integration** (0.5d). Clicking a cell routes to `/leads?cohortMonth=YYYY-MM&window=30d&dimension=affiliate&value=<id>`. Leads list reads these params and constrains the existing filter.
- [ ] **T7 — Shareable link extension** (1d). Add `COHORT` to `ShareableView`; serializer writes filter state to the token payload; public `/share/cohort/[token]/page.tsx` renders read-only heatmap. Ensure no tRPC session is required; the share endpoint uses a dedicated `publicShareProcedure`.
- [ ] **T8 — Perf test** (0.5d). Seed 1M leads across 12 months in staging; hit `/analytics/cohorts` with each dimension; assert p95 < 2 s. If fails, add Redis cache on the aggregated grid keyed by `(tenantId, dimension, from, to)` with 15-min TTL.
- [ ] **T9 — E2E test** (1d). Playwright: navigate to cohorts page, change dimension, click a cell, verify drill-down shows expected leads, create share link, open in incognito, verify read-only render.
- [ ] **T10 — Sprint close** (0.5d). Tests, lint, typecheck, commit, tag `v2.5-s3-cohort`, retro.

### Open design questions

- **Conversion definition extensibility.** Some tenants define "conversion" as first deposit, others as approved KYC. Ship v2.5.0 with FTD only; expose an `eventType` dropdown in v2.5.1 once we see customer demand.
- **Negative cohorts (e.g., -7d).** Not in scope. "Retention" is forward-looking only.
- **Plan-tier gating.** Free on all plans per spec. Reconsider only if the feature becomes a cost driver (MV refresh on giant tenants).

### Risks

- MV refresh contention. `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires a unique index — ensured in migration. Monitor refresh duration; if > 5 min, consider partitioning by `tenantId`.
- **Share-link leakage.** Tokenized share links are public-readable by anyone with the URL. Cohort data contains aggregated metrics, not raw PII, but could still reveal business volume. Mitigation: tenants can disable share links per report; existing 7-day default expiry + manual revoke carry over from v1.0.
- **Dimension explosion.** If a tenant has 10k affiliates, rendering a 10k-row heatmap crashes the browser. Mitigation: pagination (100 rows per page default) + top-N filter; server caps at 1 000 rows per response.

### Dependencies on prior versions

- v1.0 S4: share-link infrastructure (`src/server/analytics/share-link.ts`), analytics daily roll-up MVs, filter-preset pattern.
- v1.5 S3: status-group canonical statuses used for "converted" definition.
- v2.0 S1: `tenantId` scoping — cohort data is strictly tenant-isolated.

---

## Sprint S2.5-4 — EPIC-19 Public API & Developer Portal

**Dates:** 2027-08-12 → 2027-08-25 (W7–W8).
**Focus:** Turn the existing `/api/v1/*` into a first-class public developer platform: tiered tokens with plan-gated rate limits, public docs built from OpenAPI, webhooks catalog, sandbox without signup, 3 quickstart tutorials.

### Deliverables

- [ ] **API token tiers:** `ApiKey.tier ∈ {FREE, PRO, ENTERPRISE}`. Rate limits per tier — Free: 60 rpm / 10k lead-writes per day; Pro: 600 rpm / 200k/day; Enterprise: 3 000 rpm / 5M/day. Values source of truth: `src/server/intake/rate-limit-tiers.ts`. Enforced in existing rate-limit middleware from v1.0.
- [ ] **Public docs site** at `/docs/api` rendered from the canonical OpenAPI 3.1 spec (already partially exposed in v1.0 S8). Renderer: **Scalar** (or Redoc — decide in T2). Includes auth, pagination, error catalog (from `GET /api/v1/errors`), schema registry links.
- [ ] **Webhooks catalog** at `/docs/api/webhooks` listing all event types with payload schema, HMAC signing details, retry ladder (`10s, 60s, 300s, 900s, 3600s`, auto-pause on HTTP 410 — already in v1.0 outcome webhooks).
- [ ] **Stateless public sandbox** at `https://sandbox.gambchamp.app/v1/*` accessible **without signup** — a token-less endpoint that echoes deterministic responses based on `external_lead_id` prefix (reuses v1.0 sandbox infra). Resets daily at 00:00 UTC. CORS wide open. Rate-limited by IP (`20 rpm`).
- [ ] **3 quickstart tutorials** published at `/docs/api/tutorials/`: (1) "Send your first lead in 5 minutes" (curl + Node + Python), (2) "Receive postbacks and verify signature", (3) "Poll analytics with tokenized share links".
- [ ] **Developer portal landing** at `/developers` — hero, pricing-tier comparison table, link to docs, link to sandbox, link to tutorials, status page link.

### Files to create/modify

- Modify: `prisma/schema.prisma` — add `ApiKey.tier` enum, default `FREE`. Migration backfills existing keys to `PRO` (not `FREE`, because they are paying customers — confirm in kickoff).
- Create: `src/server/intake/rate-limit-tiers.ts` — canonical limits.
- Modify: `src/server/intake/rate-limit.ts` — read `tier` off the `ApiKey` row (already fetched in verify), apply correct limit.
- Create: `src/app/docs/api/page.tsx` — Scalar-rendered OpenAPI.
- Create: `src/app/docs/api/webhooks/page.tsx` — static MDX.
- Create: `src/app/docs/api/tutorials/[slug]/page.tsx` — MDX tutorial pages.
- Create: `src/app/developers/page.tsx` — portal landing.
- Create: `openapi/v1.yaml` — canonical spec (extract + canonicalize from the route handlers via a generator; do not hand-write).
- Create: `scripts/generate-openapi.ts` — reads Zod schemas from `src/server/schema/registry.ts` + tRPC routers, emits `openapi/v1.yaml`.
- Modify: `src/app/api/v1/errors/route.ts` (if exists) — ensure machine-readable error catalog is complete for docs consumption.
- Modify: infrastructure — route `sandbox.gambchamp.app` to a dedicated Next.js deployment with sandbox feature flag on.
- Create: `docs/superpowers/plans/2027-08-12-v2-5-sprint-4-developer-portal-tasks.md`.

### Task list

- [ ] **T1 — Tier schema + backfill** (0.5d). Add `tier` enum to `ApiKey`, migrate, backfill: existing customer keys → `PRO`; admin keys → `ENTERPRISE`.
- [ ] **T2 — Rate-limit tier enforcement** (1d). Thread `tier` through the rate-limit middleware. Tests covering all 3 tiers on both single and bulk intake. Choose docs renderer (Scalar vs Redoc): Scalar is more modern; Redoc is more battle-tested. Default: **Scalar**.
- [ ] **T3 — OpenAPI generator** (2d). `scripts/generate-openapi.ts` — walks Zod schemas in `src/server/schema/registry.ts` and route handlers; emits OpenAPI 3.1 YAML. Validate via `@redocly/cli lint`. Wire into CI: PR fails if `openapi/v1.yaml` is out of date.
- [ ] **T4 — Docs page + webhooks page** (2d). `/docs/api` renders via Scalar from `openapi/v1.yaml`. `/docs/api/webhooks` as static MDX with event-type table + code-sample blocks (TS + Python) for HMAC verification.
- [ ] **T5 — Sandbox deployment** (1.5d). Duplicate Next.js deploy as `sandbox.gambchamp.app`. Env: `SANDBOX_MODE=true`, `SANDBOX_DAILY_RESET=true`. Configure daily reset cron (truncate sandbox tables at 00:00 UTC). IP-based rate limiter configured.
- [ ] **T6 — Quickstart tutorials** (1.5d). 3 MDX files with code samples. Each is end-to-end runnable against the sandbox without signup. Validate each tutorial by running it from a blank WSL VM.
- [ ] **T7 — Developer portal landing** (1d). `/developers` — marketing page; pricing tier comparison pulls from `rate-limit-tiers.ts` constants (single source of truth). Status-page link points to the external status-page URL from env.
- [ ] **T8 — E2E + link-check** (1d). Playwright: render each docs page, check no broken links (internal + external); run the 3 tutorials head-to-tail.
- [ ] **T9 — Sprint close** (0.5d). Tests, lint, typecheck, commit, tag `v2.5-s4-dev-portal`, retro.

### Open design questions

- **Redoc vs Scalar.** Default Scalar (more modern, MIT-licensed, interactive). Swap to Redoc if Scalar bundle size exceeds 500 kB in the docs page payload.
- **Sandbox as a separate deployment vs a path prefix on main app.** Default: **separate deployment**. Isolation prevents sandbox abuse from affecting production rate limits or metrics.
- **Should tiers be mutable by admin without billing change?** Yes, for customer-success exceptions. An audit log entry is required on every change; UI in the existing `/admin/api-keys` page.
- **GraphQL?** Out of scope. REST + OpenAPI only.

### Risks

- OpenAPI drift between generator and reality. Mitigation: CI check forbids merges when spec is stale.
- Sandbox daily reset deletes data mid-tutorial. Mitigation: reset at 00:00 UTC; surface countdown in portal header.
- **Sandbox abuse / scraping.** The sandbox has no auth and wide-open CORS — trivially abusable for traffic generation. Mitigation: IP-based rate limit (20 rpm); Cloudflare Bot Management layer; daily reset purges accumulated state.
- **Free-tier rate-limit abuse.** Free tokens are issued to anyone post-signup; bots could farm accounts. Mitigation: email verification + phone verification before `ApiKey.tier` can be upgraded past `FREE`; existing signup-throttling from v1.0.
- **Tier change without billing change.** Admin-driven tier changes bypass Stripe. Mitigation: every tier change emits an audit log entry + Slack alert to finance; a weekly cron reconciles `ApiKey.tier` vs `Subscription.plan` and flags mismatches for review.

### Dependencies on prior versions

- v1.0 S1: `ApiKey` schema (adding `tier` column); per-key rate limit middleware.
- v1.0 S8: initial API docs scaffold at `/docs/api` (we replace the content but keep the route).
- v1.0 S7: public pricing page (we cross-link to the developer portal and vice-versa).
- v2.0 S2: `Subscription.plan` enum is the source of truth for default tier on new keys.

---

## Sprint S2.5-5 — Provider API + PWA

**Dates:** 2027-08-26 → 2027-09-08 (W9–W10).
**Focus:** Ship the **Provider API** — allow 3rd-party CRMs (HubSpot / Bitrix24) to be plugged in as upstream lead source — plus a **PWA wrapper** for `/dashboard` with offline read-only mode.

### Deliverables

**Provider API:**

- [ ] **Provider template catalog:** at least 2 provider templates seeded (`hubspot`, `bitrix24`). Each template declares: OAuth config (scopes, token URLs), webhook event schema, field-mapping presets.
- [ ] **Install flow** at `/admin/providers` — admin picks a template → redirected to OAuth consent → returns with access token persisted → field mapping UI where each remote field maps to a GambChamp intake schema field (drag/drop or dropdown). Save → creates a `ProviderConnection` row.
- [ ] **Inbound webhook handler** at `/api/v1/providers/:provider/webhook` accepting the upstream provider's native webhook format, translating via the mapping, then calling the existing intake pipeline as if it came from a regular API key. HMAC / signature verification per provider.
- [ ] **One working adapter shipped** end-to-end. **Default: HubSpot** (pilot customer confirmed). If pilot shifts, Bitrix24 ships instead — documented in T1. Round-trip acceptance: new contact created in HubSpot → appears in GambChamp leads list within 30 s, correctly scored by fraud rule + ML, routed per existing flows.
- [ ] **Provider connection health** indicator in `/admin/providers` showing `last_event_at`, `events_last_24h`, `error_rate`, `token_expires_at`.

**PWA:**

- [ ] **Installable PWA** wrapping `/dashboard`. Manifest + service worker registered. Passes Lighthouse PWA audit with score ≥ 90.
- [ ] **Service worker caches shell** (app chrome, fonts, CSS, JS bundles) via Workbox precache. Dynamic data (tRPC responses) cached via stale-while-revalidate with a 30 s TTL.
- [ ] **Offline read-only mode:** on offline, the dashboard renders the last-cached `/leads`, `/analytics`, `/routing` views with a yellow "offline — data may be stale" banner. Mutations are disabled (buttons / forms show tooltip "requires connection").
- [ ] **Install prompt** shown once per user, dismissible, respects `beforeinstallprompt` behavior.

### Files to create/modify

- Create: `prisma/schema.prisma` — `ProviderTemplate`, `ProviderConnection`, `ProviderFieldMapping` models.
- Create: `src/server/providers/registry.ts` — registers provider adapters; hubspot + bitrix24 stubs.
- Create: `src/server/providers/hubspot/adapter.ts` — OAuth + webhook + mapping translator.
- Create: `src/server/providers/bitrix24/adapter.ts` — stub only (template + schema, not full implementation — ships fully in v2.5.1 or on pilot demand).
- Create: `src/app/api/v1/providers/[provider]/webhook/route.ts`.
- Create: `src/app/api/v1/providers/[provider]/oauth/callback/route.ts`.
- Create: `src/app/(dashboard)/admin/providers/page.tsx` — list + install flow UI.
- Create: `src/app/(dashboard)/admin/providers/[id]/mapping/page.tsx` — field mapping UI.
- Create: `src/server/routers/provider.ts` — tRPC for connection CRUD + mapping CRUD.
- Modify: `src/server/routers/_app.ts`.
- Create: `public/manifest.json` — PWA manifest.
- Create: `public/sw.js` (or generated via Workbox) — service worker.
- Create: `src/app/pwa-register.tsx` — client component that registers the SW.
- Create: `src/components/system/OfflineBanner.tsx`.
- Modify: `src/app/(dashboard)/layout.tsx` — mount `OfflineBanner`.
- Create: `docs/superpowers/plans/2027-08-26-v2-5-sprint-5-provider-api-and-pwa-tasks.md`.

### Task list

- [ ] **T1 — Pilot adapter decision + schema scaffolding** (0.5d). Confirm with account owner: HubSpot or Bitrix24 for pilot. Lock choice in this task's notes. Create `ProviderTemplate`, `ProviderConnection`, `ProviderFieldMapping` models; `pnpm db:push`.
- [ ] **T2 — HubSpot adapter: OAuth flow** (1.5d). Standard OAuth 2.0 authorization_code flow. Register app with HubSpot dev account (pilot tenant owns the app or we own it + multi-tenant). Persist `accessToken`, `refreshToken`, `expiresAt` encrypted at rest (reuse v2.0 secrets encryption helper).
- [ ] **T3 — HubSpot adapter: webhook receiver** (1.5d). HubSpot webhook payload signature verification, parse contact.creation / contact.propertyChange events, translate via `ProviderFieldMapping`, call intake pipeline. Integration test with HubSpot's signed payload fixture.
- [ ] **T4 — Mapping UI** (1.5d). Field-mapping page: two-column layout — remote fields (fetched live from HubSpot via adapter's `listFields()`) on left, GambChamp intake schema fields on right. Dropdown per remote field. Validation: required intake fields must be mapped. Save → `ProviderFieldMapping` row.
- [ ] **T5 — Admin providers page** (1d). List installed connections; per-connection health row; "Install new" CTA. Uninstall revokes the token + marks connection inactive.
- [ ] **T6 — Bitrix24 stub** (0.5d). Template + schema + placeholder adapter that returns "not yet implemented" on all operations. Documented in the template as "Coming soon — contact support".
- [ ] **T7 — PWA manifest + SW registration** (1d). Workbox-generated SW; manifest with all icon sizes, theme color from design system. `pwa-register.tsx` registers on first client mount.
- [ ] **T8 — Offline mode + banner** (1d). `OfflineBanner` reacts to `navigator.onLine`; SW configured to serve cached shell + SWR for tRPC. Mutation tRPC hooks check `navigator.onLine` and short-circuit to a toast when offline.
- [ ] **T9 — Lighthouse audit + fixes** (0.5d). Run Lighthouse against staging; address any PWA-audit failures until score ≥ 90.
- [ ] **T10 — E2E: HubSpot round-trip + PWA install** (1d). (a) From a test HubSpot account, create a contact; verify it appears in GambChamp leads list within 30 s, correctly scored; (b) on Chrome, install PWA, go offline, verify dashboard loads cached state with banner.
- [ ] **T11 — Sprint close** (0.5d). Tests, lint, typecheck, commit, tag `v2.5-s5-provider-pwa`, retro.

### Open design questions

- **HubSpot vs Bitrix24 for pilot.** Decided in T1 with account owner. Default: HubSpot (larger ecosystem, cleaner API).
- **Adapter ownership: we run it or customer runs it?** Multi-tenant: we own the HubSpot app registration; customers OAuth-consent into it. Enterprise pilots may BYO app (config allowed in ProviderConnection). Ship multi-tenant-only in v2.5.0; BYO in v2.5.1.
- **PWA caching strategy.**
  - *Option A (default):* Workbox precache of shell (~2 MB), SWR for data, 30 s TTL. Pros: simple, common pattern. Cons: initial load still requires network.
  - *Option B:* Precache + aggressive data preload on idle. Pros: instant offline. Cons: privacy concerns (data lingers on device). Decided: **Option A**. Option B revisited if the PWA sees meaningful offline usage (telemetry added in S2.5-6).
- **Offline mutation queue?** Out of scope. PWA is read-only offline. Mutation queue is a v3.0 consideration.

### Risks

- OAuth flow debugging is famously time-consuming. Mitigation: build against HubSpot's sandbox account; reserve 1d of T2 buffer.
- Field mapping gets gnarly for rich contact objects. Mitigation: ship v2.5.0 with a minimal mapping (email, phone, name, country); deeper mapping in v2.5.1.
- **Token rotation / refresh failure.** HubSpot access tokens expire hourly; refresh tokens can be revoked out-of-band by the user. Mitigation: background job refreshes tokens 10 min before expiry; on refresh failure, mark connection `DEGRADED` + notify admin via existing Telegram ops-bot (v1.0 S5).
- **Duplicate leads from provider re-sync.** HubSpot retries webhook delivery on failure, and provider-initiated re-syncs can replay events. Mitigation: every inbound event carries a provider-side event ID; we dedupe at intake using the existing `IdempotencyKey` table keyed as `provider:<providerId>:<eventId>`.
- **PWA cache staleness surprising admins.** SWR with a 30 s TTL means admins may see slightly stale routing data. Mitigation: timestamp in the offline banner ("last synced 14s ago"); pull-to-refresh gesture on mobile.
- **Service worker update bricks tab.** Faulty SW deploy can persist across hard refreshes. Mitigation: skipWaiting + clientsClaim on each deploy; "emergency SW killswitch" endpoint that responds with an empty SW and `Clear-Site-Data: cache,storage`.

### Dependencies on prior versions

- v1.0 S1: intake pipeline (providers call into existing `/api/v1/leads` after mapping).
- v1.0 S4: idempotency key table (reused for provider event dedup).
- v1.5 S2: visual rule-builder — not a dependency but the field-mapping UI cribs its drag-drop pattern.
- v2.0 S1: tenant-scoped secrets encryption — stores OAuth tokens encrypted at rest.
- v2.0 S4: Telegram Mini App — PWA caching strategy references its Service Worker config.

---

## Sprint S2.5-6 — EPIC-16 Integration Marketplace v2 + Hardening + Release

**Dates:** 2027-09-09 → 2027-09-22 (W11–W12).
**Focus:** Public integration marketplace, one-click installs, community-contributed templates with moderation, full hardening pass, and the v2.5.0 release cut.

### Deliverables

**Marketplace v2:**

- [ ] **Public catalog** at `/marketplace` listing: broker templates (from v1.0 S7 + subsequent sprints), provider adapters (from S2.5-5), custom integrations. Searchable + filterable (category, rating, official vs community).
- [ ] **Template detail page** at `/marketplace/[slug]` with screenshots, config preview, rating (average + count), recent reviews, "Install" CTA.
- [ ] **One-click install:** "Install" on a broker template pre-fills a new `Broker` row with the template's config (URL patterns, auth mode, field mappings) and drops the admin into the existing broker-edit drawer to finish and save. Template version pinned on install; updates offered as a notification.
- [ ] **Community submissions:** any tenant on Pro+ plan can submit a broker template via `POST /api/v1/marketplace/submissions`. Submissions go to a moderation queue (`/admin/marketplace/review`) — only GambChamp staff can approve. Schema: `MarketplaceSubmission` with state machine `DRAFT → SUBMITTED → IN_REVIEW → APPROVED | REJECTED`.
- [ ] **5-star rating** + optional short review per install. Enforced: one rating per tenant per template. Average + distribution visible on detail page.

**Hardening + release:**

- [ ] **Integration smoke suite rerun** — all v1.0, v1.5, v2.0, v2.5 integration tests green on `main`.
- [ ] **Perf regression rerun** — `perf/intake-load.js` sustained 300 rps / 15m + burst 1 000 rps / 60 s; same or better p95 than v2.0.
- [ ] **Pentest completed** against staging by external firm; high/critical findings fixed pre-release. (Engage firm at S2.5-4 kickoff.)
- [ ] **CHANGELOG.md** entry for v2.5.0 with all new capabilities, flags, migrations.
- [ ] **Release tag `v2.5.0`** on `main`; GA date: 2027-09-22 soft, 2027-12-15 GA (11 weeks of pilot + hardening between soft and GA, covered by buffer sprints S2.5-7 and S2.5-8 in the annex — see "Buffer" section below).

### Files to create/modify

- Modify: `prisma/schema.prisma` — extend `BrokerTemplate` with `publishedBy`, `publishedAt`, `ratingAverage`, `ratingCount`, `isCommunity`, `approvedAt`, `approvedBy`. Add `MarketplaceSubmission`, `MarketplaceRating`, `MarketplaceInstall` models.
- Create: `src/app/marketplace/page.tsx` — public catalog.
- Create: `src/app/marketplace/[slug]/page.tsx` — template detail.
- Create: `src/app/(dashboard)/admin/marketplace/submit/page.tsx` — submission form.
- Create: `src/app/(dashboard)/admin/marketplace/review/page.tsx` — moderation queue.
- Create: `src/server/routers/marketplace.ts` — tRPC for catalog + submissions + ratings + installs.
- Modify: `src/server/routers/_app.ts`.
- Modify: `src/app/(dashboard)/brokers/new/page.tsx` — accept `?fromTemplate=<id>` query param, pre-fill from template.
- Create: `CHANGELOG.md` entry (or update if exists).
- Create: `docs/superpowers/plans/2027-09-09-v2-5-sprint-6-marketplace-and-release-tasks.md`.

### Task list

- [ ] **T1 — Schema extensions + migration** (1d). Add the marketplace tables + `BrokerTemplate` columns. `pnpm db:push`. Backfill existing templates as `isCommunity=false`, `publishedBy='gambchamp'`, `approvedAt=<now>`.
- [ ] **T2 — Public catalog page** (1.5d). `/marketplace` with search, filters, sort (popular, newest, highest-rated). Server component with client-side filter pane. No auth required; shows approved templates only.
- [ ] **T3 — Template detail + install flow** (1.5d). `/marketplace/[slug]` — detail view. "Install" CTA: if not logged in, redirects to signup; if logged in, routes to `/brokers/new?fromTemplate=<id>`. `BrokerTemplate.pre-fill` hydrates the new-broker form; admin completes remaining fields.
- [ ] **T4 — Submission flow + moderation UI** (1.5d). Submission form for Pro+ tenants (plan-tier gate). Moderation queue for staff: review, diff-view (vs similar approved templates), approve/reject with required note. State-machine transitions emit audit events.
- [ ] **T5 — Ratings + reviews** (1d). One rating per `(tenantId, templateId)` unique constraint. Review text optional, max 500 chars. Rating average recomputed on write.
- [ ] **T6 — Integration smoke rerun** (1d). Run the full test suite + integration smoke pack on staging. Fix any regressions. Target: **zero** flaky tests for release.
- [ ] **T7 — Perf rerun** (0.5d). `perf/intake-load.js` sustained + burst; compare to v2.0 baseline; publish delta report.
- [ ] **T8 — Pentest findings triage** (1d). External firm's report (scheduled start at S2.5-4 end, results by S2.5-6 day 1) — high/critical fixed; mediums triaged into v2.5.1.
- [ ] **T9 — Release checklist** (0.5d). CHANGELOG, upgrade notes, migration notes (MV refresh, new columns, new env vars), rollback runbook.
- [ ] **T10 — Tag v2.5.0** (0.25d). `git tag v2.5.0`; push tag; GitHub release notes pasted from CHANGELOG.
- [ ] **T11 — Sprint close + v2.5 retrospective** (0.75d). Full retro appended to this file covering all 6 sprints: what shipped vs planned, open items for v2.5.1, ML precision/recall final numbers, pilot Provider API round-trip results.

### Open design questions

- **Community-template security.** Templates can include JSONPath or regex field mappings — risk of ReDoS. Mitigation: validate all user-provided regex via `re2` (linear-time). No code execution in templates.
- **Rating abuse / sockpuppet ratings.** One-rating-per-tenant is the primary defense. Secondary: staff can suppress suspicious ratings (audit-logged). No ML-based abuse detection in v2.5.0.
- **Featured / official badge.** GambChamp staff can mark a template "Official" — visually distinct. Community templates must display "Community" badge.
- **Monetization of community templates.** Out of scope. All marketplace content is free in v2.5.0. Revenue-share model is a v3.0 topic.

### Risks

- Pentest surfaces critical finding late. Mitigation: pentest starts at S2.5-4 end (not S2.5-6) to give 3+ weeks for fixes.
- Marketplace SEO / discoverability matters for sales but not for release. Mitigation: basic meta tags + sitemap only in v2.5.0; full SEO in a post-GA marketing sprint.
- **Moderation throughput.** If community submissions arrive faster than staff can review, backlog grows. Mitigation: Monday / Thursday review cadence; SLA of 5 business days; auto-email submitters on status change.
- **One-click install creates broken broker.** If a template's config is stale (e.g., upstream broker API version bumped), the pre-filled broker fails on first push. Mitigation: admin must still manually test-push before saving (existing v1.0 flow preserved); template detail page shows "last tested" date.

### Dependencies on prior versions

- v1.0 S7: broker template catalog schema (extended here, not rewritten).
- v1.0 S5: Telegram ops bot — notifications for new submissions go here for staff.
- v2.0 S1: `tenantId` on `BrokerTemplate` and `MarketplaceSubmission` — community content is tenant-attributed.
- v2.0 S2: `Subscription.plan` — Pro+ plan gate for submission eligibility.

---

## Buffer / soft-launch period (W13–W24)

Between the S2.5-6 code-complete tag (2027-09-22) and public GA (2027-12-15) there are 11 weeks of **pilot + soft-launch + hardening**. These are not sprints of new work; they cover:

- 2-week ML shadow → enforce gated rollout (internal → pilot → GA) as scheduled in S2.5-2 T10.
- Pilot customer onboarding on Provider API (HubSpot round-trip at real volume).
- Pentest remediation tail.
- Bug backlog drain.
- Documentation polish + screencasts for docs site.
- Marketing-site integration (pricing page, developer portal, marketplace).

If any scope slips from S2.5-1..6, it lands in this buffer, not into v3.0, unless it is net-new rather than completion.

### Buffer cadence

- **W13–W14 (2027-09-23 → 2027-10-06):** Internal-only ML enforce for GambChamp's own tenant, 7-day observation window. Pentest interim fixes land. Cohort report shared with two customer-success reps for UX feedback.
- **W15–W18 (2027-10-07 → 2027-11-03):** Pilot customer ML enforce rollout + HubSpot Provider API live traffic. Weekly sync with pilot. Adjust auto-tune recommender based on real false-positive feedback.
- **W19–W22 (2027-11-04 → 2027-12-01):** GA-candidate hardening. Documentation polish (screencasts, API examples, troubleshooting guide). Marketing-site integration: `/pricing`, `/developers`, `/marketplace` publicly linked from homepage. Final pentest report received and signed off.
- **W23–W24 (2027-12-02 → 2027-12-15):** GA-ready freeze. Only P0 bug fixes merged. Announcement, customer comms, GA tag.

### Buffer deferrals

If a sprint slips but the feature is 80%+ complete:

- **ML below precision/recall target:** land in buffer W13–W14 via feature engineering iteration; ship behind `ENFORCE` only after target met.
- **Provider API adapter incomplete:** pilot runs in WEBHOOK-only mode (no OAuth), complete OAuth in buffer.
- **Marketplace community submissions not yet approved:** GA ships with official-only catalog; community opens post-GA.
- **PWA Lighthouse score < 90:** ship PWA behind flag defaulting to off; fix to ≥ 90 during buffer, then flip default on.

---

## Cross-cutting concerns

### Feature flags

All v2.5 surfaces ship behind flags defaulting to `off` for existing tenants, `on` for new tenants post-GA:

- `feature.ml_fraud_shadow` — enables dual-scoring in shadow. Default `on` once S2.5-2 ships.
- `feature.ml_fraud_enforce` — per-tenant opt-in to enforce ML score. Default `off` at release; flipped per tenant per rollout plan.
- `feature.cohort_report` — defaults `on` for all (free tier available per spec).
- `feature.public_portal` — defaults `on` globally (it's a public page).
- `feature.provider_api` — per-tenant; defaults `off` until admin installs a provider.
- `feature.pwa` — defaults `on`; tenants can disable via admin setting.
- `feature.marketplace_v2` — defaults `on`.

### Observability

Each sprint adds at least one Grafana dashboard:

- S2.5-1: `fraud-ml-training` (training job durations, dataset sizes, eval metrics).
- S2.5-2: `fraud-ml-shadow` (agreement rates, divergence, latency).
- S2.5-3: `analytics-cohort` (MV refresh duration, cache hit rate, page render p95).
- S2.5-4: `public-api` (per-tier rate-limit hits, sandbox usage).
- S2.5-5: `providers` (per-provider event rate, error rate, token expiry horizon).
- S2.5-6: `marketplace` (installs/day, new submissions, rating distribution).

### Documentation

Per sprint:

- Update `crm-node/CLAUDE.md` with one paragraph per sprint summarizing new modules, tables, flags, env vars.
- Update the master backlog + this plan with a retrospective section.
- External docs: `/docs/api` is the source of truth; public marketing pages link to it rather than duplicating.

### Testing gates (applied every sprint)

- `pnpm typecheck` — zero errors.
- `pnpm lint` — zero errors.
- `pnpm test` — all pass; coverage not regressing (compare to prior sprint baseline).
- For UI work: Playwright smoke on staging.
- For ML: offline eval gates enforced in CI via a separate job (`ci-ml-eval`).

### Competitive positioning check (per sprint)

Each sprint closes one or more competitive gaps documented in spec §8. Sprint close includes a one-line update to the roadmap spec's v2.5 row showing "closed" items.

| Sprint | Closes (parity) | Adds (unique) |
|---|---|---|
| S2.5-1 | (none customer-visible; foundation) | — |
| S2.5-2 | ML fraud (HyperOne, iREV direction) | Per-feature SHAP attribution in UI (none have this) |
| S2.5-3 | Cohort/Retention (iREV has it paywalled) | **Cohort free on all plans** (industry first per spec) |
| S2.5-4 | Public API portal (multiple competitors have docs) | Sandbox without signup (none have this) |
| S2.5-5 | PWA mobile (none have dedicated mobile today) | **Provider API** — 3rd-party CRMs as upstream (unique wedge per spec) |
| S2.5-6 | Marketplace v2 (iREV-adjacent) | Community-contributed templates with ratings (none have this) |

### Tenancy + data-isolation checklist

v2.5 inherits v2.0's multi-tenant isolation. Per sprint, verify:

- [ ] Every new Prisma model has `tenantId String` (not nullable, post v2.0) + `@@index([tenantId])`.
- [ ] Every new tRPC procedure under a `protectedProcedure` applies `ctx.tenantId` in its `where` clause.
- [ ] Every new REST endpoint applies tenant scoping before touching the DB.
- [ ] Every new share-link / public endpoint explicitly documents whether it bypasses tenant scoping and why.
- [ ] Every new background job queries only within its tenant scope or explicitly iterates tenants.

---

## Success criteria for v2.5.0 (go / no-go gate at GA 2027-12-15)

Per spec §10:

- [ ] **Smart Fraud ML**: precision ≥ 0.85 @ recall ≥ 0.75 vs v1.0 rule-based baseline, measured on the rolling 30-day production enforce-mode cohort. Explainability UI shows top-3 contributing features per decision.
- [ ] **Public API portal**: ≥ 3 external integrations completed via docs without support intervention (tracked via support-ticket audit).
- [ ] **Provider API**: 1 external CRM (HubSpot in pilot, or Bitrix24 if pilot switched) connected as upstream on a pilot customer, processing real leads end-to-end.

Plus v2.5-level internal gates not in the spec but required for release:

- [ ] Cohort retention report renders in < 2 s p95 on a 1M-lead tenant and is available on all plan tiers.
- [ ] PWA passes Lighthouse PWA audit with score ≥ 90.
- [ ] Marketplace has ≥ 5 community-submitted templates approved at GA (not counting the 10+ official templates shipped in v1.0 S7).
- [ ] External pentest report shows zero open high/critical findings.
- [ ] CHANGELOG and `v2.5.0` tag present.

---

## Retrospective

_To be filled in at the end of S2.5-6, appended via the same pattern as the v1.0 Sprint 1 plan._

Template:

- **Scope achieved vs planned:** …
- **Precision/recall of final ML model at GA:** …
- **Pilot Provider API round-trip latency (p95):** …
- **Items deferred to v2.5.1:** …
- **Items escalated to v3.0:** …
- **Surprises / lessons:** …
- **Rough time spent per sprint:** S2.5-1 … d, S2.5-2 … d, …
