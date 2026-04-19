# Changelog

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
