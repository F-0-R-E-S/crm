import { auth } from "@/auth";
import { computeSla } from "@/server/autologin/sla";
import { NextResponse } from "next/server";

const SEVEN_DAYS = 7 * 86_400_000;
const MAX_WINDOW = 31 * 86_400_000;

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const toParam = url.searchParams.get("to");
  const fromParam = url.searchParams.get("from");
  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getTime() - SEVEN_DAYS);
  if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  if (from >= to) {
    return NextResponse.json({ error: "from_must_be_before_to" }, { status: 400 });
  }
  if (to.getTime() - from.getTime() > MAX_WINDOW) {
    return NextResponse.json({ error: "window_too_large_max_31d" }, { status: 400 });
  }
  return NextResponse.json(await computeSla({ from, to }));
}
