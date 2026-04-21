"use client";
import { btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CloneDialogProps {
  sourceId: string;
  sourceName: string;
  onClose: () => void;
}

const COPIED_FIELDS = [
  "daily cap",
  "working hours",
  "retry schedule",
  "pending-hold minutes",
  "http method + headers",
  "field mapping + static payload",
  "status mapping",
  "postback paths",
  "sync mode + polling config",
  "autologin flag",
];
const BLANKED_FIELDS = [
  "endpoint URL (blanked)",
  "postback secret (blanked)",
  "auth config (blanked)",
  "autologin login URL (blanked)",
  "isActive (clone starts paused)",
];

export default function CloneDialog({ sourceId, sourceName, onClose }: CloneDialogProps) {
  const { theme } = useThemeCtx();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [newName, setNewName] = useState(`${sourceName} (clone)`);
  const [err, setErr] = useState<string | null>(null);
  const mut = trpc.broker.clone.useMutation({
    onSuccess: async (row) => {
      await utils.broker.list.invalidate();
      await utils.broker.listClones.invalidate({ sourceId });
      onClose();
      router.push(`/dashboard/brokers/${row.id}`);
    },
    onError: (e) => setErr(e.message),
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <dialog
        open
        style={{
          background: "var(--bg-0)",
          color: "inherit",
          border: "1px solid var(--bd-1)",
          borderRadius: 4,
          padding: "20px 22px",
          width: 520,
          maxWidth: "90vw",
          maxHeight: "85vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-label="Clone broker"
      >
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 500 }}>Clone broker</h2>

        <label style={{ display: "block", marginBottom: 14 }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: "var(--mono)",
              color: "var(--fg-2)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 6,
            }}
          >
            New broker name
          </span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ ...inputStyle(theme), width: "100%" }}
          />
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            fontSize: 11,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ color: "var(--fg-2)", marginBottom: 4 }}>WILL BE COPIED</div>
            <ul style={{ margin: 0, paddingLeft: 14 }}>
              {COPIED_FIELDS.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ color: "var(--fg-2)", marginBottom: 4 }}>WILL BE BLANKED</div>
            <ul style={{ margin: 0, paddingLeft: 14 }}>
              {BLANKED_FIELDS.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>

        {err && (
          <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12, marginBottom: 10 }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnStyle(theme)}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!newName.trim() || mut.isPending}
            onClick={() => mut.mutate({ sourceId, newName: newName.trim() })}
            style={btnStyle(theme, "primary")}
          >
            {mut.isPending ? "Cloning…" : "Clone broker"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
