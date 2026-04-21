import { env } from "@/lib/env";
import { signOperatorToken } from "@/server/auth/operator-token";
import { prisma } from "@/server/db";
import { checkRateLimit } from "@/server/ratelimit";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "unknown";
}

export async function POST(req: NextRequest) {
  if (!env.GAME_FRONTEND_ENABLED) {
    return NextResponse.json({ error: "game frontend disabled" }, { status: 503 });
  }

  const rl = await checkRateLimit(`op-token:${clientIp(req)}`, {
    capacity: 5,
    refillPerSec: 5 / 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!user) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });

  const ok = await bcrypt.compare(parsed.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });

  const token = await signOperatorToken({ userId: user.id, role: user.role });
  const ttlSec = 60 * 60 * 24 * 30;
  return NextResponse.json({
    token,
    expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString(),
    user: { id: user.id, email: user.email, role: user.role },
  });
}
