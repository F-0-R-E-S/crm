import { auth } from "@/auth";
import { prisma } from "@/server/db";
import { NextResponse } from "next/server";

const TERMINAL_STATES = new Set(["PUSHED", "FAILED", "REJECTED", "ACCEPTED", "FTD"]);
const MAX_DURATION_MS = 60_000;
const POLL_INTERVAL_MS = 500;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ traceId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { traceId } = await params;
  const encoder = new TextEncoder();
  const started = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let lastState: string | null = null;
      let closed = false;

      const write = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      try {
        while (Date.now() - started < MAX_DURATION_MS && !closed) {
          const lead = await prisma.lead.findUnique({
            where: { traceId },
            select: {
              state: true,
              brokerId: true,
              rejectReason: true,
            },
          });
          if (lead && lead.state !== lastState) {
            lastState = lead.state;
            write(`data: ${JSON.stringify(lead)}\n\n`);
            if (TERMINAL_STATES.has(lead.state)) {
              break;
            }
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
        write("event: done\ndata: {}\n\n");
      } catch (e) {
        write(
          `event: error\ndata: ${JSON.stringify({ message: e instanceof Error ? e.message : "stream error" })}\n\n`,
        );
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
