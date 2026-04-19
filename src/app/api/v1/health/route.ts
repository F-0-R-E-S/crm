import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { NextResponse } from "next/server";

export async function GET() {
  const checks = { db: "unknown", redis: "unknown" };
  let ok = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "down";
    ok = false;
  }
  try {
    const res = await redis.ping();
    checks.redis = res === "PONG" ? "ok" : "down";
    if (checks.redis !== "ok") ok = false;
  } catch {
    checks.redis = "down";
    ok = false;
  }
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", ...checks },
    { status: ok ? 200 : 503 },
  );
}
