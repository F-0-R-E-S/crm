import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  query: z.unknown(),
  ttlDays: z.number().int().min(1).max(90).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const ttlDays = parsed.data.ttlDays ?? 30;
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
  await prisma.analyticsShareLink.create({
    data: {
      token,
      query: parsed.data.query as object,
      createdBy: session.user.id,
      expiresAt,
    },
  });
  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() });
}

/**
 * GET — list the caller's share links with expiry metadata.
 * Expired links stay in the result set so the UI can show a "delete expired"
 * shortcut next to them.
 */
export async function GET(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await prisma.analyticsShareLink.findMany({
    where: { createdBy: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  const links = rows.map((r) => ({
    token: r.token,
    query: r.query,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    expired: r.expiresAt.getTime() < now,
  }));
  return NextResponse.json({ links });
}

/**
 * DELETE — purge all expired links owned by the caller. Returns count.
 */
export async function DELETE(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await prisma.analyticsShareLink.deleteMany({
    where: {
      createdBy: session.user.id,
      expiresAt: { lt: new Date() },
    },
  });
  return NextResponse.json({ deleted: res.count });
}
