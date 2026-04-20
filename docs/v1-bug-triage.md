# v1.0 Bug Triage Log

**Window:** 2026-08-05 → 2026-08-07 (S8 days 6–8; continues days 8–10 if open-list ≥ 5).
**Owner during window:** on-call engineer + backup for pairing on S1 items.

## Severity legend

| Severity | Criteria                                                                        | Action                                |
|----------|---------------------------------------------------------------------------------|----------------------------------------|
| S1       | Prevents launch (data loss, auth bypass, broken intake on happy path)           | Fix pre-tag; block v1.0.0.             |
| S2       | User-visible regression, silent incorrect behavior, failing alert rule          | Fix in S8 if capacity; else first patch (v1.0.1). |
| S3       | Cosmetic, rare edge case, doc gap                                               | Defer to v1.0.1 / v1.5 via `docs/v1-postlaunch-backlog.md`. |

## Triage procedure

- Daily 10:00 AM standup: walk the Open list; assign severity + owner.
- S1 → immediate fix, same-day regression test, same-day commit.
- S2 → scheduled into remaining window days with specific owner.
- S3 → moved to post-launch backlog with a 1-line note on why deferred.
- Every fix commit includes the regression test in the same commit.
- EOD recap posted to `#on-call`.

## Triage sources

- Internal smoke tests: `tests/e2e/v1-full-flow.test.ts`, `tests/integration/observability-events.test.ts`.
- Manual QA: external-reviewer walkthrough (launch-checklist item), onboarding-wizard 5-step run.
- Alerts fired during perf runs and baseline measurement.
- Grafana anomalies + on-call checklist findings.
- GitHub Issues tagged `bug` + `v1.0`.

## Open

| Ticket | Date | Sev | Area | Summary | Owner | Status |
|--------|------|-----|------|---------|-------|--------|
| —      | —    | —   | —    | (no open items at triage-window start) | — | — |

## Closed (this sprint)

| Ticket | Date | Sev | Area | Summary | Resolution |
|--------|------|-----|------|---------|-----------|
| —      | —    | —   | —    | —       | —          |

## Risk register (non-blocking)

- Scalar viewer loads from jsDelivr CDN — if CDN has an outage, `/docs/api` renders as blank container with the header. Mitigation: self-host Scalar in v1.0.1.
- `AlertLog` doesn't have a dashboard UI — on-call uses raw SQL via `oncall-checklist.md`. Mitigation: add admin page in v1.5 (noted in plan's v1.0.1 follow-ups).
- Observability `routing.decision` events increase info-level log volume — if `LOG_LEVEL` drifts back to `info` in prod, watch for pino backpressure.
