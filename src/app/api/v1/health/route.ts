import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/server/db";
import { redis } from "@/server/redis";
import { NextResponse } from "next/server";

type HealthDep = "ok" | "down" | "unknown";

let cachedVersion: string | null = null;
function getVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { version?: string };
    cachedVersion = pkg.version ?? "0.0.0";
  } catch {
    cachedVersion = "0.0.0";
  }
  return cachedVersion;
}

export async function GET() {
  let db: HealthDep = "unknown";
  let redisStatus: HealthDep = "unknown";
  let queue: { pending: number; failed_last_hour: number } = {
    pending: 0,
    failed_last_hour: 0,
  };
  let ok = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "ok";
  } catch {
    db = "down";
    ok = false;
  }

  try {
    const res = await redis.ping();
    redisStatus = res === "PONG" ? "ok" : "down";
    if (redisStatus !== "ok") ok = false;
  } catch {
    redisStatus = "down";
    ok = false;
  }

  try {
    const pending = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM pgboss.job WHERE state IN ('created','retry','active')`;
    const failed = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM pgboss.job WHERE state = 'failed' AND completed_on > NOW() - INTERVAL '1 hour'`;
    queue = {
      pending: Number(pending[0]?.count ?? 0),
      failed_last_hour: Number(failed[0]?.count ?? 0),
    };
  } catch {
    // pgboss schema might not exist in a fresh DB; that's degraded, not fatal.
    ok = false;
  }

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      db,
      redis: redisStatus,
      queue,
      version: getVersion(),
    },
    { status: ok ? 200 : 503 },
  );
}
