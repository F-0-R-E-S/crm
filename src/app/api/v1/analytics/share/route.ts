import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
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
		return NextResponse.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
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
