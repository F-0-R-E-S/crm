import type { FlowGraph } from "./model";

export type ValidationError = { code: string; node_id?: string; message: string };
export type ValidationResult = { ok: boolean; errors: ValidationError[] };

export function validateFlowGraph(g: FlowGraph): ValidationResult {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(g.nodes.map((n) => n.id));

  const entries = g.nodes.filter((n) => n.kind === "Entry");
  if (entries.length === 0)
    errors.push({ code: "missing_entry", message: "graph must contain Entry node" });
  if (entries.length > 1)
    errors.push({
      code: "multiple_entries",
      node_id: entries[1]?.id,
      message: "only one Entry node allowed",
    });

  if (!g.nodes.some((n) => n.kind === "Exit"))
    errors.push({ code: "missing_exit", message: "graph must contain at least one Exit" });

  for (const e of g.edges) {
    if (!nodeIds.has(e.from))
      errors.push({
        code: "dangling_edge",
        node_id: e.from,
        message: `edge.from unknown: ${e.from}`,
      });
    if (!nodeIds.has(e.to))
      errors.push({
        code: "dangling_edge",
        node_id: e.to,
        message: `edge.to unknown: ${e.to}`,
      });
  }

  const adj = new Map<string, string[]>();
  for (const n of g.nodes) adj.set(n.id, []);
  for (const e of g.edges) {
    const list = adj.get(e.from);
    if (list) list.push(e.to);
  }

  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);
  const dfs = (u: string): string | null => {
    color.set(u, GREY);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v);
      if (c === GREY) return v;
      if (c === WHITE) {
        const hit = dfs(v);
        if (hit) return hit;
      }
    }
    color.set(u, BLACK);
    return null;
  };
  for (const id of nodeIds) {
    if (color.get(id) === WHITE) {
      const hit = dfs(id);
      if (hit) {
        errors.push({
          code: "cycle_detected",
          node_id: hit,
          message: `cycle reaches node ${hit}`,
        });
        break;
      }
    }
  }

  const entry = entries[0];
  if (entry) {
    const seen = new Set<string>();
    const stack = [entry.id];
    while (stack.length) {
      const x = stack.pop() as string;
      if (seen.has(x)) continue;
      seen.add(x);
      for (const v of adj.get(x) ?? []) stack.push(v);
    }
    for (const n of g.nodes) {
      if (!seen.has(n.id))
        errors.push({
          code: "unreachable_node",
          node_id: n.id,
          message: `node ${n.id} unreachable from Entry`,
        });
    }
  }

  return { ok: errors.length === 0, errors };
}
