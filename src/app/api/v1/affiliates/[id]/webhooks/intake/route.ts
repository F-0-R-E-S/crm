import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const EVENT_TYPES = z.enum(["intake.accepted", "intake.rejected", "intake.duplicate"]);

const BodySchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16).max(128),
  events: z.array(EVENT_TYPES).min(1),
});

async function guardAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guardAdmin()))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { id } = await params;
  const webhooks = await prisma.affiliateIntakeWebhook.findMany({
    where: { affiliateId: id },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      pausedAt: true,
      pausedReason: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ webhooks });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guardAdmin()))
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { id } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: { code: "validation_error" } }, { status: 422 });
  const w = await prisma.affiliateIntakeWebhook.create({
    data: {
      affiliateId: id,
      url: parsed.data.url,
      secret: parsed.data.secret,
      events: parsed.data.events,
    },
  });
  return NextResponse.json(
    { id: w.id, url: w.url, events: w.events, is_active: w.isActive },
    { status: 201 },
  );
}
