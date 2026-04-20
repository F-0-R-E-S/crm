# Intake perf harness

Local SLO validation harness for STORY-012 (EPIC-01 Lead Intake).

## Usage

```bash
INTAKE_API_KEY=ak_... node perf/intake-load.js sustained_300_rps_15m
INTAKE_API_KEY=ak_... node perf/intake-load.js burst_1000_rps_60s
INTAKE_API_KEY=ak_... node perf/intake-load.js sustained_500_rps_30m
```

## v1.0 GA gates (S8)

- **sustained_500_rps_30m** — p95 < 500ms, err_pct < 0.5% — the launch SLO.
  - Prereq: warm dev server (`pnpm dev`) + a 60s warmup run (`sustained_300_rps_15m` ^C at 60s).
  - Baseline destination: `docs/perf/v1-baseline.md`.
- **Routing engine stress:** see `perf/routing-stress.js` (10k-batch simulations).

## Targets (STORY-012 AC)

- **AC1:** 300 RPS sustained 15m → p95 < 500ms, 5xx < 0.5%
- **AC2:** 1000 RPS burst 60s → valid-lead loss = 0, 429 ≤ 2%
- **AC3:** downstream off → 202 + backlog drain < 10m после восстановления (ручной тест через остановку pg-boss worker)
- **AC4:** SLO 99.95% monthly, burn-rate alert 2m — Grafana rule (Operational Follow-up)
- **AC5:** DR drill RTO < 5m, RPO = 0 — infra runbook (Operational Follow-up)

## Notes

- Harness не запускается в CI — это локальный инструмент против running dev server.
- Target URL по умолчанию `http://localhost:3000/api/v1/leads`; override через `INTAKE_URL`.
- API key должен быть активным (не revoked, прошедшим `verifyApiKey`).
