"use client";
// VersionHistory — compact list of FlowVersion rows. Published version is
// highlighted; on click, caller can load that version's graph read-only.

import { Pill } from "@/components/router-crm";

interface Version {
  id: string;
  versionNumber: number;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
}

interface Props {
  versions: Version[];
  activeVersionId: string | null | undefined;
  selectedVersionId?: string | null;
  onSelect: (id: string) => void;
}

function fmt(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VersionHistory({ versions, activeVersionId, selectedVersionId, onSelect }: Props) {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {sorted.map((v) => {
        const isActive = v.id === activeVersionId;
        const isSelected = v.id === selectedVersionId;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onSelect(v.id)}
            style={{
              textAlign: "left",
              padding: "6px 8px",
              border: `1px solid ${isSelected ? "var(--fg-0)" : "var(--bd-1)"}`,
              background: isSelected ? "var(--bg-3)" : "var(--bg-2)",
              color: "var(--fg-0)",
              borderRadius: 4,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
            }}
          >
            <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>v{v.versionNumber}</span>
            {isActive && (
              <Pill tone="success" size="xs">
                active
              </Pill>
            )}
            {!isActive && v.publishedAt && (
              <Pill tone="neutral" size="xs">
                published
              </Pill>
            )}
            {!v.publishedAt && (
              <Pill tone="warn" size="xs">
                draft
              </Pill>
            )}
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-2)" }}>
              {fmt(v.publishedAt ?? v.createdAt)}
            </span>
          </button>
        );
      })}
      {sorted.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-2)" }}>No versions yet.</div>
      )}
    </div>
  );
}
