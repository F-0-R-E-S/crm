# Docs Subsite Plan #1 — Feature Inventory + `docs:regen` Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `docs/feature-inventory.md` — the canonical mapping from ~24 logical blocks of the CRM (intake, routing, fraud, brokers, autologin, billing, telegram, …) to their code surfaces, and build `pnpm docs:regen` — a CLI that auto-extracts the AI-deep layer of documentation (`content/docs/<block>/_deep/*.md`) from Prisma schema, tRPC routers, REST routes, env schema, thrown errors, Telegram events, and pg-boss jobs.

**Architecture:** New directory `crm-node/scripts/docs-regen/` with one extractor per source (`prisma.ts`, `trpc.ts`, `rest.ts`, `env.ts`, `errors.ts`, `telegram.ts`, `jobs.ts`). Each extractor is a pure function `extract(sourceRoot) → Map<BlockId, Section[]>`. A canonical `block-catalog.ts` maps file-path regexes / Prisma model names / router names / REST path prefixes → `BlockId`. The orchestrator CLI walks every extractor, merges sections per block, writes `content/docs/<block>/_deep/<source>.md` with deterministic ordering. `--check` mode diffs against the filesystem and exits 1 on drift (used in CI). The human-facing inventory (`docs/feature-inventory.md`) is rendered from the same `block-catalog.ts` plus per-block counts of the extractor output.

**Tech Stack:** `ts-morph` (TypeScript AST), `yaml` (OpenAPI read — already in repo per S8 `pnpm gen:openapi`), existing Prisma DMMF, `fast-glob`, Biome formatter invoked from Node. No runtime additions — all script-only deps live under `devDependencies`.

