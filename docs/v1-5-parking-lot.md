# v1.5 Parking Lot

Items surfaced during v1.5.0 sprints (S1 → S5) that were not closed before tag. Each is classified by target version and justification. Reviewed at the S1.5-5 release gate; nothing here blocks v1.5.0.

## From S1.5-1 (BI Report Builder polish)

### Google Sheets export — target **v2.0**

- **Why parked:** `googleapis` adds ~3 MB to the bundle + requires an OAuth consent flow and per-user token storage. Plan §S1.5-1 listed this as "first-drop candidate". Deferred as planned.
- **Reopen trigger:** customer demand > 5 requests / month, OR a lighter-weight CSV-to-Sheets bridge (webhook-based) emerges.

### Org-level shared analytics presets — target **v2.0**

- **Why parked:** preset ownership is per-user today (`AnalyticsPreset.userId`). Cross-user sharing is covered by the tokenized share-link (`AnalyticsShareLink`), which is read-only. Writing a "share a preset with the whole org so they can edit it" path needs a permissions model (admin-only? all in org? custom ACL?) that aligns with the v2.0 white-label tenancy story.
- **Reopen trigger:** v2.0 tenant-scoped RBAC design lands.

## From S1.5-2 (Visual Rule-Builder residuals)

### Live in-canvas preview widget (Task D from plan) — target **v1.5.1** or **v2.0**

- **Why parked:** the existing `/dashboard/routing/flows/:id/simulator` page is one click from the editor header. Embedding a client-side N-lead sim would duplicate engine logic for marginal UX gain.
- **Reopen trigger:** usage telemetry shows operators want the histogram in-canvas, OR a second customer asks.

### Custom predicate full expression language — target **v2.0**

- **Why parked:** v1.5 ships a closed vocabulary (`geo-in`, `cap-reached`, `fraud-score >=`, `time-of-day`, `day-of-week`, `custom-regex-on-field`). A full expression language (JS subset / CEL) is a security-review item and plan §S1.5-2 explicitly defers it.
- **Reopen trigger:** v2.0 design pass.

### Accessibility fallback for drag+drop editor — target **v2.0**

- **Why parked:** plan §S1.5-2 open question 4 — not a launch blocker. Screen-reader users cannot currently author flows via the visual editor; they can still author via the tRPC `flow.updateDraftGraph` with hand-assembled JSON.
- **Reopen trigger:** a customer formally requests WCAG 2.1 AA for this screen.

## From S1.5-3 (Broker Clone + Delayed Actions)

### Per-entity "Schedule change" wizard — target **v1.5.1**

- **Why parked:** admin list at `/dashboard/settings/scheduled-changes` lets operators manage changes today. Per-entity wizards on each Flow / Broker / Cap edit page are UX sugar — < 1 day of work each but three surfaces to touch.
- **Reopen trigger:** operator ticket count on the settings page > 10/month.

### Baseline-drift 3-way merge — target **v2.0**

- **Why parked:** plan §S1.5-3 open question 5. v1.5 ships last-write-wins. A 3-way merge needs UI + concurrency model + conflict markers.
- **Reopen trigger:** first production incident where a concurrent edit corrupted a scheduled change.

### Auto-subscribe admins to the new Telegram events — target **v1.5.1**

- **Why parked:** `SCHEDULED_CHANGE_APPLIED` / `SCHEDULED_CHANGE_FAILED` / `STATUS_MAPPING_BACKFILL_PROGRESS` are not in the default admin subscription set. Admins must `/sub <EVENT>` once from Telegram.
- **Reopen trigger:** first on-call rotation where an admin misses a failure event. Fix is a one-line seed update.

## From S1.5-4 (Status Groups + Q-Leads trend)

### Materialized-view canonical rollup — **CLOSED in S1.5-5**

- **Was:** `LeadDailyRoll.canonicalStatus` column existed but rollup refresh wrote NULL; `canonicalStatusBreakdown` read from `Lead` directly.
- **Now:** S1.5-5 extended the daily rollup to group by `canonicalStatus` (new unique tuple includes it); breakdown reads from the rollup with a same-day `Lead` fallback. Commit `ab3bcfc`.

### Telegram `STATUS_MAPPING_BACKFILL_PROGRESS` event — **CLOSED in S1.5-5**

- **Was:** backfill runs inline, no progress visibility in Telegram.
- **Now:** registered as a new `TelegramEventType`, template `status-mapping-backfill-progress.ts`, emitted from `statusMapping.backfillLeads` at start / every 10k rows / finish. Commit `ab3bcfc`.

### Auto-classify "unmapped" bucket into Telegram alert — target **v1.5.1**

- **Why parked:** when a never-seen raw status appears, it's bucketed into `'unmapped'` silently (seed data demonstrates this). Plan §S1.5-4 open question 2 proposed a Telegram alert on first appearance. Not critical — the status-mapping page surfaces unmapped raws with frequency counts.
- **Reopen trigger:** operator asks for real-time notification, OR `'unmapped'` crosses 5% of broker volume.

## General / cross-sprint

### `telegram-events-wired.test.ts` flakiness — target **v1.5.1** (observe)

- **Why parked:** passes reliably in isolation; occasionally fails in full-suite runs on slow CI machines. Known pre-existing condition (see CLAUDE.md Known gotchas). Not a correctness issue.
- **Reopen trigger:** flake rate > 10% across three CI runs.

### `push-lead.ts` wire into Flow engine — target **v2.0**

- **Why parked:** `push-lead.ts` still consumes `RotationRule`-derived pools via `select-broker.ts`. The v1.5 Visual Rule-Builder writes to `FlowVersion.graph` but the runtime path didn't switch — v1.5 invariant #1 ("nothing in v1.5 changes routing runtime behaviour"). This is deliberate.
- **Reopen trigger:** v2.0 roadmap item "retire RotationRule".

---

## Closure summary

| Count | Status |
|---:|:---|
| 2 | Closed in S1.5-5 |
| 4 | Targeted v1.5.1 |
| 5 | Targeted v2.0 |
| 1 | Observe (flakiness) |

Total: 12 items, zero launch blockers for v1.5.0.
