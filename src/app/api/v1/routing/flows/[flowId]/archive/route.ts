import { auth } from "@/auth";
import { archiveFlow } from "@/server/routing/flow/publish";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ flowId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { flowId } = await params;
  try {
    const f = await archiveFlow(flowId, session.user.id);
    return NextResponse.json(f);
  } catch (e) {
    const err = e as Error;
    if (err.message === "flow_not_found")
      return NextResponse.json({ error: { code: "flow_not_found" } }, { status: 404 });
    return NextResponse.json({ error: { code: err.message } }, { status: 409 });
  }
}
