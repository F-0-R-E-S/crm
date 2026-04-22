"use client";
// Custom reactflow node renderers for the routing visual editor.
//
// Each node type corresponds to a `FlowNode.kind`:
//
//   Entry        — EntryNode    (flow metadata card)
//   Filter       — BranchNode   (condition predicate; default + fail outputs)
//   Algorithm    — AlgorithmNode (WRR / Slots-Chance pick)
//   BrokerTarget — BrokerPoolNode (broker + weight/chance + health)
//   Fallback     — FallbackNode  (fallback triggers)
//   Exit         — ExitNode      (terminal)
//
// The Inspector panel listens to node selection; nothing here persists.

import { Pill } from "@/components/router-crm";
import type { FlowNode } from "@/server/routing/flow/model";
import { Handle, Position } from "@xyflow/react";

interface NodeData {
  kind: FlowNode["kind"];
  label: string;
  raw: FlowNode;
}

const BASE_STYLE = {
  background: "var(--bg-1)",
  border: "1px solid var(--bd-1)",
  borderRadius: 8,
  padding: "10px 12px",
  minWidth: 180,
  fontSize: 12,
  color: "var(--fg-0)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
} as const;

const KIND_ACCENT: Record<FlowNode["kind"], string> = {
  Entry: "oklch(78% 0.13 220)",
  Filter: "oklch(80% 0.12 290)",
  Algorithm: "oklch(82% 0.14 150)",
  BrokerTarget: "oklch(82% 0.15 75)",
  Fallback: "oklch(75% 0.15 25)",
  SmartPool: "oklch(78% 0.14 40)",
  ComparingSplit: "oklch(80% 0.13 320)",
  Exit: "oklch(70% 0.05 230)",
};

function Header({ kind, sub }: { kind: FlowNode["kind"]; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderBottom: "1px solid var(--bd-1)",
        paddingBottom: 6,
        marginBottom: 8,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: KIND_ACCENT[kind],
        }}
      />
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-2)",
        }}
      >
        {kind}
      </span>
      {sub && (
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--fg-2)",
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

export function EntryNode({ data }: { data: NodeData }) {
  return (
    <div style={BASE_STYLE}>
      <Header kind="Entry" />
      <div style={{ fontWeight: 500 }}>{data.label}</div>
      <div style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 4 }}>
        All traffic enters here
      </div>
      <Handle type="source" position={Position.Right} style={{ background: KIND_ACCENT.Entry }} />
    </div>
  );
}

export function BranchNode({ data }: { data: NodeData }) {
  const node = data.raw as Extract<FlowNode, { kind: "Filter" }>;
  return (
    <div style={BASE_STYLE}>
      <Header kind="Filter" sub={node.logic} />
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{data.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {node.rules.slice(0, 3).map((c, i) => (
          <span
            key={`${c.field}-${i}`}
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              color: "var(--fg-1)",
            }}
          >
            {c.field} {c.sign} {Array.isArray(c.value) ? `[${c.value.join(",")}]` : String(c.value)}
          </span>
        ))}
        {node.rules.length > 3 && (
          <span style={{ fontSize: 10, color: "var(--fg-2)" }}>+{node.rules.length - 3} more</span>
        )}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
      <Handle type="source" position={Position.Right} style={{ background: KIND_ACCENT.Filter }} />
    </div>
  );
}

export function AlgorithmNode({ data }: { data: NodeData }) {
  const node = data.raw as Extract<FlowNode, { kind: "Algorithm" }>;
  return (
    <div style={BASE_STYLE}>
      <Header kind="Algorithm" />
      <div style={{ fontWeight: 500, marginBottom: 6 }}>
        {node.mode === "WEIGHTED_ROUND_ROBIN" ? "Weighted Round-Robin" : "Slots-Chance"}
      </div>
      <Pill tone={node.mode === "WEIGHTED_ROUND_ROBIN" ? "info" : "accent"} size="xs">
        {node.mode === "WEIGHTED_ROUND_ROBIN" ? "WRR" : "Slots %"}
      </Pill>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: KIND_ACCENT.Algorithm }}
      />
    </div>
  );
}

