# v1.0 On-Call Checklist

Copy this checklist into your shift notes and tick as you go. Companion doc: `docs/runbooks/v1-launch.md`.

## Morning (within 1h of shift start)

- [ ] `curl $PROD/api/v1/health` returns:
  - `status: "ok"`
  - `db: "ok"`
  - `redis: "ok"`
  - `queue.pending < 100`
  - `queue.failed_last_hour < 10`
- [ ] `curl -b $ADMIN_COOKIE $PROD/api/v1/metrics/summary`:
  - `leads_received > 0` (within business hours for top-3 affiliate timezones).
  - `leads_pushed / leads_received > 0.8` — push rate sane.
  - `fraud_hit < 5% of leads_received` — fraud not runaway.
  - `broker_down_count = 0`.
  - `manual_queue_depth < 20`.
- [ ] Open alerts:
  ```sql
  SELECT "ruleKey", "severity", "triggeredAt", "message"
  FROM "AlertLog"
  WHERE "resolvedAt" IS NULL
  ORDER BY "triggeredAt" DESC;
  ```
  Investigate every open row; cross-reference `docs/runbooks/v1-launch.md`.
- [ ] Autologin SLA dashboard: last 24h ≥ 99.5%. If trending below, start triage per runbook § On autologin failure.
- [ ] `#on-call` Telegram scrollback: unresolved threads from previous shift?

## Afternoon (4–6h after morning check)

- [ ] Spot-check the 5 morning metrics.
- [ ] `SELECT COUNT(*) FROM "Lead" WHERE state='FAILED' AND "updatedAt" > NOW() - INTERVAL '4 hours';` — should stay roughly flat.
- [ ] `git log --since="this morning"` — any deploys today? If yes, verify zero new alerts in the 30-min post-deploy window.
- [ ] Run the 5-step onboarding wizard manually once a week (record duration in `docs/v1-bug-triage.md`).

## End of shift

- [ ] Resolve alerts you fixed: `UPDATE "AlertLog" SET "resolvedAt" = NOW() WHERE id = '$1';` — OR let the evaluator auto-resolve (preferred).
- [ ] Handoff note in `#on-call`: what fired, what is open, what is tentative, who's next on call.
- [ ] Add any surprising bug or regression to `docs/v1-bug-triage.md`.

## Emergency pager list

- Postgres on-call: `[PHONE]` — escalate if `pg_stat_activity` shows > 80 active connections or replica lag > 30s.
- Proxy vendor (autologin): `[EMAIL + escalation path]`.
- Founder / commercial: `[TELEGRAM @handle]` — any affiliate pause, vendor escalation, or customer-impacting outage.
- Broker vendor contacts: `docs/runbooks/broker-contacts.md`.

## Escalation ladder

1. On-call engineer: investigate + triage per runbook, 15 min budget.
2. Backup on-call: if root cause unclear after 15 min or alert severity = critical.
3. Founder / commercial: customer-visible outage > 5 min, any data integrity concern, any security incident.
4. DB on-call: any suspected Postgres or replica issue.
5. Infra on-call: any networking / egress / Redis cluster issue.
