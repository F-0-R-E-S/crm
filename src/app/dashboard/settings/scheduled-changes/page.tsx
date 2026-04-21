"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type StatusFilter = "" | "PENDING" | "APPLIED" | "CANCELLED" | "FAILED";
type EntityFilter = "" | "Broker" | "Flow" | "Cap";

function statusTone(s: string) {
  if (s === "PENDING") return "neutral" as const;
  if (s === "APPLIED") return "success" as const;
  if (s === "CANCELLED") return "warn" as const;
  return "danger" as const;
}

function formatPatch(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const keys = Object.keys(payload as Record<string, unknown>);
  if (!keys.length) return "—";
  const parts = keys
    .slice(0, 4)
    .map((k) => {
      const v = (payload as Record<string, unknown>)[k];
      const display =
        typeof v === "string"
          ? v
          : typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : "…";
      return `${k}=${display}`;
    })
    .join(", ");
  return keys.length > 4 ? `${parts}, +${keys.length - 4}` : parts;
}

function relativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const deltaMs = d.getTime() - Date.now();
  const abs = Math.abs(deltaMs);
  const mins = Math.round(abs / 60_000);
  const past = deltaMs < 0;
  if (abs < 60_000) return past ? "just now" : "in <1 min";
  if (mins < 60) return past ? `${mins} min ago` : `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return past ? `${hours} h ago` : `in ${hours} h`;
  const days = Math.round(hours / 24);
  return past ? `${days} d ago` : `in ${days} d`;
}

export default function ScheduledChangesPage() {
  const { theme } = useThemeCtx();
  const [status, setStatus] = useState<StatusFilter>("");
  const [entityType, setEntityType] = useState<EntityFilter>("");
  const [fromApplyAt, setFromApplyAt] = useState("");
  const [toApplyAt, setToApplyAt] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.scheduledChange.list.useQuery({
    status: status || undefined,
    entityType: entityType || undefined,
    fromApplyAt: fromApplyAt ? new Date(fromApplyAt) : undefined,
    toApplyAt: toApplyAt ? new Date(toApplyAt) : undefined,
  });

  const cancel = trpc.scheduledChange.cancel.useMutation({
    onSuccess: () => utils.scheduledChange.list.invalidate(),
  });
  const applyNow = trpc.scheduledChange.applyNow.useMutation({
    onSuccess: () => utils.scheduledChange.list.invalidate(),
  });
  const retry = trpc.scheduledChange.retry.useMutation({
    onSuccess: () => utils.scheduledChange.list.invalidate(),
  });

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1300 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
        Scheduled changes
      </h1>
      <p style={{ fontSize: 12, color: "var(--fg-2)", margin: "0 0 16px" }}>
        Delayed edits to Flows, Brokers, and Caps. The apply-scheduled-changes cron runs every 60s;
        SLA is ±5 min from target. Only fields on the allowlist per entity type are accepted.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            style={{ ...inputStyle(theme), width: 150 }}
          >
            <option value="">all</option>
            <option value="PENDING">pending</option>
            <option value="APPLIED">applied</option>
            <option value="CANCELLED">cancelled</option>
            <option value="FAILED">failed</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            entity
          </span>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityFilter)}
            style={{ ...inputStyle(theme), width: 130 }}
          >
            <option value="">all</option>
            <option value="Broker">Broker</option>
            <option value="Flow">Flow</option>
            <option value="Cap">Cap</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            from applyAt
          </span>
          <input
            type="datetime-local"
            value={fromApplyAt}
            onChange={(e) => setFromApplyAt(e.target.value)}
            style={inputStyle(theme)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            to applyAt
          </span>
          <input
            type="datetime-local"
            value={toApplyAt}
            onChange={(e) => setToApplyAt(e.target.value)}
            style={inputStyle(theme)}
          />
        </label>
      </div>

      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              textAlign: "left",
              color: "var(--fg-2)",
              fontFamily: "var(--mono)",
              fontSize: 10,
            }}
          >
            <th style={{ padding: "6px 8px" }}>entity</th>
            <th style={{ padding: "6px 8px" }}>target</th>
            <th style={{ padding: "6px 8px" }}>patch</th>
            <th style={{ padding: "6px 8px" }}>applyAt</th>
            <th style={{ padding: "6px 8px" }}>status</th>
            <th style={{ padding: "6px 8px" }}>latency</th>
            <th style={{ padding: "6px 8px" }}>actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={7} style={{ padding: 14, color: "var(--fg-2)" }}>
                Loading…
              </td>
            </tr>
          )}
          {data?.map((row) => (
            <tr key={row.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "8px" }}>{row.entityType}</td>
              <td style={{ padding: "8px", fontFamily: "var(--mono)" }}>
                {row.entityId.slice(0, 10)}
              </td>
              <td
                style={{
                  padding: "8px",
                  fontFamily: "var(--mono)",
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={JSON.stringify(row.payload)}
              >
                {formatPatch(row.payload)}
              </td>
              <td style={{ padding: "8px" }}>
                <div>{new Date(row.applyAt).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: "var(--fg-2)" }}>
                  {relativeTime(row.applyAt)}
                </div>
              </td>
              <td style={{ padding: "8px" }}>
                <Pill tone={statusTone(row.status)} size="xs">
                  {row.status.toLowerCase()}
                </Pill>
                {row.errorMessage && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "oklch(72% 0.15 25)",
                      marginTop: 2,
                      maxWidth: 200,
                    }}
                    title={row.errorMessage}
                  >
                    {row.errorMessage.slice(0, 40)}
                    {row.errorMessage.length > 40 ? "…" : ""}
                  </div>
                )}
              </td>
              <td style={{ padding: "8px", fontFamily: "var(--mono)", fontSize: 11 }}>
                {row.latencyMs !== null && row.latencyMs !== undefined
                  ? `${Math.round(row.latencyMs / 1000)}s`
                  : "—"}
              </td>
              <td style={{ padding: "8px" }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {row.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => applyNow.mutate({ id: row.id })}
                        disabled={applyNow.isPending}
                        style={btnStyle(theme, "primary")}
                      >
                        Apply now
                      </button>
                      <button
                        type="button"
                        onClick={() => cancel.mutate({ id: row.id })}
                        disabled={cancel.isPending}
                        style={btnStyle(theme)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {row.status === "FAILED" && (
                    <button
                      type="button"
                      onClick={() => retry.mutate({ id: row.id })}
                      disabled={retry.isPending}
                      style={btnStyle(theme)}
                    >
                      Retry
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {data?.length === 0 && !isLoading && (
            <tr>
              <td
                colSpan={7}
                style={{ padding: 20, color: "var(--fg-2)", textAlign: "center", fontSize: 12 }}
              >
                No scheduled changes match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
