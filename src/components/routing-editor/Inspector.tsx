"use client";
// Inspector — node-kind-dispatched edit panel.
//
// Mounts on the right side of the visual editor and edits one node at a
// time. Parent owns the canonical FlowGraph; Inspector emits patches back.

import { Pill } from "@/components/router-crm";
import type { FilterNode, FlowNode } from "@/server/routing/flow/model";
import {
  type AlgoEntry,
  type AlgoMode,
  AlgorithmInspector,
  type AvailableBroker,
} from "./AlgorithmInspector";
import { type CapDefRow, CapInspector, type LiveCap } from "./CapInspector";
import { FilterConditionEditor } from "./FilterConditionEditor";
import { ScheduleGrid, type ScheduleValue, normalizeSchedule } from "./ScheduleGrid";
import type { FilterCondition, FilterLogic } from "./filter-conditions";

interface BrokerSummary {
  id: string;
  name: string;
  isActive: boolean;
  dailyCap: number | null;
  lastHealthStatus: string;
  autologinEnabled: boolean;
}

interface Props {
  node: FlowNode | null;
  readOnly: boolean;
  /** Indicates graph-wide structural state the inspector nudges about. */
  hasAnyBrokerTarget: boolean;
  hasAlgorithmNode: boolean;
  /** Called when the user hits the "take me to the Algorithm node" link
   * from the empty-state nudge. */
  onJumpToAlgorithm?: () => void;
  // Broker lookup — by id
  brokers: BrokerSummary[];
  // Algorithm config for the selected broker-pool node's parent algo
  algoMode: AlgoMode;
  algoEntries: AlgoEntry[];
  onAlgoChange: (entries: AlgoEntry[]) => void;
  onAlgoModeChange: (mode: AlgoMode) => void;
  /** v1.0.3: add a BrokerTarget to the flow's algorithm pool. */
  onAddBroker?: (brokerId: string) => void;
  /** v1.0.3: remove a BrokerTarget (by visual node id). */
  onRemoveBroker?: (nodeId: string) => void;
  // Caps
  capRows: CapDefRow[];
  liveCaps: LiveCap[];
  onCapChange: (rows: CapDefRow[]) => void;
  onAddCap: (brokerId: string) => void;
  onRemoveCap: (uid: string) => void;
  // Schedule (for Filter nodes with schedule-like predicate)
  schedule: ScheduleValue | null;
  onScheduleChange: (v: ScheduleValue) => void;
  // Generic node edits (label, etc.)
  onNodePatch: (patch: Partial<FlowNode>) => void;
}

const sectionStyle = {
  borderTop: "1px solid var(--bd-1)",
  paddingTop: 12,
  marginTop: 12,
};

const inp = {
  fontFamily: "var(--sans)",
  fontSize: 12,
  padding: "4px 8px",
  border: "1px solid var(--bd-1)",
  background: "var(--bg-1)",
  color: "var(--fg-0)",
  borderRadius: 3,
  width: "100%",
};

