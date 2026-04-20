import { auth } from "@/auth";
import { getTemplateById } from "@/server/broker-template/catalog";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  }
  const { templateId } = await params;
  const t = await getTemplateById(templateId);
  if (!t) return NextResponse.json({ error: { code: "template_not_found" } }, { status: 404 });

  return NextResponse.json({
    id: t.id,
    slug: t.slug,
    name: t.name,
    vendor: t.vendor,
    vertical: t.vertical,
    protocol: t.protocol,
    status: t.status,
    countries: t.countries,
    description: t.description,
    logo_url: t.logoUrl,
    docs_url: t.docsUrl,
    default_http_method: t.defaultHttpMethod,
    default_headers: t.defaultHeaders,
    default_auth_type: t.defaultAuthType,
    auth_config_schema: t.authConfigSchema,
    field_mapping: t.fieldMapping,
    required_fields: t.requiredFields,
    static_payload: t.staticPayload,
    response_id_path: t.responseIdPath,
    postback_lead_id_path: t.postbackLeadIdPath,
    postback_status_path: t.postbackStatusPath,
    status_mapping: t.statusMapping,
    rate_limit_per_min: t.rateLimitPerMin,
    sample_payload: t.samplePayload,
    sample_response: t.sampleResponse,
  });
}
