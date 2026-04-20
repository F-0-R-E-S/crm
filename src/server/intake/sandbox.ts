import { createHash } from "node:crypto";

export type MockOutcome = "ACCEPTED" | "DECLINED" | "DUPLICATE" | "RATE_LIMITED";

export function determineMockOutcome(externalLeadId: string | null | undefined): MockOutcome {
  if (!externalLeadId) return "ACCEPTED";
  const upper = externalLeadId.toUpperCase();
  if (upper.startsWith("ACCEPT")) return "ACCEPTED";
  if (upper.startsWith("DECLINE")) return "DECLINED";
  if (upper.startsWith("DUP")) return "DUPLICATE";
  if (upper.startsWith("RATE")) return "RATE_LIMITED";
  const h = createHash("sha256").update(externalLeadId).digest()[0];
  if (h < 200) return "ACCEPTED";
  if (h < 230) return "DECLINED";
  if (h < 250) return "DUPLICATE";
  return "RATE_LIMITED";
}

export function mockOutcomeToResponse(outcome: MockOutcome, traceId: string) {
  if (outcome === "RATE_LIMITED")
    return { status: 429, body: { error: { code: "rate_limited", trace_id: traceId } } };
  if (outcome === "DUPLICATE")
    return { status: 409, body: { error: { code: "duplicate_lead", trace_id: traceId } } };
  if (outcome === "DECLINED")
    return {
      status: 202,
      body: {
        lead_id: `sbx-${traceId}`,
        status: "rejected",
        reject_reason: "mock_declined",
        sandbox: true,
        mock_outcome: outcome,
        trace_id: traceId,
      },
    };
  return {
    status: 202,
    body: {
      lead_id: `sbx-${traceId}`,
      status: "received",
      sandbox: true,
      mock_outcome: outcome,
      trace_id: traceId,
    },
  };
}
