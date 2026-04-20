# v1.0 Launch Checklist

All items must be ticked before `git push origin v1.0.0` and public announcement. This document is kept under source control — PR it open each time an item changes state.

## Engineering

- [x] Perf baseline validated: `docs/perf/v1-baseline.md` — all 5 scenarios PASS.
- [x] E2E green: `tests/e2e/v1-full-flow.test.ts`.
- [x] Full test suite green: `pnpm test` ≥ 500 tests.
- [x] Zero typecheck errors: `pnpm typecheck`.
- [x] ≤ 10 lint errors: `pnpm lint` (pre-existing diagnostics reduced in S8).
- [x] Health live: `/api/v1/health` reports `version: "1.0.0"`.
- [x] Metrics live: `/api/v1/metrics/summary` returns 5 counters.
- [x] 6 alert rules deployed + one test-fire verified: `tests/integration/alerts-rules.test.ts`.
- [x] `AlertLog` table created; evaluator scheduled every minute.

## Operations

- [x] Runbook written: `docs/runbooks/v1-launch.md`.
- [x] On-call checklist published: `docs/runbooks/oncall-checklist.md`.
- [ ] On-call rotation assigned (names + shifts) — populate `docs/runbooks/oncall-rotation.md` before GA.
- [ ] Monitoring dashboards linked in README + runbook.
- [ ] Rollback procedure documented + drilled (revert + deploy < 5 min).
- [ ] Backup restore drill on staging passed.

## Product / GTM

- [x] Public pricing page live at `/pricing`.
- [x] `/docs/api` renders OpenAPI spec (Scalar).
- [x] Sandbox keys documented in OpenAPI `info.description`.
- [x] Broker templates ≥ 10 in catalog (EPIC-13 S7 seed).
- [ ] External-reviewer signup + wizard walkthrough < 30 min — row captured in `docs/v1-bug-triage.md`.
- [x] Wizard all 5 steps — no console errors; SSE live-lead stream works.
- [ ] Marketing site links to docs + pricing.

## Security

- [x] `tests/integration/security-baseline.test.ts` green (SQLi + XSS + IDOR + rate-limit).
- [ ] Pentest-lite checklist fully ticked: `docs/security/v1-pentest-checklist.md`.
- [ ] Trufflehog on `main` clean.
- [x] CSP + HSTS + X-Frame-Options live in `next.config.ts`.

## Release

- [x] `package.json` version = `1.0.0`.
- [x] `CHANGELOG.md` populated (all 8 sprints).
- [x] Tag `v1.0.0` on `main`.
- [ ] Release notes drafted on GitHub (use CHANGELOG content).
- [ ] Zero open S1 or S2 bugs in `docs/v1-bug-triage.md`.

## Post-launch — first 24h

- [ ] On-call runs `oncall-checklist.md` 2× on launch day.
- [ ] Metrics snapshot at T+1h, T+6h, T+24h → `docs/perf/launch-day.md` (new file, post-launch).
- [ ] First external customer e2e acceptance — record timing + any surprises in `docs/v1-bug-triage.md`.
- [ ] Founder/commercial alignment call at T+24h to set v1.0.1 priorities.
