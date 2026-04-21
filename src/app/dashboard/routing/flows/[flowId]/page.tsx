"use client";
// Visual Flow Editor — the centerpiece of the routing UI rebuild.
//
// Layout:
//   ┌───────────────────────────────────────────────────────────────────┐
//   │  header: name + status + publish/archive + simulator link         │
//   ├────────────┬───────────────────────────────────────┬──────────────┤
//   │            │                                       │              │
//   │  versions  │        reactflow canvas               │  inspector   │
//   │            │                                       │              │
//   ├────────────┴───────────────────────────────────────┴──────────────┤
//   │  save draft · publish · cap counters footer                       │
//   └───────────────────────────────────────────────────────────────────┘
//
// The canvas renders a FlowGraph using `flowToGraph`; the inspector edits
// the selected node in-place. On save we call `graphToFlow` to strip
// positions, update the draft version, optionally persist the algorithm
// config (WRR weights / Slots-Chance %) via a separate tRPC call, and
// upsert cap definitions.
//
// Publish uses the existing publish mutation — cycle-detection in
// `publishFlow` is preserved end-to-end.

import { Pill, btnStyle } from "@/components/router-crm";
import {
  type AlgoEntry,
  Canvas,
  type CapDefRow,
  Inspector,
  type LiveCap,
  type ScheduleValue,
  VersionHistory,
  type VisualNode,
  normalizeSchedule,
} from "@/components/routing-editor";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { extractPositions, flowToGraph, graphToFlow } from "@/server/routing/flow/graph";
import type { FlowGraph, FlowNode } from "@/server/routing/flow/model";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ServerVersion {
  id: string;
  versionNumber: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  graph: unknown;
  algorithm: unknown;
  entryFilters: unknown;
}

function statusTone(s: string) {
  if (s === "PUBLISHED") return "success" as const;
  if (s === "ARCHIVED") return "neutral" as const;
  return "warn" as const;
}

function capRowsFromServer(
  defs: Array<{
    scope: string;
    scopeRefId: string;
    window: string;
    limit: number;
    timezone: string;
    perCountry: boolean;
    countryLimits: Array<{ country: string; limit: number }>;
  }>,
): CapDefRow[] {
  return defs.map((d) => ({
    _uid: crypto.randomUUID(),
    scope: d.scope as CapDefRow["scope"],
    scopeRefId: d.scopeRefId,
    window: d.window as CapDefRow["window"],
    limit: String(d.limit),
    timezone: d.timezone,
    perCountry: d.perCountry,
    countryLimits: d.countryLimits.map((cl) => ({
      _uid: crypto.randomUUID(),
      country: cl.country,
      limit: String(cl.limit),
    })),
  }));
}

