import type { BlockId } from "./types";

export interface BlockDef {
  id: BlockId;
  title: string;
  order: number;
  oneLineDescription: string;
  prismaModels: string[];
  trpcRouters: string[];
  restPathPrefixes: string[];
  serverDirs: string[];
  jobNames: string[];
}

export const BLOCK_CATALOG: BlockDef[] = [
  {
    id: "intake",
    title: "Lead Intake",
    order: 1,
    oneLineDescription:
      "External `/api/v1/leads` + bulk, schema registry, sandbox, idempotency, intake-settings.",
    prismaModels: [
      "Lead",
      "LeadEvent",
      "IntakeSettings",
      "IdempotencyKey",
      "ApiKey",
      "AffiliateIntakeWebhook",
      "WebhookDelivery",
      "Affiliate",
    ],
    trpcRouters: ["lead", "affiliate", "apiKey"],
    restPathPrefixes: ["/api/v1/leads", "/api/v1/schema", "/api/v1/errors"],
    serverDirs: ["src/server/intake", "src/server/schema", "src/server/audit"],
    jobNames: [],
  },
  {
    id: "fraud-score",
    title: "Fraud Score",
    order: 2,
    oneLineDescription: "FraudPolicy weights, signal computation, auto-reject + borderline review.",
    prismaModels: ["FraudPolicy", "BlacklistEntry"],
    trpcRouters: ["fraud"],
    restPathPrefixes: [],
    serverDirs: ["src/server/intake/fraud-score.ts", "src/server/intake/fraud-signals.ts"],
    jobNames: [],
  },
  {
    id: "quality-score",
    title: "Quality Score (Q-Leads)",
    order: 3,
    oneLineDescription:
      "0..100 lead quality w/ affiliate-history + geo components; v1.5 trend adjustment.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: ["src/server/intake/quality-score.ts"],
    jobNames: [],
  },
  {
    id: "routing-engine",
    title: "Routing Engine",
    order: 4,
    oneLineDescription:
      "Flow/FlowVersion/FlowBranch + WRR + Slots-Chance + GEO/schedule/caps constraints + fallback orchestrator.",
    prismaModels: [
      "Flow",
      "FlowVersion",
      "FlowBranch",
      "FlowAlgorithmConfig",
      "FallbackStep",
      "CapDefinition",
      "CapCounter",
      "CapCountryLimit",
      "RotationRule",
    ],
    trpcRouters: ["routing"],
    restPathPrefixes: ["/api/v1/routing"],
    serverDirs: ["src/server/routing"],
    jobNames: [],
  },
  {
    id: "routing-ui",
    title: "Routing UI",
    order: 5,
    oneLineDescription: "Visual flow editor (reactflow), simulator, dashboard overview.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: ["src/app/dashboard/routing", "src/components/routing-editor"],
    jobNames: [],
  },
  {
    id: "broker-push",
    title: "Broker Push",
    order: 6,
    oneLineDescription: "pg-boss push-lead job, retry ladder, HTTP adapter, broker pool selection.",
    prismaModels: ["Broker", "BrokerTemplate"],
    trpcRouters: ["broker"],
    restPathPrefixes: [],
    serverDirs: ["src/server/jobs/push-lead.ts", "src/server/brokers"],
    jobNames: ["push-lead"],
  },
  {
    id: "postback-status-groups",
    title: "Postback + Status Groups",
    order: 7,
    oneLineDescription: "Broker postback ingestion + canonical status classification (EPIC-18).",
    prismaModels: ["CanonicalStatus", "StatusMapping"],
    trpcRouters: ["statusMapping"],
    restPathPrefixes: ["/api/v1/postbacks"],
    serverDirs: ["src/server/status-groups", "src/app/api/v1/postbacks"],
    jobNames: [],
  },
  {
    id: "autologin",
    title: "Autologin",
    order: 8,
    oneLineDescription:
      "Proxy pool, Playwright adapters, INITIATING→SESSION_READY state machine, SLA.",
    prismaModels: ["ProxyEndpoint", "AutologinAttempt"],
    trpcRouters: ["autologin"],
    restPathPrefixes: ["/api/v1/autologin"],
    serverDirs: ["src/server/autologin"],
    jobNames: ["autologin-attempt", "proxy-health"],
  },
  {
    id: "anti-shave",
    title: "Anti-shave / PENDING_HOLD",
    order: 9,
    oneLineDescription:
      "Broker.pendingHoldMinutes + `resolve-pending-hold` + SHAVE_SUSPECTED LeadEvent.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: ["src/server/jobs/resolve-pending-hold.ts"],
    jobNames: ["resolve-pending-hold"],
  },
  {
    id: "manual-review",
    title: "Manual Review (UAD)",
    order: 10,
    oneLineDescription:
      "ManualReviewQueue cold overflow + configurable retry ladder + per-column RBAC.",
    prismaModels: ["ManualReviewQueue"],
    trpcRouters: ["manualReview", "rbacPreview"],
    restPathPrefixes: ["/api/v1/manual-review"],
    serverDirs: ["src/server/routing/manual-queue.ts", "src/server/rbac"],
    jobNames: ["manual-queue-depth-check"],
  },
  {
    id: "conversions-crg",
    title: "Conversions + CRG + Finance",
    order: 11,
    oneLineDescription:
      "Conversion ingest, PayoutRules, CRG cohorts, BrokerInvoice/AffiliateInvoice, P&L.",
    prismaModels: [
      "Conversion",
      "BrokerPayoutRule",
      "AffiliatePayoutRule",
      "CRGCohort",
      "BrokerInvoice",
      "AffiliateInvoice",
    ],
    trpcRouters: ["finance"],
    restPathPrefixes: [],
    serverDirs: ["src/server/finance"],
    jobNames: ["crg-cohort-settle"],
  },
  {
    id: "billing-subscription",
    title: "Billing & Stripe Subscription",
    order: 12,
    oneLineDescription:
      "Subscription, PaymentMethod, Invoice (platform-level), quota gate, Stripe webhook.",
    prismaModels: ["Subscription", "PaymentMethod", "Invoice"],
    trpcRouters: ["billing"],
    restPathPrefixes: ["/api/stripe/webhook"],
    serverDirs: ["src/server/billing", "src/server/routers/billing.ts"],
    jobNames: [],
  },
  {
    id: "multi-tenancy",
    title: "Multi-Tenancy",
    order: 13,
    oneLineDescription:
      "Tenant model, AsyncLocalStorage `withTenant`, Prisma $use middleware, 3-domain hostname routing.",
    prismaModels: ["Tenant"],
    trpcRouters: ["tenant"],
    restPathPrefixes: [],
    serverDirs: ["src/server/db-tenant.ts", "src/server/tenant", "src/middleware.ts"],
    jobNames: [],
  },
  {
    id: "auth-rbac",
    title: "Auth & RBAC",
    order: 14,
    oneLineDescription: "NextAuth Credentials + JWT, UserRole enum, per-column redaction.",
    prismaModels: ["User", "Account", "Session"],
    trpcRouters: [],
    restPathPrefixes: ["/api/auth"],
    serverDirs: ["src/auth.ts", "src/server/rbac"],
    jobNames: [],
  },
  {
    id: "telegram-bot",
    title: "Telegram Ops Bot",
    order: 15,
    oneLineDescription:
      "28 event types, subscriptions with filters, commands, link tokens, anomaly-detect + daily-summary.",
    prismaModels: [
      "TelegramBotConfig",
      "TelegramSubscription",
      "TelegramEventLog",
      "TelegramLinkToken",
    ],
    trpcRouters: ["telegram", "telegramAdmin"],
    restPathPrefixes: ["/api/telegram/webhook"],
    serverDirs: ["src/server/telegram"],
    jobNames: ["telegram-send", "anomaly-detect", "daily-summary"],
  },
  {
    id: "webhooks-outbound",
    title: "Outbound Webhooks",
    order: 16,
    oneLineDescription:
      "Affiliate-facing HMAC-signed postbacks, 5-retry ladder, auto-pause on HTTP 410.",
    prismaModels: ["AffiliateIntakeWebhook", "WebhookDelivery"],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: ["src/server/webhooks", "src/server/jobs/intake-webhook-delivery.ts"],
    jobNames: ["intake-webhook-delivery"],
  },
  {
    id: "analytics",
    title: "Analytics (BI Report Builder)",
    order: 17,
    oneLineDescription:
      "Rollups, service procs, period-compare, presets (default + rename), drill-down, share-links.",
    prismaModels: ["LeadDailyRoll", "LeadHourlyRoll", "AnalyticsPreset", "AnalyticsShareLink"],
    trpcRouters: ["analytics"],
    restPathPrefixes: ["/api/v1/analytics"],
    serverDirs: ["src/server/analytics"],
    jobNames: ["analytics-roll-daily", "analytics-roll-hourly"],
  },
  {
    id: "alerts",
    title: "Alerts",
    order: 18,
    oneLineDescription:
      "6 rules, evaluator with dedupe+auto-resolve, AlertLog, Telegram ALERT_TRIGGERED, ack UI.",
    prismaModels: ["AlertLog"],
    trpcRouters: ["alertLog"],
    restPathPrefixes: [],
    serverDirs: ["src/server/alerts"],
    jobNames: ["alerts-evaluator"],
  },
  {
    id: "scheduled-changes",
    title: "Scheduled Changes",
    order: 19,
    oneLineDescription: "Future-apply patches on Flow/Broker/Cap with ±5-min SLA.",
    prismaModels: ["ScheduledChange"],
    trpcRouters: ["scheduledChange"],
    restPathPrefixes: [],
    serverDirs: ["src/server/scheduled-changes"],
    jobNames: ["apply-scheduled-changes"],
  },
  {
    id: "broker-clone",
    title: "Broker Clone",
    order: 20,
    oneLineDescription: "Self-relation `Broker.clonedFromId` + blank-secrets clone helper.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: ["src/server/brokers/clone.ts"],
    jobNames: [],
  },
  {
    id: "onboarding",
    title: "Onboarding Wizard",
    order: 21,
    oneLineDescription: "Signup → 5-step wizard → test-lead live stream → time-to-first-lead SLA.",
    prismaModels: ["Org", "OnboardingProgress"],
    trpcRouters: ["onboarding"],
    restPathPrefixes: ["/api/v1/onboarding"],
    serverDirs: ["src/server/onboarding", "src/app/onboarding"],
    jobNames: [],
  },
  {
    id: "observability",
    title: "Observability",
    order: 22,
    oneLineDescription:
      "pino logger, structured events, `/api/v1/health` + `/api/v1/metrics/summary`, rolling counters.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: ["/api/v1/health", "/api/v1/metrics"],
    serverDirs: ["src/server/observability.ts", "src/server/metrics"],
    jobNames: [],
  },
  {
    id: "rate-limiting",
    title: "Rate Limiting",
    order: 23,
    oneLineDescription: "Redis-backed sliding-window limiter used by intake + signup.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: ["src/server/ratelimit.ts"],
    jobNames: [],
  },
  {
    id: "api-docs",
    title: "API Docs (OpenAPI + Scalar)",
    order: 24,
    oneLineDescription: "Zod-to-OpenAPI generator + Scalar self-hosted viewer at /docs/api.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: ["/api/v1/openapi"],
    serverDirs: ["scripts/gen-openapi.ts", "src/app/docs/api"],
    jobNames: [],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    order: 0,
    oneLineDescription: "Landing pages — install, first lead push, glossary, architecture tour.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: [],
    jobNames: [],
  },
  {
    id: "glossary",
    title: "Glossary",
    order: 99,
    oneLineDescription: "Canonical terminology — affiliate, broker, flow, cap, shave, postback, …",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: [],
    jobNames: [],
  },
  {
    id: "architecture",
    title: "Architecture Tour",
    order: 100,
    oneLineDescription: "System diagram + data flow + module map.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: [],
    serverDirs: [],
    jobNames: [],
  },
];

export type ResolveInput =
  | { kind: "prisma-model"; name: string }
  | { kind: "trpc-router"; name: string }
  | { kind: "rest-path"; name: string }
  | { kind: "server-path"; name: string }
  | { kind: "job-name"; name: string };

export function resolveBlock(input: ResolveInput): BlockId | null {
  for (const b of BLOCK_CATALOG) {
    if (input.kind === "prisma-model" && b.prismaModels.includes(input.name)) return b.id;
    if (input.kind === "trpc-router" && b.trpcRouters.includes(input.name)) return b.id;
    if (input.kind === "rest-path" && b.restPathPrefixes.some((p) => input.name.startsWith(p)))
      return b.id;
    if (input.kind === "server-path" && b.serverDirs.some((p) => input.name.startsWith(p)))
      return b.id;
    if (input.kind === "job-name" && b.jobNames.includes(input.name)) return b.id;
  }
  return null;
}
