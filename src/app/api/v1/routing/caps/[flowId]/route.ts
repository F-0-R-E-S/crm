import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { remainingCap } from "@/server/routing/constraints/caps";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const { flowId } = await params;
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: { activeVersion: { include: { capDefs: true } } },
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
        used: r.used,
        remaining: r.remaining,
        resets_at: r.resetsAt.toISOString(),
      };
    }),
  );

  return NextResponse.json({ flow_id: flowId, caps });
}
