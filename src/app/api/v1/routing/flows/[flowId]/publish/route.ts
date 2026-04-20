import { auth } from "@/auth";
import { publishFlow } from "@/server/routing/flow/publish";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ flowId: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { flowId } = await params;
  try {
    const f = await publishFlow(flowId, session.user.id);
    return NextResponse.json(f);
  } catch (e) {
    const err = e as Error & { details?: unknown };
    if (err.message === "flow_validation_error")
      return NextResponse.json(
        { error: { code: "flow_validation_error", details: err.details } },
        { status: 422 },
      );
    if (err.message === "fallback_cycle_detected")
      return NextResponse.json(
        { error: { code: "fallback_cycle_detected", details: err.details } },
        { status: 422 },
      );
    if (err.message === "flow_not_found")
      return NextResponse.json({ error: { code: "flow_not_found" } }, { status: 404 });
    if (err.message === "publish_conflict")
      return NextResponse.json({ error: { code: "publish_conflict" } }, { status: 409 });
    return NextResponse.json({ error: { code: "internal_error" } }, { status: 500 });
  }
}
