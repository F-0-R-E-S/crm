# v1.0 Launch Runbook

**Audience:** on-call engineer during v1.0 GA and the first 30 days post-launch.
**Scope:** the five failure modes with corresponding alert rules in `src/server/alerts/rules.ts`.
**Paired with:** `docs/runbooks/oncall-checklist.md` (morning/afternoon/EOD).

Production defaults (set during S8 perf baseline — see `docs/perf/v1-baseline.md`):
- `DATABASE_URL?connection_limit=40`
- `LOG_LEVEL=warn`
- `AUDIT_HASH_CHAIN_SECRET` required
- `pg-boss` `newJobCheckIntervalSeconds=1`
- Node `--max-old-space-size=2048`

---

## On intake degradation

- **Symptom:** alert `intake_failure_rate` (critical) fires, or `/api/v1/health` returns 503. Dashboards show `leads_received` flat while `leads_pushed/received` ratio collapses. Affiliates report 5xx in their webhook logs.
- **Confirm:**
  - `curl $PROD/api/v1/health` — expect `status=ok`, `db=ok`, `redis=ok`, `queue.pending < 100`.
  - `curl -b $ADMIN_COOKIE $PROD/api/v1/metrics/summary` — look at `leads_received`, `leads_pushed`, `fraud_hit`.
  - `SELECT "ruleKey", "severity", "message", "triggeredAt" FROM "AlertLog" WHERE "resolvedAt" IS NULL ORDER BY "triggeredAt" DESC;`
- **Triage:**
  1. Postgres saturated? `SELECT state, count(*) FROM pg_stat_activity GROUP BY 1;` — if active > 80, raise `DATABASE_URL?connection_limit` or scale the app horizontally.
  2. Redis? `PING` via `redis-cli`, check WRR contention: `redis-cli slowlog GET 10`.
  3. Per-affiliate skew? `SELECT "affiliateId", count(*) FROM "Lead" WHERE "createdAt" > NOW() - INTERVAL '5 min' GROUP BY 1 ORDER BY 2 DESC;` — pause a noisy affiliate via `UPDATE "Affiliate" SET "isActive"=false WHERE id=$1`.
  4. Recent deploy? `git log --since="30 min ago"` — if a log-cost regression slipped, set `LOG_LEVEL=warn` temporarily.
  5. Schema drift? `GET /api/v1/schema/leads?version=<reported>` — if affiliates are sending an old version, update their integration or widen the compat schema.
- **Rollback / Mitigation:**
  - Revert suspicious commit: `git revert $SHA && pnpm deploy`.
  - Emergency brake: scale intake replicas down to reduce DB contention; pg-boss backlog will drain once the root cause clears.
- **Escalate:** DB on-call if pg_stat_activity shows persistent saturation or replica lag > 30s; founder for customer-visible outage > 5 min.

---

## On broker-down

- **Symptom:** alert `broker_down_prolonged` (critical) fires. `/api/v1/metrics/summary` shows `broker_down_count > 0`. Affiliates may receive intake 2xx but leads stay in `PUSH_FAILED` in their dashboard.
- **Confirm:**
  - `SELECT id, name, "lastHealthStatus", "lastHealthCheckAt" FROM "Broker" WHERE "lastHealthStatus" != 'UP';`
  - `SELECT count(*), "kind" FROM "LeadEvent" WHERE "createdAt" > NOW() - INTERVAL '10 min' AND "kind" IN ('BROKER_PUSH_FAIL','BROKER_PUSH_ATTEMPT') GROUP BY 2;`
- **Triage:**
  1. One broker vs many? If many → network egress issue. `curl -s https://httpbin.org/ip` from the node host.
  2. Single broker timeout → vendor side. Check broker's status page + tail `"BrokerErrorSample"` for recent 5xx bodies.
  3. Endpoint changed? Compare `"Broker"."endpointUrl"` against vendor docs.
  4. Temporary pause:
     ```sql
     UPDATE "FlowBranch" SET "filters" = '{"_temporary_muted": true}'::jsonb WHERE id = $1;
     -- OR kill all traffic: set Broker.isActive = false and let routing engine auto-fallback.
     ```
- **Rollback / Mitigation:** none required (traffic re-routes on next decision). Resume: `UPDATE "Broker" SET "isActive"=true WHERE id=$1`.
- **Escalate:** vendor contact from `docs/runbooks/broker-contacts.md`; founder if multiple vendors fail simultaneously.