**Spec:** Part of the docs-subsite v1 project. Parent tracker: `docs/superpowers/plans/2026-04-22-docs-01-feature-inventory-and-regen.md` (this file). Downstream plans (#2–#6) consume the output.

**Preflight:**
- Dev DB up (`pnpm db:up`) — only for smoke-check Prisma can read schema; no runtime DB needed.
- Working tree clean on `main`.
- `pnpm install` complete.

**Output contract (locked at end of this plan):**
- `crm-node/scripts/docs-regen/index.ts` — CLI entry.
- `crm-node/scripts/docs-regen/block-catalog.ts` — single source of truth for block→code mapping.
- `crm-node/scripts/docs-regen/extractors/{prisma,trpc,rest,env,errors,telegram,jobs}.ts`.
- `crm-node/content/docs/<block>/_deep/{db-schema,trpc-surface,rest-surface,env-vars,error-catalog,telegram-events,jobs,invariants}.md` for each block (not all files exist for every block — only those the extractors produced sections for).
- `crm-node/docs/feature-inventory.md` — canonical human-readable inventory.
- `crm-node/package.json` new scripts: `"docs:regen"`, `"docs:regen:check"`.
- `crm-node/.github/workflows/docs-regen-check.yml` (or extension of existing CI) — fails PR if `_deep/` drifted.

---

### Task 1: Scaffold `scripts/docs-regen/` + package.json wiring

**Files:**
- Create: `crm-node/scripts/docs-regen/index.ts`
- Create: `crm-node/scripts/docs-regen/types.ts`
- Modify: `crm-node/package.json:scripts`
- Test: `crm-node/tests/unit/docs-regen/smoke.test.ts`

- [ ] **Step 1: Write the failing smoke test**

```ts
// crm-node/tests/unit/docs-regen/smoke.test.ts
import { describe, it, expect } from "vitest";
import { runDocsRegen } from "@/../scripts/docs-regen";

describe("docs-regen smoke", () => {
  it("runs in dry mode without throwing and returns a manifest", async () => {
    const manifest = await runDocsRegen({ mode: "dry", cwd: process.cwd() });
    expect(manifest).toHaveProperty("blocks");
    expect(manifest).toHaveProperty("generatedAt");
    expect(Array.isArray(manifest.blocks)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to confirm failure**

Run: `pnpm vitest run tests/unit/docs-regen/smoke.test.ts`
Expected: `Cannot find module '@/../scripts/docs-regen'`.

- [ ] **Step 3: Create minimal types**

```ts
// crm-node/scripts/docs-regen/types.ts
export type BlockId = string;

export interface Section {
  source: "prisma" | "trpc" | "rest" | "env" | "errors" | "telegram" | "jobs" | "invariants";
  heading: string;
  body: string;
  anchor: string;
}

export interface BlockOutput {
  id: BlockId;
  title: string;
  sections: Section[];
}

export interface RegenManifest {
  generatedAt: string;
  blocks: BlockOutput[];
  sourceCommit: string | null;
}

export interface RegenOptions {
  mode: "dry" | "write" | "check";
  cwd: string;
}
```

- [ ] **Step 4: Create minimal CLI stub**

```ts
// crm-node/scripts/docs-regen/index.ts
import type { RegenManifest, RegenOptions } from "./types";

export async function runDocsRegen(opts: RegenOptions): Promise<RegenManifest> {
  return {
    generatedAt: new Date().toISOString(),
    blocks: [],
    sourceCommit: null,
  };
}

if (require.main === module) {
  const mode = (process.argv.includes("--check") ? "check" :
    process.argv.includes("--write") ? "write" : "dry") as RegenOptions["mode"];
  runDocsRegen({ mode, cwd: process.cwd() }).then((m) => {
    console.log(`[docs-regen] mode=${mode} blocks=${m.blocks.length}`);
  });
}
```

- [ ] **Step 5: Register package.json scripts**

Modify `crm-node/package.json`, add under `scripts`:
```json
"docs:regen": "tsx scripts/docs-regen/index.ts --write",
"docs:regen:check": "tsx scripts/docs-regen/index.ts --check",
"docs:regen:dry": "tsx scripts/docs-regen/index.ts"
```

- [ ] **Step 6: Verify test passes**

Run: `pnpm vitest run tests/unit/docs-regen/smoke.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add crm-node/scripts/docs-regen crm-node/tests/unit/docs-regen crm-node/package.json
git commit -m "feat(docs): scaffold docs-regen CLI + smoke test"
```

---

### Task 2: Block catalog — single source of truth

**Files:**
- Create: `crm-node/scripts/docs-regen/block-catalog.ts`
- Test: `crm-node/tests/unit/docs-regen/block-catalog.test.ts`

- [ ] **Step 1: Write the failing test pinning all known blocks**

```ts
// crm-node/tests/unit/docs-regen/block-catalog.test.ts
import { describe, it, expect } from "vitest";
import { BLOCK_CATALOG, resolveBlock } from "@/../scripts/docs-regen/block-catalog";

describe("block catalog", () => {
  it("declares every logical block with stable id, title, order", () => {
    const ids = BLOCK_CATALOG.map((b) => b.id).sort();
    expect(ids).toEqual([
      "alerts",
      "analytics",
      "anti-shave",
      "api-docs",
      "auth-rbac",
      "autologin",
      "billing-subscription",
      "broker-clone",
      "broker-push",
      "conversions-crg",
      "fraud-score",
      "intake",
      "manual-review",
      "multi-tenancy",
      "observability",
      "onboarding",
      "postback-status-groups",
      "quality-score",
      "rate-limiting",
      "routing-engine",
      "routing-ui",
      "scheduled-changes",
      "telegram-bot",
      "webhooks-outbound",
    ]);
  });

  it("resolves prisma model Lead to intake", () => {
    expect(resolveBlock({ kind: "prisma-model", name: "Lead" })).toBe("intake");
  });

  it("resolves prisma model FlowVersion to routing-engine", () => {
    expect(resolveBlock({ kind: "prisma-model", name: "FlowVersion" })).toBe("routing-engine");
  });

  it("resolves REST /api/v1/leads to intake", () => {
    expect(resolveBlock({ kind: "rest-path", name: "/api/v1/leads" })).toBe("intake");
  });

  it("resolves tRPC router finance to conversions-crg", () => {
    expect(resolveBlock({ kind: "trpc-router", name: "finance" })).toBe("conversions-crg");
  });

  it("returns null for unknown input (caller decides what to do)", () => {
    expect(resolveBlock({ kind: "prisma-model", name: "DoesNotExist" })).toBe(null);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/block-catalog.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement the catalog**

```ts
// crm-node/scripts/docs-regen/block-catalog.ts
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
      "Lead", "LeadEvent", "IntakeSettings", "IdempotencyKey", "ApiKey",
      "AffiliateIntakeWebhook", "WebhookDelivery", "Affiliate",
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
    oneLineDescription:
      "FraudPolicy weights, signal computation, auto-reject + borderline review.",
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
      "Flow", "FlowVersion", "FlowBranch", "FlowAlgorithmConfig",
      "FallbackStep", "CapDefinition", "CapCounter", "CapCountryLimit",
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
    oneLineDescription:
      "pg-boss push-lead job, retry ladder, HTTP adapter, broker pool selection.",
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
    oneLineDescription:
      "Broker postback ingestion + canonical status classification (EPIC-18).",
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
      "Conversion", "BrokerPayoutRule", "AffiliatePayoutRule",
      "CRGCohort", "BrokerInvoice", "AffiliateInvoice",
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
    serverDirs: ["src/server/billing"],
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
      "TelegramBotConfig", "TelegramSubscription", "TelegramEventLog", "TelegramLinkToken",
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
    prismaModels: [
      "LeadDailyRoll", "LeadHourlyRoll", "AnalyticsPreset", "AnalyticsShareLink",
    ],
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
    oneLineDescription:
      "Future-apply patches on Flow/Broker/Cap with ±5-min SLA.",
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
    oneLineDescription:
      "Self-relation `Broker.clonedFromId` + blank-secrets clone helper.",
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
    oneLineDescription:
      "Signup → 5-step wizard → test-lead live stream → time-to-first-lead SLA.",
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
    oneLineDescription:
      "Zod-to-OpenAPI generator + Scalar self-hosted viewer at /docs/api.",
    prismaModels: [],
    trpcRouters: [],
    restPathPrefixes: ["/api/v1/openapi"],
    serverDirs: ["scripts/gen-openapi.ts", "src/app/docs/api"],
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
    if (input.kind === "rest-path" && b.restPathPrefixes.some((p) => input.name.startsWith(p))) return b.id;
    if (input.kind === "server-path" && b.serverDirs.some((p) => input.name.startsWith(p))) return b.id;
    if (input.kind === "job-name" && b.jobNames.includes(input.name)) return b.id;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm vitest run tests/unit/docs-regen/block-catalog.test.ts`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/block-catalog.ts crm-node/tests/unit/docs-regen/block-catalog.test.ts
git commit -m "feat(docs): declare block catalog with 24 logical blocks"
```

---

### Task 3: Prisma extractor → `_deep/db-schema.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/prisma.ts`
- Test: `crm-node/tests/unit/docs-regen/prisma-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/prisma-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractPrisma } from "@/../scripts/docs-regen/extractors/prisma";

describe("prisma extractor", () => {
  it("emits a section for the intake block covering Lead + LeadEvent", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    const intake = out.get("intake");
    expect(intake).toBeDefined();
    expect(intake!.some((s) => s.heading.includes("Lead"))).toBe(true);
    expect(intake!.some((s) => s.heading.includes("LeadEvent"))).toBe(true);
  });

  it("renders field-granular blocks (one H3 per model, one bullet per field)", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    const leadSection = out.get("intake")?.find((s) => s.heading === "Lead");
    expect(leadSection).toBeDefined();
    // every Lead field from schema appears as `- **name** type (nullable? index? default?)`
    expect(leadSection!.body).toMatch(/- \*\*id\*\*/);
    expect(leadSection!.body).toMatch(/- \*\*state\*\* `LeadState`/);
    expect(leadSection!.body).toMatch(/- \*\*fraudScore\*\*/);
  });

  it("emits sections for enums referenced by tracked models", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    const flat = [...out.values()].flat();
    const leadStateEnum = flat.find((s) => s.heading === "enum LeadState");
    expect(leadStateEnum).toBeDefined();
    expect(leadStateEnum!.body).toMatch(/- NEW/);
    expect(leadStateEnum!.body).toMatch(/- REJECTED_FRAUD/);
  });

  it("groups unknown models under __unassigned__ instead of dropping", async () => {
    const out = await extractPrisma({ schemaPath: "prisma/schema.prisma" });
    // __unassigned__ may be empty; key must exist so the drift check surfaces new models.
    expect(out.has("__unassigned__")).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/prisma-extractor.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement using Prisma DMMF**

```ts
// crm-node/scripts/docs-regen/extractors/prisma.ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDMMF } from "@prisma/internals";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";

export interface PrismaExtractOpts {
  schemaPath: string;
  cwd?: string;
}

export async function extractPrisma(
  opts: PrismaExtractOpts,
): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const datamodel = await readFile(resolve(cwd, opts.schemaPath), "utf8");
  const dmmf = await getDMMF({ datamodel });

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  const usedEnums = new Set<string>();

  for (const model of dmmf.datamodel.models) {
    const block = resolveBlock({ kind: "prisma-model", name: model.name }) ?? "__unassigned__";
    const lines: string[] = [];
    lines.push(`Database-backed model. Source: \`prisma/schema.prisma\`.`, "");
    for (const field of model.fields) {
      if (field.kind === "enum") usedEnums.add(field.type);
      const parts: string[] = [];
      parts.push(`\`${field.type}${field.isList ? "[]" : ""}${field.isRequired ? "" : "?"}\``);
      if (field.isId) parts.push("**id**");
      if (field.isUnique) parts.push("unique");
      if (field.hasDefaultValue) {
        const d = JSON.stringify(field.default);
        parts.push(`default=${d}`);
      }
      if (field.relationName) parts.push(`relation→${field.relationName}`);
      lines.push(`- **${field.name}** ${parts.join(" ")}`);
    }
    if (model.uniqueIndexes.length) {
      lines.push("", "**Unique indexes:**");
      for (const ui of model.uniqueIndexes) {
        lines.push(`- (${ui.fields.join(", ")})`);
      }
    }
    if (model.primaryKey) {
      lines.push("", `**Composite PK:** (${model.primaryKey.fields.join(", ")})`);
    }

    out.get(block)!.push({
      source: "prisma",
      heading: model.name,
      anchor: `db-${model.name.toLowerCase()}`,
      body: lines.join("\n"),
    });
  }

  for (const enumDef of dmmf.datamodel.enums) {
    if (!usedEnums.has(enumDef.name)) continue;
    // Attach enum to the first block that references any field of that type.
    let ownerBlock: BlockId = "__unassigned__";
    for (const model of dmmf.datamodel.models) {
      if (model.fields.some((f) => f.type === enumDef.name)) {
        ownerBlock = resolveBlock({ kind: "prisma-model", name: model.name }) ?? ownerBlock;
        break;
      }
    }
    const body =
      `Enum referenced by one or more models.\n\n` +
      enumDef.values.map((v) => `- ${v.name}`).join("\n");
    out.get(ownerBlock)!.push({
      source: "prisma",
      heading: `enum ${enumDef.name}`,
      anchor: `db-enum-${enumDef.name.toLowerCase()}`,
      body,
    });
  }

  return out;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/prisma-extractor.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/prisma.ts crm-node/tests/unit/docs-regen/prisma-extractor.test.ts
git commit -m "feat(docs): prisma DMMF extractor for db-schema.md"
```

---

### Task 4: tRPC extractor (ts-morph) → `_deep/trpc-surface.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/trpc.ts`
- Test: `crm-node/tests/unit/docs-regen/trpc-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/trpc-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractTrpc } from "@/../scripts/docs-regen/extractors/trpc";

describe("trpc extractor", () => {
  it("produces a section per procedure in the analytics router under block analytics", async () => {
    const out = await extractTrpc({ routersDir: "src/server/routers" });
    const analytics = out.get("analytics") ?? [];
    const procs = analytics.map((s) => s.heading);
    expect(procs).toContain("analytics.metricSeries");
    expect(procs).toContain("analytics.drillDown");
    expect(procs).toContain("analytics.savePreset");
  });

  it("tags each procedure with authn level (public/protected/admin/superAdmin)", async () => {
    const out = await extractTrpc({ routersDir: "src/server/routers" });
    const finance = out.get("conversions-crg") ?? [];
    const pnl = finance.find((s) => s.heading === "finance.pnl");
    expect(pnl).toBeDefined();
    expect(pnl!.body).toMatch(/authn: (protected|admin)/);
  });

  it("emits input schema shape when it is a ZodObject literal", async () => {
    const out = await extractTrpc({ routersDir: "src/server/routers" });
    const statusMap = out.get("postback-status-groups") ?? [];
    const suggest = statusMap.find((s) => s.heading === "statusMapping.suggestFor");
    expect(suggest).toBeDefined();
    expect(suggest!.body).toMatch(/input:/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/trpc-extractor.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement extractor**

```ts
// crm-node/scripts/docs-regen/extractors/trpc.ts
import fg from "fast-glob";
import { Project, SyntaxKind, Node } from "ts-morph";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";

const AUTH_BUILDER_TO_LEVEL: Record<string, string> = {
  publicProcedure: "public",
  protectedProcedure: "protected",
  adminProcedure: "admin",
  superAdminProcedure: "superAdmin",
};

export interface TrpcExtractOpts {
  routersDir: string; // "src/server/routers"
  cwd?: string;
}

export async function extractTrpc(
  opts: TrpcExtractOpts,
): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.routersDir}/**/*.ts`, { cwd, absolute: true });
  const project = new Project({ tsConfigFilePath: `${cwd}/tsconfig.json` });
  for (const f of files) project.addSourceFileAtPathIfExists(f);

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  for (const sf of project.getSourceFiles()) {
    const defaultExport = sf.getExportSymbols().find((s) => s.getName().endsWith("Router"));
    const routerName = routerNameFromFile(sf.getFilePath());
    if (!routerName) continue;
    const block = resolveBlock({ kind: "trpc-router", name: routerName }) ?? "__unassigned__";

    // Naive: look for `createTRPCRouter({ <proc>: <builder>.input(...).query/mutation(...) })`
    const routerCall = sf.getDescendantsOfKind(SyntaxKind.CallExpression).find((c) => {
      const expr = c.getExpression().getText();
      return expr === "createTRPCRouter" || expr.endsWith(".createTRPCRouter");
    });
    if (!routerCall) continue;
    const obj = routerCall.getArguments()[0];
    if (!obj || !obj.asKind(SyntaxKind.ObjectLiteralExpression)) continue;

    for (const prop of obj.asKindOrThrow(SyntaxKind.ObjectLiteralExpression).getProperties()) {
      if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
      const propAssignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const procName = propAssignment.getName();
      const init = propAssignment.getInitializer();
      if (!init) continue;
      const chain = init.getText();

      let authn = "unknown";
      for (const [builder, level] of Object.entries(AUTH_BUILDER_TO_LEVEL)) {
        if (chain.includes(builder)) { authn = level; break; }
      }

      const kind = chain.includes(".mutation(") ? "mutation"
        : chain.includes(".query(") ? "query"
        : chain.includes(".subscription(") ? "subscription" : "unknown";

      // input shape: capture the first `.input(z.object({...}))` text (string-based, best-effort).
      const inputMatch = chain.match(/\.input\(\s*z\.(object|discriminatedUnion|union|string|array|enum|literal|number|boolean|unknown)\([\s\S]*?\)\s*\)/);
      const inputText = inputMatch ? inputMatch[0].slice(7, -1) : "—";

      const body =
        `Procedure \`${routerName}.${procName}\` — authn: ${authn}, kind: ${kind}.\n\n` +
        `input: ${inputText}\n\n` +
        `Source: \`${relativePath(sf.getFilePath(), cwd)}\``;

      out.get(block)!.push({
        source: "trpc",
        heading: `${routerName}.${procName}`,
        anchor: `trpc-${routerName}-${procName}`.toLowerCase(),
        body,
      });
    }
  }
  return out;
}

function routerNameFromFile(fp: string): string | null {
  const m = fp.match(/\/routers\/([^/]+)\.ts$/);
  return m ? m[1] : null;
}
function relativePath(abs: string, cwd: string): string {
  return abs.startsWith(cwd) ? abs.slice(cwd.length + 1) : abs;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/trpc-extractor.test.ts`
Expected: PASS (3/3). If a procedure isn't picked up, iterate on the chain-matching (string-based is acceptable for v1; AST-based traversal is a parking-lot improvement).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/trpc.ts crm-node/tests/unit/docs-regen/trpc-extractor.test.ts
git commit -m "feat(docs): trpc AST extractor for trpc-surface.md"
```

---

### Task 5: REST extractor → `_deep/rest-surface.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/rest.ts`
- Test: `crm-node/tests/unit/docs-regen/rest-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/rest-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractRest } from "@/../scripts/docs-regen/extractors/rest";

describe("rest extractor", () => {
  it("walks src/app/api/**/route.ts and emits one section per HTTP verb", async () => {
    const out = await extractRest({ appApiDir: "src/app/api" });
    const intake = out.get("intake") ?? [];
    expect(intake.some((s) => s.heading === "POST /api/v1/leads")).toBe(true);
    expect(intake.some((s) => s.heading === "POST /api/v1/leads/bulk")).toBe(true);
  });

  it("resolves dynamic segments to brace form", async () => {
    const out = await extractRest({ appApiDir: "src/app/api" });
    const postbacks = out.get("postback-status-groups") ?? [];
    expect(postbacks.some((s) => s.heading === "POST /api/v1/postbacks/{brokerId}")).toBe(true);
  });

  it("prefers merged OpenAPI spec when available", async () => {
    const out = await extractRest({
      appApiDir: "src/app/api",
      openapiYamlPath: "docs/api/v1/openapi.yaml",
    });
    const intake = out.get("intake") ?? [];
    const postLeads = intake.find((s) => s.heading === "POST /api/v1/leads");
    expect(postLeads!.body).toMatch(/Request body/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/rest-extractor.test.ts`

- [ ] **Step 3: Implement extractor**

```ts
// crm-node/scripts/docs-regen/extractors/rest.ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fg from "fast-glob";
import yaml from "yaml";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";

export interface RestExtractOpts {
  appApiDir: string;
  openapiYamlPath?: string;
  cwd?: string;
}

const VERBS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export async function extractRest(opts: RestExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.appApiDir}/**/route.ts`, { cwd, absolute: true });

  const openapi = opts.openapiYamlPath
    ? (yaml.parse(await readFile(resolve(cwd, opts.openapiYamlPath), "utf8")) as any)
    : null;

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  for (const file of files) {
    const src = await readFile(file, "utf8");
    const verbs = VERBS.filter((v) =>
      new RegExp(`export\\s+async\\s+function\\s+${v}\\s*\\(`).test(src) ||
      new RegExp(`export\\s+const\\s+${v}\\s*=`).test(src),
    );
    if (!verbs.length) continue;
    const path = appRouteToPath(file, cwd, opts.appApiDir);
    const block = resolveBlock({ kind: "rest-path", name: path }) ?? "__unassigned__";

    for (const verb of verbs) {
      const heading = `${verb} ${path}`;
      const openapiOp =
        openapi?.paths?.[path]?.[verb.toLowerCase()] ??
        openapi?.paths?.[path.replace(/\{([^}]+)\}/g, ":$1")]?.[verb.toLowerCase()];
      const bodyParts: string[] = [];
      if (openapiOp?.summary) bodyParts.push(openapiOp.summary);
      if (openapiOp?.description) bodyParts.push(openapiOp.description);
      if (openapiOp?.requestBody) {
        bodyParts.push("\n**Request body**\n```yaml\n" +
          yaml.stringify(openapiOp.requestBody) + "```");
      }
      if (openapiOp?.responses) {
        bodyParts.push("\n**Responses**\n```yaml\n" +
          yaml.stringify(openapiOp.responses) + "```");
      }
      if (!bodyParts.length) bodyParts.push(`Handler: \`${relative(file, cwd)}\``);

      out.get(block)!.push({
        source: "rest",
        heading,
        anchor: `rest-${verb.toLowerCase()}-${path.replace(/[^a-z0-9]/gi, "-")}`.toLowerCase(),
        body: bodyParts.join("\n\n"),
      });
    }
  }
  return out;
}

function relative(abs: string, cwd: string): string {
  return abs.startsWith(cwd) ? abs.slice(cwd.length + 1) : abs;
}
function appRouteToPath(file: string, cwd: string, appApiDir: string): string {
  const rel = relative(file, cwd);
  const withoutRoute = rel
    .replace(new RegExp(`^${appApiDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "/api")
    .replace(/\/route\.ts$/, "");
  return withoutRoute.replace(/\[([^\]]+)\]/g, "{$1}");
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/rest-extractor.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/rest.ts crm-node/tests/unit/docs-regen/rest-extractor.test.ts
git commit -m "feat(docs): REST route extractor for rest-surface.md"
```

---

### Task 6: Env extractor → `_deep/env-vars.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/env.ts`
- Test: `crm-node/tests/unit/docs-regen/env-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/env-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractEnv } from "@/../scripts/docs-regen/extractors/env";

describe("env extractor", () => {
  it("parses src/lib/env.ts and returns one section per var tagged to its block", async () => {
    const map = await extractEnv({ envFilePath: "src/lib/env.ts" });
    const billing = map.get("billing-subscription") ?? [];
    expect(billing.some((s) => s.heading === "STRIPE_SECRET_KEY")).toBe(true);
    expect(billing.some((s) => s.heading === "STRIPE_WEBHOOK_SECRET")).toBe(true);

    const tg = map.get("telegram-bot") ?? [];
    expect(tg.some((s) => s.heading === "TELEGRAM_WEBHOOK_BASE_URL")).toBe(true);
  });

  it("vars without a block stay under __shared__", async () => {
    const map = await extractEnv({ envFilePath: "src/lib/env.ts" });
    const shared = map.get("__shared__") ?? [];
    expect(shared.some((s) => s.heading === "DATABASE_URL")).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/env-extractor.test.ts`

- [ ] **Step 3: Implement extractor**

```ts
// crm-node/scripts/docs-regen/extractors/env.ts
import { Project, SyntaxKind } from "ts-morph";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG } from "../block-catalog";

// Hand-maintained lookup — not worth AST-parsing magic prefixes.
// NB: if you add a new env var, add a mapping here, or it goes to __shared__.
const ENV_PREFIX_TO_BLOCK: Array<[RegExp, BlockId]> = [
  [/^STRIPE_/, "billing-subscription"],
  [/^TELEGRAM_/, "telegram-bot"],
  [/^FRAUD_/, "fraud-score"],
  [/^ROUTING_/, "routing-engine"],
  [/^AUTOLOGIN_|PROXY_/, "autologin"],
  [/^ANALYTICS_/, "analytics"],
  [/^RATELIMIT_|^RATE_LIMIT_/, "rate-limiting"],
  [/^ONBOARDING_|^SIGNUP_/, "onboarding"],
  [/^MANUAL_QUEUE_/, "manual-review"],
  [/^AUDIT_/, "intake"],
  [/^ROOT_DOMAIN$/, "multi-tenancy"],
];

export interface EnvExtractOpts {
  envFilePath: string;
  cwd?: string;
}

export async function extractEnv(opts: EnvExtractOpts): Promise<Map<BlockId | "__shared__", Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const project = new Project({ tsConfigFilePath: `${cwd}/tsconfig.json` });
  const sf = project.addSourceFileAtPath(`${cwd}/${opts.envFilePath}`);

  const out = new Map<BlockId | "__shared__", Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__shared__", []);

  // Find the main `z.object({ ... })` schema literal.
  const zObjects = sf.getDescendantsOfKind(SyntaxKind.CallExpression).filter((c) =>
    c.getExpression().getText() === "z.object");
  for (const call of zObjects) {
    const arg = call.getArguments()[0];
    if (!arg?.isKind(SyntaxKind.ObjectLiteralExpression)) continue;
    for (const prop of arg.asKindOrThrow(SyntaxKind.ObjectLiteralExpression).getProperties()) {
      if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
      const pa = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
      const name = pa.getName().replace(/['"]/g, "");
      const init = pa.getInitializer();
      if (!init) continue;

      const block = resolveEnvBlock(name);
      const body =
        `Environment variable. Zod schema fragment:\n\n` +
        "```ts\n" + `${name}: ${init.getText()}` + "\n```";

      out.get(block)!.push({
        source: "env",
        heading: name,
        anchor: `env-${name.toLowerCase()}`,
        body,
      });
    }
  }
  return out;
}

function resolveEnvBlock(name: string): BlockId | "__shared__" {
  for (const [re, block] of ENV_PREFIX_TO_BLOCK) if (re.test(name)) return block;
  return "__shared__";
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/env-extractor.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/env.ts crm-node/tests/unit/docs-regen/env-extractor.test.ts
git commit -m "feat(docs): env.ts extractor for env-vars.md"
```

---

### Task 7: Error catalog extractor → `_deep/error-catalog.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/errors.ts`
- Test: `crm-node/tests/unit/docs-regen/errors-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/errors-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractErrors } from "@/../scripts/docs-regen/extractors/errors";

describe("errors extractor", () => {
  it("finds TRPCError throws and assigns them to the block that owns the file", async () => {
    const map = await extractErrors({ srcDir: "src" });
    const billing = map.get("billing-subscription") ?? [];
    expect(billing.some((s) => s.heading === "stripe_not_configured")).toBe(true);
  });

  it("records filename:line for each throw", async () => {
    const map = await extractErrors({ srcDir: "src" });
    const intake = map.get("intake") ?? [];
    expect(intake.length).toBeGreaterThan(0);
    expect(intake[0].body).toMatch(/\.ts:\d+/);
  });

  it("distinguishes TRPCError code vs plain Error message", async () => {
    const map = await extractErrors({ srcDir: "src" });
    const flat = [...map.values()].flat();
    expect(flat.some((s) => s.body.includes("TRPCError"))).toBe(true);
    expect(flat.some((s) => s.body.includes("Error:"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/errors-extractor.test.ts`

- [ ] **Step 3: Implement extractor**

```ts
// crm-node/scripts/docs-regen/extractors/errors.ts
import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";

// Rough regexes — we do not need full AST for errors; line-based is robust enough.
const TRPC_ERROR_RE = /new\s+TRPCError\s*\(\s*{\s*code:\s*['"]([^'"]+)['"]\s*,\s*message:\s*['"]([^'"]+)['"]/g;
const PLAIN_ERROR_RE = /throw\s+new\s+Error\s*\(\s*['"`]([^'"`]+)['"`]/g;

export interface ErrorsExtractOpts {
  srcDir: string;
  cwd?: string;
}

export async function extractErrors(opts: ErrorsExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg(`${opts.srcDir}/**/*.ts`, { cwd, absolute: true });

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  for (const file of files) {
    const src = await readFile(file, "utf8");
    const rel = file.slice(cwd.length + 1);
    const block = resolveBlock({ kind: "server-path", name: rel }) ?? "__unassigned__";

    let m;
    while ((m = TRPC_ERROR_RE.exec(src)) !== null) {
      const line = src.slice(0, m.index).split("\n").length;
      out.get(block)!.push({
        source: "errors",
        heading: m[2], // message is the unique key (e.g. "stripe_not_configured")
        anchor: `err-${m[2]}`.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
        body: `TRPCError code=\`${m[1]}\` message=\`${m[2]}\` at \`${rel}:${line}\`.`,
      });
    }
    while ((m = PLAIN_ERROR_RE.exec(src)) !== null) {
      const line = src.slice(0, m.index).split("\n").length;
      out.get(block)!.push({
        source: "errors",
        heading: `Error: ${m[1]}`,
        anchor: `err-plain-${m[1]}`.replace(/[^a-z0-9]/gi, "-").toLowerCase(),
        body: `Plain Error: \`${m[1]}\` at \`${rel}:${line}\`.`,
      });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/errors-extractor.test.ts`
Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/errors.ts crm-node/tests/unit/docs-regen/errors-extractor.test.ts
git commit -m "feat(docs): TRPCError + plain Error extractor for error-catalog.md"
```

---

### Task 8: Telegram event-catalog extractor → `_deep/telegram-events.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/telegram.ts`
- Test: `crm-node/tests/unit/docs-regen/telegram-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/telegram-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractTelegram } from "@/../scripts/docs-regen/extractors/telegram";

describe("telegram extractor", () => {
  it("lists every TelegramEventType under telegram-bot block", async () => {
    const map = await extractTelegram({
      catalogPath: "src/server/telegram/event-catalog.ts",
      templatesDir: "src/server/telegram/templates",
    });
    const tg = map.get("telegram-bot") ?? [];
    expect(tg.some((s) => s.heading === "NEW_LEAD")).toBe(true);
    expect(tg.some((s) => s.heading === "FTD")).toBe(true);
    expect(tg.some((s) => s.heading === "SUBSCRIPTION_CREATED")).toBe(true);
    expect(tg.length).toBeGreaterThanOrEqual(23);
  });

  it("links each event to its template file", async () => {
    const map = await extractTelegram({
      catalogPath: "src/server/telegram/event-catalog.ts",
      templatesDir: "src/server/telegram/templates",
    });
    const ftd = (map.get("telegram-bot") ?? []).find((s) => s.heading === "FTD");
    expect(ftd).toBeDefined();
    expect(ftd!.body).toMatch(/templates\/ftd\.ts/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/telegram-extractor.test.ts`

- [ ] **Step 3: Implement extractor**

```ts
// crm-node/scripts/docs-regen/extractors/telegram.ts
import { Project, SyntaxKind } from "ts-morph";
import fg from "fast-glob";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG } from "../block-catalog";

export interface TelegramExtractOpts {
  catalogPath: string;
  templatesDir: string;
  cwd?: string;
}

export async function extractTelegram(opts: TelegramExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const project = new Project({ tsConfigFilePath: `${cwd}/tsconfig.json` });
  const sf = project.addSourceFileAtPath(`${cwd}/${opts.catalogPath}`);

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);

  // Look for `TELEGRAM_EVENT_TYPES = [...] as const` or an enum; fall back to string-literal scan.
  const text = sf.getFullText();
  const literals = Array.from(text.matchAll(/['"]([A-Z_]{3,})['"]/g))
    .map((m) => m[1])
    .filter((s) => /^[A-Z][A-Z_]+$/.test(s));
  const unique = [...new Set(literals)];

  const templateFiles = await fg(`${opts.templatesDir}/*.ts`, { cwd, absolute: true });
  const templateBySlug = new Map<string, string>();
  for (const f of templateFiles) {
    const slug = f.split("/").pop()!.replace(/\.ts$/, "");
    templateBySlug.set(slug, f.slice(cwd.length + 1));
  }

  for (const ev of unique) {
    const slug = ev.toLowerCase().replace(/_/g, "-");
    const templatePath = templateBySlug.get(slug) ?? `(no template matched slug "${slug}")`;
    out.get("telegram-bot")!.push({
      source: "telegram",
      heading: ev,
      anchor: `tg-${slug}`,
      body:
        `Telegram event \`${ev}\`.\n\nTemplate: \`${templatePath}\`.\n\n` +
        `Defined in \`${opts.catalogPath}\`. Emit site: grep the codebase for \`emitTelegramEvent("${ev}"\`.`,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/telegram-extractor.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/telegram.ts crm-node/tests/unit/docs-regen/telegram-extractor.test.ts
git commit -m "feat(docs): telegram event-catalog extractor"
```

---

### Task 9: pg-boss jobs extractor → `_deep/jobs.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/extractors/jobs.ts`
- Test: `crm-node/tests/unit/docs-regen/jobs-extractor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/jobs-extractor.test.ts
import { describe, it, expect } from "vitest";
import { extractJobs } from "@/../scripts/docs-regen/extractors/jobs";

describe("jobs extractor", () => {
  it("finds push-lead job and tags it under broker-push", async () => {
    const map = await extractJobs({ jobsDir: "src/server/jobs" });
    const brokerPush = map.get("broker-push") ?? [];
    expect(brokerPush.some((s) => s.heading === "push-lead")).toBe(true);
  });

  it("includes cron schedule when present", async () => {
    const map = await extractJobs({ jobsDir: "src/server/jobs" });
    const analytics = map.get("analytics") ?? [];
    const daily = analytics.find((s) => s.heading === "analytics-roll-daily");
    expect(daily).toBeDefined();
    expect(daily!.body).toMatch(/schedule/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/unit/docs-regen/jobs-extractor.test.ts`

- [ ] **Step 3: Implement extractor**

```ts
// crm-node/scripts/docs-regen/extractors/jobs.ts
import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import type { BlockId, Section } from "../types";
import { BLOCK_CATALOG, resolveBlock } from "../block-catalog";

// Conventions: jobName exposed as `export const JOB_NAMES = { ... } as const;` inside each file,
// OR derived from filename (e.g. push-lead.ts → "push-lead").
// Cron schedules: grep for `pgboss.schedule("<name>", "<cron>"` or similar.
const SCHEDULE_RE = /\.schedule\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
const JOB_NAMES_RE = /JOB_NAMES\s*=\s*({[\s\S]+?})\s*as\s+const/;

export interface JobsExtractOpts {
  jobsDir: string;
  cwd?: string;
}

export async function extractJobs(opts: JobsExtractOpts): Promise<Map<BlockId, Section[]>> {
  const cwd = opts.cwd ?? process.cwd();
  const files = await fg([`${opts.jobsDir}/**/*.ts`, "src/worker.ts"], { cwd, absolute: true });

  const out = new Map<BlockId, Section[]>();
  for (const b of BLOCK_CATALOG) out.set(b.id, []);
  out.set("__unassigned__", []);

  // pass 1 — collect schedules from worker.ts
  const schedules = new Map<string, string>();
  for (const f of files) {
    const src = await readFile(f, "utf8");
    let m;
    while ((m = SCHEDULE_RE.exec(src)) !== null) schedules.set(m[1], m[2]);
  }

  // pass 2 — job files themselves
  for (const f of files) {
    if (!f.includes("/jobs/")) continue;
    const jobName = f.split("/").pop()!.replace(/\.ts$/, "");
    const block = resolveBlock({ kind: "job-name", name: jobName }) ?? "__unassigned__";
    const schedule = schedules.get(jobName);
    const rel = f.slice(cwd.length + 1);

    const body =
      `pg-boss job \`${jobName}\`.\n\n` +
      (schedule ? `**Schedule:** \`${schedule}\`\n\n` : "**Schedule:** on-demand (enqueued from code).\n\n") +
      `Handler: \`${rel}\``;

    out.get(block)!.push({
      source: "jobs",
      heading: jobName,
      anchor: `job-${jobName}`,
      body,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/jobs-extractor.test.ts`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/extractors/jobs.ts crm-node/tests/unit/docs-regen/jobs-extractor.test.ts
git commit -m "feat(docs): pg-boss jobs extractor"
```

---

### Task 10: Orchestrator — merge + write `_deep/*.md` + manifest

**Files:**
- Modify: `crm-node/scripts/docs-regen/index.ts`
- Create: `crm-node/scripts/docs-regen/render.ts`
- Test: `crm-node/tests/integration/docs-regen-orchestrator.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// crm-node/tests/integration/docs-regen-orchestrator.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { runDocsRegen } from "@/../scripts/docs-regen";

const CONTENT_ROOT = resolve(process.cwd(), "content/docs");

describe("docs-regen orchestrator (write mode)", () => {
  beforeAll(async () => {
    await rm(CONTENT_ROOT, { recursive: true, force: true });
  });

  it("writes _deep files for every block with extracted content", async () => {
    const manifest = await runDocsRegen({ mode: "write", cwd: process.cwd() });
    expect(manifest.blocks.length).toBeGreaterThan(0);

    const intakeSchema = await readFile(resolve(CONTENT_ROOT, "intake/_deep/db-schema.md"), "utf8");
    expect(intakeSchema).toMatch(/# Lead/);
    expect(intakeSchema).toMatch(/audience: ai-deep/);
    expect(intakeSchema).toMatch(/source: auto-gen/);

    const intakeTrpc = await readFile(resolve(CONTENT_ROOT, "intake/_deep/trpc-surface.md"), "utf8");
    expect(intakeTrpc).toMatch(/lead\./);
  });

  it("check mode returns drift=false on a freshly written tree", async () => {
    await runDocsRegen({ mode: "write", cwd: process.cwd() });
    const manifest = await runDocsRegen({ mode: "check", cwd: process.cwd() });
    expect(manifest).toHaveProperty("drift");
    expect((manifest as any).drift).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `pnpm vitest run tests/integration/docs-regen-orchestrator.test.ts`
Expected: `_deep` paths not written / `drift` property missing.

- [ ] **Step 3: Implement renderer**

```ts
// crm-node/scripts/docs-regen/render.ts
import type { Section } from "./types";

export function renderDeepFile(opts: {
  block: string;
  source: Section["source"];
  sections: Section[];
}): string {
  const title = sourceTitle(opts.source);
  const frontmatter = [
    "---",
    `audience: ai-deep`,
    `block: ${opts.block}`,
    `source: auto-gen`,
    `kind: ${opts.source}`,
    `title: "${title} — ${opts.block}"`,
    "---",
    "",
  ].join("\n");

  const body = opts.sections
    .sort((a, b) => a.heading.localeCompare(b.heading))
    .map((s) => `# ${s.heading}\n<a id="${s.anchor}"></a>\n\n${s.body.trim()}\n`)
    .join("\n---\n\n");

  return `${frontmatter}${body}\n`;
}

function sourceTitle(src: Section["source"]): string {
  switch (src) {
    case "prisma": return "DB Schema";
    case "trpc": return "tRPC Surface";
    case "rest": return "REST Surface";
    case "env": return "Environment Variables";
    case "errors": return "Error Catalog";
    case "telegram": return "Telegram Events";
    case "jobs": return "Jobs";
    case "invariants": return "Invariants";
  }
}
```

- [ ] **Step 4: Implement orchestrator**

```ts
// crm-node/scripts/docs-regen/index.ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import fg from "fast-glob";
import type { BlockId, BlockOutput, RegenManifest, RegenOptions, Section } from "./types";
import { BLOCK_CATALOG } from "./block-catalog";
import { extractPrisma } from "./extractors/prisma";
import { extractTrpc } from "./extractors/trpc";
import { extractRest } from "./extractors/rest";
import { extractEnv } from "./extractors/env";
import { extractErrors } from "./extractors/errors";
import { extractTelegram } from "./extractors/telegram";
import { extractJobs } from "./extractors/jobs";
import { renderDeepFile } from "./render";

export async function runDocsRegen(opts: RegenOptions): Promise<RegenManifest & { drift?: string[] }> {
  const cwd = opts.cwd;
  const [prisma, trpc, rest, env, errors, telegram, jobs] = await Promise.all([
    extractPrisma({ schemaPath: "prisma/schema.prisma", cwd }),
    extractTrpc({ routersDir: "src/server/routers", cwd }),
    extractRest({ appApiDir: "src/app/api", openapiYamlPath: "docs/api/v1/openapi.yaml", cwd }),
    extractEnv({ envFilePath: "src/lib/env.ts", cwd }),
    extractErrors({ srcDir: "src", cwd }),
    extractTelegram({ catalogPath: "src/server/telegram/event-catalog.ts", templatesDir: "src/server/telegram/templates", cwd }),
    extractJobs({ jobsDir: "src/server/jobs", cwd }),
  ]);

  const merged = new Map<BlockId, Record<Section["source"], Section[]>>();
  for (const b of BLOCK_CATALOG) {
    merged.set(b.id, { prisma: [], trpc: [], rest: [], env: [], errors: [], telegram: [], jobs: [], invariants: [] });
  }
  mergeInto(merged, prisma, "prisma");
  mergeInto(merged, trpc, "trpc");
  mergeInto(merged, rest, "rest");
  // Env output has an extra "__shared__" key — emit it under every block that uses a matching prefix? No — we attach shared vars once per block that has at least one matched var, and list all __shared__ inline on each block.
  mergeInto(merged, stripKey(env, "__shared__"), "env");
  const sharedEnv = env.get("__shared__") ?? [];
  if (sharedEnv.length) {
    for (const block of merged.keys()) merged.get(block)!.env.push(...sharedEnv);
  }
  mergeInto(merged, errors, "errors");
  mergeInto(merged, telegram, "telegram");
  mergeInto(merged, jobs, "jobs");

  const blocksOut: BlockOutput[] = [];
  const drift: string[] = [];

  for (const b of BLOCK_CATALOG) {
    const bySource = merged.get(b.id)!;
    const sectionsAll: Section[] = [];
    for (const [source, sections] of Object.entries(bySource) as [Section["source"], Section[]][]) {
      if (!sections.length) continue;
      sectionsAll.push(...sections);
      const relPath = `content/docs/${b.id}/_deep/${source}.md`;
      const absPath = resolve(cwd, relPath);
      const body = renderDeepFile({ block: b.id, source, sections });

      if (opts.mode === "write") {
        await mkdir(dirname(absPath), { recursive: true });
        await writeFile(absPath, body, "utf8");
      } else if (opts.mode === "check") {
        const existing = await readFileSafe(absPath);
        if (existing !== body) drift.push(relPath);
      }
    }
    blocksOut.push({ id: b.id, title: b.title, sections: sectionsAll });
  }

  return {
    generatedAt: new Date().toISOString(),
    blocks: blocksOut,
    sourceCommit: null,
    ...(opts.mode === "check" ? { drift } : {}),
  };
}

function mergeInto(
  target: Map<BlockId, Record<Section["source"], Section[]>>,
  src: Map<string, Section[]>,
  key: Section["source"],
) {
  for (const [blockId, sections] of src) {
    if (!target.has(blockId)) continue; // drop __unassigned__ silently; see invariants task for promotion
    target.get(blockId)![key].push(...sections);
  }
}
function stripKey<K, V>(m: Map<K, V>, k: K): Map<K, V> {
  const out = new Map(m);
  out.delete(k);
  return out;
}
async function readFileSafe(p: string): Promise<string | null> {
  try { return await (await import("node:fs/promises")).readFile(p, "utf8"); } catch { return null; }
}

if (require.main === module) {
  const mode = process.argv.includes("--check") ? "check"
    : process.argv.includes("--write") ? "write" : "dry";
  runDocsRegen({ mode, cwd: process.cwd() }).then((m: any) => {
    console.log(`[docs-regen] mode=${mode} blocks=${m.blocks.length}`);
    if (mode === "check" && m.drift?.length) {
      console.error(`[docs-regen] DRIFT in ${m.drift.length} files:`);
      for (const d of m.drift) console.error(`  ${d}`);
      process.exit(1);
    }
  });
}
```

- [ ] **Step 5: Run test**

Run: `pnpm vitest run tests/integration/docs-regen-orchestrator.test.ts`
Expected: both cases PASS.

- [ ] **Step 6: Commit**

```bash
git add crm-node/scripts/docs-regen/index.ts crm-node/scripts/docs-regen/render.ts crm-node/tests/integration/docs-regen-orchestrator.test.ts
git commit -m "feat(docs): docs-regen orchestrator + check mode"
```

---

### Task 11: Hand-written invariants stubs

**Files:**
- Create: one `content/docs/<block>/_deep/invariants.md` per block
- Create: `crm-node/scripts/docs-regen/invariant-stubs.ts`
- Test: `crm-node/tests/unit/docs-regen/invariants-scaffold.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/invariants-scaffold.test.ts
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BLOCK_CATALOG } from "@/../scripts/docs-regen/block-catalog";

describe("invariants stubs", () => {
  for (const b of BLOCK_CATALOG) {
    it(`${b.id} has _deep/invariants.md with the right frontmatter`, async () => {
      const content = await readFile(
        resolve(process.cwd(), `content/docs/${b.id}/_deep/invariants.md`),
        "utf8",
      );
      expect(content).toMatch(/audience: ai-deep/);
      expect(content).toMatch(/source: hand/);
      expect(content).toMatch(new RegExp(`block: ${b.id}`));
    });
  }
});
```

- [ ] **Step 2: Scaffold generator**

```ts
// crm-node/scripts/docs-regen/invariant-stubs.ts
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { BLOCK_CATALOG } from "./block-catalog";

async function exists(p: string) {
  try { await access(p); return true; } catch { return false; }
}

export async function scaffoldInvariantStubs(cwd = process.cwd()): Promise<string[]> {
  const created: string[] = [];
  for (const b of BLOCK_CATALOG) {
    const path = resolve(cwd, `content/docs/${b.id}/_deep/invariants.md`);
    if (await exists(path)) continue;
    await mkdir(dirname(path), { recursive: true });
    const body = [
      "---",
      `audience: ai-deep`,
      `block: ${b.id}`,
      `source: hand`,
      `kind: invariants`,
      `title: "Invariants — ${b.title}"`,
      "---",
      "",
      `# Invariants — ${b.title}`,
      "",
      `> Non-obvious rules, edge cases, and facts that are NOT derivable from code.`,
      `> Auto-gen sources cover structure; this file covers **why it must be that way**.`,
      "",
      "<!-- Add one H2 per invariant. Example:",
      "",
      "## Fraud score is never recomputed after intake",
      "",
      "- **Rule:** once `Lead.fraudScore` is written, no code path mutates it.",
      "- **Why:** reprocessing would break the hash-chain of `LeadEvent.FRAUD_SCORED`.",
      "- **Failure mode if violated:** audit-chain verification fails on that lead.",
      "-->",
      "",
    ].join("\n");
    await writeFile(path, body, "utf8");
    created.push(path);
  }
  return created;
}

if (require.main === module) {
  scaffoldInvariantStubs().then((x) => console.log(`[invariants] scaffolded ${x.length} files`));
}
```

- [ ] **Step 3: Run scaffold once**

Run: `pnpm tsx scripts/docs-regen/invariant-stubs.ts`
Expected: "scaffolded N files" printed.

- [ ] **Step 4: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/invariants-scaffold.test.ts`
Expected: all 24 PASS.

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen/invariant-stubs.ts crm-node/content/docs crm-node/tests/unit/docs-regen/invariants-scaffold.test.ts
git commit -m "feat(docs): scaffold hand-written invariants stubs per block"
```

---

### Task 12: Write canonical `docs/feature-inventory.md`

**Files:**
- Create: `crm-node/scripts/docs-regen/inventory.ts`
- Create: `crm-node/docs/feature-inventory.md`
- Test: `crm-node/tests/unit/docs-regen/inventory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// crm-node/tests/unit/docs-regen/inventory.test.ts
import { describe, it, expect } from "vitest";
import { renderInventory } from "@/../scripts/docs-regen/inventory";

describe("inventory renderer", () => {
  it("renders one H2 per block in order, with counts + links", () => {
    const md = renderInventory([
      { id: "intake", title: "Lead Intake", counts: { prisma: 8, trpc: 12, rest: 4, env: 1, errors: 9, telegram: 2, jobs: 0 } },
      { id: "fraud-score", title: "Fraud Score", counts: { prisma: 2, trpc: 2, rest: 0, env: 0, errors: 1, telegram: 1, jobs: 0 } },
    ]);
    expect(md).toMatch(/## Lead Intake/);
    expect(md).toMatch(/\| Source \| Count \| Link \|/);
    expect(md).toMatch(/\[db-schema.md\]\(\.\.\/content\/docs\/intake\/_deep\/db-schema\.md\)/);
    expect(md.indexOf("Lead Intake")).toBeLessThan(md.indexOf("Fraud Score"));
  });
});
```

- [ ] **Step 2: Implement renderer + wire orchestrator to emit inventory**

```ts
// crm-node/scripts/docs-regen/inventory.ts
export interface InventoryInput {
  id: string;
  title: string;
  counts: Record<string, number>;
}

export function renderInventory(blocks: InventoryInput[]): string {
  const lines: string[] = [
    "# CRM Feature Inventory",
    "",
    "> Auto-generated by `pnpm docs:regen`. Do not edit by hand — edit the block catalog or invariants files.",
    "",
  ];
  for (const b of blocks) {
    lines.push(`## ${b.title}`);
    lines.push(`- **Block id:** \`${b.id}\``);
    lines.push(`- **Human-layer directory:** \`content/docs/${b.id}/\``);
    lines.push(`- **AI-deep directory:** \`content/docs/${b.id}/_deep/\``);
    lines.push("");
    lines.push("| Source | Count | Link |");
    lines.push("|---|---:|---|");
    for (const [src, n] of Object.entries(b.counts)) {
      if (!n) continue;
      lines.push(`| ${src} | ${n} | [${src === "prisma" ? "db-schema" : src === "trpc" ? "trpc-surface" : src === "rest" ? "rest-surface" : src === "env" ? "env-vars" : src === "errors" ? "error-catalog" : src === "telegram" ? "telegram-events" : "jobs"}.md](../content/docs/${b.id}/_deep/${src === "prisma" ? "db-schema" : src === "trpc" ? "trpc-surface" : src === "rest" ? "rest-surface" : src === "env" ? "env-vars" : src === "errors" ? "error-catalog" : src === "telegram" ? "telegram-events" : "jobs"}.md) |`);
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}
```

Then modify `scripts/docs-regen/index.ts` to emit inventory at the end of `runDocsRegen`:
```ts
// at the bottom of runDocsRegen, before return
const inventoryMd = renderInventory(blocksOut.map((bo) => ({
  id: bo.id,
  title: BLOCK_CATALOG.find((b) => b.id === bo.id)!.title,
  counts: tallyCounts(bo.sections),
})));
if (opts.mode === "write") {
  await writeFile(resolve(cwd, "docs/feature-inventory.md"), inventoryMd, "utf8");
}
```
Add the tally helper at the bottom of index.ts:
```ts
function tallyCounts(sections: Section[]) {
  const r: Record<string, number> = {};
  for (const s of sections) r[s.source] = (r[s.source] ?? 0) + 1;
  return r;
}
```

- [ ] **Step 3: Run test**

Run: `pnpm vitest run tests/unit/docs-regen/inventory.test.ts`
Expected: PASS.

- [ ] **Step 4: Regenerate everything**

Run: `pnpm docs:regen`
Expected: `content/docs/` populated + `docs/feature-inventory.md` created.

- [ ] **Step 5: Commit**

```bash
git add crm-node/scripts/docs-regen crm-node/content/docs crm-node/docs/feature-inventory.md crm-node/tests/unit/docs-regen/inventory.test.ts
git commit -m "feat(docs): canonical feature-inventory.md + auto-gen _deep/*.md"
```

---

### Task 13: CI guard — fail PRs on drift

**Files:**
- Modify: `crm-node/.github/workflows/ci.yml` (or the equivalent existing workflow)
- Test: none (CI is the test)

- [ ] **Step 1: Locate the current CI workflow**

Run:
```bash
ls -la crm-node/.github/workflows/
```
Identify the primary workflow (likely `ci.yml` or `checks.yml`). If none exists, create `crm-node/.github/workflows/docs-regen-check.yml`.

- [ ] **Step 2: Add a job step**

Append to the existing typecheck/lint job (after `pnpm install`):
```yaml
- name: docs-regen drift check
  run: pnpm docs:regen:check
```

- [ ] **Step 3: Verify locally**

Run:
```bash
pnpm docs:regen && pnpm docs:regen:check
```
Expected: first command writes files; second exits 0.

- [ ] **Step 4: Force a drift and confirm it fails**

Temporarily add a field to `prisma/schema.prisma` (e.g. `Lead.testDriftField String?`), then:
```bash
pnpm docs:regen:check
```
Expected: exit 1, drift list printed. Revert the schema change.

- [ ] **Step 5: Commit**

```bash
git add crm-node/.github/workflows
git commit -m "ci: fail PR on docs-regen drift"
```

---

### Task 14: `CHANGELOG.md` + READINESS_CHECKLIST flip

**Files:**
- Modify: `crm-node/CHANGELOG.md`
- Modify: `crm-node/docs/superpowers/READINESS_CHECKLIST.md`

- [ ] **Step 1: Prepend a new entry to CHANGELOG.md**

```markdown
## Unreleased — Docs infrastructure wave 1

- **Feature inventory generator.** `pnpm docs:regen` auto-extracts DB schema (Prisma DMMF), tRPC procedures (ts-morph), REST routes (walk `src/app/api/**/route.ts` + merge OpenAPI), env vars (`src/lib/env.ts`), TRPCError/plain throws, Telegram event catalog, and pg-boss jobs into `content/docs/<block>/_deep/*.md`. Canonical inventory at `docs/feature-inventory.md`. CI guard `pnpm docs:regen:check` fails PRs on drift.
- **Block catalog.** 24 logical blocks declared in `scripts/docs-regen/block-catalog.ts` — single source of truth mapping Prisma models / routers / REST paths / server dirs / job names → block id.
```

- [ ] **Step 2: Add a READINESS line**

In `crm-node/docs/superpowers/READINESS_CHECKLIST.md`, find or create the "Docs infra" section and add:
```markdown
- [x] Feature inventory generator + `pnpm docs:regen` + CI drift guard — #2026-04-22-docs-01
```

- [ ] **Step 3: typecheck + lint + test pass**

Run:
```bash
pnpm typecheck && pnpm lint && pnpm vitest run tests/unit/docs-regen tests/integration/docs-regen-orchestrator.test.ts
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add crm-node/CHANGELOG.md crm-node/docs/superpowers/READINESS_CHECKLIST.md
git commit -m "docs: note docs-regen shipping in changelog + readiness checklist"
```

---

### Task 15: Self-review

- [ ] **Step 1: Spec coverage**

Every extractor from plan overview is implemented (Prisma, tRPC, REST, env, errors, telegram, jobs). Invariants stub present. Inventory rendered. CI guard wired.

- [ ] **Step 2: Manual drift test**

Run:
```bash
pnpm docs:regen
git status --short content/ docs/feature-inventory.md
```
Expected: changes staged. Then flip back:
```bash
pnpm docs:regen:check
```
Expected: exit 0.

- [ ] **Step 3: Confirm `_deep/` directories are ignored for RSS/sitemaps (deferred to plan #2)**

Nothing to assert here — plan #2 handles the visibility filter. Note the dependency in the inventory: `content/docs/<block>/_deep/` MUST be excluded from nav/routing in plan #2.

- [ ] **Step 4: Hand off**

Print: "Plan #1 complete. Proceed to plan #2 (`2026-04-22-docs-02-subsite-skeleton.md`) to render this content as a subsite."
