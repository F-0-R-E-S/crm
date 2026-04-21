"use client";
// AlgorithmInspector — shows per-broker controls for the algorithm
// currently in use on an Algorithm-kind node or a BrokerTarget-kind node:
//
//   WRR           → per-broker weight slider 1..100 + preview percentage
//   Slots-Chance  → per-broker chance % (must sum to 100%); auto-normalize
//                   button + reset.
//
// The component is controlled. Parent owns the `entries` array and is
// responsible for persisting to the graph JSON (node.weight / node.chance).
import type { ReactNode } from "react";

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

interface Props {
  mode: AlgoMode;
  entries: AlgoEntry[];
  readOnly?: boolean;
  onChange: (entries: AlgoEntry[]) => void;
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
}: {
  e: AlgoEntry;
  totalWeight: number;
  readOnly?: boolean;
  onUpdate: (patch: Partial<AlgoEntry>) => void;
}) {
  const weight = e.weight ?? 1;
  const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 70px 60px",
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
    </div>
  );
}

function ChanceRow({
  e,
  readOnly,
  onUpdate,
}: {
  e: AlgoEntry;
  readOnly?: boolean;
  onUpdate: (patch: Partial<AlgoEntry>) => void;
}) {
  const chance = e.chance ?? 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 40px",
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
    </div>
  );
}

export function AlgorithmInspector({ mode, entries, readOnly, onChange }: Props): ReactNode {
  const totalWeight = entries.reduce((a, e) => a + (e.weight ?? 1), 0);
  const totalChance = entries.reduce((a, e) => a + (e.chance ?? 0), 0);
  const chanceValid = Math.abs(totalChance - 100) < 0.01;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          {mode === "WEIGHTED_ROUND_ROBIN" ? "weights (1-100)" : "chance %"}
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          {mode === "WEIGHTED_ROUND_ROBIN"
            ? `Σ weight=${totalWeight}`
            : `Σ chance=${totalChance.toFixed(2)}${chanceValid ? " ✓" : ""}`}
        </span>
      </div>

      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-2)" }}>
          No broker targets on this flow yet.
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
          />
        ))}

      {mode === "SLOTS_CHANCE" &&
        entries.map((e) => (
          <ChanceRow key={e.id} e={e} readOnly={readOnly} onUpdate={(p) => updateEntry(e.id, p)} />
        ))}

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
