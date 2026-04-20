# Changelog

## Unreleased (Wave 2 in progress)

### Added — W2.2 Fraud auto-reject (enforcement)
- New `LeadState.REJECTED_FRAUD` (separate from REJECTED) — set when
  computed fraud score reaches `FraudPolicy.autoRejectThreshold`.
- `Lead.needsReview: Boolean` — set when score is in the borderline
  band (`borderlineMin <= score < threshold`). Lead continues normal
  routing; surfaces in the future review queue (W2.4).
- Intake response surfaces `status: "rejected_fraud"` with
  `reason_codes: [<signal.kind>, …]` when auto-rejected. Weights are
  NOT exposed to the affiliate.
- Blacklist hard-reject semantics preserved: blacklist hit → state
  REJECTED (hard), score is still computed, but hard-reject takes
  precedence over threshold-based REJECTED_FRAUD.
- Migration `wave2_fraud_autoreject` (additive).
- UI tokens (`src/lib/tokens.ts`) include REJECTED_FRAUD
  (tone=danger, deep-red).

### Added — W2.1 Fraud score calculation
- `FraudPolicy` model (single global row) with 5 signal weights + auto-reject
  threshold + borderline min + version. Seed creates `name="global"` with
  defaults (blacklist=40, geo_mismatch=15, voip=20, dedup_hit=10,
  pattern_hit=15).
- `Lead.fraudScore: Int?` and `Lead.fraudSignals: Json` — persisted
  alongside intake writes.
- `LeadEventKind.FRAUD_SCORED` — emitted for every accepted lead with
  `{score, signals, policyVersion}`.
- Pure `computeFraudScore(signals, policy)` in
  `src/server/intake/fraud-score.ts`; signal extractor
  `buildSignals(input)` in `src/server/intake/fraud-signals.ts`.
- 30s LRU cache for policy in
  `src/server/intake/fraud-policy-cache.ts`.
- Migration `wave2_fraud_score` (additive).

### Fixed
- `broker.update` tRPC now accepts `pendingHoldMinutes` (Wave 1 field
  was in Prisma schema but missing from Zod input).
- Middleware treats `/api/v1/errors` and `/api/v1/schema/*` as public
  (affiliate-facing discovery endpoints per CLAUDE.md).

## 0.3.0 — 2026-04-20 (Wave 1: Parity gaps)

Closes two parity gaps vs Leadgreed/iREV: per-country cap budgets and
Status Pipe Pending (anti-shave hold window after broker accept).

### Added
- `CapDefinition.perCountry` + `CapCountryLimit` model — separate cap
  budgets per GEO, resolved against `lead.geo` in routing engine.
- `CapCounter.country` discriminator (`""` = TOTAL for back-compat).
- `LeadState.PENDING_HOLD` + `Lead.pendingHoldUntil` +
  `Lead.shaveSuspected` — anti-shave hold window after broker push.
- `Broker.pendingHoldMinutes` — opt-in per-broker hold duration
  (null = feature off).
- pg-boss job `resolve-pending-hold` — transitions PENDING_HOLD leads
  to ACCEPTED at hold expiry.
- `LeadEventKind` values: `PENDING_HOLD_STARTED`,
  `PENDING_HOLD_RELEASED`, `SHAVE_SUSPECTED`.
- UI: per-country cap toggle + country→limit grid in Flow editor;
  PENDING_HOLD state pill + `hold until HH:MM` countdown +
  `shave suspected` badge in Lead detail drawer.

### Migrations
- `20260420105207_wave1_cap_per_country`
- `20260420140530_wave1_pending_hold`

### Back-compat
- `CapCounter.country=""` default — existing counters keep TOTAL
  semantics.
- `Broker.pendingHoldMinutes=null` default — existing brokers unchanged.
- Postback handler on non-PENDING_HOLD leads: unchanged behaviour.

## 0.2.0 — 2026-04-20 (Design Port)

Ports the ROUTER CRM design prototype (`crm-design/project/ROUTER CRM.html`) into
the Next.js app. Visual-only release — no backend or schema changes.

### Added
- Dark graphite + light cream theme system via CSS variables in `globals.css`.
- Design primitives (`src/components/router-crm/`): Pill, StatePill, Dot, Sparkline,
  MiniBars, LeadFunnelSankey, CounterTile, Card, Field, Select, CodeBlock, TabStrip.
- Shell with 220px sidebar (kbd nav hints D/L/A/B/R/K/U/G, user chip, queue counter)
  + 46px topbar (live intake rate, theme toggle).
- Dashboard: 4 counter tiles, full-width Sankey, broker performance table, top geos
  stacked bars (backed by new tRPC queries `lead.funnelCounts`, `lead.brokerPerformance`,
  `lead.topGeos`).
- Leads grid (9 columns, new-row highlight animation) + right-anchored 540px drawer
  with timeline / payload / broker / postbacks tabs.
- Restyled affiliates / brokers / routing / blacklist / users / audit pages.

### Changed
- All dashboard routes now under `/dashboard/*` (matches sidebar hrefs).
- Login page restyled with ROUTER logo + tokens.

## 0.1.0 — 2026-04-19 (MVP)

First shippable build. Local-only. See `../docs/superpowers/specs/2026-04-19-gambchamp-mvp-v0.1-design.md` for the design.

### Added
- Public intake API (`POST /api/v1/leads`) with Bearer API-key auth, zod validation, E.164 phone normalization, idempotency key, rate limit (120/min + burst 30 per key, 30/min per IP).
- Routing engine: GEO-scoped priority-ordered broker pool, atomic daily caps per affiliate and per broker, working-hours filter.
- Generic HTTP broker adapter: field mapping, static payload, 5 auth schemes (none/bearer/basic/api-key-header/api-key-query), JSONPath response id extraction, 3x exponential-backoff retry on 5xx.
- Inbound postback handler (`POST /api/v1/postbacks/[brokerId]`) with HMAC verification, status mapping, FTD/ACCEPTED/DECLINED transitions.
- Outbound postback system: `notify-affiliate` job with URL macro templating, optional HMAC, 3x retry, full `OutboundPostback` audit.
- Anti-fraud layer: IP (CIDR + exact) / email domain / phone E.164 blacklists, 7-day dedup by phone/email hash, async numverify VOIP check (mocked when key absent).
- 2-role RBAC (ADMIN/OPERATOR) via NextAuth JWT claim.
- 12-screen admin UI: dashboard counters, leads grid + detail with timeline, affiliates with postback tab, brokers with JSON editors + Test Send, rotation priority list, blacklist 4-tab CRUD, user management, audit log.
- Observability: pino logger, trace_id via AsyncLocalStorage, `/api/v1/health` liveness probe.
- Tests: unit (~80% on routing/antifraud), integration (intake, routing, inbound postback, outbound postback, auth, ratelimit, caps), e2e (happy path + edge cases).

### Known limitations (v0.2 work)
- Autologin pipeline (EPIC-08) not implemented.
- UAD / re-injection (EPIC-09): `no_broker_available` is terminal.
- Analytics dashboard limited to 4 counter tiles.
- Telegram notifications (EPIC-11): no bot.
- Finance / P&L / CRG (EPIC-12): none.
- Onboarding wizard (EPIC-13): not implemented.
- OpenAPI docs autogeneration.
- Flow versioning (draft/publish).
- Broker clone UI convenience.
- Per-column permissions.
- Load + pentest testing.
