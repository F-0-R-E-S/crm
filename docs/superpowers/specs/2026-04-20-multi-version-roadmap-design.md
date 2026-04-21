# GambChamp CRM — Multi-Version Roadmap (v1.0 → v2.5)

**Status:** Draft — pending user review
**Author:** brainstorming session 2026-04-20
**Supersedes:** `product_backlog/RELEASE_PLAN_SPRINTS_v1.md` (24-sprint plan, Mar 2026 – Feb 2027)

---

## 1. Context

GambChamp CRM is a B2B SaaS lead-distribution platform for the crypto/forex affiliate-marketing vertical. A first release plan (23 epics across 4 quarterly waves) was produced in Q1 2026 based on analysis of 4 competitors (Leadgreed, Elnopy, HyperOne, CRM Mate).

Since that plan was written:
- **EPIC-01..07** (P0 MVP) is fully shipped on `main`.
- A `wave1-parity-gaps` branch adds per-country caps, PENDING_HOLD / anti-shave hold, and a fraud-score subsystem — not yet merged.
- Two new competitors were processed — **GetLinked** and **Trackbox.ai** — surfacing features the original plan missed (CRG native + auto-invoicing, back-to-back invoice matching, Q-Leads quality score, 3-domain white-label, login-anomaly security alerts).
- Gap analysis surfaced universal omissions across all 6 competitors: **Idempotency-Key in intake** and **E.164 phone normalization** — cheap wedges nobody currently does.

This document rescopes the roadmap into four explicit versions, solo-developable over ~16 months.

## 2. Constraints

- **Team:** solo (one developer + Claude).
- **v1.0 target GA:** ~10 September 2026 (≈16 weeks from 2026-04-20).
- **Scope preference:** full core + full main feature set in v1.0 — no "wedge-first minimal MVP."
- **Cadence:** 4 versions, roughly quarterly, spanning Sept 2026 → end of 2027.

## 3. Approach — Capability-layered

Each version adds one layer of capability on top of the previous, rather than mixing unrelated themes:

| Version | Target date | Theme |
|---|---|---|
| **v1.0** | 2026-09-10 | **Core** — intake → routing → delivery → fraud → analytics v1 → ops |
| **v1.5** | 2026-12 | **Analytics & Ops ergonomics** — BI builder, visual rule-builder, workflow productivity |
| **v2.0** | 2027-Q2 | **Monetize & Scale** — white-label, billing (incl. CRG), compliance, Telegram Mini App |
| **v2.5** | 2027-Q4 | **Intelligence & Platform** — ML fraud, public API, provider API, PWA mobile |

**Rationale:** solo developer avoids cross-layer thrash; each layer is independently valuable to sell; wedges (idempotency, Q-Leads, public pricing, Telegram Mini App) are distributed so every version has at least one distinctive sales story.

## 4. v1.0 — Core (16-week sprint breakdown)

8 × 2-week sprints. W1 begins 2026-04-21.

| Sprint | Weeks | Focus | Deliverables |
|---|---|---|---|
| **S1** | W1–2 | Wave1 merge + security hardening | Merge `wave1-parity-gaps` into `main` (per-country caps, `PENDING_HOLD`, fraud score). Enable fraud-score enforcement (auto-reject at threshold). Add `Idempotency-Key` header support to `/api/v1/leads` + `/api/v1/leads/bulk`. E.164 phone normalization at intake. API tokens: IP whitelist, scoped lifetime, per-key rate limits. Add nullable `tenantId` column to primary tables as forward-compat for v2.0 white-label. |
| **S2** | W3–4 | EPIC-08 Autologin + SLA | Proxy pipeline (proxy pool + health monitoring), 4-stage monitoring (request → captcha → auth → session), SLA tracker targeting 99.5% uptime. Q-Leads quality score (0–100 probabilistic scoring layered on top of fraud signals). |
| **S3** | W5–6 | EPIC-09 UAD + RBAC upgrades | Automated Lead Delivery: cold-overflow queue, retry ladder (`10s, 60s, 5m, 15m, 1h`), fallback to manual queue + alerts. Per-column RBAC (hide fields by role — e.g., affiliate role cannot see broker-side PII). |
| **S4** | W7–8 | EPIC-10 Analytics v1 | Dashboard with 4 drill-down types (Metric / Conversions / Rejects / Revenue), period-compare, shareable tokenized links, save-filter presets. Pre-aggregated materialized views for hourly/daily/weekly roll-ups. |
| **S5** | W9–10 | EPIC-11 Telegram ops bot | 20+ event types (NEW_LEAD, PUSHED, FTD, FAILED, cap_reached, broker_down, fraud_hit, pending_hold_start, pending_hold_released, shave_suspected, autologin_down, sla_breached, etc.). Subscription management + per-user filters. Command bot (`/stats`, `/ack`, `/pause_broker`, `/resume_broker`). |
| **S6** | W11–12 | EPIC-12 P&L + CRG | Conversion tracking, broker revenue, affiliate payout calculation. **CRG native** (Cost-per-Registration guarantee with auto-invoicing). Back-to-back invoice matching MVP (broker invoice → affiliate payout invoice, single-currency, full-invoice only; partial payments / chargebacks → v2.0). |
| **S7** | W13–14 | EPIC-13 Onboarding wizard | 5-step wizard (create org → add broker from template → add affiliate + issue API key → send test lead → go live). Target: end-to-end < 30 min. ≥10 pre-built broker templates shipped in catalog. Public pricing page. |
| **S8** | W15–16 | Hardening + launch | Perf (autocannon sustained 500 rps + burst 1k rps/60s), full integration smoke, bug triage, monitoring/alerts wired, launch checklist + runbook, public API docs + sandbox. |

