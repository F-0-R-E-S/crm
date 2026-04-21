"use client";
import type { ChangeEvent } from "react";

export interface FilterState {
  from: Date;
  to: Date;
  groupBy: "hour" | "day" | "week" | "affiliate" | "broker" | "geo";
  compareTo: "previous_period" | "year_ago" | "custom" | null;
  filters: { affiliateIds: string[]; brokerIds: string[]; geos: string[] };
}

export interface PresetRef {
  id: string;
  name: string;
  query: unknown;
}

export interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onShare?: () => void;
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (id: string) => void;
  /** DEPRECATED: use `PresetManager` component instead. Kept for compat. */
  presets?: PresetRef[];
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromDateInput(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

const ctlStyle: React.CSSProperties = {
  border: "1px solid var(--bd-1)",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  background: "var(--bg-2)",
  color: "inherit",
};

export function FilterBar({
  value,
  onChange,
  onShare,
  onSavePreset,
  onLoadPreset,
  presets = [],
}: FilterBarProps) {
  const setFrom = (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, from: fromDateInput(e.target.value) });
  const setTo = (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, to: fromDateInput(e.target.value) });
  const setGroupBy = (e: ChangeEvent<HTMLSelectElement>) =>
    onChange({ ...value, groupBy: e.target.value as FilterState["groupBy"] });
  const toggleCompare = (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, compareTo: e.target.checked ? "previous_period" : null });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--bd-1)",
        paddingBottom: 12,
      }}
    >
      <label style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
        from
        <input
          type="date"
          value={toDateInput(value.from)}
          onChange={setFrom}
          style={{ ...ctlStyle, marginLeft: 6 }}
        />
      </label>
      <label style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
        to
        <input
          type="date"
          value={toDateInput(value.to)}
          onChange={setTo}
          style={{ ...ctlStyle, marginLeft: 6 }}
        />
      </label>
      <select value={value.groupBy} onChange={setGroupBy} style={ctlStyle}>
        <option value="hour">hour</option>
        <option value="day">day</option>
        <option value="week">week</option>
        <option value="affiliate">affiliate</option>
        <option value="broker">broker</option>
        <option value="geo">geo</option>
      </select>
      <label
        style={{
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--fg-2)",
        }}
      >
        <input type="checkbox" checked={value.compareTo !== null} onChange={toggleCompare} />
        compare
      </label>
      {presets.length > 0 && onLoadPreset ? (
        <select
          style={ctlStyle}
          onChange={(e) => {
            if (e.target.value) onLoadPreset(e.target.value);
          }}
          value=""
        >
          <option value="">load preset…</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : null}
      {onSavePreset ? (
        <button
          type="button"
          style={ctlStyle}
          onClick={() => {
            const name = prompt("preset name?");
            if (name) onSavePreset(name);
          }}
        >
          save preset
        </button>
      ) : null}
      {onShare ? (
        <button
          type="button"
          style={{
            ...ctlStyle,
            background: "var(--accent, oklch(76% 0.12 220))",
            color: "var(--bg-0, #000)",
            border: "1px solid transparent",
          }}
          onClick={onShare}
        >
          share
        </button>
      ) : null}
    </div>
  );
}
