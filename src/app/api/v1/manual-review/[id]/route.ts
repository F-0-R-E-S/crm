import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { appRouter } from "@/server/routers/_app";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as {
    action: "claim" | "resolve" | "requeue";
    resolution?: "ACCEPT" | "REJECT" | "REQUEUE";
    note?: string;
  };
  const caller = appRouter.createCaller({
    session,
    prisma,
    userId: session.user.id,
    role: session.user.role ?? "OPERATOR",
  } as unknown as Parameters<typeof appRouter.createCaller>[0]);
  try {
    if (body.action === "claim") {
      return NextResponse.json(await caller.manualReview.claim({ id }));
    }
    if (body.action === "resolve" && body.resolution) {
      return NextResponse.json(
        await caller.manualReview.resolve({
          id,
          resolution: body.resolution,
          note: body.note,
        }),
      );
    }
    if (body.action === "requeue") {
      return NextResponse.json(await caller.manualReview.requeue({ id }));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}
