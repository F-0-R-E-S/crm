import { prisma } from "@/server/db";
import type { FlowGraph } from "./model";
import { publishFlow } from "./publish";
import { createDraftFlow } from "./repository";

export async function ensureDefaultFlowsFromRotationRules(): Promise<number> {
  const rules = await prisma.rotationRule.findMany({
    where: { isActive: true, broker: { isActive: true } },
    include: { broker: true },
    orderBy: [{ geo: "asc" }, { priority: "asc" }],
  });
  const byGeo = new Map<string, typeof rules>();
  for (const r of rules) {
    const list = byGeo.get(r.geo);
    if (list) list.push(r);
    else byGeo.set(r.geo, [r]);
  }
  let created = 0;
  for (const [geo, geoRules] of byGeo) {
    const name = `auto:${geo}`;
    const existing = await prisma.flow.findFirst({ where: { name } });
    if (existing) continue;
    const targets = geoRules.map((r) => ({
      id: `t-${r.brokerId}`,
      kind: "BrokerTarget" as const,
      brokerId: r.brokerId,
      weight: 100,
    }));
    const graph: FlowGraph = {
      nodes: [
        { id: "e", kind: "Entry" },
        {
          id: "f",
          kind: "Filter",
          rules: [{ field: "geo", sign: "eq", value: geo, caseSensitive: false }],
          logic: "AND",
        },
        { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
        ...targets,
        { id: "x", kind: "Exit" },
      ],
      edges: [
        { from: "e", to: "f", condition: "default" },
        { from: "f", to: "a", condition: "default" },
        ...targets.map((t) => ({ from: "a", to: t.id, condition: "default" as const })),
        ...targets.map((t) => ({ from: t.id, to: "x", condition: "default" as const })),
      ],
    };
    const flow = await createDraftFlow({ name, timezone: "UTC", graph });
    await publishFlow(flow.id, "system");
    created += 1;
  }
  return created;
}
