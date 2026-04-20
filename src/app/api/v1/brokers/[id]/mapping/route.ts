import { auth } from "@/auth";
import {
  type MappingConfig,
  applyMappingWithTransforms,
  maskPII,
  validateMapping,
} from "@/server/broker-adapter/mapping-preview";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const RuleSchema = z.object({
  target: z.string().min(1).max(128),
  transform: z.enum(["concat", "format_phone", "default", "uppercase", "lowercase"]).optional(),
  concatWith: z.string().optional(),
  sep: z.string().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  format: z.string().optional(),
});
const BodySchema = z.object({
  mapping: z.record(z.string(), RuleSchema),
  staticPayload: z.record(z.string(), z.unknown()).default({}),
});

async function guardAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s;
}

function sampleLead(template: { samplePayload: unknown } | null): Record<string, unknown> {
  const tplSample =
    template?.samplePayload && typeof template.samplePayload === "object"
      ? (template.samplePayload as Record<string, unknown>)
      : {};
  return {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+380501234567",
    geo: "UA",
    ip: "8.8.8.8",
    subId: "aff-123",
    ...tplSample,
  };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guardAdmin()))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id } = await params;
  const broker = await prisma.broker.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!broker) return NextResponse.json({ error: { code: "broker_not_found" } }, { status: 404 });

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
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

  const required = (broker.template?.requiredFields as string[] | null) ?? [];
  const v = validateMapping(parsed.data.mapping as MappingConfig, required);
  if (!v.ok) {
    return NextResponse.json(
      { error: { code: "required_field_missing", missing: v.missing } },
      { status: 422 },
    );
  }

  const updated = await prisma.broker.update({
    where: { id },
    data: {
      fieldMapping: parsed.data.mapping as object,
      staticPayload: parsed.data.staticPayload as object,
    },
  });
  return NextResponse.json({ ok: true, brokerId: updated.id });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guardAdmin()))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id } = await params;
  const broker = await prisma.broker.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!broker) return NextResponse.json({ error: { code: "broker_not_found" } }, { status: 404 });

  const url = new URL(req.url);
  const wantPreview = url.searchParams.get("preview") === "1";
  const mapping = (broker.fieldMapping as unknown as MappingConfig) ?? {};
  const staticPayload = (broker.staticPayload as Record<string, unknown>) ?? {};

  const body: Record<string, unknown> = {
    mapping,
    static_payload: staticPayload,
    required_fields: (broker.template?.requiredFields as string[] | null) ?? [],
  };

  if (wantPreview) {
    const lead = sampleLead(broker.template);
    const rawPayload = applyMappingWithTransforms(lead, mapping, staticPayload);
    body.preview = maskPII(rawPayload);
  }

  return NextResponse.json(body);
}
