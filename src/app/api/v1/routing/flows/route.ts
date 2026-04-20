import { auth } from "@/auth";
import { FlowGraphSchema } from "@/server/routing/flow/model";
import { createDraftFlow, listFlows } from "@/server/routing/flow/repository";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateBody = z.object({
  name: z.string().min(1).max(120),
  timezone: z.string().min(1),
  graph: FlowGraphSchema,
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "DRAFT" || statusParam === "PUBLISHED" || statusParam === "ARCHIVED"
      ? statusParam
      : undefined;
  const flows = await listFlows({ status });
  return NextResponse.json({ flows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const raw = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "flow_validation_error",
          message: parsed.error.issues[0]?.message,
          field: parsed.error.issues[0]?.path.join("."),
        },
      },
      { status: 422 },
    );
  const flow = await createDraftFlow({
    ...parsed.data,
    createdBy: session.user.id,
  });
  return NextResponse.json(flow, { status: 201 });
}
