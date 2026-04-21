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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  type Connection,
  Controls,
  MiniMap,
  type Node as RFNode,
  type NodeTypes,
  type OnEdgesChange,
  type OnNodesChange,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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
  const rfRef = useRef<ReactFlowInstance<VisualNode, VisualEdge> | null>(null);

  // reactflow v11 wants edges in a locally-applied store. If we just pass
  // the prop and a no-op onEdgesChange, the prop sync happens but selection
  // / delete updates are swallowed AND in some paths the initial render
  // drops them entirely. Keep a local edge state synced from props; apply
  // reactflow's changes locally so the renderer is happy.
  const [localEdges, setLocalEdges] = useState(edges);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync on prop identity change, not on every re-render
  useEffect(() => {
    setLocalEdges(edges);
  }, [edges]);

  const handleEdgesChange: OnEdgesChange = (changes) => {
    setLocalEdges((curr) => applyEdgeChanges(changes, curr) as VisualEdge[]);
  };

  // Auto-fit the viewport when nodes transition from 0 → N (async graph
  // load) or when the set of node ids changes. reactflow's `fitView` prop
  // only fires on initial mount, which misses late-arriving data.
  const nodeIds = useMemo(() => nodes.map((n) => n.id).join("|"), [nodes]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally depend on the id set, not the node objects (position drags would retrigger a fit-view)
  useEffect(() => {
    const i = rfRef.current;
    if (!i || nodes.length === 0) return;
    const raf = requestAnimationFrame(() => i.fitView({ padding: 0.2, duration: 200 }));
    return () => cancelAnimationFrame(raf);
  }, [nodeIds]);

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

  // S1.5-2: on drag-end, stamp meta.pos onto data.raw so the save
  // signature picks up the change and debounced-save persists it.
  // Reactflow fires `onNodeDragStop` after the drag interaction ends;
  // we only mutate at this boundary (not on every drag frame) so we
  // don't spam saves.
  const handleNodeDragStop = (_ev: React.MouseEvent, draggedNode: RFNode) => {
    if (readOnly) return;
    const next = nodes.map((n) => {
      if (n.id !== draggedNode.id) return n;
      const raw = n.data.raw as FlowNode & { meta?: Record<string, unknown> };
      const nextRaw = {
        ...raw,
        meta: {
          ...(raw.meta ?? {}),
          pos: { x: draggedNode.position.x, y: draggedNode.position.y },
        },
      } as FlowNode;
      return {
        ...n,
        position: draggedNode.position,
        data: { ...n.data, raw: nextRaw },
      };
    });
    onNodesChange(next);
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
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={localEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleChange}
          onEdgesChange={handleEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          onNodeContextMenu={handleNodeContextMenu}
          onInit={(instance) => {
            rfRef.current = instance;
            // Late-arriving async graph: call fitView once nodes exist.
            if (nodes.length > 0) setTimeout(() => instance.fitView({ padding: 0.2 }), 50);
          }}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          edgesFocusable={!readOnly}
          elementsSelectable
          deleteKeyCode={readOnly ? null : ["Delete", "Backspace"]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={14} color="var(--bd-1)" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable maskColor="rgba(0,0,0,0.4)" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