---

## On queue backup

- **Symptom:** alert `manual_queue_depth` (warning) fires OR `/health.queue.pending > 1000`. Fresh leads not reaching brokers within SLA.
- **Confirm:** `SELECT name, state, count(*) FROM pgboss.job GROUP BY 1,2 ORDER BY 3 DESC;`
- **Triage:**
  1. Worker count mismatch? `ps aux | grep -E 'next|node' | grep -v grep` — expect the worker process alongside app.
  2. Single-job retry loop? `SELECT name, count(*) FROM pgboss.job WHERE state='retry' GROUP BY 1 ORDER BY 2 DESC;` — if one job name dominates, inspect its error output: `SELECT output FROM pgboss.job WHERE name=$1 AND state='retry' ORDER BY "created_on" DESC LIMIT 5;`.
  3. Poisoned job? Manually mark failed: `UPDATE pgboss.job SET state='failed' WHERE retry_count > 5 AND state='retry';`.
  4. Scale horizontally: run an additional worker replica.
- **Rollback / Mitigation:** none required.
- **Escalate:** founder + DB on-call if queue > 10k AND draining slower than 500/min.

---

## On autologin failure

- **Symptom:** alert `autologin_sla_breach` (warning). Affiliates report sessions not available after push. Autologin dashboard shows uptime < 99.5%.
- **Confirm:** `SELECT count(*), status FROM "AutologinAttempt" WHERE "createdAt" > NOW() - INTERVAL '1 hour' GROUP BY 2;`
- **Triage:**
  1. Proxy pool exhausted? `SELECT count(*), status FROM "ProxyEndpoint" GROUP BY 2;` — rotate the proxy provider env (`SEED_PROXY_USER`, `SEED_PROXY_PASS`) and restart the worker.
  2. Captcha detection spike? Temporarily disable autologin for the affected broker: `UPDATE "Broker" SET "autologinEnabled"=false WHERE id=$1;` — schedule re-enable after 30 min.
  3. Session-cookie extraction broke? Inspect raw response captured in `"AutologinAttempt"."errorMessage"` — push selector fix to `src/server/autologin/extract.ts`.
- **Rollback / Mitigation:** redeploy the last-known-good autologin worker image.
- **Escalate:** proxy vendor + founder.

---

## On fraud spike

- **Symptom:** `fraud_hit` counter jumps >100 in 60 s; support sees legitimate leads marked `REJECTED_FRAUD`.
- **Confirm:**
  - `SELECT count(*), "fraudScore" FROM "Lead" WHERE "createdAt" > NOW() - INTERVAL '10 min' GROUP BY 2 ORDER BY 2 DESC;`
  - `SELECT "affiliateId", count(*) FROM "Lead" WHERE "state"='REJECTED_FRAUD' AND "createdAt" > NOW() - INTERVAL '10 min' GROUP BY 1 ORDER BY 2 DESC;`
- **Triage:**
  1. Per-affiliate concentration → pause that affiliate; check sub-ID quality.
  2. Misflag → temporarily reduce `FraudPolicy.autoRejectThreshold` by 10 points; manually review top-50 rejects via `/dashboard/manual-review`.
  3. Recent blacklist bulk import? `DELETE FROM "Blacklist" WHERE "createdAt" > NOW() - INTERVAL '1 hour' AND "source"='bulk-import';` (replace with the actual offending source).
  4. Policy edit? `AuditLog` → find the last `FraudPolicy` update; revert via Prisma Studio or dashboard.
- **Rollback / Mitigation:** revert the policy change; cold restart the policy cache via a bump to `FraudPolicy.updatedAt`.
- **Escalate:** founder + compliance owner.

---

## Emergency contacts (fill in for GA)

- Postgres on-call: `[PHONE]`
- Proxy vendor (autologin): `[EMAIL + escalation path]`
- Founder / commercial: `[TELEGRAM @handle]`
- Broker vendor contacts: `docs/runbooks/broker-contacts.md`
- Redis / infra on-call: `[PHONE]`

---

## v1.5 additions

### Status-mapping backfill stuck or slow