**Built-in slack:** one sprint of reserve is implicit — if something slips, back-to-back invoicing (S6) or public pricing page (S7) are first-drop candidates to v1.5.

## 5. v1.5 — Analytics & Ops ergonomics (≈Dec 2026)

- **EPIC-14 BI Report Builder (descoped):** save-filter presets, full drill-down on all 4 types, period-compare, shareable tokenized links, Google Sheets export (if cheap).
- **EPIC-17 → Visual Rule-Builder** (replaces the original AI/ML suggestions framing): flow + branch visual editor in a Leadgreed/HyperOne-hybrid UX, expressive enough for ~90% of routing configurations without a DSL.
- **Broker Clone** (iREV parity): copy a broker's configuration with attribution (`cloned from <X>`).
- **Delayed Actions** (only CRM Mate has this today): schedule routing / cap changes to apply at a future time, removing midnight change-requests for ops.
- **EPIC-18 Status Groups:** 20 canonical statuses × 100+ raw-status mappings; UI for grouping and switching raw → canonical.
- **Q-Leads v1.5:** per-affiliate quality trend in analytics, affiliate scoring visible on the affiliates dashboard.

## 6. v2.0 — Monetize & Scale (≈Q2 2027)

- **EPIC-20 White-Label Multi-Tenant:** 3-domain pattern (network / autologin / API), per-tenant branding, tenant-scoped middleware routing, tenant-scoped data isolation (the `tenantId` column pre-added in v1.0 S1 is now populated and enforced).
- **EPIC-21 Billing:** subscription billing (Stripe or Paddle), invoicing pipeline, CRG full coverage, back-to-back invoicing with partial-payment and chargeback handling.
- **EPIC-22 Compliance hardening:** 2FA enforcement per role, SSO (SAML / Google Workspace), full audit-log UI, login-anomaly detection (Trackbox-style security alerts), IP-restricted admin sessions.
- **Telegram Mini App:** full ops panel inside Telegram's mobile client (view leads / pause broker / acknowledge fraud hit / view stats / switch affiliate).

## 7. v2.5 — Intelligence & Platform (≈Q4 2027)

- **EPIC-23 Smart Fraud ML v2:** behavioral fraud model trained on the v1.0–v2.0 fraud-decision corpus; explainability via per-feature attribution showing the top-3 contributing signals per decision.
- **Cohort / Retention Report** (iREV-pattern; first in industry available on all tiers).
- **EPIC-19 Public API & Developer Portal (scoped):** API-token tiers, rate-limit tiers, public docs site, webhooks catalog, sandbox accessible without registration.
- **Provider API:** 3rd-party CRMs (HubSpot, Bitrix, etc.) plug in as upstream — enterprise use case.
- **EPIC-15 Mobile Dashboard via PWA** (not a separate native app).
- **EPIC-16 Integration Marketplace v2:** public catalog, one-click install, community-contributed broker templates with ratings.

## 8. Competitive positioning

