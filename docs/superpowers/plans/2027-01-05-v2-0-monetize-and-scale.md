# v2.0 — Monetize & Scale (6-sprint implementation plan)

> **For agentic workers:** this is a sprint-level plan, not a per-step TDD plan. Each sprint is sized for one developer + Claude over ~2 weeks. Use `superpowers:writing-plans` to expand any sprint into a step-level plan before execution. A companion v1.5 plan (Analytics & Ops ergonomics, ≈Dec 2026) must have shipped before this plan can be executed; if v1.5 slips, v2.0 dates slip proportionally.

**Goal:** ship v2.0 of GambChamp CRM — the "Monetize & Scale" capability layer. Turn the single-tenant product from v1.0/v1.5 into a white-label multi-tenant platform with subscription billing, finance-grade CRG/back-to-back invoicing, compliance hardening (2FA / SSO / audit / anomaly detection), and a Telegram Mini App for ops.

**Start date:** 2027-01-05 (Mon, W1 of v2.0 cycle).
**Target GA:** 2027-04-02 (end of W12).
**Duration:** 12 weeks = 6 × 2-week sprints.

**Architecture principles for v2.0:**
- **No architectural rewrites.** Activate the `tenantId` column that v1.0 S1 added as nullable forward-compat; do not reshape any existing table.
- **Middleware-first isolation.** Tenant resolution happens once at request ingress (Next.js `middleware.ts`); downstream code reads `ctx.tenantId` and never passes it explicitly across service boundaries.
- **Default-deny by default.** Every Prisma query that touches a tenant-scoped table must filter by `tenantId`; enforce via a Prisma middleware + integration pentest.
- **Additive schema changes only.** New tables (`Tenant`, `Subscription`, `Chargeback`, `FxRate`, …) live alongside existing ones; existing rows get backfilled to a synthetic `default` tenant.
- **Stripe is the billing backbone.** We do not build our own subscription lifecycle — Stripe owns state, we mirror it.

**Tech stack (unchanged from v1.0):** Next.js 15 App Router, tRPC v11, Prisma 5 (Postgres), NextAuth v5, ioredis, Vitest.
**New dependencies introduced in v2.0:** `stripe`, `@stripe/stripe-js`, `next-auth/providers/saml` (Auth.js SAML), `passport-saml` or `@node-saml/node-saml` for SAML metadata, `ipaddr.js` (admin IP CIDR), `qrcode` + `otplib` (2FA), `@twa-dev/sdk` (Telegram Web App client), a lightweight FX-rates package (e.g. direct fetch of exchangerate.host — no paid API).

**Spec:** `docs/superpowers/specs/2026-04-20-multi-version-roadmap-design.md`, §6 (v2.0 scope), §8 (competitive wedges), §10 (success criteria).

**Sprint map at a glance:**

| Sprint | Weeks | Focus | Headline deliverable |
|---|---|---|---|
| **S2.0-1** | W1–2 | White-Label Foundation | `Tenant` model live; `tenantId` activated across all scoped tables |
| **S2.0-2** | W3–4 | Tenant Routing + Branding + Isolation | 3-domain pattern; per-tenant branding; pentest 0-critical |
| **S2.0-3** | W5–6 | Subscription Billing | Stripe integration; 3 plans; plan-gating live |
| **S2.0-4** | W7–8 | CRG Full + Back-to-back Polish | Multi-currency; partial payments; chargebacks; pro-rata matching |
| **S2.0-5** | W9–10 | Compliance Hardening | 2FA + SSO (SAML + Google) + audit UI + anomaly + admin IP CIDR |
| **S2.0-6** | W11–12 | Telegram Mini App + Release | Mini App with 5 ops; pentest report; tag `v2.0.0` |

**Cross-version dependencies:**
- `tenantId` columns were added (nullable, unindexed-on-filters, unenforced) in **v1.0 Sprint 1** as cheap forward-compat — see `docs/superpowers/plans/2026-04-21-v1-sprint-1-wave1-merge-and-hardening.md` Task 7. v2.0 S2.0-1 is the **activation** sprint: backfill, require on insert, enforce on query. This two-step split (cheap column add in S1 → activation 9 months later) is the single most important sequencing decision of v2.0; it means the 10k+ rows already in production do not require a schema-rewriting migration under load — just a backfill.
- v1.0 S6 introduced finance-side `BrokerInvoice` / `AffiliateInvoice` (single-currency, single-invoice, full-payment only). v2.0 S2.0-4 generalizes them with multi-currency, partial payments, chargebacks, and many-to-many matching. **No rename, no rewrite** — fields are added, not reshaped.
- v1.0 S5 Telegram ops bot ships the 20+ event catalog and command bot (`/stats`, `/ack`, `/pause_broker`, `/resume_broker`) — **reused by** v2.0 S2.0-5 (anomaly alerts) and S2.0-6 (Mini App deep-linking). Same bot, same token, same event bus.
- v1.5 delivered the analytics event schema and the visual rule-builder; both remain unchanged in v2.0 — no migration work required. (If v1.5 added any new `Flow`-adjacent tables, the S2.0-1 table audit catches them.)
- Audit hash-chain (`src/server/audit/hash-chain.ts`) from v1.0 carries forward into S2.0-5 audit UI unchanged; only the verifier rendering is new.
- v1.0 S1 `ApiKey.allowedIps` CIDR matcher (from `src/server/intake/check-ip.ts`) is reused — byte-for-byte — for `Tenant.adminAllowedIps` enforcement in S2.0-5.

