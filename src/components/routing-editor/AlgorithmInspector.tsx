"use client";
// AlgorithmInspector — shows per-broker controls for the algorithm
// currently in use on an Algorithm-kind node or a BrokerTarget-kind node:
//
//   WRR           → per-broker weight slider 1..100 + preview percentage
//   Slots-Chance  → per-broker chance % (must sum to 100%); auto-normalize
//                   button + reset.
//
// v1.0.3: also exposes an "Add broker" section so the user can grow
// the pool from inside the inspector, and a per-row "remove" button to
// shrink it. Graph mutations happen via the parent's `onAddBroker` /
// `onRemoveBroker` callbacks — keeps this component pure.
import type { ReactNode } from "react";
import { useState } from "react";

export type AlgoMode = "WEIGHTED_ROUND_ROBIN" | "SLOTS_CHANCE";

export interface AlgoEntry {
  id: string; // BrokerTarget node id
  brokerId: string;
  name?: string; // Broker display name (resolved by parent)
  weight?: number;
  chance?: number;
  slots?: number;
  health?: "healthy" | "degraded" | "down" | "unknown";
  autologin?: boolean;
}

export interface AvailableBroker {
  id: string;
  name: string;
  lastHealthStatus: string;
  autologinEnabled?: boolean;
  isActive?: boolean;
}

interface Props {
  mode: AlgoMode;
  entries: AlgoEntry[];
  availableBrokers?: AvailableBroker[];
  readOnly?: boolean;
  onChange: (entries: AlgoEntry[]) => void;
  onAddBroker?: (brokerId: string) => void;
  onRemoveBroker?: (nodeId: string) => void;
}

function healthColor(s?: string) {
  if (s === "healthy") return "oklch(82% 0.14 150)";
  if (s === "degraded") return "oklch(82% 0.15 75)";
  if (s === "down") return "oklch(75% 0.15 25)";
  return "var(--fg-2)";
}