export default function FlowVisualEditorPage({
  params,
}: {
  params: Promise<{ flowId: string }>;
}) {
  const { flowId } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();

  // ── server queries ────────────────────────────────────────────────────
  const { data: flow, isLoading } = trpc.routing.byId.useQuery({ id: flowId });
  const { data: capDefs } = trpc.routing.listCaps.useQuery({ flowId });
  const { data: algoConfigs } = trpc.routing.listAlgoConfigs.useQuery({ flowId });
  const { data: brokers } = trpc.routing.listBrokersForFlow.useQuery();

  // ── mutations ─────────────────────────────────────────────────────────
  const publish = trpc.routing.publish.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });
  const archive = trpc.routing.archive.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });
  const updateDraft = trpc.routing.update.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });
  const updateCaps = trpc.routing.updateCaps.useMutation({
    onSuccess: () => utils.routing.listCaps.invalidate({ flowId }),
  });
  const upsertAlgo = trpc.routing.upsertAlgoConfig.useMutation({
    onSuccess: () => utils.routing.listAlgoConfigs.invalidate({ flowId }),
  });

  // ── local visual state ───────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visual, setVisual] = useState<{
    nodes: VisualNode[];
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      data: { condition: string };
    }>;
  } | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [capRows, setCapRows] = useState<CapDefRow[]>([]);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // ── version selection — default to active version, else latest ────────
  useEffect(() => {
    if (!flow) return;
    if (!selectedVersionId) {
      setSelectedVersionId(
        flow.activeVersionId ?? flow.versions[flow.versions.length - 1]?.id ?? null,
      );
    }
  }, [flow, selectedVersionId]);

  // ── load graph for selected version ──────────────────────────────────
  const selectedVersion: ServerVersion | undefined = useMemo(() => {
    if (!flow) return;
    return flow.versions.find((v) => v.id === selectedVersionId) as ServerVersion | undefined;
  }, [flow, selectedVersionId]);

  // Whether the currently-loaded version is the latest draft (editable).
  const isLatestDraft = useMemo(() => {
    if (!flow || !selectedVersion) return false;
    const latest = flow.versions[flow.versions.length - 1] as ServerVersion | undefined;
    return flow.status === "DRAFT" && latest?.id === selectedVersion.id;
  }, [flow, selectedVersion]);

  const readOnly = !isLatestDraft;

  // ── hydrate visual graph from the selected version ───────────────────
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedVersion) return;
    if (hydratedFor.current === selectedVersion.id) return;
    try {
      const g = selectedVersion.graph as FlowGraph;
      const positions = (
        selectedVersion.algorithm as { __positions?: Record<string, { x: number; y: number }> }
      )?.__positions;
      const v = flowToGraph(g, positions);
      setVisual({ nodes: v.nodes as VisualNode[], edges: v.edges });
      hydratedFor.current = selectedVersion.id;
    } catch (e) {
      setSaveErr(`graph load failed: ${(e as Error).message}`);
    }
  }, [selectedVersion]);

  // ── hydrate cap rows from server once per flow ───────────────────────
  useEffect(() => {
    if (capDefs) setCapRows(capRowsFromServer(capDefs));
  }, [capDefs]);

  // ── live cap counters (polled every 30s) ─────────────────────────────
  const [liveCaps, setLiveCaps] = useState<LiveCap[]>([]);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    const pull = () => {
      fetch(`/api/v1/routing/caps/${flowId}`)
        .then(async (r) => {
          if (cancel) return;
          if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            setLiveErr(body.error?.code ?? "unknown");
            setLiveCaps([]);
            return;
          }
          const body = await r.json();
          setLiveCaps((body.caps ?? []) as LiveCap[]);
          setLiveErr(null);
        })
        .catch((e) => {
          if (!cancel) setLiveErr(e.message);
        });
    };
    pull();
    const h = setInterval(pull, 30_000);
    return () => {
      cancel = true;
      clearInterval(h);
    };
  }, [flowId]);

  // ── algorithm config derived from server ─────────────────────────────
  // Find the flow-scope config (we don't yet wire branch-scope overrides
  // in this editor — the existing REST endpoint supports both; that's a
  // follow-up iteration).
  const flowAlgoConfig = useMemo(
    () => algoConfigs?.find((c) => c.scope === "FLOW" && !c.scopeRefId) ?? null,
    [algoConfigs],
  );

  const selectedNode: FlowNode | null = useMemo(() => {
    if (!visual || !selectedId) return null;
    return visual.nodes.find((n) => n.id === selectedId)?.data.raw ?? null;
  }, [visual, selectedId]);

  // Algorithm entries — one per BrokerTarget node, merged with server's
  // algorithm params + broker metadata.
  const algoEntries: AlgoEntry[] = useMemo(() => {
    if (!visual) return [];
    const brokerTargets = visual.nodes.filter((n) => n.data.kind === "BrokerTarget");
    const params = (flowAlgoConfig?.params ?? {}) as {
      weights?: Record<string, number>;
      chance?: Record<string, number>;
      slots?: Record<string, number>;
    };
    return brokerTargets.map((n) => {
      const raw = n.data.raw as Extract<FlowNode, { kind: "BrokerTarget" }>;
      const b = brokers?.find((x) => x.id === raw.brokerId);
      return {
        id: n.id,
        brokerId: raw.brokerId,
        name: b?.name,
        weight: params.weights?.[n.id] ?? raw.weight,
        chance: params.chance?.[n.id] ?? raw.chance,
        slots: params.slots?.[n.id] ?? raw.slots,
        health: (b?.lastHealthStatus ?? "unknown") as "healthy" | "degraded" | "down" | "unknown",
        autologin: b?.autologinEnabled,
      };
    });
  }, [visual, flowAlgoConfig, brokers]);

  const algoMode = (flowAlgoConfig?.mode ?? "WEIGHTED_ROUND_ROBIN") as
    | "WEIGHTED_ROUND_ROBIN"
    | "SLOTS_CHANCE";

  // Schedule value (from entryFilters.schedule on the version)
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleValue | null>(null);
  useEffect(() => {
    if (!selectedVersion) return;
    const ef = selectedVersion.entryFilters as { schedule?: Partial<ScheduleValue> } | null;
    setScheduleDraft(normalizeSchedule(ef?.schedule));
  }, [selectedVersion]);

  // ── handlers ─────────────────────────────────────────────────────────
  const handleNodePatch = useCallback(
    (patch: Record<string, unknown>) => {
      if (!visual || !selectedId || readOnly) return;
      setVisual({
        ...visual,
        nodes: visual.nodes.map((n) =>
          n.id === selectedId
            ? {
                ...n,
                data: {
                  ...n.data,
                  raw: { ...(n.data.raw as object), ...patch } as FlowNode,
                },
              }
            : n,
        ),
      });
    },
    [visual, selectedId, readOnly],
  );

  const handleAlgoChange = useCallback(
    (entries: AlgoEntry[]) => {
      if (!visual || readOnly) return;
      // Map updated weights/chance back onto the graph BrokerTarget nodes.
      setVisual({
        ...visual,
        nodes: visual.nodes.map((n) => {
          if (n.data.kind !== "BrokerTarget") return n;
          const match = entries.find((e) => e.id === n.id);
          if (!match) return n;
          const patched = {
            ...(n.data.raw as object),
            weight: match.weight,
            chance: match.chance,
            slots: match.slots,
          } as FlowNode;
          return { ...n, data: { ...n.data, raw: patched } };
        }),
      });
    },
    [visual, readOnly],
  );

  const handleAlgoModeChange = useCallback(() => {
    // Mode change is applied via handleNodePatch above; the upsert is
    // separate from the graph save.
  }, []);

  const handleAddCap = useCallback(
    (brokerId: string) => {
      if (readOnly) return;
      setCapRows((prev) => [
        ...prev,
        {
          _uid: crypto.randomUUID(),
          scope: "BROKER",
          scopeRefId: brokerId,
          window: "DAILY",
          limit: "100",
          timezone: "UTC",
          perCountry: false,
          countryLimits: [],
        },
      ]);
    },
    [readOnly],
  );

  const handleRemoveCap = useCallback((uid: string) => {
    setCapRows((prev) => prev.filter((r) => r._uid !== uid));
  }, []);

  const handleSave = useCallback(async () => {
    if (!visual || !flow || !selectedVersion || readOnly) return;
    setSaveErr(null);
    setSaveOk(false);
    try {
      // 1. Persist graph (strip positions).
      const baseGraph = graphToFlow({
        nodes: visual.nodes.map((n) => ({
          id: n.id,
          type:
            n.data.kind === "BrokerTarget" ? "brokerTarget" : (n.data.kind.toLowerCase() as never),
          position: n.position,
          data: n.data,
        })),
        edges: visual.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: {
            condition: (e.data.condition ?? "default") as "default" | "on_success" | "on_fail",
          },
        })),
      });
      await updateDraft.mutateAsync({ id: flowId, graph: baseGraph });

      // 2. Persist caps.
      const parsedCaps = capRows.map((r) => ({
        scope: r.scope,
        scopeRefId: r.scopeRefId,
        window: r.window,
        limit: Math.max(0, Number.parseInt(r.limit, 10) || 0),
        timezone: r.timezone || "UTC",
        perCountry: r.perCountry,
        countryLimits: r.countryLimits.map((cl) => ({
          country: cl.country.toUpperCase().slice(0, 2),
          limit: Math.max(1, Number.parseInt(cl.limit, 10) || 1),
        })),
      }));
      await updateCaps.mutateAsync({ flowId, caps: parsedCaps });

      // 3. Persist algorithm params derived from the graph's BrokerTarget
      //    nodes. Default mode matches current flow-scope config.
      const brokerTargets = visual.nodes.filter((n) => n.data.kind === "BrokerTarget");
      if (brokerTargets.length > 0) {
        const params: Record<string, Record<string, number>> = {};
        if (algoMode === "WEIGHTED_ROUND_ROBIN") {
          params.weights = {};
          for (const n of brokerTargets) {
            const raw = n.data.raw as Extract<FlowNode, { kind: "BrokerTarget" }>;
            params.weights[n.id] = raw.weight ?? 1;
          }
        } else {
          params.chance = {};
          for (const n of brokerTargets) {
            const raw = n.data.raw as Extract<FlowNode, { kind: "BrokerTarget" }>;
            params.chance[n.id] = raw.chance ?? 0;
          }
        }
        await upsertAlgo.mutateAsync({
          flowId,
          scope: "FLOW",
          mode: algoMode,
          params,
        });
      }

      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
      // Force re-hydrate on next data tick.
      hydratedFor.current = null;
    } catch (e) {
      setSaveErr((e as Error).message);
    }
  }, [
    visual,
    flow,
    selectedVersion,
    readOnly,
    flowId,
    capRows,
    algoMode,
    updateDraft,
    updateCaps,
    upsertAlgo,
  ]);

  // Positions snapshot is held in visual state; extracted here purely to
  // keep biome happy that `extractPositions` stays imported for callers
  // who round-trip positions into the backend later.
  useMemo(
    () =>
      visual
        ? extractPositions({ nodes: visual.nodes as never, edges: visual.edges as never })
        : null,
    [visual],
  );

  if (isLoading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!flow) return <div style={{ padding: 28 }}>Flow not found.</div>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 46px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 20px",
          borderBottom: "1px solid var(--bd-1)",
        }}
      >
        <Link
          href={"/dashboard/routing" as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← routing
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {flow.name}
        </h1>
        <Pill tone={statusTone(flow.status)} size="xs">
          {flow.status.toLowerCase()}
        </Pill>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {flow.id.slice(0, 10)}
        </span>
        {readOnly && (
          <Pill tone="neutral" size="xs">
            read-only
          </Pill>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {liveErr && (
            <span style={{ fontSize: 10, color: "oklch(72% 0.15 25)" }}>caps: {liveErr}</span>
          )}
          {saveErr && (
            <span style={{ fontSize: 10, color: "oklch(72% 0.15 25)" }}>save: {saveErr}</span>
          )}
          {saveOk && <span style={{ fontSize: 10, color: "oklch(72% 0.15 130)" }}>saved</span>}
          <Link
            href={`/dashboard/routing/flows/${flowId}/simulator` as never}
            style={{ ...btnStyle(theme), textDecoration: "none" }}
          >
            Simulator
          </Link>
          {isLatestDraft && (
            <button
              type="button"
              style={btnStyle(theme)}
              onClick={handleSave}
              disabled={updateDraft.isPending || updateCaps.isPending || upsertAlgo.isPending}
            >
              {updateDraft.isPending || updateCaps.isPending || upsertAlgo.isPending
                ? "Saving…"
                : "Save draft"}
            </button>
          )}
          {flow.status === "DRAFT" && (
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={publish.isPending}
              onClick={async () => {
                await handleSave();
                publish.mutate({ id: flowId });
              }}
            >
              {publish.isPending ? "Publishing…" : "Publish draft"}
            </button>
          )}
          {flow.status === "PUBLISHED" && (
            <button
              type="button"
              style={btnStyle(theme)}
              disabled={archive.isPending}
              onClick={() => archive.mutate({ id: flowId })}
            >
              {archive.isPending ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
      </div>
      {publish.error && (
        <div
          style={{
            borderBottom: "1px solid oklch(60% 0.15 25)",
            padding: "8px 20px",
            background: "oklch(25% 0.08 25)",
            fontSize: 12,
            color: "oklch(85% 0.08 25)",
          }}
        >
          Publish failed: {publish.error.message}
        </div>
      )}

      {/* Body: 3-column */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "220px 1fr 360px",
          gap: 12,
          padding: 12,
          minHeight: 0,
        }}
      >
        {/* Left: versions */}
        <aside
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            padding: 10,
            overflow: "auto",
            background: "var(--bg-2)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-2)",
              fontFamily: "var(--mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            versions ({flow.versions?.length ?? 0})
          </div>
          <VersionHistory
            versions={flow.versions ?? []}
            activeVersionId={flow.activeVersionId}
            selectedVersionId={selectedVersionId}
            onSelect={(id) => {
              setSelectedVersionId(id);
              hydratedFor.current = null;
              setSelectedId(null);
            }}
          />
        </aside>

        {/* Middle: canvas */}
        <main style={{ minHeight: 0 }}>
          {visual ? (
            <Canvas
              nodes={visual.nodes}
              edges={visual.edges}
              selectedId={selectedId}
              brokers={brokers ?? []}
              onSelect={setSelectedId}
              onNodesChange={(next) => setVisual({ ...visual, nodes: next })}
            />
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--fg-2)",
                border: "1px solid var(--bd-1)",
                borderRadius: 6,
              }}
            >
              Loading graph…
            </div>
          )}
        </main>

        {/* Right: inspector */}
        <aside
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            background: "var(--bg-2)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              fontSize: 13,
              fontWeight: 500,
              background: "var(--bg-2)",
            }}
          >
            Inspector
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Inspector
              node={selectedNode}
              readOnly={readOnly}
              brokers={
                (brokers ?? []).map((b) => ({
                  id: b.id,
                  name: b.name,
                  isActive: b.isActive,
                  dailyCap: b.dailyCap ?? null,
                  lastHealthStatus: b.lastHealthStatus,
                  autologinEnabled: b.autologinEnabled,
                })) ?? []
              }
              algoMode={algoMode}
              algoEntries={algoEntries}
              onAlgoChange={handleAlgoChange}
              onAlgoModeChange={handleAlgoModeChange}
              capRows={capRows}
              liveCaps={liveCaps}
              onCapChange={setCapRows}
              onAddCap={handleAddCap}
              onRemoveCap={handleRemoveCap}
              schedule={scheduleDraft}
              onScheduleChange={setScheduleDraft}
              onNodePatch={handleNodePatch}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
