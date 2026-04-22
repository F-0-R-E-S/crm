// Synchronous batch simulation for SmartPool sequential-accept
// verification. Given N synthetic leads and a per-broker accept
// probability map, simulate every push attempt (including
// FallbackStep hops) and return per-broker tallies + sample traces.
//
// Unlike /simulate (which enqueues a batch job), this endpoint runs
// inline — it's an interactive "prove my SmartPool works" tool,
// not a durable regression run.

import { auth } from "@/auth";
import { simulateBatch } from "@/server/routing/simulator";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  flow_id: z.string().min(1),
  count: z.number().int().min(1).max(10_000),
  broker_accept_probabilities: z.record(z.string(), z.number().min(0).max(1)).optional(),
  lead_template: z.object({
    geo: z.string().length(2),
    affiliate_id: z.string().min(1),
    sub_id: z.string().optional(),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }
  try {
    const r = await simulateBatch({
      flowId: parsed.data.flow_id,
      count: parsed.data.count,
      brokerAcceptProbabilities: parsed.data.broker_accept_probabilities,
      leadTemplate: {
        geo: parsed.data.lead_template.geo,
        affiliateId: parsed.data.lead_template.affiliate_id,
        subId: parsed.data.lead_template.sub_id,
      },
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: { code: "simulate_pool_error", message: (e as Error).message } },
      { status: 500 },
    );
  }
}
