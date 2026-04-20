import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("webhook") }),
  z.object({
    mode: z.literal("polling"),
    pollIntervalMin: z.number().int().min(1).max(60),
    statusPollPath: z.string().min(1).max(256).optional(),
    statusPollIdsParam: z.string().min(1).max(64).optional(),
  }),
]);

async function guardAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await guardAdmin()))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id } = await params;
  const broker = await prisma.broker.findUnique({ where: { id } });
  if (!broker)
    return NextResponse.json({ error: { code: "broker_not_found" } }, { status: 404 });

  return NextResponse.json({
    mode: broker.syncMode,
    poll_interval_min: broker.pollIntervalMin,
    status_poll_path: broker.statusPollPath,
    status_poll_ids_param: broker.statusPollIdsParam,
    last_polled_at: broker.lastPolledAt,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await guardAdmin()))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id } = await params;
  const broker = await prisma.broker.findUnique({ where: { id } });
  if (!broker)
    return NextResponse.json({ error: { code: "broker_not_found" } }, { status: 404 });

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

  const data =
    parsed.data.mode === "polling"
      ? {
          syncMode: "polling" as const,
          pollIntervalMin: parsed.data.pollIntervalMin,
          statusPollPath: parsed.data.statusPollPath,
          statusPollIdsParam: parsed.data.statusPollIdsParam,
        }
      : { syncMode: "webhook" as const, pollIntervalMin: null };

  const updated = await prisma.broker.update({ where: { id }, data });
  return NextResponse.json({
    mode: updated.syncMode,
    poll_interval_min: updated.pollIntervalMin,
    status_poll_path: updated.statusPollPath,
    status_poll_ids_param: updated.statusPollIdsParam,
  });
}