**Preflight (before S2.0-1 kickoff):**
- v1.5 tag `v1.5.0` shipped to production; `main` is clean.
- `Tenant` model does **not** yet exist; `tenantId` exists only as nullable columns on the 6 tables listed in v1.0 S1 (`Affiliate`, `Broker`, `ApiKey`, `Lead`, `User`, `BrokerTemplate`).
- Stripe test-mode account provisioned; API keys added to `.env.local` as `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Stripe CLI (`stripe`) installed locally for webhook fixture capture.
- `crm-design/project/src/` contains prototypes for: Tenant admin, Billing pages, Telegram Mini App layout (per spec §11). If missing, pause v2.0 kickoff and schedule 2 days of design work — do not build UI from ad-hoc sketches.
- Staging DNS — `*.gambchamp-staging.io` wildcard A-record + TLS wildcard cert — provisioned. Without this, the 3-domain pattern in S2.0-2 cannot be smoke-tested.
- Load-test baseline captured on v1.5: record intake p95 + dashboard TTFB so that S2.0-6 can compare post-multi-tenancy performance against pre-multi-tenancy numbers. Accept ≤ 15% regression; anything worse blocks GA.

---

## Sprint S2.0-1 — White-Label Foundation

**Dates:** 2027-01-05 → 2027-01-16 (W1–W2).
**Focus:** activate the latent `tenantId` columns. Make them required on inserts, default-deny on queries, and context-carried across the entire request lifecycle. Zero UX-visible changes — this sprint is pure plumbing.

### Deliverables

- **`Tenant` model live in production.**
  - Fields: `id`, `slug` (URL-safe short id, e.g. `acme`), `name`, `displayName`, `domains` (`String[]`), `theme` (`Json`), `featureFlags` (`Json`), `status` (`ACTIVE` | `SUSPENDED` | `ARCHIVED`), `createdAt`, `updatedAt`.
  - Single `default` row seeded; all existing rows across the 6 pre-columned tables backfilled to `default.id`.
  - Acceptance: `SELECT COUNT(*) FROM "Affiliate" WHERE "tenantId" IS NULL` returns 0. Same for `Broker`, `ApiKey`, `Lead`, `User`, `BrokerTemplate`.
- **Full audit of tenant-scoped tables.**
  - A list committed to `docs/tenant-scoped-tables.md` naming every model that must carry `tenantId`. Bare minimum: the 6 from S1 plus `Flow`, `FlowVersion`, `FlowBranch`, `FlowAlgorithmConfig`, `FallbackStep`, `CapDefinition`, `CapCounter`, `RotationRule` (deprecated but still live), `BrokerTemplate`, `BrokerTemplateVersion`, `IntakeSettings`, `AffiliateIntakeWebhook`, `WebhookDelivery`, `IdempotencyKey`, `FraudPolicy`, `BlacklistEntry`, `LeadEvent`, `AuditLog`, `BrokerInvoice`, `AffiliateInvoice`, `ConversionEvent`.
  - **Not tenant-scoped** (global): `Tenant` itself, `FxRate` (shared rates), any outbound-webhook retry scheduler that is cross-tenant.
  - Acceptance: list reviewed + signed off before any column addition; no surprises discovered in S2.0-2 pentest.
- **Request-scoped tenant resolution.**
  - `src/middleware.ts` resolves a `tenantId` from hostname using `Tenant.domains` lookup. Falls back to `default` only for non-branded hostnames (`localhost`, vercel preview URLs) — production domains must match or return 404.
  - Tenant cache: in-memory LRU, 60 s TTL, invalidated on tenant admin mutations.
  - Acceptance: request to unknown hostname returns 404 `tenant_not_found`.
- **Tenant-aware tRPC + REST context.**
  - `ctx.tenantId` always defined on every tRPC procedure and every REST route handler.
  - `protectedProcedure` enforces `session.user.tenantId === ctx.tenantId` — users locked to their tenant.
  - Acceptance: a user from tenant A cannot call any tRPC procedure while authenticated against tenant B (attempt is rejected at the tRPC `init` layer).
- **Prisma middleware default-deny.**
  - `src/server/db.ts` Prisma client extended with a `$extends` client-level extension that injects `{ tenantId: ctx.tenantId }` into `where` on every `findMany` / `findFirst` / `findUnique` / `updateMany` / `deleteMany` call for tenant-scoped models.
  - Escape hatch: `prisma.$unsafeGlobal` or `withBypass(() => …)` for genuine cross-tenant work (tenant admin UI, background jobs). Every use must be explicit and audited.
  - Acceptance: removing the extension causes ≥50 existing tests to fail (proves coverage is wide).
- **Migration path documented.**
  - `prisma/migrations/<ts>_activate_tenant_scope/migration.sql` — Prisma-generated SQL, reviewed manually, with backfill step before `SET NOT NULL`.
  - Acceptance: migration applies cleanly on a copy of production data in <10 min; rollback script present.

### Files to create / modify

Create:
- `prisma/migrations/<ts>_activate_tenant_scope/migration.sql`
- `prisma/migrations/<ts>_activate_tenant_scope/README.md` (backfill rationale, rollback)
- `src/middleware.ts` (tenant resolution)
- `src/server/tenant/resolve.ts` (hostname → tenantId)
- `src/server/tenant/cache.ts` (LRU cache)
- `src/server/db.ts` Prisma extension (may require refactor to avoid circular import)
- `src/server/trpc.ts` — extend `createContext` to include `tenantId` and pass through to procedures
- `docs/tenant-scoped-tables.md`
- `tests/integration/tenant-isolation.test.ts` (smoke — real pentest in S2.0-2)

Modify:
- `prisma/schema.prisma` — new `Tenant` model; for every scoped model: switch `tenantId String?` to `tenantId String` + FK + index.
- All routers under `src/server/routers/*.ts` — drop any manually-passed `tenantId`; rely on ctx.
- `src/app/api/v1/leads/route.ts` + `src/app/api/v1/leads/bulk/route.ts` — read `tenantId` from resolved context rather than assuming a global default.
- `src/server/auth-api-key.ts` — `ApiKey` lookup now filters by `{ keyHash, tenantId }` (defense in depth against reused key across tenants).
- `CLAUDE.md` — add a "White-label / multi-tenancy (v2.0)" block once sprint ships.

### Task list (1–3 days each)

1. **Day 1:** audit tenant-scoped tables; produce `docs/tenant-scoped-tables.md`; review with user before any code.
2. **Days 2–3:** add `Tenant` model + seed `default`; generate migration; backfill every scoped row to `default.id` in a single transaction; `SET NOT NULL` on every `tenantId`.
3. **Days 4–5:** write `src/middleware.ts` + `resolve.ts` + `cache.ts`; unit-test hostname resolution (subdomain, wildcard, IP, localhost).
4. **Days 6–7:** extend Prisma client; add `withBypass` escape hatch; iterate through every `$unsafeGlobal` call site until zero lint complaints.
5. **Days 8–9:** thread `ctx.tenantId` through tRPC + REST; update every router + every `/api/v1/*` route; drop now-redundant explicit tenant params.
6. **Day 10:** full test run; fix fallout; ship migration to staging; re-run.

### Open design questions

- **Slug vs id in URLs:** should super-admin URLs be `/super-admin/tenants/:slug` (human-readable, stable) or `/super-admin/tenants/:id` (opaque cuid, avoids slug-renaming pitfalls)? Leaning slug + redirect-on-rename.
- **Tenant-scoped encryption:** do we need per-tenant KMS keys for PII at rest in v2.0, or defer to v2.5? Compliance-wise nice-to-have; engineering-wise non-trivial (column-level encryption + rotation). **Defer** decision to S2.0-5 pre-sprint.
- **Background jobs & tenantId:** the intake-webhook retry worker and fallback orchestrator both iterate across tenants. Strategy: each enqueued job carries `tenantId`; job runner sets ctx before invoking handler. Confirm this pattern once v1.5 job harness is reviewed.
- **Audit hash-chain per tenant:** one global chain or per-tenant chain? Per-tenant is cleaner for export/GDPR but forces chain-migration for existing rows. Proposal: per-tenant going forward, `default` tenant owns the single existing chain. Confirm before coding.
- **Composite index strategy:** should every existing single-column index be replaced with `(tenantId, <col>)` to keep tenant-scoped queries fast? Yes — but roll it out as a second migration after NOT-NULL is applied; compound indexing before the column is NOT NULL leaves Postgres confused about selectivity. Sequence: activate NOT NULL → measure query plans → add composite indexes where needed.
- **Migration staging:** do we run the NOT-NULL migration in a maintenance window or online? Postgres supports `SET NOT NULL` as an online DDL in PG 12+ **if** a NOT-NULL check constraint was previously added and validated. Recommend this 2-step approach: add `CHECK (tenantId IS NOT NULL) NOT VALID` → `VALIDATE CONSTRAINT` → `SET NOT NULL` → `DROP CONSTRAINT`. No maintenance window needed.

### Dependencies on prior versions

- **v1.0 S1 Task 7** added nullable `tenantId` to `Affiliate`, `Broker`, `ApiKey`, `Lead`, `User`, `BrokerTemplate`. **Activation is this sprint** — backfill + NOT NULL + FK + index.
- v1.0 S1 Task 5 introduced `ApiKey.allowedIps`; the lookup needs to now filter by tenant too, otherwise a cross-tenant key collision would silently pass IP check.
- v1.5 visual rule-builder writes `Flow` rows; those rows must gain `tenantId`. If v1.5 happened to add new flow-related tables not yet covered in v1.0 S1, the table audit in Task 1 catches them.
- v1.0 intake routes (`src/app/api/v1/leads/route.ts` + bulk) already honor `ApiKey.isSandbox` — the sandbox outcome table from v1.0 S1 is per-affiliate, not per-tenant; verify it does not need tenant-scoping (it shouldn't, because sandbox outcomes are synthetic + stateless).

---

## Sprint S2.0-2 — Tenant Routing, Branding, Isolation

**Dates:** 2027-01-19 → 2027-01-30 (W3–W4).
**Focus:** make multi-tenancy **visible**: 3 distinct domains per tenant, per-tenant branding on every page, pentest-verified cross-tenant isolation, and a super-admin console for tenant CRUD.

### Deliverables

- **3-domain pattern per tenant.**
  - `network.<tenant>.com` — main CRM (dashboard, leads UI, admin).
  - `autologin.<tenant>.com` — autologin / proxy endpoints (isolated from dashboard — reduces attack surface on credential flows).
  - `api.<tenant>.com` — intake API + webhook receivers (separately rate-limitable per tenant).
  - Acceptance: a request to `api.acme.com/api/v1/leads` routes to tenant `acme`; the same request to `network.acme.com/api/v1/leads` returns 404 (API lives only on `api.*`).
- **Domain-role routing.**
  - `src/server/tenant/resolve.ts` returns `{ tenantId, domainRole: "network" | "autologin" | "api" }`.
  - `middleware.ts` allows / denies paths based on `domainRole`:
    - `network.*` → allows `/dashboard/*`, `/super-admin/*`, `/` (landing), rejects `/api/v1/*`.
    - `autologin.*` → allows `/autologin/*`, `/api/v1/autologin/*`; rejects everything else.
    - `api.*` → allows `/api/v1/*`; rejects everything else.
  - Acceptance: integration tests hit each forbidden combination and get 404.
- **Per-tenant branding rendered.**
  - `Tenant.theme` (already `Json`) extended with a typed Zod schema: `{ logoUrl, primaryColor (oklch), accentColor (oklch), displayName, legalLinks: { privacy, terms, imprint } }`.
  - A server-only `getTenantBranding(tenantId)` helper loads branding and injects it as CSS variables on the root layout.
  - Logo replaces the `crm-design` default wordmark in the topbar; primary color drives the existing `--brand` token.
  - Acceptance: two tenants with distinct themes show distinct colors and logos side-by-side during smoke testing.
- **Data isolation pentest.**
  - A dedicated `tests/pentest/cross-tenant.test.ts` seeded with **two** tenants (`alpha`, `beta`), each with a user + API key + flow + lead.
  - For every tRPC procedure + every `/api/v1/*` route, attempt from `alpha` session to read / mutate a `beta` resource by id. All attempts must fail with 404 (preferred — hides existence) or 403.
  - Acceptance: ≥60 attack attempts, 0 succeed; the test is wired into CI and runs on every PR.
- **Super-admin tenant management UI.**
  - Route: `/super-admin/tenants` (list), `/super-admin/tenants/new` (create), `/super-admin/tenants/:slug` (edit).
  - Gated by a **new** `UserRole.SUPER_ADMIN` that exists only on the `default` tenant. Regular `ADMIN` roles cannot reach `/super-admin/*`.
  - Fields: name, slug, domains (multi-input), theme (color picker + logo upload to S3/Tigris), feature-flags JSON editor, status toggle.
  - Acceptance: super-admin can create `beta` tenant, set its 3 domains, see it come online without a server restart.

### Files to create / modify

Create:
- `src/server/tenant/domain-role.ts`
- `src/server/tenant/branding.ts`
- `src/app/(super-admin)/super-admin/tenants/page.tsx`
- `src/app/(super-admin)/super-admin/tenants/new/page.tsx`
- `src/app/(super-admin)/super-admin/tenants/[slug]/page.tsx`
- `src/app/(super-admin)/layout.tsx` (role gate)
- `src/server/routers/tenant.ts` (CRUD for super-admin)
- `tests/pentest/cross-tenant.test.ts` (full suite — ~60 cases)

Modify:
- `src/middleware.ts` — add `domainRole` gating.
- `src/app/(dashboard)/layout.tsx` — read branding, inject CSS vars, swap logo.
- `prisma/schema.prisma` — add `UserRole.SUPER_ADMIN`; add `Tenant.status` enum.
- `src/lib/env.ts` — accept `ROOT_DOMAIN` env var (`gambchamp.io` or `gamb.dev` in staging) used to parse `<role>.<slug>.<root>`.
- `crm-design/project/src/stage-super-admin-tenants.jsx` — reference prototype.

### Task list

1. **Days 1–2:** extend `resolve.ts` with `domainRole`; write middleware path-allowlist per role; unit-test.
2. **Days 3–4:** build super-admin tenant CRUD UI (list, create, edit) with upload handler for logo; prototype from `crm-design` first.
3. **Day 5:** branding pipeline — Zod schema, `getTenantBranding`, layout injection, verify two tenants render differently.
4. **Days 6–7:** write the pentest suite. Approach: generate a matrix `[source_tenant, target_tenant, resource_type, operation]` and exhaustively attempt. Expect 0 successes. Debug any leak same-day.
5. **Day 8:** add `SUPER_ADMIN` role gating; ensure it exists only on `default` tenant; ensure no tenant-scoped user can escalate.
6. **Days 9–10:** smoke the 3-domain pattern end-to-end against staging DNS; fix TLS / cookie-domain issues; commit runbook.

### Open design questions

- **Cookie scoping for session:** `Domain=.gambchamp.io` (shares across subdomains — simpler, but a compromised `autologin.*` reads `network.*` session) vs per-subdomain cookies (safer, but forces re-login when switching). Recommend **per-subdomain** + SSO redirect; revisit if UX hurts.
- **Per-tenant TLS:** Let's Encrypt + wildcard cert per root-domain covers `*.<slug>.gambchamp.io`; but customers who bring their own vanity domain (e.g. `network.leadpartner.io`) need per-domain certs. Proposal: ship with wildcard-only in v2.0; custom-domain BYO TLS → v2.5.
- **Feature-flag semantics:** are flags JSON-valued (arbitrary) or a typed enum set? Leaning typed enum set inside `Tenant.featureFlags: { key: boolean }` with a central TS const enumerating keys — easier to reason about gate coverage.
- **Sign-up → tenant creation flow:** does self-signup create a tenant, or are tenants seeded by GambChamp staff via `/super-admin/tenants/new`? v2.0 default is staff-seeded (billing plan is manually attached in S2.0-3). Self-serve signup → defer to v2.5 if needed.
- **Pentest matrix generation:** do we generate the 60-case matrix by hand (precise but laborious) or by reflecting over the tRPC router tree at test time (covers new procs automatically but can miss semantic nuances)? Recommend **hybrid**: reflection generates the matrix, hand-written cases cover the semantic edges (e.g., IDOR on `/api/v1/leads/:id` where id is a shared format across tenants).
- **DNS ownership:** do tenants manage their own DNS (CNAME `<tenant>.gambchamp.io` to their domain) or do we host DNS for them? v2.0 default: we host wildcard DNS for `*.<tenant>.gambchamp.io`. Vanity-domain CNAME support deferred to v2.5 with BYO TLS.

### Dependencies on prior versions

- All tenant plumbing from **S2.0-1** must be live — this sprint assumes `ctx.tenantId` is always defined.
- `crm-design` prototype files for Tenant admin must exist (spec §11). If not, block sprint kickoff.
- Design-system tokens (`crm-design/project/COMPONENTS.md`) define how `--brand` + `--accent` cascade; per-tenant theme injection must **not** override other tokens (fonts, spacing, density). If any leak is detected, revise Zod schema to restrict `theme` to the brand/accent pair only.

---

## Sprint S2.0-3 — Subscription Billing (Stripe)

**Dates:** 2027-02-02 → 2027-02-13 (W5–W6).
**Focus:** per-tenant Stripe subscription. Plan gating enforced server-side. Self-serve billing UI for tenant admins.

### Deliverables

- **Stripe product catalog created.**
  - 3 plans: **Starter** ($399/mo), **Growth** ($599/mo), **Pro** ($899/mo) — matches spec §8 pricing wedge.
  - One annual price per plan (2 months free).
  - Acceptance: `stripe products list` in the test account returns these three products with expected prices.
- **`Subscription` + `PaymentMethod` + generic `Invoice` tables live.**
  - `Subscription`: `tenantId` (unique), `stripeCustomerId`, `stripeSubscriptionId`, `plan` (`STARTER` | `GROWTH` | `PRO`), `status` (mirrors Stripe: `active` | `past_due` | `canceled` | `trialing` | `unpaid`), `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`, `createdAt`.
  - `PaymentMethod`: `tenantId`, `stripePaymentMethodId`, `brand`, `last4`, `expMonth`, `expYear`, `isDefault`.
  - `Invoice` (generic billing-side — **distinct from finance-side `BrokerInvoice`/`AffiliateInvoice`**): `tenantId`, `stripeInvoiceId`, `number`, `amountDue`, `amountPaid`, `currency`, `status` (`open` | `paid` | `void` | `uncollectible`), `hostedInvoiceUrl`, `periodStart`, `periodEnd`, `createdAt`.
  - Naming convention explicit in code comments: this `Invoice` is **billing**; finance uses `BrokerInvoice`/`AffiliateInvoice`. No accidental shared naming.
  - Acceptance: creating a Stripe subscription via test webhook produces matching rows in all three tables.
- **Webhook receiver active.**
  - `src/app/api/webhooks/stripe/route.ts` — signature-verified via `STRIPE_WEBHOOK_SECRET`.
  - Handles: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `payment_method.attached`, `payment_method.detached`.
  - Idempotency: Stripe `event.id` is stored in a `StripeEvent` table (`id`, `type`, `receivedAt`, `payloadHash`); duplicate IDs are accepted with 200 but skipped.
  - Acceptance: replaying the same webhook 3× produces exactly 1 DB mutation.
- **Plan gating enforced in code.**
  - A `planFeature(tenantId, feature)` helper returns `boolean`; called at every gated entrypoint.
  - Gated features (initial set): `autologin` (Growth+), `telegram_mini_app` (Pro), `sso` (Pro), `custom_domain` (Pro), `api_rate_limit_tier` returns a tier.
  - Starter tenants blocked from gated tRPC procs with `FORBIDDEN: plan_upgrade_required`.
  - Acceptance: a Starter tenant calling an autologin tRPC proc receives `FORBIDDEN`; upgrading to Growth via Stripe test flow unblocks the call within one webhook cycle.
- **Self-serve billing UI.**
  - Route: `/dashboard/settings/billing`.
  - Panels: **current plan** (card with plan name, price, next invoice date), **change plan** (3 tiles, side-by-side compare), **payment method** (Stripe Elements card input), **invoice history** (table with `hostedInvoiceUrl` download links), **cancel** (button opening a modal; sets `cancelAtPeriodEnd=true`, stays active until end of period).
  - Acceptance: a tenant admin can upgrade Starter → Growth without support intervention; the change reflects within 10s.

### Files to create / modify

Create:
- `prisma/migrations/<ts>_billing/migration.sql`
- `src/server/billing/stripe.ts` — singleton Stripe client
- `src/server/billing/subscription.ts` — sync helpers (webhook handlers call these)
- `src/server/billing/plan-features.ts` — `planFeature` + feature map constants
- `src/server/billing/webhooks.ts` — event router
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/(dashboard)/dashboard/settings/billing/page.tsx`
- `src/app/(dashboard)/dashboard/settings/billing/plan-picker.tsx`
- `src/app/(dashboard)/dashboard/settings/billing/payment-method-form.tsx`
- `src/app/(dashboard)/dashboard/settings/billing/invoice-list.tsx`
- `src/server/routers/billing.ts` — tRPC procs: `me.plan`, `me.invoices`, `me.paymentMethods`, mutations: `changePlan`, `attachPaymentMethod`, `cancelSubscription`

Modify:
- `prisma/schema.prisma` — `Subscription`, `PaymentMethod`, `Invoice`, `StripeEvent` + `Tenant` gains a `defaultCurrency` field (USD default).
- `src/lib/env.ts` — `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO` (annual variants too).
- `CLAUDE.md` — "Billing (v2.0)" section.

### Task list

1. **Day 1:** Stripe test-mode product + price IDs created manually; IDs checked into `.env.example`.
2. **Days 2–3:** schema migration + webhook signature verification + `StripeEvent` dedup.
3. **Days 4–5:** sync helpers (one per event type); integration-test each event type with a fixture payload captured from Stripe CLI (`stripe trigger customer.subscription.created`).
4. **Days 6–7:** `/dashboard/settings/billing` UI — plan picker + Stripe Elements + invoice history.
5. **Days 8–9:** wire `planFeature` gate across existing v1.0/v1.5 features (grep for autologin, sso, custom_domain, telegram — tag each call site).
6. **Day 10:** full E2E: sign up → attach card → upgrade → downgrade → cancel → verify all four states handled + UI reflects.

### Open design questions

- **Proration or not:** Stripe default is proration on plan changes. Does our UX show the prorated amount before confirmation, or hide it? Recommend **show** (one modal "Your next invoice will be $X, includes $Y credit for unused time"). Prevents support tickets.
- **Dunning:** when `invoice.payment_failed` fires, Stripe retries 4× over 3 weeks. During that window, do we gate features or keep them active? Proposal: 7-day grace (`status: past_due` → features live), after that → `status: unpaid` → read-only mode.
- **Currency per tenant vs per invoice:** `Tenant.defaultCurrency` sets the billing currency; not changeable without a new Stripe customer (Stripe limitation). Document this in the UI.
- **Finance-side `Invoice` rename?** Given we're introducing a generic `Invoice` table, do we rename finance's `BrokerInvoice`/`AffiliateInvoice` for clarity? Cost is high (touches every finance query in v1.0 S6). Leave as-is; comment the distinction in both files.
- **Trial period:** do we offer a 14-day trial on all plans, or only on the landing page's CTA? Recommend landing-page CTA only — staff-seeded pilot tenants skip trials. Reduces trial-abuse risk.
- **Tax handling:** Stripe Tax computes VAT/sales-tax automatically but costs 0.5% per tx. For a pricing wedge where we advertise "public pricing," the shown price should be inclusive of tax in the EU. Decision: enable Stripe Tax in v2.0, accept the 0.5% cost — simpler than self-computing tax across 27 EU states.

### Dependencies on prior versions

- `Tenant` from S2.0-1 is the FK target.
- Super-admin must already be functional (S2.0-2) — GambChamp staff needs to link a tenant's Stripe customer manually for the first cohort of pilot tenants before self-serve.
- v1.0 S5 Telegram alert catalog gains two new events in this sprint: `billing.payment_failed`, `billing.subscription_canceled`. Wire via the existing event-subscription table.
- v1.0 S1 idempotency pattern (`IdempotencyKey` table, `x-idempotency-key` header) is reused conceptually for the `StripeEvent` dedup — same "first write wins, later writes are skipped" semantics — but keyed on Stripe's `event.id` not a client header.

---

## Sprint S2.0-4 — CRG Full + Back-to-back Polish

**Dates:** 2027-02-16 → 2027-02-27 (W7–W8).
**Focus:** turn the v1.0 MVP finance system into a production-grade engine. Multi-currency. Partial payments. Chargebacks. Many-to-many invoice matching.

### Deliverables

- **Multi-currency support.**
  - `Currency` enum: `USD`, `EUR`, `GBP` (initial set — easy to extend).
  - `FxRate` table: `date`, `base` (always `USD`), `quote`, `rate`. One row per (date, quote).
  - Daily cron fetches rates from `exchangerate.host` (free, no key required); falls back to prior day if API fails; alerts on 2 consecutive failures.
  - Every `BrokerInvoice` / `AffiliateInvoice` / `ConversionEvent` gains `currency`; conversion to a reporting currency uses the rate on the event date.
  - Acceptance: a broker denominated in EUR raises an invoice for €1000; the affiliate payout in GBP shows the correctly converted amount at the day's EUR→USD→GBP rate.
- **Partial payment handling.**
  - New fields on `BrokerInvoice` / `AffiliateInvoice`: `paymentApplied` (decimal, default 0), `outstandingBalance` (generated column: `amountDue - paymentApplied`), `paymentStatus` enum (`UNPAID` | `PARTIAL` | `PAID` | `OVERPAID`).
  - New table `InvoicePayment`: `invoiceId` (polymorphic — either `BrokerInvoice.id` or `AffiliateInvoice.id`, discriminated by `invoiceType`), `amount`, `currency`, `paidAt`, `reference`, `recordedByUserId`.
  - tRPC mutation `finance.recordPayment` updates `paymentApplied` atomically inside a transaction.
  - Acceptance: recording two $500 payments on a $1000 invoice moves `paymentStatus` from UNPAID → PARTIAL → PAID.
- **Chargeback handling.**
  - `Chargeback` table: `conversionEventId`, `brokerId`, `amount`, `currency`, `chargebackDate`, `reason`, `reversedInvoiceId` (nullable — populated once reversal is written), `affiliateAdjustmentAmount`, `status` (`PENDING` | `APPLIED` | `DISPUTED`).
  - Reversal logic: when a chargeback is applied, the original conversion event is flagged; if its CRG cohort has not yet been invoiced, the cohort baseline is reduced. If already invoiced, a reversal line on next invoice.
  - CRG cohort recomputation: `recomputeCrgCohort(cohortKey)` helper — runs after every chargeback insert.
  - Acceptance: a chargeback within the CRG guarantee window reduces the next broker invoice by the chargeback amount × affiliate-share ratio.
- **Many-to-many invoice matching.**
  - New join table `InvoiceMatch`: `brokerInvoiceId`, `affiliateInvoiceId`, `allocatedAmount`, `allocationMethod` (`PRO_RATA_TRAFFIC` | `MANUAL`).
  - Pro-rata: when one broker invoice sources traffic from 3 affiliates at a 50/30/20 split, `InvoiceMatch` gets 3 rows with proportional allocations.
  - tRPC mutation `finance.matchInvoice(brokerInvoiceId, affiliateInvoiceIds[], method)` runs the allocation atomically.
  - UI: `/dashboard/finance/invoices/:id/match` — shows the broker invoice, lists candidate affiliate invoices ranked by traffic share, allows confirm.
  - Acceptance: a $3000 broker invoice split across 3 affiliates produces 3 `InvoiceMatch` rows summing to exactly $3000.00 (no rounding drift — banker's rounding on the last row).

### Files to create / modify

Create:
- `prisma/migrations/<ts>_finance_v2/migration.sql`
- `src/server/finance/fx.ts` — `FxRate` cache + conversion helpers
- `src/server/jobs/fetch-fx-rates.ts` — daily cron
- `src/server/finance/payment.ts` — record partial payment
- `src/server/finance/chargeback.ts` — apply chargeback + recompute cohort
- `src/server/finance/matching.ts` — pro-rata allocation algorithm
- `src/app/(dashboard)/dashboard/finance/invoices/[id]/match/page.tsx`
- `tests/integration/finance-v2.test.ts`

Modify:
- `prisma/schema.prisma` — `Currency` enum, `FxRate`, `InvoicePayment`, `Chargeback`, `InvoiceMatch`; extend `BrokerInvoice`/`AffiliateInvoice`.
- `src/server/routers/finance.ts` — new mutations: `recordPayment`, `applyChargeback`, `matchInvoice`; new query `invoice.matches`.
- `src/server/crg/cohort.ts` — accept chargeback inputs.
- Every finance UI page — add currency selector + show `outstandingBalance`.

### Task list

1. **Day 1:** `Currency` enum + `FxRate` table + cron + fixture rates; verify conversion determinism.
2. **Days 2–3:** partial-payment schema + `recordPayment` mutation + UI field.
3. **Days 4–5:** chargeback schema + `applyChargeback` + CRG cohort recompute; regression-test existing CRG suite.
4. **Days 6–7:** pro-rata matching algorithm; banker's-rounding correctness tests (10k random allocations sum to input ±0).
5. **Days 8–9:** matching UI — broker invoice list + candidates + confirm flow.
6. **Day 10:** E2E finance scenario — broker pushes invoice → match pro-rata → record partial payment → chargeback → reversal reflected on next invoice.

### Open design questions

- **FX rate source:** `exchangerate.host` is free but occasionally 500s. Fallback strategy: prior day's rate, log a warning, alert ops if >24h stale. Is this acceptable? Alternative: pay for OpenExchangeRates ($12/mo). **Ask user** during pre-sprint brainstorm.
- **Chargeback dispute UX:** when `status=DISPUTED`, do we freeze the reversal or apply it optimistically and reverse-the-reversal on loss? Recommend **optimistic apply** (banks behave this way); a `DISPUTED` badge in UI.
- **Rounding ownership:** last-row gets the rounding delta in pro-rata splits. This is industry standard but documented ambiguously across regulations. Flag for user: is per-tenant configurable rounding needed? Probably no for v2.0.
- **Currency per broker vs per invoice:** brokers are currency-stable (a EUR-broker raises EUR invoices only); affiliates too. So `Broker.defaultCurrency` and `Affiliate.defaultCurrency` are the sources of truth; invoices inherit. Confirm this assumption against v1.0 S6 finance schema before migrating.
- **Pro-rata basis:** traffic share is the default; alternative bases are revenue share or FTD share. Recommend **traffic share as default, configurable at match time** via the `allocationMethod` enum — users can override per-invoice.
- **Chargeback window:** how far back can a chargeback apply? Stripe's default is 120 days for disputes; broker/affiliate chargebacks can come years later. Recommend a hard cap of 365 days beyond which a chargeback requires super-admin approval.

### Dependencies on prior versions

- v1.0 S6 finance MVP (`BrokerInvoice`, `AffiliateInvoice`, `ConversionEvent`, `CrgCohort`) — this sprint extends, doesn't rewrite.
- Tenant scoping from S2.0-1 applies — every new table gains `tenantId`.
- Billing from S2.0-3 is **not** a dependency — finance-side invoices are a separate system. Good; decouples risk.
- v1.0 S4 analytics materialized views (hourly / daily / weekly roll-ups) **are** a soft dependency: chargebacks retroactively alter revenue for past days; decide whether roll-ups get recomputed on chargeback insert (cost: rebuild cost per affected day) or read-time-adjusted (cost: query complexity). Proposal: rebuild only "yesterday + today" roll-ups synchronously on chargeback; historical days recomputed in a nightly job.

---

## Sprint S2.0-5 — Compliance Hardening

**Dates:** 2027-03-02 → 2027-03-13 (W9–W10).
**Focus:** enterprise-tier security. 2FA. SSO. Audit-log UI. Anomaly alerts. IP-restricted admin.

### Deliverables

- **2FA enforcement per role.**
  - TOTP-based (no SMS — avoids SIM-swap risk).
  - `User.totpSecret` (encrypted at rest with per-row AEAD using a single app-level key; fine for v2.0, per-tenant KMS deferred per S2.0-1 open question).
  - Enrollment flow: `/dashboard/settings/security/2fa` — QR code via `qrcode`, 6 backup codes shown once.
  - Mandatory for `ADMIN` + `NETWORK_ADMIN` (new super-admin is inherently admin-tier). Optional for `AFFILIATE_USER`, `BROKER_USER`.
  - Grace period: 7 days after v2.0 go-live for existing admin users to enroll; after that, login blocks until enrolled.
  - Acceptance: an ADMIN without 2FA is redirected to enrollment; cannot bypass to any protected route.
- **SSO via SAML 2.0 + Google Workspace.**
  - Google Workspace: standard `GoogleProvider` in NextAuth, tenant-scoped by allowed-email-domain on the `Tenant.allowedSsoDomains` field.
  - SAML 2.0: per-tenant SP config stored in `TenantSsoConfig` (`tenantId`, `idpEntityId`, `idpSsoUrl`, `idpCertificate`, `acsUrl`). Auth.js SAML provider registered dynamically per hostname.
  - Metadata XML endpoint: `/api/sso/saml/metadata?tenant=<slug>` for customer IdP onboarding.
  - JIT provisioning: first SAML login creates a `User` row scoped to the tenant with default `AFFILIATE_USER` role; admin can promote.
  - Acceptance: a pilot tenant can onboard Okta as IdP using the published metadata; login round-trip succeeds end-to-end.
- **Full audit-log UI.**
  - Route: `/dashboard/settings/audit`.
  - Filters: user, action type, resource type, resource id, date range, tenant (super-admin only).
  - Columns: timestamp, user, action, resource, diff (collapsible JSON), IP, user-agent, chain-position (hash-chain verifier — green if chain intact, red if tampered).
  - Export: CSV + JSON signed-bundle (chain-verified export for compliance handoff).
  - Acceptance: tampering a row in the DB (via raw SQL) turns the affected row's verifier red and every subsequent row orange (dependent-rows flagged).
- **Login anomaly detection.**
  - `LoginAttempt` table: `userId`, `tenantId`, `ip`, `userAgent`, `country` (from IP geolocation), `success`, `anomalyFlags` (`String[]`), `createdAt`.
  - Signal set: **unusual country** (country differs from user's last-30-day countries), **new device** (UA/device-fingerprint unknown), **many failures** (≥5 in 10 min from same IP).
  - On detection: Telegram alert to account owner (reuses v1.0 S5 event bus with new event type `security.anomaly`); optionally auto-locks the session pending user confirmation if `tenant.featureFlags.anomalyAutoLock` is on.
  - Acceptance: logging in from a fresh VPN exit fires the alert within 10s.
- **IP-restricted admin sessions.**
  - `Tenant.adminAllowedIps` — CIDR list; applies to any session with role ≥ `ADMIN`.
  - Enforcement: on every request, if role is admin-tier and IP falls outside the list (when list is non-empty), session is rejected with 403 `ADMIN_IP_NOT_ALLOWED`.
  - UI: `/dashboard/settings/security/admin-ips` — CIDR list editor with a "test current IP" button.
  - Acceptance: setting the list to `203.0.113.0/24` while connected from `198.51.100.7` immediately locks out admin requests (session cookie still valid, but requests fail).

### Files to create / modify

Create:
- `src/server/auth/totp.ts`
- `src/server/auth/sso/saml.ts`
- `src/server/auth/sso/google.ts`
- `src/server/auth/anomaly.ts`
- `src/server/auth/admin-ip-guard.ts`
- `src/app/(dashboard)/dashboard/settings/security/2fa/page.tsx`
- `src/app/(dashboard)/dashboard/settings/security/admin-ips/page.tsx`
- `src/app/(dashboard)/dashboard/settings/audit/page.tsx`
- `src/app/api/sso/saml/[tenant]/metadata/route.ts`
- `src/app/api/sso/saml/[tenant]/acs/route.ts`
- `prisma/migrations/<ts>_compliance/migration.sql`

Modify:
- `prisma/schema.prisma` — `User.totpSecret`, `User.totpEnforcedAt`; `TenantSsoConfig`; `LoginAttempt`; `Tenant.adminAllowedIps`, `Tenant.allowedSsoDomains`.
- `src/auth.ts` — 2FA step in credentials callback; SAML provider registration.
- `src/middleware.ts` — admin-IP guard applied only on `network.*` domain.
- `CLAUDE.md` — "Compliance (v2.0)" section.

### Task list

1. **Day 1:** TOTP enrollment + verification; QR rendering; backup codes.
2. **Days 2–3:** grace-period logic; enforcement middleware; regression-test admin logins.
3. **Days 4–5:** SAML 2.0 metadata + ACS endpoints; test with `samltest.id` IdP; JIT user creation.
4. **Day 6:** Google Workspace SSO (simpler — reuse existing Google provider, gate by domain).
5. **Day 7:** Audit UI + chain-verifier + export.
6. **Days 8–9:** Anomaly detector — geolocation via MaxMind GeoLite2 (embedded DB, no API call), UA fingerprinting, alert wiring.
7. **Day 10:** Admin IP CIDR UI + guard; E2E manual test with VPN to verify anomaly + IP-block behave correctly.

### Open design questions

- **Geolocation source:** MaxMind GeoLite2 is free but redistribution restrictions. Alternative: ipapi.co (rate-limited free tier). Recommend MaxMind embedded DB, refresh weekly via cron. Flag licensing review with user.
- **TOTP secret encryption:** single app-key (simple, adequate for v2.0) vs per-tenant key (better isolation, more infra). Deferring per-tenant to v2.5 per S2.0-1 decision.
- **SAML signed responses only:** Auth.js SAML supports unsigned responses. Should we reject unsigned? Yes — baseline security; document in IdP onboarding guide.
- **Anomaly thresholds:** "many failures" = 5 in 10 min. Tunable per tenant? Recommend global defaults in v2.0, per-tenant overrides in v2.5 if demand emerges.
- **Backup-code UX:** one-time 8-character codes shown once, stored hashed. Should we force a re-download if a user burns through 4 of 6? Recommend a banner at 2 remaining; block login at 0 unless 2FA re-enrolled.
- **Admin-IP guard evasion via API keys:** `ApiKey.allowedIps` applies to intake; `Tenant.adminAllowedIps` applies to admin dashboard. These are different lists. Decision: keep them independent — an office IP for dashboards is rarely the same as a broker-system IP for intake callbacks.
- **SAML logout (SLO):** Auth.js does not support SLO natively. If an IdP-initiated logout fires, do we honor it? v2.0 says no — session expires naturally. Call it out in onboarding docs.

### Dependencies on prior versions

- Audit hash-chain infrastructure (`src/server/audit/hash-chain.ts` from v1.0) — reused unchanged; UI adds verifier rendering.
- Telegram event bus (v1.0 S5) — new event types `security.anomaly`, `security.admin_ip_blocked` wired in; subscribers configurable.
- `ApiKey.allowedIps` CIDR matcher from v1.0 S1 — reused for `Tenant.adminAllowedIps` enforcement. Same `src/server/intake/check-ip.ts` helper; no rewrite.
- NextAuth v5 credentials flow from v1.0 — the 2FA step is inserted between password validation and session issuance; session callback short-circuits if `totpEnforcedAt` is set and user is not yet verified in this session.
- v1.0 PII-mask helpers (`src/server/audit/pii-mask.ts`) — reused in audit export so CSV/JSON exports do not leak raw email/phone.

---

## Sprint S2.0-6 — Telegram Mini App + Hardening + Release

**Dates:** 2027-03-16 → 2027-03-27 (W11–W12).
**Focus:** ship the Telegram Mini App (5 ops minimum per spec §10 success criteria), run the cross-tenant pentest one more time, cut `v2.0.0`.

### Deliverables

- **Telegram Mini App shipped.**
  - Deployment: a standalone Next.js route group `src/app/(miniapp)/miniapp/*` that renders a Telegram-viewport-sized UI (typically 360×640, responsive to device).
  - Embedded in the v1.0 ops bot as a `web_app` button on the `/start` flow (`Menu → Open Ops Panel`).
  - Auth: Telegram `initData` signature verification (HMAC-SHA256 of the init string using the bot token) — no separate password flow. Mini-app session bridges to the existing session via a short-lived JWT.
  - **5 core operations** (per §10 success criteria):
    1. **View leads** — `/miniapp/leads` — scrollable list of today's leads for the operator's tenant, with filter by state.
    2. **Pause broker** — `/miniapp/brokers` — list with toggle; flipping toggle fires the existing `broker.pause`/`broker.resume` tRPC mutation.
    3. **Ack alert** — triggered from a Telegram message's inline button (`/alert/ack/:id`); opens the mini-app pre-scrolled to the alert; confirm button.
    4. **View stats** — `/miniapp/stats` — 4 cards: today's leads, pushed, FTDs, fraud-rejects; tap drills into v1.0 analytics.
    5. **Switch affiliate** — `/miniapp/affiliates` — list; select → cookie persists the "viewing as" affiliate for subsequent reads (read-only, no mutations as another affiliate).
  - Visual: follows `crm-design` tokens verbatim; uses `@twa-dev/sdk` theme bridge so dark/light modes follow Telegram's app setting.
  - Acceptance: all 5 ops working on iOS Telegram + Android Telegram + Telegram Web. Total loaded JS ≤ 180 KB gzipped.
- **v2.0 integration smoke suite.**
  - A new test file `tests/smoke/v2.test.ts` exercises, in one happy-path run:
    - Create tenant via super-admin → set domains → upload logo.
    - Stripe subscription upgrade → webhook received → plan gate opens.
    - Enable 2FA → login round-trip with TOTP.
    - SAML SSO round-trip against `samltest.id`.
    - Create a multi-currency broker invoice → match pro-rata → record partial payment → apply chargeback.
    - Open the mini app from Telegram; execute all 5 ops.
  - Acceptance: smoke passes in CI and runs ≤ 6 min.
- **Pentest report — 2 tenants, distinct domains.**
  - Set up `alpha.gambchamp-staging.io` + `beta.gambchamp-staging.io`, each with full 3-domain pattern and a different Stripe plan.
  - Re-run `tests/pentest/cross-tenant.test.ts` + manual pentest checklist (OWASP Top 10 focus: broken access control, cryptographic failures, SSRF against autologin proxies, injection against audit filters).
  - Output: `docs/security/v2.0-pentest-report.md` — findings, severities, resolutions.
  - Acceptance: 0 critical / 0 high findings; medium/low findings documented with resolution plan.
- **`CHANGELOG.md` + tag `v2.0.0`.**
  - Full changelog grouped by sprint; includes migration notes (specifically: the NOT-NULL `tenantId` migration).
  - Tag `v2.0.0` pushed to origin; GitHub release drafted with 3 screenshots of the new UI (Billing, Audit, Mini App).
  - Acceptance: `git tag v2.0.0` present; release notes live.

### Files to create / modify

Create:
- `src/app/(miniapp)/layout.tsx` — Telegram-viewport-sized shell
- `src/app/(miniapp)/miniapp/leads/page.tsx`
- `src/app/(miniapp)/miniapp/brokers/page.tsx`
- `src/app/(miniapp)/miniapp/stats/page.tsx`
- `src/app/(miniapp)/miniapp/affiliates/page.tsx`
- `src/app/(miniapp)/miniapp/alert/[id]/page.tsx`
- `src/server/telegram/verify-initdata.ts`
- `src/server/telegram/miniapp-session.ts` — short-lived JWT bridge
- `src/server/telegram/bot-miniapp-button.ts` — adds the menu button on `/start`
- `tests/smoke/v2.test.ts`
- `docs/security/v2.0-pentest-report.md`
- `CHANGELOG.md` (if not yet created)

Modify:
- `src/lib/env.ts` — `TELEGRAM_BOT_TOKEN` (likely already set from v1.0 S5), `TELEGRAM_MINIAPP_URL`.
- v1.0 S5 bot handlers — add the `web_app` button on `/start` + inline "Open Mini App" buttons on alerts.
- `CLAUDE.md` — "Telegram Mini App (v2.0)" section.

### Task list

1. **Days 1–2:** mini-app shell + layout + Telegram SDK wiring + initData verification + JWT bridge.
2. **Days 3–4:** leads list + brokers pause toggle + stats cards — reuse existing tRPC procs, no new ones needed.
3. **Day 5:** switch-affiliate cookie + alert ack deep-link from bot.
4. **Day 6:** theme tokens — port `crm-design` dark/light to Telegram theme bridge; verify iOS + Android render correctly.
5. **Day 7:** v2 smoke suite wired in CI.
6. **Days 8–9:** pentest — staging domains live, 2 tenants seeded, run automated + manual; write report.
7. **Day 10:** CHANGELOG, tag, GitHub release, user demo.

### Open design questions

- **Mini App feature expansion:** spec requires 5 ops, we've listed 5 exactly. Should "create lead" or "override routing" be added as a sixth? Recommend **no** — keep Mini App read-heavy + controlled mutations (pause, ack). Write-heavy ops stay on the main dashboard. Revisit v2.5.
- **Mini App offline state:** Telegram's WebView has intermittent connectivity on mobile. Should we bundle a minimal service worker for offline-read of the last leads page? Probably yes; 1-day spike in this sprint if time allows, else v2.5.
- **Cross-tenant Mini App:** if a Telegram user is a member of 2 tenants (rare — ops staff at a network with sub-brands), how do they switch? Recommend: the bot's `/start` flow asks tenant selection once, stores in bot user session; `?tenant=<slug>` query param allows direct-link switch.
- **Release cadence post-v2.0:** once `v2.0.0` ships, is the next cycle immediate (v2.5 kickoff the Monday after) or a buffer week? Recommend **one buffer week** for hotfixes; v2.5 kickoff 2027-04-12.
- **Mini App telemetry:** Telegram does not allow most analytics scripts inside Web Apps. Do we ship without telemetry, or add server-side page-view pings? Recommend server-side pings only (one INSERT per page load into a `MiniAppPageView` table). Low volume, high signal.
- **Bot token rotation post-GA:** if `TELEGRAM_BOT_TOKEN` leaks, rotating breaks every tenant's existing bot connection. Mitigation design (defer implementation to v2.5): per-tenant bot tokens. For v2.0 we share one bot; document leak-response procedure.

### Dependencies on prior versions

- v1.0 S5 Telegram ops bot — mini-app is an **addition** to the same bot, not a new bot. Same `TELEGRAM_BOT_TOKEN`, same admin flow.
- All S2.0-1..5 features — the Mini App respects tenant scoping, plan gating, 2FA enforcement, and audit logging through the shared `ctx` established in S2.0-1.
- `crm-design/project/src/stage-miniapp.jsx` prototype must exist before Day 1 of this sprint (per spec §11). If missing at S2.0-5 wrap-up, allocate 2 days of design work in the buffer week **before** S2.0-6 kickoff — do not crunch Mini App UI.
- 2FA from S2.0-5 does **not** apply inside the Mini App — Telegram's `initData` signature is the authentication primitive, and second-factor inside a Telegram WebView would be a UX nightmare. Session bridging JWT must be short-lived (≤5 min, refreshable) to compensate. Document this trade-off in the pentest report.
- Plan gating from S2.0-3 applies — Starter-plan tenants do not get a Mini App button on their bot `/start` flow; Pro-plan only (per `planFeature(tenantId, "telegram_mini_app")`).

---

## Success criteria — v2.0 GA go/no-go (from spec §10)

- **White-label:** 2+ tenants live on distinct domains, with data-isolation pentest passing (0 critical, 0 high findings).
- **Billing:** one end-to-end cycle (subscription → invoice → CRG payout match) on a pilot customer.
- **2FA enforcement:** 100% of admin sessions pass 2FA; 0 bypass events in audit log over 30 days post-launch.
- **Telegram Mini App:** 5 core operations (view leads / pause broker / ack alert / view stats / switch affiliate) functional in Telegram mobile.
- **Engineering:** `pnpm test` green; `pnpm lint` + `pnpm typecheck` zero errors; `tests/pentest/cross-tenant.test.ts` 0 leaks; `tests/smoke/v2.test.ts` green in CI.
- **CHANGELOG + tag:** `v2.0.0` tagged; release notes published.

---

## Top risks (descending severity)

1. **`tenantId` NOT-NULL migration (S2.0-1)** — if backfill misses any row on any table, the migration halts production. *Mitigation:* dry-run against a production-data copy; explicit row-count assertions before `SET NOT NULL`; rollback script ready. *Detection signal:* the migration's first statement should be `SELECT COUNT(*) FROM "<table>" WHERE "tenantId" IS NULL` across every scoped table; any non-zero result aborts the transaction.
2. **SAML IdP heterogeneity (S2.0-5)** — every customer IdP (Okta / Azure AD / Auth0 / on-prem ADFS) has quirks. *Mitigation:* test against `samltest.id` + at least 2 real pilot IdPs before GA; document the most common pitfalls in the IdP onboarding guide; defer exotic IdPs to v2.5. *Contingency:* if onboarding complexity exceeds 1 day per tenant, we offer SAML as a Pro-plan-with-managed-setup rather than self-serve.
3. **Stripe webhook reliability (S2.0-3)** — missed webhooks silently drift DB from Stripe. *Mitigation:* nightly reconciliation cron (`sync Stripe subscriptions → local rows`) in addition to webhooks; webhook replay button on super-admin. *Detection signal:* reconciliation job logs every drift it corrects; if > 0 drifts/day on average over a week, webhook infra needs escalation.
4. **FX-rate API outages (S2.0-4)** — `exchangerate.host` is free but not SLA'd. *Mitigation:* 24h cache; explicit stale-rate alerting; swap-in paid provider if outages exceed 1/mo.
5. **Telegram Mini App performance on low-end Android (S2.0-6)** — Telegram WebView is Chromium but old on some devices. *Mitigation:* hard bundle-size cap of 180 KB gzipped; no client-side analytics libs; SSR-first rendering. *Detection signal:* Lighthouse run on Motorola G6-class device must return Performance ≥ 70 before GA.
6. **Cross-tenant leak via Prisma escape hatch (S2.0-1 + S2.0-2)** — every `withBypass` is a potential leak if tenant filtering is forgotten inside. *Mitigation:* lint rule flagging `withBypass`; every call site reviewed in S2.0-2 pentest; production log counter for bypass invocations, alerted if > baseline.
7. **Post-migration performance regression (S2.0-1 → S2.0-6)** — adding `tenantId` to every query's `WHERE` clause plus new composite indexes can shift query plans in unexpected ways. *Mitigation:* pre-migration plan capture via `EXPLAIN ANALYZE` on top-20 hottest queries; post-migration re-capture; regressions >20% investigated before GA.
8. **Plan-gating gaps (S2.0-3)** — a forgotten gate means Starter tenants access Pro features for free. *Mitigation:* gate-coverage test — for each feature in `planFeature` catalog, assert a Starter tenant gets 403 when attempting it; running the test with a Pro tenant asserts success.

---

## Post-release (first 2 weeks after v2.0.0 GA)

- **Daily:** Stripe webhook queue depth + retry rate (Grafana dashboard panel); audit-log review for any `withBypass` invocations that exceeded baseline; FX cron health (last success timestamp).
- **Weekly:** pentest cron re-runs the cross-tenant suite in case schema changes reintroduce leaks; SAML round-trip smoke against every configured pilot IdP.
- **Continuous:** Sentry alerts on any `tenantId` null-pointer reads, any Prisma `P2002` unique-constraint violations on newly-added unique(`tenantId`, …) indexes, any 403 spike suggestive of plan-gate misconfiguration.
- **Customer feedback channel:** one GambChamp-staffed Telegram group for pilot tenants during the first 30 days — capture friction, file tickets, feed into v2.5 scope.
- **GA hotfix policy:** semver patch releases (v2.0.1, v2.0.2…) are acceptable for critical issues within the first 14 days; anything larger waits for v2.5 unless security-grade.

---

## Deferred to v2.5 (explicitly out of v2.0 scope)

- Smart Fraud ML model (EPIC-23).
- Public API portal + 3rd-party developer docs (EPIC-19).
- Provider API (HubSpot/Bitrix upstream).
- PWA mobile dashboard.
- Integration Marketplace v2.
- Per-tenant KMS-backed encryption.
- Self-serve tenant signup (v2.0 stays staff-provisioned).
- Custom-domain BYO TLS (v2.0 ships wildcard-only).
- Per-tenant anomaly-detection threshold tuning.
- Offline-first Mini App (service worker).
- Cohort / retention report (EPIC — spec §7).
- Exotic SAML IdPs (on-prem ADFS without standard metadata, LDAP fallback).

---

## Appendix A — Definition of Done for every sprint

A sprint is "done" only when **all** of the following hold:
- All acceptance criteria in the Deliverables section are demonstrable via automated or documented manual test.
- `pnpm typecheck` + `pnpm lint` + `pnpm test` green on the sprint's merge commit.
- `CLAUDE.md` has a new section reflecting what shipped.
- The sprint's migration (if any) has been applied in staging and a rollback has been demonstrated against a staging snapshot.
- A 5-line retrospective is appended to this plan file (what shipped, what slipped, next-sprint adjustments).

## Appendix B — Where to split this plan further

Each sprint above is sized at ~10 working days. Before execution, expand into per-step TDD plans using `superpowers:writing-plans`. Specifically:
- S2.0-1 warrants splitting into **two** step-level plans: one for the migration itself (highest risk) and one for the Prisma middleware + context plumbing.
- S2.0-3 and S2.0-5 each justify their own step-level plans — both involve third-party integrations (Stripe, SAML) whose fixtures and webhooks deserve explicit test setup.
- S2.0-6 may combine the Mini App + pentest + release-cut into a single plan, as the work is smaller per-task but highly interdependent on timing.
