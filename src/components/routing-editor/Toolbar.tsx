"use client";
// Canvas toolbar — lets the user structurally grow a flow without
// dropping into JSON. Lives directly above the reactflow canvas. Adding
// a node inserts an unconnected Filter / Fallback / Exit; the user is
// expected to drag an edge from one of the existing handles to connect
// it. Broker targets are added from the Algorithm inspector so the user
// picks a concrete broker.
import { btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

interface Props {
  readOnly: boolean;
  /** True iff the current flow already has at least one Exit. */
  hasExit: boolean;
  savedAt: Date | null;
  saving: boolean;
  saveErr: string | null;
  publishBlocked: boolean;
  publishBlockedReason: string | null;
  onAddFilter: () => void;
  onAddFallback: () => void;
  onAddExit: () => void;
}

function formatRelative(when: Date): string {
  const delta = Math.max(0, (Date.now() - when.getTime()) / 1000);
  if (delta < 2) return "saved just now";
  if (delta < 60) return `saved ${Math.floor(delta)}s ago`;
  if (delta < 3600) return `saved ${Math.floor(delta / 60)}m ago`;
  return `saved ${Math.floor(delta / 3600)}h ago`;
}

export function Toolbar({
  readOnly,
  hasExit,
  savedAt,
  saving,
  saveErr,
  publishBlocked,
  publishBlockedReason,
  onAddFilter,
  onAddFallback,
  onAddExit,
}: Props) {
  const { theme } = useThemeCtx();
  const disabled = readOnly;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderBottom: "1px solid var(--bd-1)",
        background: "var(--bg-2)",
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--mono)",
          color: "var(--fg-2)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginRight: 4,
        }}
      >
        add
      </span>
      <button
        type="button"
        onClick={onAddFilter}
        disabled={disabled}
        style={{ ...btnStyle(theme), fontSize: 11, opacity: disabled ? 0.5 : 1 }}
        aria-label="Add filter node"
      >
        + Filter
      </button>
      <button
        type="button"
        onClick={onAddFallback}
        disabled={disabled}
        style={{ ...btnStyle(theme), fontSize: 11, opacity: disabled ? 0.5 : 1 }}
        aria-label="Add fallback node"
      >
        + Fallback
      </button>
      <button
        type="button"
        onClick={onAddExit}
        disabled={disabled || hasExit}
        title={hasExit ? "This flow already has an Exit node" : "Add an Exit node"}
        style={{
          ...btnStyle(theme),
          fontSize: 11,
          opacity: disabled || hasExit ? 0.5 : 1,
        }}
        aria-label="Add exit node"
      >
        + Exit
      </button>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {publishBlocked && publishBlockedReason && (
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--mono)",
              color: "oklch(72% 0.15 75)",
            }}
            title={publishBlockedReason}
          >
            ⚠ publish blocked
          </span>
        )}
        {saveErr && (
          <span
            style={{ fontSize: 10, color: "oklch(72% 0.15 25)", fontFamily: "var(--mono)" }}
            title={saveErr}
          >
            ⚠ save failed
          </span>
        )}
        {saving && (
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            saving…
          </span>
        )}
        {!saving && !saveErr && savedAt && (
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            {formatRelative(savedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