export function BrokerPoolNode({
  data,
  health,
}: {
  data: NodeData;
  health?: {
    isActive: boolean;
    lastHealthStatus: string;
    autologinEnabled: boolean;
    brokerName: string;
  };
}) {
  const node = data.raw as Extract<FlowNode, { kind: "BrokerTarget" }>;
  const tone: "success" | "warn" | "danger" | "neutral" =
    health?.lastHealthStatus === "healthy"
      ? "success"
      : health?.lastHealthStatus === "degraded"
        ? "warn"
        : health?.lastHealthStatus === "down"
          ? "danger"
          : "neutral";
  return (
    <div style={BASE_STYLE}>
      <Header kind="BrokerTarget" />
      <div style={{ fontWeight: 500, marginBottom: 4 }}>
        {health?.brokerName ?? node.brokerId.slice(0, 14)}
      </div>
      <div
        style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)", marginBottom: 6 }}
      >
        {node.brokerId.slice(0, 16)}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {node.weight != null && (
          <Pill tone="info" size="xs">
            w={node.weight}
          </Pill>
        )}
        {node.chance != null && (
          <Pill tone="accent" size="xs">
            {node.chance}%
          </Pill>
        )}
        {node.slots != null && (
          <Pill tone="neutral" size="xs">
            slots={node.slots}
          </Pill>
        )}
        {health && (
          <Pill tone={tone} size="xs">
            {health.lastHealthStatus}
          </Pill>
        )}
        {health?.autologinEnabled && (
          <Pill tone="accent" size="xs">
            autologin
          </Pill>
        )}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: KIND_ACCENT.BrokerTarget }}
      />
    </div>
  );
}

export function FallbackNode({ data }: { data: NodeData }) {
  const node = data.raw as Extract<FlowNode, { kind: "Fallback" }>;
  // Defensive: older seeds (pre-v2.0 battle-demo) may have persisted a
  // Fallback without the triggers object. Fall back to schema defaults
  // so the canvas doesn't crash while a migration catches up.
  const triggers = node.triggers ?? {
    timeoutMs: 2000,
    httpStatusCodes: [500, 502, 503, 504],
    connectionError: true,
    explicitReject: true,
  };
  return (
    <div style={BASE_STYLE}>
      <Header kind="Fallback" sub={`≤${node.maxHop ?? 3} hops`} />
      <div style={{ fontWeight: 500, marginBottom: 6 }}>{data.label}</div>
      <div style={{ fontSize: 10, color: "var(--fg-2)" }}>
        triggers: timeout={triggers.timeoutMs}ms
        {triggers.connectionError ? " · conn" : ""}
        {triggers.explicitReject ? " · reject" : ""}
      </div>
      <div style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 2 }}>
        http: {triggers.httpStatusCodes.join(",")}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: KIND_ACCENT.Fallback }}
      />
    </div>
  );
}

export function SmartPoolNode({ data }: { data: NodeData }) {
  const node = data.raw as Extract<FlowNode, { kind: "SmartPool" }>;
  return (
    <div style={BASE_STYLE}>
      <Header kind="SmartPool" sub={`≤${node.maxHop} hops`} />
      <div style={{ fontWeight: 500, marginBottom: 4 }}>
        {data.label ?? "Sequential pool"}
      </div>
      <div style={{ fontSize: 10, color: "var(--fg-2)", marginBottom: 6 }}>
        Ask each child in rank order; the first that accepts wins.
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <Pill tone="warn" size="xs">
          priority-failover
        </Pill>
        <Pill tone="info" size="xs">
          timeout={node.triggers.timeoutMs}ms
        </Pill>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: KIND_ACCENT.SmartPool }}
      />
    </div>
  );
}

export function ComparingSplitNode({ data }: { data: NodeData }) {
  const node = data.raw as Extract<FlowNode, { kind: "ComparingSplit" }>;
  return (
    <div style={BASE_STYLE}>
      <Header kind="ComparingSplit" sub={`n=${node.sampleSize}`} />
      <div style={{ fontWeight: 500, marginBottom: 4 }}>
        {data.label ?? "A/B Compare"}
      </div>
      <div style={{ fontSize: 10, color: "var(--fg-2)", marginBottom: 6 }}>
        Split traffic; track {node.compareMetric} per branch.
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <Pill tone="accent" size="xs">
          {node.compareMetric}
        </Pill>
        <Pill tone="info" size="xs">
          min sample {node.sampleSize}
        </Pill>
      </div>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: KIND_ACCENT.ComparingSplit }}
      />
    </div>
  );
}

export function ExitNode({ data }: { data: NodeData }) {
  return (
    <div style={BASE_STYLE}>
      <Header kind="Exit" />
      <div style={{ fontWeight: 500 }}>{data.label}</div>
      <div style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 4 }}>Route selected</div>
      <Handle type="target" position={Position.Left} style={{ background: "var(--fg-2)" }} />
    </div>
  );
}
