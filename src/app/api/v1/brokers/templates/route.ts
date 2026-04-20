import { auth } from "@/auth";
import { listTemplates } from "@/server/broker-template/catalog";
import { NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  vertical: z.string().optional(),
  protocol: z.string().optional(),
  country: z.string().length(2).optional(),
  status: z.string().optional(),
  q: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.enum(["name", "createdAt"]).optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
});

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  }
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          field: parsed.error.issues[0]?.path.join("."),
        },
      },
      { status: 422 },
    );
  }
  const result = await listTemplates({
    vertical: parsed.data.vertical,
    protocol: parsed.data.protocol,
    country: parsed.data.country,
    status: parsed.data.status,
    q: parsed.data.q,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
    sortBy: parsed.data.sort_by,
    sortDir: parsed.data.sort_dir,
  });
  return NextResponse.json({
    items: result.items.map((t) => ({
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
      rate_limit_per_min: t.rateLimitPerMin,
      default_auth_type: t.defaultAuthType,
      required_fields: t.requiredFields,
    })),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}
