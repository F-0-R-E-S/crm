"use client";
// Tree-list view of a routing flow — iREV-style compact hierarchy
// over the same FlowVersion that the canvas authors. Read-only in
// this release; inline-edit + creation will land as a follow-up.
// Users bounce between the canvas and the tree via the header toggle.

import { Pill, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import type {
  TreeBrokerLeaf,
  TreeFolder,
  TreeRoot,
} from "@/server/routing/flow/tree";
import Link from "next/link";
import { use, useState } from "react";

export default function FlowTreePage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = use(params);
  const { theme } = useThemeCtx();
  const { data, isLoading, error } = trpc.routing.treeView.useQuery({ flowId });

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {data?.flowName ?? "Flow tree"}
        </h1>
        <span style={{ fontSize: 11, color: "var(--fg-2)" }}>
          tree view · compact iREV-style hierarchy
        </span>
        <Link
          href={`/dashboard/routing/flows/${flowId}` as never}
          style={{ marginLeft: "auto", fontSize: 12, textDecoration: "none" }}
        >
          <button type="button" style={btnStyle(theme)}>
            ← open in canvas
          </button>
        </Link>
      </div>
      {isLoading && <div style={{ color: "var(--fg-2)", fontSize: 12 }}>Loading…</div>}
      {error && (
        <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>error: {error.message}</div>
      )}
      {data?.tree && <TreeView tree={data.tree} />}
    </div>
  );
}

function TreeView({ tree }: { tree: TreeRoot }) {
  if (tree.folders.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed var(--bd-1)",
          borderRadius: 4,
          padding: 20,
          color: "var(--fg-2)",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        This flow has no routable structure yet. Open in canvas to build it.
      </div>
    );
  }
  return (
    <div
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {tree.folders.map((f, i) => (
        <TreeRow key={`${f.nodeId}-${i}`} node={f} depth={0} />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  depth,
}: {
  node: TreeFolder | TreeBrokerLeaf;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const indent = 14 + depth * 18;
  const isLeaf = node.kind === "brokerTarget";

  return (
    <div style={{ borderBottom: "1px solid var(--bd-1)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          paddingLeft: indent,
          background: isLeaf ? "transparent" : "var(--bg-2)",
        }}
      >
        {!isLeaf && (
          <button
            type="button"
            aria-label={expanded ? "collapse" : "expand"}
            onClick={() => setExpanded(!expanded)}
            style={{
              width: 16,
              height: 16,
              background: "transparent",
              border: "none",
              color: "var(--fg-2)",
              cursor: "pointer",
              fontSize: 10,
              padding: 0,
            }}
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}
        {isLeaf && <span style={{ width: 16 }} />}
        <RowContent node={node} />
      </div>
      {!isLeaf && expanded && "children" in node && (
        <div>
          {node.children.map((c, i) => (
            <TreeRow key={`${c.nodeId}-${i}`} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function RowContent({ node }: { node: TreeFolder | TreeBrokerLeaf }) {
  if (node.kind === "brokerTarget") {
    return (
      <>
        <Pill size="xs" tone="info">
          AD
        </Pill>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
          {node.label ?? node.brokerId.slice(0, 14)}
        </span>
        {node.description && (
          <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{node.description}</span>
        )}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {node.weight != null && (
            <Pill size="xs" tone="info">
              w={node.weight}
            </Pill>
          )}
          {node.chance != null && (
            <Pill size="xs" tone="accent">
              {node.chance}%
            </Pill>
          )}
          {node.hasPqlGate && (
            <Pill size="xs" tone="warn">
              PQL
            </Pill>
          )}
          <Pill size="xs" tone={node.active ? "success" : "neutral"}>
            {node.active ? "active" : "paused"}
          </Pill>
        </div>
      </>
    );
  }
  const kindShort = {
    filter: "FLT",
    algorithm: "ALG",
    smartPool: "SM",
    comparingSplit: "CO",
    fallback: "FB",
  }[node.kind];
  const sub = (() => {
    switch (node.kind) {
      case "filter":
        return `${node.rules.length} rule${node.rules.length === 1 ? "" : "s"} · ${node.logic}`;
      case "algorithm":
        return node.mode === "WEIGHTED_ROUND_ROBIN" ? "WRR" : "Slots-Chance";
      case "smartPool":
        return `≤${node.maxHop} hops · priority-failover`;
      case "comparingSplit":
        return `${node.compareMetric} · n=${node.sampleSize}`;
      case "fallback":
        return `≤${node.maxHop} hops · fallback`;
    }
  })();
  const childCount = node.children.length;
  return (
    <>
      <Pill
        size="xs"
        tone={
          node.kind === "smartPool"
            ? "warn"
            : node.kind === "comparingSplit"
              ? "accent"
              : node.kind === "algorithm"
                ? "success"
                : "info"
        }
      >
        {kindShort}
      </Pill>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
        {node.label ?? node.nodeId}
      </span>
      <span style={{ fontSize: 11, color: "var(--fg-2)" }}>{sub}</span>
      <span
        style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}
      >
        {childCount} child{childCount === 1 ? "" : "ren"}
      </span>
    </>
  );
}
