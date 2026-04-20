import { auth } from "@/auth";
import { prisma } from "@/server/db";
import {
  validateChanceSum,
  validateSlotBounds,
} from "@/server/routing/algorithm/slots-chance";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  scope: z.enum(["FLOW", "BRANCH"]),
  scopeRefId: z.string().optional(),
  mode: z.enum(["WEIGHTED_ROUND_ROBIN", "SLOTS_CHANCE"]),
  params: z.record(z.string(), z.unknown()),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { flowId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!flow) return NextResponse.json({ error: { code: "flow_not_found" } }, { status: 404 });
  const latest = flow.versions[0];
  if (!latest)
    return NextResponse.json({ error: { code: "no_draft_version" } }, { status: 409 });

  if (parsed.data.mode === "SLOTS_CHANCE") {
    const p = parsed.data.params as {
      chance?: Record<string, number>;
      slots?: Record<string, number>;
    };
    if (p.chance) {
      const v = validateChanceSum(
        Object.entries(p.chance).map(([id, chance]) => ({ id, chance })),
      );
      if (!v.ok)
        return NextResponse.json(
          { error: { code: v.code, message: v.message } },
          { status: 422 },
        );
    } else if (p.slots) {
      const v = validateSlotBounds(
        Object.entries(p.slots).map(([id, slots]) => ({ id, slots })),
      );
      if (!v.ok)
        return NextResponse.json(
          { error: { code: v.code, message: v.message } },
          { status: 422 },
        );
    }
  }

  const existing = await prisma.flowAlgorithmConfig.findFirst({
    where: {
      flowVersionId: latest.id,
      scope: parsed.data.scope,
      scopeRefId: parsed.data.scopeRefId ?? null,
    },
  });
  if (existing) {
    await prisma.flowAlgorithmConfig.update({
      where: { id: existing.id },
      data: { mode: parsed.data.mode, params: parsed.data.params as object },
    });
  } else {
    await prisma.flowAlgorithmConfig.create({
      data: {
        flowVersionId: latest.id,
        scope: parsed.data.scope,
        scopeRefId: parsed.data.scopeRefId ?? null,
        mode: parsed.data.mode,
        params: parsed.data.params as object,
      },
    });
  }

  return NextResponse.json({ ok: true, flowVersionId: latest.id });
}
