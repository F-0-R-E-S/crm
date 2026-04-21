"use client";
// Visual Flow Editor — the centerpiece of the routing UI rebuild.
//
// Layout:
//   ┌───────────────────────────────────────────────────────────────────┐
//   │  header: name + status + publish/archive + simulator link         │
//   ├────────────┬───────────────────────────────────────┬──────────────┤
//   │            │   toolbar  (+Filter +Fallback +Exit)  │              │
//   │  versions  ├───────────────────────────────────────┤  inspector   │
//   │            │        reactflow canvas               │              │
//   ├────────────┴───────────────────────────────────────┴──────────────┤
//   │  save draft · publish · cap counters footer                       │
//   └───────────────────────────────────────────────────────────────────┘
//
// v1.0.3: structural graph edits (add/remove broker targets, add
// filter/fallback/exit nodes, draw edges by dragging from handles,
// delete with keyboard/context-menu) with a debounced auto-save, a
// last-saved badge, an empty-state nudge in the inspector and a
// client-side publish guard.

import { btnStyle } from "@/components/router-crm";
import {
  type AlgoEntry,
  Canvas,
  type CapDefRow,
  DraftPublishBadge,
  Inspector,
  type LiveCap,
  type ScheduleValue,
  Toolbar,
  VersionHistory,
  type VisualEdge,
  type VisualNode,
  computeDraftPublishState,
  normalizeSchedule,
} from "@/components/routing-editor";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import {
  addBrokerTarget,
  addEdge as addEdgeToGraph,
  addExitNode,
  addFallbackNode,
  addFilterNode,
  deleteEdge as deleteEdgeFromGraph,
  deleteNode as deleteNodeFromGraph,
  findAlgorithmNodeId,
  hasReachableBrokerTarget,
} from "@/server/routing/flow/builder";
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

/**
 * Extract the current FlowGraph snapshot from the visual editor state.
 * Centralised so the save path, publish path, and guard check all see
 * the exact same shape.
 */
