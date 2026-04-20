import { auth } from "@/auth";
import { getIntakeSettings, updateIntakeSettings } from "@/server/intake/settings";
import { NextResponse } from "next/server";
import { z } from "zod";

function toApi(s: Awaited<ReturnType<typeof getIntakeSettings>>) {
  return {
    required_fields: s.requiredFields,
    allowed_geo: s.allowedGeo,
    dedupe_window_days: s.dedupeWindowDays,
    max_rpm: s.maxRpm,
    accept_schedule: s.acceptSchedule,
    version: s.version,
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  const { id } = await params;
  const s = await getIntakeSettings(id);
  return NextResponse.json(toApi(s));
}

const BodySchema = z.object({
  required_fields: z.array(z.string()).optional(),
  allowed_geo: z.array(z.string()).optional(),
  dedupe_window_days: z.number().int().optional(),
  max_rpm: z.number().int().optional(),
  accept_schedule: z.record(z.string(), z.unknown()).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });

  const { id } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: { code: "validation_error" } }, { status: 422 });

  try {
    const s = await updateIntakeSettings(
      id,
      {
        requiredFields: parsed.data.required_fields,
        allowedGeo: parsed.data.allowed_geo,
        dedupeWindowDays: parsed.data.dedupe_window_days,
        maxRpm: parsed.data.max_rpm,
        acceptSchedule: parsed.data.accept_schedule as Parameters<
          typeof updateIntakeSettings
        >[1]["acceptSchedule"],
      },
      session.user.id as string,
    );
    return NextResponse.json(toApi(s));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid";
    return NextResponse.json(
      { error: { code: "validation_error", message: msg } },
      { status: 422 },
    );
  }
}