function WeightRow({
  e,
  totalWeight,
  readOnly,
  onUpdate,
  onRemove,
}: {
  e: AlgoEntry;
  totalWeight: number;
  readOnly?: boolean;
  onUpdate: (patch: Partial<AlgoEntry>) => void;
  onRemove?: () => void;
}) {
  const weight = e.weight ?? 1;
  const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 70px 60px auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-0)" }}>
          {e.name ?? e.brokerId}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <span
            style={{ width: 6, height: 6, borderRadius: 6, background: healthColor(e.health) }}
          />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
            {e.health ?? "—"}
            {e.autologin ? " · auto" : ""}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        disabled={readOnly}
        value={weight}
        onChange={(ev) => onUpdate({ weight: Number.parseInt(ev.target.value, 10) || 1 })}
        style={{ width: "100%" }}
        aria-label={`weight for ${e.name ?? e.brokerId}`}
      />
      <div style={{ textAlign: "right" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{weight}</span>
        <div style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          ~{pct.toFixed(1)}%
        </div>
      </div>
      {onRemove && !readOnly && (
        <button
          type="button"
          onClick={onRemove}
          title={`Remove ${e.name ?? e.brokerId}`}
          aria-label={`Remove ${e.name ?? e.brokerId}`}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            border: "1px solid var(--bd-1)",
            background: "var(--bg-2)",
            color: "var(--fg-0)",
            borderRadius: 3,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function ChanceRow({
  e,
  readOnly,
  onUpdate,
  onRemove,
}: {
  e: AlgoEntry;
  readOnly?: boolean;
  onUpdate: (patch: Partial<AlgoEntry>) => void;
  onRemove?: () => void;
}) {
  const chance = e.chance ?? 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 40px auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-0)" }}>
          {e.name ?? e.brokerId}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
          <span
            style={{ width: 6, height: 6, borderRadius: 6, background: healthColor(e.health) }}
          />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
            {e.health ?? "—"}
            {e.autologin ? " · auto" : ""}
          </span>
        </div>
      </div>
      <input
        type="number"
        step="0.01"
        min={0}
        max={100}
        disabled={readOnly}
        value={chance}
        onChange={(ev) => onUpdate({ chance: Number.parseFloat(ev.target.value) || 0 })}
        style={{
          width: "100%",
          fontFamily: "var(--mono)",
          fontSize: 11,
          padding: "3px 6px",
          border: "1px solid var(--bd-1)",
          background: "var(--bg-1)",
          color: "var(--fg-0)",
          borderRadius: 3,
        }}
      />
      <span style={{ fontSize: 10, color: "var(--fg-2)" }}>%</span>
      {onRemove && !readOnly && (
        <button
          type="button"
          onClick={onRemove}
          title={`Remove ${e.name ?? e.brokerId}`}
          aria-label={`Remove ${e.name ?? e.brokerId}`}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            border: "1px solid var(--bd-1)",
            background: "var(--bg-2)",
            color: "var(--fg-0)",
            borderRadius: 3,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AlgorithmInspector({
  mode,
  entries,
  availableBrokers = [],
  readOnly,
  onChange,
  onAddBroker,
  onRemoveBroker,
}: Props): ReactNode {
  const totalWeight = entries.reduce((a, e) => a + (e.weight ?? 1), 0);
  const totalChance = entries.reduce((a, e) => a + (e.chance ?? 0), 0);
  const chanceValid = Math.abs(totalChance - 100) < 0.01;

  // IDs of brokers already bound to a BrokerTarget in the graph.
  const usedBrokerIds = new Set(entries.map((e) => e.brokerId));
  const pickable = availableBrokers.filter((b) => !usedBrokerIds.has(b.id));
  const [pendingBrokerId, setPendingBrokerId] = useState<string>("");

  const updateEntry = (id: string, patch: Partial<AlgoEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const autoNormalize = () => {
    if (entries.length === 0) return;
    if (totalChance <= 0) {
      // Even split
      const each = 100 / entries.length;
      onChange(
        entries.map((e, i) => ({
          ...e,
          chance:
            i === entries.length - 1
              ? Math.round((100 - each * i) * 100) / 100
              : Math.round(each * 100) / 100,
        })),
      );
      return;
    }
    // Scale to 100, rounding errors end up on the last entry.
    const scaled = entries.map((e) => ((e.chance ?? 0) * 100) / totalChance);
    let running = 0;
    onChange(
      entries.map((e, i) => {
        if (i === entries.length - 1)
          return { ...e, chance: Math.round((100 - running) * 100) / 100 };
        const v = Math.round(scaled[i] * 100) / 100;
        running += v;
        return { ...e, chance: v };
      }),
    );
  };

  const reset = () => {
    if (mode === "WEIGHTED_ROUND_ROBIN") {
      onChange(entries.map((e) => ({ ...e, weight: 1 })));
    } else {
      const each = Math.round((100 / entries.length) * 100) / 100;
      onChange(
        entries.map((e, i) => ({
          ...e,
          chance:
            i === entries.length - 1
              ? Math.round((100 - each * (entries.length - 1)) * 100) / 100
              : each,
        })),
      );
    }
  };

  const handleAdd = () => {
    if (!onAddBroker) return;
    const id = pendingBrokerId || pickable[0]?.id;
    if (!id) return;
    onAddBroker(id);
    setPendingBrokerId("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          broker targets
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          {mode === "WEIGHTED_ROUND_ROBIN"
            ? `Σ weight=${totalWeight}`
            : `Σ chance=${totalChance.toFixed(2)}${chanceValid ? " ✓" : ""}`}
        </span>
      </div>

      {entries.length === 0 && (
        <div
          style={{
            fontSize: 11,
            color: "oklch(82% 0.15 75)",
            fontFamily: "var(--mono)",
            border: "1px dashed oklch(50% 0.15 75)",
            padding: "6px 8px",
            borderRadius: 4,
          }}
        >
          No broker targets on this flow yet. Add at least one before publishing.
        </div>
      )}

      {mode === "WEIGHTED_ROUND_ROBIN" &&
        entries.map((e) => (
          <WeightRow
            key={e.id}
            e={e}
            totalWeight={totalWeight}
            readOnly={readOnly}
            onUpdate={(p) => updateEntry(e.id, p)}
            onRemove={onRemoveBroker ? () => onRemoveBroker(e.id) : undefined}
          />
        ))}

      {mode === "SLOTS_CHANCE" &&
        entries.map((e) => (
          <ChanceRow
            key={e.id}
            e={e}
            readOnly={readOnly}
            onUpdate={(p) => updateEntry(e.id, p)}
            onRemove={onRemoveBroker ? () => onRemoveBroker(e.id) : undefined}
          />
        ))}

      {!readOnly && onAddBroker && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 6,
            marginTop: 4,
            alignItems: "center",
          }}
        >
          <select
            value={pendingBrokerId}
            onChange={(ev) => setPendingBrokerId(ev.target.value)}
            disabled={pickable.length === 0}
            aria-label="Broker to add to pool"
            style={{
              fontFamily: "var(--sans)",
              fontSize: 12,
              padding: "4px 8px",
              border: "1px solid var(--bd-1)",
              background: "var(--bg-1)",
              color: "var(--fg-0)",
              borderRadius: 3,
              width: "100%",
            }}
          >
            <option value="">
              {pickable.length === 0 ? "— no brokers available —" : "— select broker —"}
            </option>
            {pickable.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.lastHealthStatus})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={pickable.length === 0}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              border: "1px solid var(--bd-1)",
              background: "var(--bg-3)",
              color: "var(--fg-0)",
              borderRadius: 3,
              cursor: pickable.length === 0 ? "not-allowed" : "pointer",
              opacity: pickable.length === 0 ? 0.5 : 1,
            }}
          >
            + Add broker
          </button>
        </div>
      )}

      {!readOnly && entries.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {mode === "SLOTS_CHANCE" && (
            <button
              type="button"
              onClick={autoNormalize}
              disabled={chanceValid}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                border: "1px solid var(--bd-1)",
                background: "var(--bg-2)",
                color: "var(--fg-0)",
                borderRadius: 3,
                cursor: chanceValid ? "not-allowed" : "pointer",
                opacity: chanceValid ? 0.5 : 1,
              }}
            >
              Auto-normalize to 100%
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              border: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              color: "var(--fg-0)",
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
