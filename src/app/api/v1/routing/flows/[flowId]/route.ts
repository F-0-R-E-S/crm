import { auth } from "@/auth";
import { FlowGraphSchema } from "@/server/routing/flow/model";
import { loadFlowById, updateDraftGraph } from "@/server/routing/flow/repository";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const { flowId } = await params;
  try {
    const f = await loadFlowById(flowId);
    return NextResponse.json(f);
  } catch {
    return NextResponse.json({ error: { code: "flow_not_found" } }, { status: 404 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { flowId } = await params;
  const raw = await req.json().catch(() => null);
  const body = z.object({ graph: FlowGraphSchema }).safeParse(raw);
  if (!body.success)
    return NextResponse.json(
      { error: { code: "flow_validation_error", message: body.error.issues[0]?.message } },
      { status: 422 },
    );
  try {
    const f = await updateDraftGraph(flowId, body.data.graph);
    return NextResponse.json(f);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "flow_not_found")
      return NextResponse.json({ error: { code: "flow_not_found" } }, { status: 404 });
    return NextResponse.json({ error: { code: msg } }, { status: 409 });
  }
}
