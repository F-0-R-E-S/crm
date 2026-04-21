// Seed / default FlowGraph helpers used by the UI to bootstrap a new
// flow and by tests to cover round-trip behaviour. Kept server-side so
// we can exercise it against the canonical Zod schema in unit tests.

import type { FlowGraph } from "./model";

/**
 * Minimal default flow a user gets when they click "New flow": an
 * entry → WRR algorithm → exit chain. No broker targets yet — the
 * editor's publish guard nudges the user to add at least one before
 * publishing.
 */
export function newFlowGraph(): FlowGraph {
  return {
    nodes: [
      { id: "entry", kind: "Entry", label: "Entry" },
      { id: "algo", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN", label: "WRR" },
      { id: "exit", kind: "Exit", label: "Exit" },
    ],
    edges: [
      { from: "entry", to: "algo", condition: "default" },
      { from: "algo", to: "exit", condition: "default" },
    ],
  };
}
