# GambChamp CRM

Lead-distribution platform for the crypto / forex affiliate vertical. Affiliates submit leads over a REST API; the routing engine assigns each lead to a broker by GEO / priority / caps / fraud score; broker postbacks drive the lead lifecycle; outbound postbacks + Telegram events fan out to affiliates and operators.

**Production:** <https://crm-node.fly.dev>

## Canonical documents

| Intent | File |
|--------|------|
| **Program state — what shipped, what's pending** | [`docs/superpowers/READINESS_CHECKLIST.md`](docs/superpowers/READINESS_CHECKLIST.md) |
| Per-subsystem working notes (always current) | [`CLAUDE.md`](CLAUDE.md) |
| Release history | [`CHANGELOG.md`](CHANGELOG.md) |
| Multi-version roadmap (v1.0 → v2.5) | [`docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md`](docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md) |
| Per-sprint implementation plans | [`docs/superpowers/plans/`](docs/superpowers/plans/) |
| Client-facing guide (Russian) | [`CLIENT_GUIDE.md`](CLIENT_GUIDE.md) |
| v1.0 launch checklist (frozen snapshot) | [`docs/v1-launch-checklist.md`](docs/v1-launch-checklist.md) |
| v1.5 parking lot (deferred items) | [`docs/v1-5-parking-lot.md`](docs/v1-5-parking-lot.md) |
| Operational runbooks | [`docs/runbooks/`](docs/runbooks/) |
| Perf baselines | [`docs/perf/`](docs/perf/) |
| Security checklist | [`docs/security/`](docs/security/) |
| API reference (Scalar-rendered OpenAPI) | [`docs/api/`](docs/api/) + <https://crm-node.fly.dev/docs/api> |

## Local dev

```bash
corepack enable
pnpm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# paste into AUTH_SECRET (or NEXTAUTH_SECRET)

pnpm db:up            # Postgres + Redis via docker-compose
pnpm db:migrate       # apply Prisma migrations
pnpm db:seed          # admin@gambchamp.local / changeme + super@gambchamp.local / supersuper

# Terminal 1
pnpm dev              # Next.js on :3000

# Terminal 2
pnpm worker           # pg-boss consumer (push-lead, autologin, analytics-roll, crons)
```

## Before declaring a task done

```bash
pnpm typecheck
pnpm lint
pnpm test              # if logic changed
```

## Stack

- **Runtime:** Next.js 15 App Router + tRPC v11 + NextAuth v5 (JWT / Credentials / super-admin)
- **DB:** Postgres 16 via Prisma 5 — 54 models, 12 migrations
- **Queue:** pg-boss on the same Postgres
- **Cache / rate-limit / counters:** Redis 7 via ioredis
- **Tests:** Vitest (unit + integration + e2e, 800+ tests)
- **Lint / format:** Biome
- **Deploy:** Fly.io (`fly.toml`)

## Public REST (v1)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/leads` | `Authorization: Bearer <api_key>` (+ `X-API-Version`) | Single-lead intake |
| POST | `/api/v1/leads/bulk` | same | 1–N leads (sync ≤50, async >50); returns job id |
| GET  | `/api/v1/leads/bulk/{jobId}` | same | Async bulk status |
| GET  | `/api/v1/schema/leads?version=…` | none | Versioned intake schema |
| POST | `/api/v1/postbacks/{brokerId}` | `X-Signature: hmac_sha256` | Broker status callback |
| GET  | `/api/v1/autologin/attempts` | session / api-key | Autologin attempt ledger |
| GET  | `/api/v1/autologin/sla` | session / api-key | Autologin uptime + p50/p95 |
| GET  | `/api/v1/analytics/export?query=…` | session | CSV export per drill-down |
| POST | `/api/v1/analytics/share` | session | Mint a share token (30d) |
| GET  | `/api/v1/analytics/share/{token}` | token | Public share viewer |
| GET  | `/api/v1/health` | none | Liveness + version + DB/Redis/queue |
| GET  | `/api/v1/metrics/summary` | admin | 60s rolling counters |
| POST | `/api/stripe/webhook` | Stripe signature | Subscription lifecycle (v2.0) |

See the full surface (incl. routing, manual-review, billing, super-admin, status-mapping, scheduled-changes, finance) in [`docs/api/README.md`](docs/api/README.md) or the live Scalar viewer at `/docs/api`.

## Domain glossary

- **Affiliate** — lead source. Has API keys (IP-scoped, TTL-scoped) + intake settings + outbound-webhook + payout rules.
- **Broker** — lead destination. Configured from a template (endpoint, field mapping, auth, postback semantics, retry ladder, pending-hold window, autologin config).
- **Flow / FlowVersion** — visual-rule-builder graph that replaces `RotationRule` — nodes for algorithm, constraints, caps, branches, fallback; published version is live, drafts autosave.
- **Daily / hourly cap** — atomic Postgres upsert counter per `(scope, scopeId, bucket, country?)`.
- **Fraud score** — 0..100 composite of blacklist / dedup / VOIP / phone-vs-geo / velocity signals, policy-weighted; ≥ `autoRejectThreshold` auto-rejects.
- **Pending hold** — opt-in per broker — lead sits in `PENDING_HOLD` for N minutes; a DECLINED postback inside that window flags `shaveSuspected`.
- **Manual review queue** — cold-overflow destination for rejected leads (broker-failed / cap-reached / fraud-borderline / no-broker-match).
- **Tenant** — white-label unit (slug + domains + theme + featureFlags + `adminAllowedIps`); scoped across 21 tables; enforced via `withTenant(tenantId, fn)` AsyncLocalStorage + Prisma `$use` middleware.
- **Subscription plan** — Trial / Starter / Growth / Pro; Stripe-backed; `enforceQuota()` gates single-lead intake at `/api/v1/leads`.
- **Telegram event** — one of 28 catalogued types (lead, broker, operational, finance, subscription); fan-out via `emitTelegramEvent` → `pg-boss` → grammy.

## Deploy

```bash
fly deploy             # Dockerfile-driven; docker-entrypoint.js runs migrations on boot
fly logs               # tail
curl https://crm-node.fly.dev/api/v1/health
```

## Contributing

1. Start from [`docs/superpowers/READINESS_CHECKLIST.md`](docs/superpowers/READINESS_CHECKLIST.md) to pick the next sprint.
2. Expand any sprint-level plan under `docs/superpowers/plans/` into a step-level plan with the `superpowers:writing-plans` skill before coding.
3. Follow the conventions in [`CLAUDE.md`](CLAUDE.md) (imports, mutations invalidating queries, server-only boundaries, protectedProcedure context).
4. `typecheck` + `lint` + `test` green before commit; flip the appropriate `[ ]` → `[x]` in `READINESS_CHECKLIST.md` in the same release commit.