export function Inspector(props: Props) {
  const { node, readOnly, brokers } = props;

  if (!node) {
    // Empty-state panel: explain + nudge when the flow obviously lacks a
    // broker target.
    return (
      <div
        style={{
          padding: 14,
          color: "var(--fg-2)",
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div>Select a node on the canvas to edit its configuration.</div>
        {props.hasAlgorithmNode && !props.hasAnyBrokerTarget && !readOnly && (
          <div
            style={{
              border: "1px solid oklch(50% 0.15 75)",
              background: "oklch(22% 0.08 75)",
              color: "oklch(90% 0.05 75)",
              padding: "10px 12px",
              borderRadius: 4,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            Your flow has <b>no broker targets</b> — add at least one before publishing.
            {props.onJumpToAlgorithm && (
              <>
                <br />
                <button
                  type="button"
                  onClick={props.onJumpToAlgorithm}
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    padding: "4px 8px",
                    border: "1px solid var(--bd-1)",
                    background: "var(--bg-3)",
                    color: "var(--fg-0)",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  Open Algorithm inspector →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const broker = node.kind === "BrokerTarget" ? brokers.find((b) => b.id === node.brokerId) : null;

  const availableBrokers: AvailableBroker[] = brokers.map((b) => ({
    id: b.id,
    name: b.name,
    lastHealthStatus: b.lastHealthStatus,
    autologinEnabled: b.autologinEnabled,
    isActive: b.isActive,
  }));

  return (
    <div
      style={{
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflow: "auto",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Pill size="xs">{node.kind}</Pill>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
          {node.id}
        </span>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: "var(--fg-2)", letterSpacing: "0.08em" }}>LABEL</span>
        <input
          disabled={readOnly}
          value={node.label ?? ""}
          onChange={(e) => props.onNodePatch({ label: e.target.value } as Partial<FlowNode>)}
          style={inp}
        />
      </label>

      {/* Kind-specific panels */}
      {node.kind === "Algorithm" && (
        <>
          <div style={sectionStyle}>
            <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>algorithm</div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["WEIGHTED_ROUND_ROBIN", "SLOTS_CHANCE"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    props.onNodePatch({ mode: m } as Partial<FlowNode>);
                    props.onAlgoModeChange(m);
                  }}
                  style={{
                    flex: 1,
                    fontSize: 11,
                    padding: "6px 8px",
                    border: `1px solid ${node.mode === m ? "var(--fg-0)" : "var(--bd-1)"}`,
                    background: node.mode === m ? "var(--bg-3)" : "var(--bg-2)",
                    color: "var(--fg-0)",
                    borderRadius: 3,
                    cursor: readOnly ? "default" : "pointer",
                  }}
                >
                  {m === "WEIGHTED_ROUND_ROBIN" ? "WRR" : "Slots-Chance"}
                </button>
              ))}
            </div>
          </div>
          <div style={sectionStyle}>
            <AlgorithmInspector
              mode={props.algoMode}
              entries={props.algoEntries}
              availableBrokers={availableBrokers}
              readOnly={readOnly}
              onChange={props.onAlgoChange}
              onAddBroker={props.onAddBroker}
              onRemoveBroker={props.onRemoveBroker}
            />
          </div>
        </>
      )}

      {node.kind === "BrokerTarget" && (
        <>
          <div style={sectionStyle}>
            <label
              htmlFor="broker-target-broker"
              style={{ fontSize: 10, color: "var(--fg-2)", letterSpacing: "0.08em" }}
            >
              BROKER
            </label>
            <select
              id="broker-target-broker"
              disabled={readOnly}
              value={node.brokerId}
              onChange={(e) => props.onNodePatch({ brokerId: e.target.value } as Partial<FlowNode>)}
              style={{ ...inp, appearance: "auto", marginTop: 3 }}
            >
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.lastHealthStatus})
                </option>
              ))}
              {brokers.find((b) => b.id === node.brokerId) === undefined && (
                <option value={node.brokerId}>unknown: {node.brokerId}</option>
              )}
            </select>
            {broker && (
              <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {broker.autologinEnabled && (
                  <Pill size="xs" tone="accent">
                    autologin
                  </Pill>
                )}
                <Pill
                  size="xs"
                  tone={
                    broker.lastHealthStatus === "healthy"
                      ? "success"
                      : broker.lastHealthStatus === "degraded"
                        ? "warn"
                        : broker.lastHealthStatus === "down"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {broker.lastHealthStatus}
                </Pill>
                {broker.dailyCap != null && <Pill size="xs">daily cap {broker.dailyCap}</Pill>}
                {!broker.isActive && (
                  <Pill size="xs" tone="warn">
                    broker inactive
                  </Pill>
                )}
              </div>
            )}
            {props.onRemoveBroker && !readOnly && (
              <button
                type="button"
                onClick={() => props.onRemoveBroker?.(node.id)}
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  padding: "4px 8px",
                  border: "1px solid oklch(60% 0.15 25)",
                  background: "transparent",
                  color: "oklch(75% 0.15 25)",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                Remove from pool
              </button>
            )}
          </div>
          <div style={sectionStyle}>
            <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>caps</div>
            <CapInspector
              brokerId={node.brokerId}
              rows={props.capRows}
              liveCaps={props.liveCaps}
              readOnly={readOnly}
              onChange={props.onCapChange}
              onAdd={() => props.onAddCap(node.brokerId)}
              onRemove={props.onRemoveCap}
            />
          </div>
        </>
      )}

      {node.kind === "Filter" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>schedule</div>
          <ScheduleGrid
            value={normalizeSchedule(props.schedule)}
            onChange={props.onScheduleChange}
            readOnly={readOnly}
          />
          <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 12, marginBottom: 6 }}>
            conditions
          </div>
          <FilterConditionEditor
            node={node as FilterNode}
            readOnly={readOnly}
            onChange={(patch: { conditions: FilterCondition[]; logic: FilterLogic }) =>
              props.onNodePatch(patch as Partial<FlowNode>)
            }
          />
        </div>
      )}

      {node.kind === "Fallback" &&
        (() => {
          // Defensive against seeds missing triggers — see nodes.tsx.
          const triggers = node.triggers ?? {
            timeoutMs: 2000,
            httpStatusCodes: [500, 502, 503, 504],
            connectionError: true,
            explicitReject: true,
          };
          return (
            <div style={sectionStyle}>
              <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>triggers</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-1)" }}>
                timeout: {triggers.timeoutMs}ms
                <br />
                http: {triggers.httpStatusCodes.join(", ")}
                <br />
                connection error: {String(triggers.connectionError)}
                <br />
                explicit reject: {String(triggers.explicitReject)}
                <br />
                max hops: {node.maxHop ?? 3}
              </div>
              <div style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 8 }}>
                Manual review is the tail fallback when max-hops is exhausted.
              </div>
            </div>
          );
        })()}

      {node.kind === "Entry" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, color: "var(--fg-2)" }}>
            Traffic enters here. Configure entry filters at the flow level.
          </div>
        </div>
      )}

      {node.kind === "Exit" && (
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, color: "var(--fg-2)" }}>
            Terminal node — flow dispatches lead to the selected broker.
          </div>
        </div>
      )}
    </div>
  );
}
