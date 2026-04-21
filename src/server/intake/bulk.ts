import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { checkBlacklists } from "@/server/antifraud/blacklist";
import { detectDuplicate } from "@/server/antifraud/dedup";
import { normalizeIntake } from "@/server/antifraud/normalization";
import { prisma } from "@/server/db";
import { getActiveTenantId } from "@/server/db-tenant";
import { getSchemaForVersion } from "@/server/schema/registry";

export interface BulkItemResult {
  index: number;
  status_code: number;
  lead_id?: string;
  error_code?: string;
  error_field?: string;
}

export async function processBulkItem(
  affiliateId: string,
  item: unknown,
  index: number,
  version: string,
  traceId: string,
): Promise<BulkItemResult> {
  const schema = getSchemaForVersion(version);
  if (!schema) return { index, status_code: 400, error_code: "unsupported_version" };

  const parsed = schema.safeParse(item);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      index,
      status_code: 422,
      error_code: "validation_error",
      error_field: first.path.join("."),
    };
  }
  const p = parsed.data as Record<string, unknown>;

  const n = normalizeIntake({
    phone: p.phone as string | null,
    email: p.email as string | null,
    geo: p.geo as string,
    ip: p.ip as string,
    landingUrl: p.landing_url as string | null,
  });
  if (n.error) {
    return { index, status_code: 422, error_code: n.error.code, error_field: n.error.field };
  }

  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  const phoneHash = n.phoneE164 ? sha(n.phoneE164) : null;
  const emailHash = n.email ? sha(n.email) : null;
  const bl = await checkBlacklists({
    ip: p.ip as string,
    email: n.email,
    phoneE164: n.phoneE164,
  });
  if (bl) return { index, status_code: 422, error_code: bl };

  const dd = await detectDuplicate({
    affiliateId,
    externalLeadId: (p.external_lead_id as string) ?? null,
    phoneHash,
    emailHash,
    fingerprint: null,
    windowDays: env.ANTIFRAUD_DEDUP_WINDOW_DAYS,
    crossAffiliate: env.ANTIFRAUD_DEDUP_CROSS_AFFILIATE,
  });
  if (dd.duplicate) return { index, status_code: 409, error_code: "duplicate_lead" };

  const lead = await prisma.lead.create({
    data: {
      tenantId: getActiveTenantId() ?? "tenant_default",
      affiliateId,
      externalLeadId: (p.external_lead_id as string) ?? null,
      firstName: (p.first_name as string) ?? null,
      lastName: (p.last_name as string) ?? null,
      email: n.email,
      phone: n.phoneE164,
      phoneHash,
      emailHash,
      geo: n.geo as string,
      ip: p.ip as string,
      landingUrl: (p.landing_url as string) ?? null,
      subId: (p.sub_id as string) ?? null,
      utm: ((p.utm as object) ?? {}) as object,
      eventTs: new Date(p.event_ts as string),
      traceId: `${traceId}-${index}`,
      normalizationWarnings: n.warnings as unknown as object,
      rawPayload: n.raw as unknown as object,
      events: { create: [{ kind: "RECEIVED", meta: { source: "bulk", index } }] },
    },
  });
  return { index, status_code: 202, lead_id: lead.id };
}

export async function processBulkSync(
  affiliateId: string,
  items: unknown[],
  version: string,
  traceId: string,
): Promise<BulkItemResult[]> {
  return Promise.all(items.map((it, i) => processBulkItem(affiliateId, it, i, version, traceId)));
}