| Version | Unique wedges | Parity closures | Remaining gap |
|---|---|---|---|
| **v1.0** | Idempotency-Key + E.164 normalization (no competitor does this), Q-Leads score (only Trackbox has analogue), Telegram-first 20+ events (vs HyperOne 17), public pricing + $0 setup, onboarding <30 min SLA, explainable fraud via signals + score | Routing engine (WRR / Slots / Schedule / Caps / per-country), broker templates, Autologin SLA, analytics drill-down, CRG native, back-to-back invoicing MVP | White-label, Delayed Actions, Broker Clone, Visual rule-builder, Cohort/Retention, PWA |
| **v1.5** | Delayed Actions (only CRM Mate has this, we'd be second), Q-Leads per-affiliate trend | Visual rule-builder (Leadgreed/HyperOne UX), BI builder (iREV-style), Broker Clone (iREV), Status Groups with 20 canonical statuses | White-label, Billing, Compliance, Mini App |
| **v2.0** | Telegram Mini App (no competitor has this), back-to-back invoicing at full coverage | White-label 3-domain (GetLinked / iREV), SSO + 2FA + audit log (iREV tier), security alerts (Trackbox), CRG full | ML fraud, Public API portal, Marketplace |
| **v2.5** | Provider API (3rd-party CRMs as upstream — unique) | ML fraud (HyperOne + iREV direction), Cohort/Retention (iREV), Public API portal, PWA, Marketplace | — full parity with all 6 competitors |

## 9. Risks & critical path

**v1.0 critical path (sequential due to solo constraint):**
`S1 (wave1 merge) → S2 (Autologin) → S3 (UAD) → S4 (Analytics) → S5 (Telegram) → S6 (CRG) → S7 (Onboarding) → S8 (harden)`

**Hard dependencies:**
- **S1 wave1 merge blocks everything downstream** — fraud-score enforcement must be active before S2 (autologin shouldn't process fraud-hit leads).
- **S6 P&L + CRG** depends on the analytics event schema finalized in S4 (shared conversion events).
- **S7 Onboarding wizard** requires 10+ broker templates; templates must be produced opportunistically during S1–S3 while integrating with real brokers.

**Top risks (descending severity):**

1. **Autologin SLA (S2)** — proxy infrastructure and monitoring are inherently unstable; may take 3–4 weeks instead of 2. *Mitigation:* start with MVP (one proxy provider, 3-stage monitoring); full SLA dashboard lands in S8.
2. **CRG + invoicing (S6)** — financial logic requires legal accuracy; back-to-back matching has edge cases (partial refunds, chargebacks). *Mitigation:* MVP = single-currency, single-invoice; partial/chargeback handling deferred to v2.0.
3. **Analytics performance (S4)** — drill-down on large lead volumes stresses Postgres. *Mitigation:* pre-aggregated materialized views per period (hour / day / week), Redis cache on hot reports.
4. **Solo burnout / context-switching** — 8 distinct epics back-to-back. *Mitigation:* S8 hardening doubles as decompression + tech-debt window; do not sacrifice it even if a prior sprint under-delivered.
5. **Wave1 merge conflicts (S1)** — 21 commits on a stale branch; `main` may have diverged further. *Mitigation:* perform merge on day 1 of S1, not day 10.

**Cross-version dependencies:**
- v1.5 BI builder extends v1.0 analytics schema — no rewrite, additive only.
- v2.0 white-label requires `tenantId` column across primary tables — added (nullable, unenforced) in v1.0 S1 as cheap forward-compat.
- v2.5 Smart Fraud ML requires ≥6 months of production fraud decisions from v1.0 + v1.5; if v1.0 GA slips materially, ML delivery slips proportionally.

## 10. Success criteria (go / no-go gates)

### v1.0 GA (2026-09-10)

**Product:**
- Intake p95 < 500 ms; burst 1 k rps / 60 s with zero drops (autocannon).
- Routing success ≥ 99.9%.
- Autologin SLA uptime ≥ 99.5% measured over 7 days.
- Onboarding: signup → first test lead via wizard in < 30 min (verified across 5 fresh runs).
- Fraud-score enforcement active with auto-reject at configured threshold; false-positive rate < 2% on a manual review of 100 blocked samples.

**Engineering:**
- 100% integration test pass (current 365 + ≥150 new across v1.0 sprints).
- Wave1 merged; all `DEPRECATED compat` / "Operational Follow-up" items in CLAUDE.md closed.
- `perf/intake-load.js` wired into CI.

**GTM:**
- Public pricing page live.
- API docs + sandbox live (minimum: intake + routing + webhook).
- ≥10 broker templates in catalog.
- Launch runbook, alerts, on-call rotation signed off.

### v1.5 (Dec 2026)
- BI builder: save filter → share via link → drill-down works at 3+ levels.
- Visual rule-builder: 5 real customer flows from v1.0 re-created in the visual editor without behavioral diff.
- Delayed Actions: 95% of scheduled changes apply within ±5 min of target window.
- Status Groups: mapping coverage ≥ 95% of top-10 broker statuses.

### v2.0 (Q2 2027)
- White-label: 2+ tenants live on distinct domains with verified data isolation (pentest audit).
- Billing: one end-to-end cycle (subscription → invoice → CRG payout match) on a pilot customer.
- 2FA enforcement: 100% of admin sessions pass 2FA; 0 bypass events in audit log over 30 days.
- Telegram Mini App: 5 core operations (view leads / pause broker / ack alert / view stats / switch affiliate) functional in Telegram mobile.

### v2.5 (Q4 2027)
- Smart Fraud ML: precision ≥ 0.85 @ recall ≥ 0.75 vs v1.0 rule-based baseline; explainability UI shows top-3 contributing features per decision.
- Public API portal: ≥3 external integrations completed via docs without support intervention.
- Provider API: 1 external CRM (HubSpot / Bitrix / similar) connected as upstream on a pilot customer.

## 11. Design system — UI source of truth

All UI work from v1.0 onwards must follow the design system defined in `../../../crm-design/`:

- **Master prototype:** `crm-design/project/ROUTER CRM.html` — read in full before any new UI sprint.
- **Screen-by-screen spec:** `crm-design/project/SPEC.md` — maps every screen to implementation notes (dashboard, leads, routing tree, admin drawers, settings).
- **Component catalog:** `crm-design/project/COMPONENTS.md` — primitives, tokens, oklch colors.
- **JSX stages** (`crm-design/project/src/stage-*.jsx`) — React-like prototypes for each screen, the closest reference to what to ship.

Design-system constants (from `SPEC.md`):
- Sidebar 220 px fixed, topbar 46 px, drawer 540 px slide-in.
- Fonts: Inter 400/500/600, JetBrains Mono 400/500/600.
- Density: 13 px body, 11 px mono labels, 10–11 px meta. Table rows 7–12 px padding. **Never pad to fill space.**
- Dark theme default + light toggle, both derive from a single `theme` prop.
- Keyboard shortcuts: `D L A B R K U G` for nav, `Esc` closes drawer, `/` focuses search on `/leads`.
- Persistence: last route / theme / variant in `localStorage`.

**New screens introduced by this roadmap** must get a prototype in `crm-design/project/src/` before implementation starts:
- v1.0: Analytics dashboard (S4), Telegram bot admin (S5), Onboarding wizard (S7), Public pricing page (S7).
- v1.5: BI builder, Visual rule-builder, Delayed Actions scheduler, Broker Clone flow.
- v2.0: Tenant admin, Billing / invoicing pages, Telegram Mini App layout.
- v2.5: Fraud ML explainability panel, Cohort/Retention report, Developer portal.

## 12. Related documents

> Paths updated 2026-04-22 after the workspace restructure. See `../../../../README.md` at the workspace root for the full map.

- `../../../docs/strategic/strategic_analysis_report.md` — competitive analysis covering Leadgreed, Elnopy, HyperOne, CRM Mate (+ iREV in v1.3).
- `../../../docs/competitor_research/Transcript_videos/GetLinked/`, `../../../docs/competitor_research/Transcript_videos/trackbox/` — new-competitor raw data feeding §8.
- `../../../docs/strategic/GAP_ANALYSIS_v1.md` — sources for Idempotency-Key + E.164 wedges.
- `../../CLAUDE.md` — current-state notes (shipped subsystems, deprecated shims, operational follow-ups).
- `../READINESS_CHECKLIST.md` — living program-state flag updated per release.
- *(historical — moved to Trash 2026-04-22)* `product_backlog/PRODUCT_BACKLOG_v1.md` / `product_backlog/RELEASE_PLAN_SPRINTS_v1.md` — original 23-epic backlog + 24-sprint plan; superseded by §4–§7 above.
- *(historical — merged in v1.0 S1)* `crm-node-wave1/` — wave1 parity branch.

## 13. Open questions

None at spec-write time; all design questions resolved during brainstorming session 2026-04-20. Any new questions surface in the implementation plan phase (next step).
