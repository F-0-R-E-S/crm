/**
 * Zod-driven OpenAPI spec generator (v1.0.1).
 *
 * Wires `@asteasolutions/zod-to-openapi` against the schemas in
 * `src/server/schema/registry.ts` to produce components + the `/leads` POST,
 * `/leads/bulk` POST, and `/health` GET paths directly from Zod. Remaining
 * paths (routing simulate, schema discovery, error catalog, metrics summary,
 * bulk job status) are kept hand-authored and merged in — they expose
 * internal runtime shapes that don't live in the intake schema registry.
 *
 * Output: `docs/api/v1/openapi.yaml` (source of truth for Scalar) and
 * `docs/api/v1/openapi.json` (sibling for Postman/k6/etc.).
 *
 * Invoked via `pnpm openapi:build`; also wired under the legacy
 * `pnpm gen:openapi` alias.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import YAML from "yaml";
import { z } from "zod";
import { intakeSchema_2026_01 } from "../src/server/schema/v2026-01";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "api-key",
});

// ---- Error component (hand-authored; matches the runtime envelope) ----
const ErrorBody = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      field: z.string().optional(),
      trace_id: z.string().optional(),
    }),
  })
  .openapi("Error");
registry.register("Error", ErrorBody);

// ---- Lead payload (drawn from the registry) ----
const LeadCreate = intakeSchema_2026_01.openapi("LeadCreate", {
  description: "Single-lead intake payload (schema version 2026-01).",
});

const LeadAcceptedResponse = z
  .object({
    trace_id: z.string(),
    lead_id: z.string(),
    status: z.string().openapi({ example: "received" }),
  })
  .openapi("LeadAcceptedResponse");
registry.register("LeadAcceptedResponse", LeadAcceptedResponse);

const BulkLeadsRequest = z
  .object({
    leads: z.array(LeadCreate),
  })
  .openapi("BulkLeadsRequest");
registry.register("BulkLeadsRequest", BulkLeadsRequest);

const BulkJobStatus = z
  .object({
    status: z.string(),
    completed: z.number().int(),
    failed: z.number().int(),
    total: z.number().int(),
  })
  .openapi("BulkJobStatus");
registry.register("BulkJobStatus", BulkJobStatus);

const HealthBody = z
  .object({
    status: z.enum(["ok", "degraded"]),
    db: z.string(),
    redis: z.string(),
    queue: z.object({
      pending: z.number().int(),
      failed_last_hour: z.number().int(),
    }),
    version: z.string(),
  })
  .openapi("Health");
registry.register("Health", HealthBody);

// ---- Paths (zod-generated) ----
registry.registerPath({
  method: "post",
  path: "/api/v1/leads",
  tags: ["Intake"],
  summary: "Submit a single lead",
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({
      "x-api-version": z.string().openapi({ example: "2026-01" }),
      "x-idempotency-key": z.string().optional(),
      "x-trace-id": z.string().optional(),
    }),
    body: {
      required: true,
      content: { "application/json": { schema: LeadCreate } },
    },
  },
  responses: {
    202: {
      description: "Accepted; async processing",
      content: { "application/json": { schema: LeadAcceptedResponse } },
    },
    401: {
      description: "invalid api key",
      content: { "application/json": { schema: ErrorBody } },
    },
    403: {
      description: "ip not allowed or sandbox mismatch",
      content: { "application/json": { schema: ErrorBody } },
    },
    409: {
      description: "idempotency conflict",
      content: { "application/json": { schema: ErrorBody } },
    },
    422: {
      description: "validation error or fraud auto-reject",
      content: { "application/json": { schema: ErrorBody } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/leads/bulk",
  tags: ["Intake"],
  summary: "Submit a batch of leads (sync ≤50, async >50)",
  security: [{ bearerAuth: [] }],
  request: {
    headers: z.object({ "x-api-version": z.string() }),
    body: {
      required: true,
      content: { "application/json": { schema: BulkLeadsRequest } },
    },
  },
  responses: {
    202: { description: "queued async job — returns job_id" },
    207: { description: "multi-status — per-lead results for sync batches" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/health",
  tags: ["Operations"],
  summary: "Health check",
  responses: {
    200: {
      description: "ok",
      content: { "application/json": { schema: HealthBody } },
    },
    503: { description: "degraded" },
  },
});

// ---- Simulate request / response (Zod-generated; matches route.ts shapes) ----

const SimulateLeadPayload = z.object({
  geo: z.string().length(2).openapi({ example: "UA" }),
  affiliate_id: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  sub_id: z.string().optional(),
  utm: z.record(z.string(), z.unknown()).optional(),
});

// Single-lead variant — flow_id + lead
const SimulateSingleRequest = z.object({
  flow_id: z.string(),
  lead: SimulateLeadPayload,
});

// Batch variant — flow_id + leads array; the route dispatches on which key is present
const SimulateBatchRequest = z.object({
  flow_id: z.string(),
  leads: z.array(SimulateLeadPayload),
});

// The request body accepts either shape; we expose the single-lead variant as
// the primary documented schema (the batch form has an identical wrapper).
const SimulateRequestSchema = SimulateSingleRequest.openapi("RoutingSimulateRequest");
registry.register("RoutingSimulateRequest", SimulateRequestSchema);

// Mirrors SimulateExplain from src/server/routing/simulator.ts
const SimulateResponseSchema = z
  .object({
    selected_target: z.string().nullable(),
    selected_broker_id: z.string().nullable(),
    algorithm_used: z.string().nullable(),
    algorithm_source: z.string().nullable(),
    filters_applied: z.array(
      z.object({
        step: z.string(),
        node_id: z.string().optional(),
        ok: z.boolean(),
        detail: z.unknown().optional(),
      }),
    ),
    fallback_path: z.array(z.object({ from: z.string(), to: z.string(), reason: z.string() })),
    outcome: z.string(),
    reason: z.string().nullable(),
    decision_time_ms: z.number(),
    trace_token: z.string().nullable(),
    flow_version_id: z.string(),
  })
  .openapi("RoutingSimulateResponse");
registry.register("RoutingSimulateResponse", SimulateResponseSchema);

// ---- Errors catalog response (Zod-generated; matches route.ts shape) ----

// Each entry uses the field names from src/app/api/v1/errors/route.ts CATALOG
const ErrorCatalogEntry = z.object({
  error_code: z.string().openapi({ example: "validation_error" }),
  http_status: z.number().int().openapi({ example: 422 }),
  description: z.string(),
  fix_hint: z.string(),
});

const ErrorsCatalogResponseSchema = z
  .object({
    errors: z.array(ErrorCatalogEntry),
    count: z.number().int(),
  })
  .openapi("ErrorsCatalogResponse");
registry.register("ErrorsCatalogResponse", ErrorsCatalogResponseSchema);

// ---- Zod-generated paths: simulate + errors ----

registry.registerPath({
  method: "post",
  path: "/api/v1/routing/simulate",
  tags: ["Routing"],
  summary: "Simulate routing without persisting",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: SimulateRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Sync simulation result (single lead)",
      content: { "application/json": { schema: SimulateResponseSchema } },
    },
    202: { description: "Queued async batch — returns job_id" },
    401: { description: "Unauthorized", content: { "application/json": { schema: ErrorBody } } },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorBody } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/errors",
  tags: ["Schema"],
  summary: "List all documented error codes and sandbox outcomes",
  responses: {
    200: {
      description: "Error + sandbox-outcome catalog",
      content: { "application/json": { schema: ErrorsCatalogResponseSchema } },
    },
  },
});

// ---- Hand-authored paths (kept verbatim until the rest of the surface is Zod-ified) ----
// Cast as `any` — zod-to-openapi's runtime PathsObject is looser than the
// strict openapi3-ts typings it exports; we validate the merged output in
// `tests/unit/openapi-spec.test.ts`.
// biome-ignore lint/suspicious/noExplicitAny: openapi3-ts ParametersObject is stricter than needed
const HAND_AUTHORED_PATHS: Record<string, any> = {
  "/api/v1/leads/bulk/{jobId}": {
    get: {
      tags: ["Intake"],
      summary: "Get bulk job status",
      security: [{ bearerAuth: [] }],
      parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "current status",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/BulkJobStatus" } },
          },
        },
      },
    },
  },
  "/api/v1/routing/simulate/{jobId}": {
    get: {
      tags: ["Routing"],
      summary: "Get routing simulate job result",
      parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "results" } },
    },
  },
  "/api/v1/schema/leads": {
    get: {
      tags: ["Schema"],
      summary: "Discover the JSON schema for a schema version",
      parameters: [
        {
          in: "query",
          name: "version",
          required: false,
          schema: { type: "string", example: "2026-01" },
        },
      ],
      responses: { "200": { description: "schema document" } },
    },
  },
  "/api/v1/metrics/summary": {
    get: {
      tags: ["Operations"],
      summary: "60s rolling counters + queue depth (ADMIN session required)",
      responses: {
        "200": {
          description: "counters",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  window_seconds: { type: "integer" },
                  leads_received: { type: "integer" },
                  leads_pushed: { type: "integer" },
                  fraud_hit: { type: "integer" },
                  broker_down_count: { type: "integer" },
                  manual_queue_depth: { type: "integer" },
                },
              },
            },
          },
        },
        "401": { description: "unauthorized" },
      },
    },
  },
};

const generator = new OpenApiGeneratorV3(registry.definitions);
const doc = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    version: "1.0.1",
    title: "GambChamp CRM API",
    description: [
      "Lead distribution platform public API.",
      "All intake and routing endpoints require a Bearer api key.",
      "",
      "## Sandbox",
      "Toggle `isSandbox: true` on any api key (dashboard → settings → api keys) — requests continue to hit the same URLs but responses become deterministic mocks based on the `external_lead_id` prefix. See `GET /api/v1/errors` for the mock outcome catalog.",
      "",
      "Interactive docs: [/docs/api](/docs/api).",
      "",
      "## Spec source",
      "The `/leads`, `/leads/bulk` (POST), and `/health` paths are auto-generated from the Zod schemas in `src/server/schema/registry.ts`. Routing, schema discovery, and ops paths are hand-authored and merged — they expose internal runtime shapes that don't live in the intake registry.",
    ].join("\n"),
  },
  servers: [
    { url: "https://api.gambchamp.example.com", description: "production" },
    { url: "https://sandbox.gambchamp.example.com", description: "sandbox" },
  ],
  tags: [
    { name: "Intake", description: "Lead intake — single + bulk + async job status." },
    { name: "Routing", description: "Flow simulation + dry-run." },
    { name: "Schema", description: "Schema registry + error catalog (self-discovery)." },
    { name: "Operations", description: "Health + metrics." },
  ],
});

// Merge hand-authored paths into the generated paths object.
doc.paths = { ...doc.paths, ...HAND_AUTHORED_PATHS };

const yamlPath = join(process.cwd(), "docs", "api", "v1", "openapi.yaml");
const jsonPath = join(process.cwd(), "docs", "api", "v1", "openapi.json");

writeFileSync(yamlPath, YAML.stringify(doc));
writeFileSync(jsonPath, `${JSON.stringify(doc, null, 2)}\n`);

console.log(`wrote ${yamlPath}`);
console.log(`wrote ${jsonPath}`);
