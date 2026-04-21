"use client";
// Diagnostic page — minimal reactflow/xyflow test to isolate the
// edge-rendering bug from the rest of the routing editor's complexity.
//
// Renders a hardcoded {A → B} graph and logs DOM node/edge counts so we
// can tell whether the library renders edges at all in this
// Next.js + React 19 build. If this page shows the edge, the bug lives
// in the routing editor's data pipeline; if not, it's the library.

import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { useState } from "react";
import "@xyflow/react/dist/style.css";

const INITIAL_NODES: Node[] = [
  { id: "a", position: { x: 50, y: 80 }, data: { label: "A" }, type: "default" },
  { id: "b", position: { x: 320, y: 80 }, data: { label: "B" }, type: "default" },
];
const INITIAL_EDGES: Edge[] = [{ id: "a-to-b", source: "a", target: "b" }];

export default function RfDebugPage() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);

  return (
    <div style={{ padding: 24, fontFamily: "var(--sans)" }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>xyflow diagnostic</h1>
      <p style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 16 }}>
        Minimal 2-node / 1-edge graph. If the edge doesn't render below, the library itself is
        broken in this bundle. Run the DOM assertions in the console:{" "}
        <code>document.querySelectorAll('.react-flow__edge').length</code>
      </p>
      <div
        style={{
          width: "100%",
          height: 480,
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          background: "var(--bg-1)",
        }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => setNodes((n) => applyNodeChanges(changes, n))}
            onEdgesChange={(changes) => setEdges((e) => applyEdgeChanges(changes, e))}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <pre
        style={{
          marginTop: 12,
          fontSize: 11,
          fontFamily: "var(--mono)",
          color: "var(--fg-2)",
        }}
      >
        nodes: {JSON.stringify(nodes, null, 2)}
        {"\n"}
        edges: {JSON.stringify(edges, null, 2)}
      </pre>
    </div>
  );
}
