import { NextResponse } from "next/server";

const CATALOG = [
  { error_code: "unauthorized", http_status: 401, description: "Invalid or missing API key", fix_hint: "Check Authorization: Bearer <key>" },
  { error_code: "forbidden", http_status: 403, description: "Key disabled or IP denied", fix_hint: "Verify key status and IP whitelist" },
  { error_code: "sandbox_forbidden", http_status: 403, description: "Production key used in sandbox mode", fix_hint: "Use a sandbox-scoped key" },
  { error_code: "sandbox_required", http_status: 403, description: "Sandbox key requires ?mode=sandbox", fix_hint: "Append ?mode=sandbox to URL" },
  { error_code: "malformed_json", http_status: 400, description: "Body is not valid JSON", fix_hint: "Validate JSON with a linter" },
  { error_code: "unsupported_version", http_status: 400, description: "Unknown X-API-Version", fix_hint: "Use one of GET /api/v1/schema/leads available versions" },
  { error_code: "payload_too_large", http_status: 413, description: "Body exceeds size limit", fix_hint: "Keep single lead <64KB, bulk <2MB and <=100 items" },
  { error_code: "validation_error", http_status: 422, description: "Field-level validation failed", fix_hint: "Inspect error.field" },
  { error_code: "phone_invalid", http_status: 422, description: "Phone cannot be normalized to E.164", fix_hint: "Send international or local phone matching geo" },
  { error_code: "geo_unknown", http_status: 422, description: "GEO is not ISO-3166-1 alpha-2 (with synonyms)", fix_hint: "Use 2-letter country code or GBR/USA synonyms" },
  { error_code: "geo_not_allowed", http_status: 422, description: "GEO not in affiliate allowed list", fix_hint: "Check affiliate intake-settings" },
  { error_code: "missing_required_field", http_status: 422, description: "Required field missing per affiliate settings", fix_hint: "Verify required_fields in intake-settings" },
  { error_code: "rate_limited", http_status: 429, description: "Rate limit exceeded", fix_hint: "Back off using Retry-After header" },
  { error_code: "duplicate_lead", http_status: 409, description: "Lead already seen per dedup rules", fix_hint: "Inspect matched_by and existing_lead_id" },
  { error_code: "idempotency_mismatch", http_status: 409, description: "Same X-Idempotency-Key with different payload", fix_hint: "Use a new key or retry with original payload" },
  { error_code: "internal_error", http_status: 500, description: "Unexpected server error", fix_hint: "Retry after Retry-After or contact support with trace_id" },
];

export async function GET() {
  return NextResponse.json({ errors: CATALOG, count: CATALOG.length });
}
