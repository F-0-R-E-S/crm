import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}
	const url = new URL(req.url);
	const status = url.searchParams.get("status") ?? "OPEN";
	const where: Record<string, unknown> = {};
	if (status === "OPEN") {
		where.claimedBy = null;
		where.resolvedAt = null;
	}
	if (status === "RESOLVED") where.resolvedAt = { not: null };
	const rows = await prisma.manualReviewQueue.findMany({
		where,
		include: { lead: true, lastBroker: true },
		orderBy: { createdAt: "desc" },
		take: 100,
	});
	return NextResponse.json({ rows });
}
