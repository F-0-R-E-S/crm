import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { remainingCap } from "@/server/routing/constraints/caps";
import { upsertFlowCaps } from "@/server/routing/flow/caps-repository";
import { CapDefinitionsInputSchema } from "@/server/routing/flow/caps-schema";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const { flowId } = await params;
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: {
      activeVersion: { include: { capDefs: { include: { countryLimits: true } } } },
    },
  });
  if (!flow || !flow.activeVersion)
    return NextResponse.json({ error: { code: "no_active_version" } }, { status: 404 });

  const caps = await Promise.all(
    flow.activeVersion.capDefs.map(async (def) => {
      const r = await remainingCap({
        scope: def.scope,
        scopeId: def.scopeRefId,
        window: def.window,
        tz: def.timezone,
        limit: def.limit,
      });
      return {
        scope: def.scope,
        scope_ref_id: def.scopeRefId,
        window: def.window,
        limit: def.limit,
        per_country: def.perCountry,
        country_limits: def.countryLimits.map((cl) => ({ country: cl.country, limit: cl.limit })),
        used: r.used,
        remaining: r.remaining,
        resets_at: r.resetsAt.toISOString(),
      };
    }),
  );

  return NextResponse.json({ flow_id: flowId, caps });
}

export async function PUT(req: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { flowId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = CapDefinitionsInputSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: parsed.error.issues[0]?.message,
          field: parsed.error.issues[0]?.path.join("."),
        },
      },
      { status: 422 },
    );
  try {
    const saved = await upsertFlowCaps(flowId, parsed.data.caps);
    return NextResponse.json({
      flow_id: flowId,
      caps: saved.map((d) => ({
        id: d.id,
        scope: d.scope,
        scope_ref_id: d.scopeRefId,
        window: d.window,
        limit: d.limit,
        timezone: d.timezone,
        per_country: d.perCountry,
        country_limits: d.countryLimits.map((cl) => ({ country: cl.country, limit: cl.limit })),
      })),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "flow_not_found")
      return NextResponse.json({ error: { code: "flow_not_found" } }, { status: 404 });
    if (msg === "flow_archived" || msg === "no_draft_version")
      return NextResponse.json({ error: { code: msg } }, { status: 409 });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: 500 });
  }
}
