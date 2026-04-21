"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export interface PresetManagerProps {
  onApply: (query: unknown) => void;
  currentQuery: unknown;
}

const ctlStyle: React.CSSProperties = {
  border: "1px solid var(--bd-1)",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  background: "var(--bg-2)",
  color: "inherit",
};

export function PresetManager({ onApply, currentQuery }: PresetManagerProps) {
  const utils = trpc.useUtils();
  const presets = trpc.analytics.listPresets.useQuery();
  const save = trpc.analytics.savePreset.useMutation({
    onSuccess: () => utils.analytics.listPresets.invalidate(),
  });
  const del = trpc.analytics.deletePreset.useMutation({
    onSuccess: () => {
      utils.analytics.listPresets.invalidate();
      utils.analytics.getDefaultPreset.invalidate();
    },
  });
  const ren = trpc.analytics.renamePreset.useMutation({
    onSuccess: () => utils.analytics.listPresets.invalidate(),
  });
  const setDef = trpc.analytics.setDefaultPreset.useMutation({
    onSuccess: () => {
      utils.analytics.listPresets.invalidate();
      utils.analytics.getDefaultPreset.invalidate();
    },
  });

  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" style={ctlStyle} onClick={() => setExpanded((v) => !v)}>
        presets ({presets.data?.length ?? 0})
      </button>
      <button
        type="button"
        style={ctlStyle}
        onClick={() => {
          const name = prompt("preset name?");
          if (!name) return;
          save.mutate({ name, query: currentQuery as object });
        }}
      >
        save current
      </button>
      {expanded ? (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 24,
            width: 360,
            zIndex: 20,
            background: "var(--bg-0, white)",
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 420,
            overflow: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {(presets.data ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--fg-2)", padding: 8 }}>
              No presets yet. Click "save current" to create one.
            </div>
          ) : null}
          {(presets.data ?? []).map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                padding: 4,
                borderBottom: "1px solid var(--bd-1)",
              }}
            >
              <button
                type="button"
                title={p.isDefault ? "default preset" : "set as default"}
                onClick={() => setDef.mutate({ id: p.isDefault ? null : p.id })}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: p.isDefault ? "oklch(78% 0.15 85)" : "var(--fg-2)",
                  fontSize: 14,
                }}
              >
                {p.isDefault ? "★" : "☆"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply(p.query);
                  setExpanded(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  flex: 1,
                  textAlign: "left",
                  color: "inherit",
                  fontSize: 12,
                }}
              >
                {p.name}
              </button>
              <button
                type="button"
                title="rename"
                onClick={() => {
                  const nm = prompt("new name?", p.name);
                  if (nm && nm !== p.name) ren.mutate({ id: p.id, name: nm });
                }}
                style={{ ...ctlStyle, padding: "2px 6px", fontSize: 10 }}
              >
                rename
              </button>
              <button
                type="button"
                title="delete"
                onClick={() => {
                  if (confirm(`Delete preset "${p.name}"?`)) del.mutate({ id: p.id });
                }}
                style={{ ...ctlStyle, padding: "2px 6px", fontSize: 10, color: "#c00" }}
              >
                delete
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