- **Symptom:** an operator kicks `statusMapping.backfillLeads({brokerId})` from `/dashboard/brokers/:id/status-mapping` and it appears to hang. Telegram `STATUS_MAPPING_BACKFILL_PROGRESS` events are not arriving, or stop arriving mid-run.
- **Confirm:**
  - Backfill is an inline tRPC mutation — it holds the request open until complete. A browser timing out at 60 s does not mean the backfill failed; `SELECT count(*) FROM "Lead" WHERE "brokerId"=$1 AND "canonicalStatus" IS NOT NULL` should advance.
  - `SELECT * FROM "AuditLog" WHERE action='status_mapping.backfill' ORDER BY "createdAt" DESC LIMIT 5;` — the terminal row has `diff.updated` + `diff.unmapped` counts.
- **Triage:**
  1. If total lead count for the broker is > 500k, the inline backfill can exceed 30 s. Acceptable — re-kick from a shell-level tRPC call and let it run.
  2. Telegram events silent? Check `TelegramEventLog` for `STATUS_MAPPING_BACKFILL_PROGRESS` rows and the subscription set — new event, admins are **not** auto-subscribed. Operators must `/sub STATUS_MAPPING_BACKFILL_PROGRESS` in Telegram once.
  3. `updateMany` long-running? Check `pg_stat_activity` — the backfill runs one `updateMany` per mapping. Adding an index on `(brokerId, lastBrokerStatus)` helps; already in place as `@@index([brokerId, lastBrokerStatus])` on `Lead`.
- **Mitigation:** backfill is idempotent — safe to re-run. Each run overwrites `Lead.canonicalStatus` based on the current `StatusMapping` rows.

### Scheduled-change apply failure

- **Symptom:** alert `SCHEDULED_CHANGE_FAILED` fires in Telegram; a row in `ScheduledChange` sits in `FAILED` status beyond its target `applyAt`.
- **Confirm:**
  - `SELECT id, "entityType", "entityId", status, "errorMessage", "applyAt", "latencyMs" FROM "ScheduledChange" WHERE status='FAILED' ORDER BY "applyAt" DESC LIMIT 20;`
  - The `errorMessage` column carries the Prisma / validation failure.
- **Triage:**
  1. `errorMessage LIKE '[VALIDATION]%'` — operator submitted an out-of-allowlist field. No runtime concern; show the offender in the admin UI and let them fix.
  2. `errorMessage LIKE '[ENTITY_NOT_FOUND]%'` — the target row was deleted between schedule and apply. Safe to cancel.
  3. Apply-time DB error (FK, unique constraint) — re-check the patch against the current state via the admin dialog's "baseline drift" view; in v1.5 the policy is last-write-wins (no 3-way merge — v2.0).
- **Mitigation:** `/dashboard/settings/scheduled-changes` → Retry. If retry is not safe, Cancel and re-schedule manually. Cron retries only PENDING rows.

### Preset ownership (per-user) + share-link cleanup

- `AnalyticsPreset` rows are owned per user (`AnalyticsPreset.userId`); no org-level shared presets in v1.5 (deferred to v2.0 — see parking lot). If a departed user's presets must be migrated, `UPDATE "AnalyticsPreset" SET "userId"=$new WHERE "userId"=$old;` is safe.
- Share links — `DELETE /api/v1/analytics/share` (admin) purges expired `AnalyticsShareLink` rows. Wire into a daily cron if the table grows past ~5k rows.

### canonicalStatus mapping-gap / `unmapped` sentinel

- **Symptom:** `/dashboard/brokers/:id/status-mapping` coverage tile shows < 95 %, or analytics canonical-status breakdown contains a large `'unmapped'` bucket.
- **Confirm:**
  - `statusMapping.coverageForBroker({brokerId})` returns `{mappedVolume, unmappedVolume, totalVolume, coveragePct}` over the last 30 days.
  - Raw statuses that have been seen but not mapped: `statusMapping.observedRawStatuses({brokerId})` returns them ordered by frequency.
- **Triage:**
  1. Use the UI's "Apply suggested" button to bulk-accept Levenshtein-suggested mappings (code+label similarity, score threshold 0.6 by default).
  2. After mapping, click "Remap existing leads" to trigger the inline backfill (emits `STATUS_MAPPING_BACKFILL_PROGRESS` Telegram events).
  3. Mapping cache is 30 s LRU per broker — new mappings take effect within that window for the postback hot-path.
- **Mitigation:** `'unmapped'` is a *valid* canonical value — it means "seen but uncategorized". Analytics drill-down surfaces the raw statuses feeding into the unmapped bucket.

