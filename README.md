# GambChamp CRM — MVP v0.1

Lead distribution platform. Takes leads from affiliates, routes to brokers by GEO/priority/cap, tracks their lifecycle via inbound postbacks, notifies affiliate trackers via outbound postbacks.

See design spec: `../docs/superpowers/specs/2026-04-19-gambchamp-mvp-v0.1-design.md`.
Implementation plan: `../docs/superpowers/plans/2026-04-19-gambchamp-mvp-v0.1-plan.md`.

## Local dev

```bash
corepack enable
pnpm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste into AUTH_SECRET

pnpm db:up            # Postgres + Redis via docker-compose
pnpm db:migrate       # apply Prisma migrations
pnpm db:seed          # admin@gambchamp.local / changeme + test affiliate/broker/rotation

# Terminal 1:
pnpm dev              # Next.js on :3000

# Terminal 2:
pnpm worker           # pg-boss consumer (push-lead, notify-affiliate, voip-check)
```

## Public API (v1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/leads` | `Authorization: Bearer <api_key>` | Submit a lead |
| POST | `/api/v1/postbacks/{brokerId}` | `X-Signature: <hmac_sha256>` | Broker pushes status update |
| GET | `/api/v1/health` | none | Liveness probe |

### Intake payload

```json
{
  "external_lead_id": "aff-12345",
  "first_name": "Ivan",
  "last_name": "Petrenko",
  "email": "ivan@example.com",
  "phone": "+380671234567",
  "geo": "UA",
  "ip": "1.2.3.4",
  "landing_url": "https://landing.example.com",
  "sub_id": "click-abc",
  "utm": { "source": "fb", "medium": "cpc" },
  "event_ts": "2026-04-19T12:00:00Z"
}
```

At least one of `email`/`phone` required. Accepts `X-Idempotency-Key` header for safe retries (24h TTL).

### Intake response

```json
{
  "lead_id": "cuid…",
  "status": "received" | "rejected",
  "reject_reason": null | "ip_blocked" | "duplicate" | ...,
  "trace_id": "nanoid",
  "received_at": "2026-04-19T12:00:00.123Z"
}
```

## Domain glossary

- **Affiliate** — lead source. Has API keys and subscribes to outbound postback events.
- **Broker** — lead destination. Configured with a generic HTTP template (endpoint, field mapping, auth).
- **Rotation rule** — `(GEO, broker, priority, active)`. Brokers form a priority-ordered **pool** per GEO. No primary/fallback — the worker polls sequentially until one accepts capacity.
- **Daily cap** — atomic counter per `(scope, scopeId, day)`. Applied to affiliates (intake-time) and brokers (routing-time).
- **Outbound postback** — HTTP GET to the affiliate's tracker with `{sub_id}/{status}/{payout}/…` macros. Triggered on state transitions the affiliate subscribes to.

## Stack

- **Runtime:** Next.js 15 (App Router) + tRPC v11 + NextAuth v5 (JWT + Credentials)
- **DB:** Postgres 16 via Prisma 5
- **Queue:** pg-boss (same Postgres)
- **Cache / rate limit:** Redis 7 via ioredis
- **Tests:** Vitest (unit + integration + e2e)
- **Lint:** Biome