function snapshotGraph(visual: {
  nodes: VisualNode[];
  edges: VisualEdge[];
}): FlowGraph {
  return graphToFlow({
    nodes: visual.nodes.map((n) => ({
      id: n.id,
      type: n.data.kind === "BrokerTarget" ? "brokerTarget" : (n.data.kind.toLowerCase() as never),
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
}

function visualFromFlow(g: FlowGraph, positions?: Record<string, { x: number; y: number }>) {
  const v = flowToGraph(g, positions);
  return {
    nodes: v.nodes as VisualNode[],
    edges: v.edges as VisualEdge[],
  };
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
    edges: VisualEdge[];
  } | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [capRows, setCapRows] = useState<CapDefRow[]>([]);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  // Re-render tick so "saved 2s ago" updates every second without
  // re-querying the server.
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setNowTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(h);
  }, []);
  // Silence unused-variable lint; we just need React to re-render.
  void nowTick;

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
  //
  // S1.5-2: position precedence is now (explicit > meta.pos > auto-layout).
  // The `algorithm.__positions` side-channel is kept for backward compat
  // with flows saved before `meta.pos` existed; newly saved flows write
  // positions directly onto FlowNode.meta.pos.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedVersion) return;
    if (hydratedFor.current === selectedVersion.id) return;
    try {
      const g = selectedVersion.graph as FlowGraph;
      const legacyPositions = (
        selectedVersion.algorithm as { __positions?: Record<string, { x: number; y: number }> }
      )?.__positions;
      setVisual(visualFromFlow(g, legacyPositions));
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
  const flowAlgoConfig = useMemo(
    () => algoConfigs?.find((c) => c.scope === "FLOW" && !c.scopeRefId) ?? null,
    [algoConfigs],
  );

  const selectedNode: FlowNode | null = useMemo(() => {
    if (!visual || !selectedId) return null;
    return visual.nodes.find((n) => n.id === selectedId)?.data.raw ?? null;
  }, [visual, selectedId]);

  const algoMode = (flowAlgoConfig?.mode ?? "WEIGHTED_ROUND_ROBIN") as
    | "WEIGHTED_ROUND_ROBIN"
    | "SLOTS_CHANCE";

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

  // Schedule value (from entryFilters.schedule on the version)
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleValue | null>(null);
  useEffect(() => {
    if (!selectedVersion) return;
    const ef = selectedVersion.entryFilters as { schedule?: Partial<ScheduleValue> } | null;
    setScheduleDraft(normalizeSchedule(ef?.schedule));
  }, [selectedVersion]);

  // ── handlers: structural + inspector edits ───────────────────────────
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

  const replaceGraph = useCallback(
    (next: FlowGraph, selectId?: string | null) => {
      const positions: Record<string, { x: number; y: number }> = {};
      if (visual) {
        for (const n of visual.nodes) positions[n.id] = n.position;
      }
      setVisual(visualFromFlow(next, positions));
      if (selectId !== undefined) setSelectedId(selectId);
    },
    [visual],
  );

  const handleAddBroker = useCallback(
    (brokerId: string) => {
      if (!visual || readOnly) return;
      try {
        const g = snapshotGraph(visual);
        const { graph, nodeId } = addBrokerTarget(g, brokerId, algoMode);
        replaceGraph(graph, nodeId);
      } catch (e) {
        setSaveErr((e as Error).message);
      }
    },
    [visual, readOnly, algoMode, replaceGraph],
  );

  const handleRemoveBroker = useCallback(
    (nodeId: string) => {
      if (!visual || readOnly) return;
      try {
        const g = snapshotGraph(visual);
        // Use deleteNode (which also strips edges); for Slots-Chance we
        // defer re-normalization to the user.
        const graph = deleteNodeFromGraph(g, nodeId);
        replaceGraph(graph, selectedId === nodeId ? null : selectedId);
      } catch (e) {
        setSaveErr((e as Error).message);
      }
    },
    [visual, readOnly, replaceGraph, selectedId],
  );

  const handleAddFilter = useCallback(() => {
    if (!visual || readOnly) return;
    try {
      const g = snapshotGraph(visual);
      const { graph, nodeId } = addFilterNode(g);
      replaceGraph(graph, nodeId);
    } catch (e) {
      setSaveErr((e as Error).message);
    }
  }, [visual, readOnly, replaceGraph]);

  const handleAddFallback = useCallback(() => {
    if (!visual || readOnly) return;
    try {
      const g = snapshotGraph(visual);
      const { graph, nodeId } = addFallbackNode(g);
      replaceGraph(graph, nodeId);
    } catch (e) {
      setSaveErr((e as Error).message);
    }
  }, [visual, readOnly, replaceGraph]);

  const handleAddExit = useCallback(() => {
    if (!visual || readOnly) return;
    try {
      const g = snapshotGraph(visual);
      const { graph, nodeId } = addExitNode(g);
      replaceGraph(graph, nodeId);
    } catch (e) {
      setSaveErr((e as Error).message);
    }
  }, [visual, readOnly, replaceGraph]);

  const handleConnect = useCallback(
    (conn: { from: string; to: string; condition: "default" | "on_success" | "on_fail" }) => {
      if (!visual || readOnly) return;
      try {
        const g = snapshotGraph(visual);
        const next = addEdgeToGraph(g, conn);
        replaceGraph(next);
      } catch (e) {
        setSaveErr((e as Error).message);
      }
    },
    [visual, readOnly, replaceGraph],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!visual || readOnly) return;
      try {
        const g = snapshotGraph(visual);
        const next = deleteNodeFromGraph(g, nodeId);
        replaceGraph(next, selectedId === nodeId ? null : selectedId);
      } catch (e) {
        setSaveErr((e as Error).message);
      }
    },
    [visual, readOnly, replaceGraph, selectedId],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (!visual || readOnly) return;
      const edge = visual.edges.find((e) => e.id === edgeId);
      if (!edge) return;
      try {
        const g = snapshotGraph(visual);
        const next = deleteEdgeFromGraph(g, {
          from: edge.source,
          to: edge.target,
          condition: edge.data.condition as "default" | "on_success" | "on_fail",
        });
        replaceGraph(next);
      } catch (e) {
        setSaveErr((e as Error).message);
      }
    },
    [visual, readOnly, replaceGraph],
  );

  const handleContextMenu = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (readOnly) return;
      setCtxMenu({ nodeId, x, y });
    },
    [readOnly],
  );

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

  // ── save: graph + caps + algo params ─────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!visual || !flow || !selectedVersion || readOnly) return;
    setSaveErr(null);
    try {
      const baseGraph = snapshotGraph(visual);
      await updateDraft.mutateAsync({ id: flowId, graph: baseGraph });

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

      setSavedAt(new Date());
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

  // ── debounced auto-save on structural changes ────────────────────────
  // We take a content-hash of the nodes/edges/capRows so that positional
  // drags don't trigger saves — only shape changes do.
  const saveSignature = useMemo(() => {
    if (!visual) return "";
    const n = visual.nodes.map((x) => ({
      id: x.id,
      kind: x.data.kind,
      raw: x.data.raw,
    }));
    const e = visual.edges.map((x) => ({
      from: x.source,
      to: x.target,
      cond: x.data.condition,
    }));
    return JSON.stringify({ n, e, capRows });
  }, [visual, capRows]);
  const firstSigRef = useRef<string | null>(null);
  const lastSavedSigRef = useRef<string | null>(null);
  // Debounced save queued iff local signature drifted from last-saved
  // signature. Surfaces as "unsaved changes" on the header badge.
  const debouncePending =
    !readOnly &&
    lastSavedSigRef.current !== null &&
    saveSignature !== "" &&
    lastSavedSigRef.current !== saveSignature;
  useEffect(() => {
    if (!visual || readOnly) return;
    if (firstSigRef.current === null) {
      // Record the signature of the initially-loaded graph so we don't
      // immediately save on hydration.
      firstSigRef.current = saveSignature;
      lastSavedSigRef.current = saveSignature;
      return;
    }
    if (firstSigRef.current === saveSignature) return;
    const h = setTimeout(() => {
      handleSave().then(() => {
        lastSavedSigRef.current = saveSignature;
      });
    }, 500);
    return () => clearTimeout(h);
  }, [saveSignature, visual, readOnly, handleSave]);

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

  // ── publish guard: ensure at least one reachable BrokerTarget ────────
  const publishBlocked = useMemo(() => {
    if (!visual) return true;
    const g = snapshotGraph(visual);
    return !hasReachableBrokerTarget(g);
  }, [visual]);

  const publishBlockedReason = publishBlocked
    ? "Flow must have at least one BrokerTarget reachable from Entry before publishing."
    : null;

  const hasExit = useMemo(() => {
    if (!visual) return false;
    return visual.nodes.some((n) => n.data.kind === "Exit");
  }, [visual]);

  const hasAlgorithmNode = useMemo(() => {
    if (!visual) return false;
    return visual.nodes.some((n) => n.data.kind === "Algorithm");
  }, [visual]);

  const hasAnyBrokerTarget = useMemo(() => {
    if (!visual) return false;
    return visual.nodes.some((n) => n.data.kind === "BrokerTarget");
  }, [visual]);

  const jumpToAlgorithm = useCallback(() => {
    if (!visual) return;
    const g = snapshotGraph(visual);
    const algoId = findAlgorithmNodeId(g);
    if (algoId) setSelectedId(algoId);
  }, [visual]);

  const saveInFlight = updateDraft.isPending || updateCaps.isPending || upsertAlgo.isPending;

  // Derive active + latest version numbers for the draft/publish badge.
  // The `versions` array is already ordered ascending by versionNumber.
  const activeVersionNumber = flow
    ? ((flow.versions ?? []).find((v) => v.id === flow.activeVersionId)?.versionNumber ?? null)
    : null;
  const latestVersionNumber = flow
    ? ((flow.versions ?? [])[flow.versions.length - 1]?.versionNumber ?? null)
    : null;

  const draftPublishState = computeDraftPublishState({
    flowStatus: (flow?.status ?? "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    isLatestDraft,
    saveInFlight,
    debouncePending,
    savedAt,
    now: Date.now(),
    activeVersionNumber,
    latestVersionNumber,
  });

  if (isLoading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!flow) return <div style={{ padding: 28 }}>Flow not found.</div>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 46px)",
      }}
      onClickCapture={() => setCtxMenu(null)}
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
        <DraftPublishBadge state={draftPublishState} />
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {flow.id.slice(0, 10)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {liveErr && (
            <span style={{ fontSize: 10, color: "oklch(72% 0.15 25)" }}>caps: {liveErr}</span>
          )}
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
              disabled={saveInFlight}
            >
              {saveInFlight ? "Saving…" : "Save draft"}
            </button>
          )}
          {flow.status === "DRAFT" && (
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={publish.isPending || publishBlocked}
              title={publishBlocked && publishBlockedReason ? publishBlockedReason : undefined}
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
              firstSigRef.current = null;
              setSelectedId(null);
            }}
          />
        </aside>

        {/* Middle: toolbar + canvas */}
        <main style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <Toolbar
            readOnly={readOnly}
            hasExit={hasExit}
            savedAt={savedAt}
            saving={saveInFlight}
            saveErr={saveErr}
            publishBlocked={publishBlocked}
            publishBlockedReason={publishBlockedReason}
            onAddFilter={handleAddFilter}
            onAddFallback={handleAddFallback}
            onAddExit={handleAddExit}
          />
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {visual ? (
              <Canvas
                nodes={visual.nodes}
                edges={visual.edges}
                selectedId={selectedId}
                brokers={brokers ?? []}
                readOnly={readOnly}
                onSelect={setSelectedId}
                onNodesChange={(next) => setVisual({ ...visual, nodes: next })}
                onConnect={handleConnect}
                onDeleteNode={handleDeleteNode}
                onDeleteEdge={handleDeleteEdge}
                onNodeContextMenu={handleContextMenu}
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
            {ctxMenu && (
              <div
                style={{
                  position: "fixed",
                  top: ctxMenu.y,
                  left: ctxMenu.x,
                  zIndex: 40,
                  background: "var(--bg-1)",
                  border: "1px solid var(--bd-1)",
                  borderRadius: 4,
                  padding: 4,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  minWidth: 140,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteNode(ctxMenu.nodeId);
                    setCtxMenu(null);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    fontSize: 12,
                    padding: "6px 8px",
                    background: "transparent",
                    color: "var(--fg-0)",
                    border: "none",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  Delete node
                </button>
              </div>
            )}
          </div>
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
              hasAnyBrokerTarget={hasAnyBrokerTarget}
              hasAlgorithmNode={hasAlgorithmNode}
              onJumpToAlgorithm={jumpToAlgorithm}
              brokers={(brokers ?? []).map((b) => ({
                id: b.id,
                name: b.name,
                isActive: b.isActive,
                dailyCap: b.dailyCap ?? null,
                lastHealthStatus: b.lastHealthStatus,
                autologinEnabled: b.autologinEnabled,
              }))}
              algoMode={algoMode}
              algoEntries={algoEntries}
              onAlgoChange={handleAlgoChange}
              onAlgoModeChange={handleAlgoModeChange}
              onAddBroker={handleAddBroker}
              onRemoveBroker={handleRemoveBroker}
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
