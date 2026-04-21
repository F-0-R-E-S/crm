"use client";
// Canvas — thin reactflow wrapper. Renders the visual graph with custom
// node types, delegates node selection + drag persistence to the parent,
// and — new in v1.0.3 — surfaces edge creation (`onConnect`) and node /
// edge deletion (keyboard Delete/Backspace) back to the parent so the
// user can structurally build a flow from scratch.
//
// We import reactflow's CSS here so consuming pages don't need to touch
// it. Biome won't flag a CSS import since it's a side-effect module.

import type { FlowEdge, FlowNode } from "@/server/routing/flow/model";
import { useMemo } from "react";
import ReactFlow, {
  Background,
  type Connection,
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

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data: { condition: string };
}

interface Props {
  nodes: VisualNode[];
  edges: VisualEdge[];
  selectedId: string | null;
  brokers: BrokerSummary[];
  readOnly?: boolean;
  onSelect: (id: string | null) => void;
  onNodesChange: (next: VisualNode[]) => void;
  /**
   * Fired when the user draws a new edge between two handles. The parent
   * should validate + add via `builder.addEdge`.
   */
  onConnect?: (connection: {
    from: string;
    to: string;
    condition: FlowEdge["condition"];
  }) => void;
  /** Fired when the user presses Delete/Backspace with a node selected. */
  onDeleteNode?: (nodeId: string) => void;
  /** Fired when the user removes an edge (via keyboard / click). */
  onDeleteEdge?: (edgeId: string) => void;
  /** Fired on right-click so the parent can show a context menu. */
  onNodeContextMenu?: (nodeId: string, clientX: number, clientY: number) => void;
}

export function Canvas({
  nodes,
  edges,
  selectedId,
  brokers,
  readOnly,
  onSelect,
  onNodesChange,
  onConnect,
  onDeleteNode,
  onDeleteEdge,
  onNodeContextMenu,
}: Props) {
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
    // positions snapshot on save. When readOnly we still accept selection
    // changes so the inspector can show details, but we drop positional
    // edits.
    const filtered = readOnly ? changes.filter((c) => c.type === "select") : changes;
    const next = applyNodeChanges(filtered, nodes) as VisualNode[];
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

  const handleConnect = (conn: Connection) => {
    if (readOnly || !onConnect) return;
    if (!conn.source || !conn.target) return;
    onConnect({ from: conn.source, to: conn.target, condition: "default" });
  };

  const handleNodesDelete = (deleted: RFNode[]) => {
    if (readOnly || !onDeleteNode) return;
    for (const n of deleted) onDeleteNode(n.id);
  };

  const handleEdgesDelete = (deleted: Array<{ id: string }>) => {
    if (readOnly || !onDeleteEdge) return;
    for (const e of deleted) onDeleteEdge(e.id);
  };

  const handleNodeContextMenu = (ev: React.MouseEvent, node: RFNode) => {
    if (!onNodeContextMenu) return;
    ev.preventDefault();
    onNodeContextMenu(node.id, ev.clientX, ev.clientY);
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
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onNodeContextMenu={handleNodeContextMenu}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesFocusable={!readOnly}
        elementsSelectable
        deleteKeyCode={readOnly ? null : ["Delete", "Backspace"]}
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
