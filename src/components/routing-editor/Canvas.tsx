"use client";
// Canvas — thin reactflow wrapper. Renders the visual graph with custom
// node types, delegates node selection + drag persistence to the parent.
//
// We import reactflow's CSS here so consuming pages don't need to touch
// it. Biome won't flag a CSS import since it's a side-effect module.

import type { FlowNode } from "@/server/routing/flow/model";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node as RFNode,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  AlgorithmNode,
  BranchNode,
  BrokerPoolNode,
  EntryNode,
  ExitNode,
  FallbackNode,
} from "./nodes";

interface BrokerSummary {
  id: string;
  name: string;
  isActive: boolean;
  lastHealthStatus: string;
  autologinEnabled: boolean;
}

export interface VisualNode extends RFNode {
  data: { kind: FlowNode["kind"]; label: string; raw: FlowNode };
}

interface Props {
  nodes: VisualNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    data: { condition: string };
  }>;
  selectedId: string | null;
  brokers: BrokerSummary[];
  onSelect: (id: string | null) => void;
  onNodesChange: (next: VisualNode[]) => void;
}

export function Canvas({ nodes, edges, selectedId, brokers, onSelect, onNodesChange }: Props) {
  const nodeTypes = useMemo<NodeTypes>(() => {
    // Bake broker info into the broker-pool node render so it can show
    // health/autologin pills without a separate hook.
    const BrokerPoolWithHealth = (p: { data: VisualNode["data"] }) => {
      const raw = p.data.raw as Extract<FlowNode, { kind: "BrokerTarget" }>;
      const b = brokers.find((x) => x.id === raw.brokerId);
      return (
        <BrokerPoolNode
          data={p.data}
          health={
            b
              ? {
                  isActive: b.isActive,
                  lastHealthStatus: b.lastHealthStatus,
                  autologinEnabled: b.autologinEnabled,
                  brokerName: b.name,
                }
              : undefined
          }
        />
      );
    };
    return {
      entry: EntryNode,
      filter: BranchNode,
      branch: BranchNode,
      algorithm: AlgorithmNode,
      brokerTarget: BrokerPoolWithHealth,
      fallback: FallbackNode,
      exit: ExitNode,
    };
  }, [brokers]);

  const handleChange: OnNodesChange = (changes) => {
    // Reactflow mutates node state (positions + selection). Apply and
    // surface back to parent; position diffs will round-trip into the
    // positions snapshot on save.
    const next = applyNodeChanges(changes, nodes) as VisualNode[];
    onNodesChange(next);
    // Track single selection to drive the Inspector.
    const sel = changes.find((c) => c.type === "select" && c.selected);
    if (sel && "id" in sel) onSelect(sel.id);
    const desel = changes.find((c) => c.type === "select" && !c.selected);
    if (desel && "id" in desel && desel.id === selectedId) {
      const anySelected = next.some((n) => n.selected);
      if (!anySelected) onSelect(null);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "var(--bg-1)",
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={14} color="var(--bd-1)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable maskColor="rgba(0,0,0,0.4)" />
      </ReactFlow>
    </div>
  );
}
