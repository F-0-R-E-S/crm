"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "ALL";

function statusTone(s: string) {
  if (s === "PUBLISHED") return "success" as const;
  if (s === "ARCHIVED") return "neutral" as const;
  return "warn" as const;
}

const COMMON_TZS = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
];

function newFlowGraph() {
  return {
    nodes: [
      { id: "entry", kind: "Entry" as const, label: "Entry" },
      {
        id: "algo",
        kind: "Algorithm" as const,
        mode: "WEIGHTED_ROUND_ROBIN" as const,
        label: "WRR",
      },
      { id: "exit", kind: "Exit" as const, label: "Exit" },
    ],
    edges: [
      { from: "entry", to: "algo" },
      { from: "algo", to: "exit" },
    ],
  };
}

export default function FlowsListPage() {
  const router = useRouter();
  const { theme } = useThemeCtx();
  const [status, setStatus] = useState<Status>("ALL");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tz, setTz] = useState("UTC");
  const [err, setErr] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.routing.list.useQuery(status === "ALL" ? undefined : { status });
  const createMut = trpc.routing.create.useMutation({
    onSuccess: (f) => {
      setCreating(false);
      setName("");
      setTz("UTC");
      setErr(null);
      utils.routing.list.invalidate();
      router.push(`/dashboard/routing/flows/${f.id}` as never);
    },
    onError: (e) => setErr(e.message),
  });

  function handleCreate() {
    setErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("name is required");
      return;
    }
    createMut.mutate({ name: trimmed, timezone: tz, graph: newFlowGraph() });
  }

  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Routing Flows
        </h1>
        <Link
          href={"/dashboard/routing" as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← overview
        </Link>
        <span style={{ fontSize: 11, color: "var(--fg-2)", marginLeft: "auto" }}>
          {data?.length ?? 0} flows
        </span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{ ...btnStyle(theme, "primary"), fontSize: 11 }}
        >
          + New flow
        </button>
      </div>

      {creating && (
        <div
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
            background: "var(--bg-1)",
            display: "grid",
            gridTemplateColumns: "1fr 220px auto auto",
            gap: 8,
            alignItems: "end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            <span
              style={{ color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              name
            </span>
            <input
              // biome-ignore lint/a11y/noAutofocus: intentional — create-flow modal auto-focuses the first input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. geo-routing-prod"
              style={inputStyle(theme)}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            <span
              style={{ color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              timezone
            </span>
            <select value={tz} onChange={(e) => setTz(e.target.value)} style={inputStyle(theme)}>
              {COMMON_TZS.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMut.isPending}
            style={{ ...btnStyle(theme, "primary"), fontSize: 12 }}
          >
            {createMut.isPending ? "creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setErr(null);
              setName("");
            }}
            style={{ ...btnStyle(theme), fontSize: 12 }}
          >
            Cancel
          </button>
          {err && (
            <div style={{ gridColumn: "1 / -1", color: "var(--fg-danger, #e87c7c)", fontSize: 11 }}>
              {err}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            style={{
              ...btnStyle(theme, status === s ? "primary" : undefined),
              fontSize: 11,
            }}
          >
            {s.toLowerCase()}
          </button>
        ))}
      </div>

      {isLoading && <div style={{ color: "var(--fg-2)" }}>loading…</div>}
      {!isLoading && (data?.length ?? 0) === 0 && (
        <div
          style={{
            border: "1px dashed var(--bd-1)",
            padding: 24,
            borderRadius: 6,
            color: "var(--fg-2)",
            textAlign: "center",
          }}
        >
          No flows yet. Click <b>+ New flow</b> above, or an <code>auto:&lt;GEO&gt;</code> flow will
          be created automatically on first push.
        </div>
      )}

      <div style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "var(--fg-2)",
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <th style={{ padding: "10px 14px" }}>name</th>
              <th>status</th>
              <th>timezone</th>
              <th>versions</th>
              <th>active version</th>
              <th>updated</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((f) => (
              <tr key={f.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "10px 14px" }}>
                  <Link
                    href={`/dashboard/routing/flows/${f.id}` as never}
                    style={{ color: "var(--fg-0)", textDecoration: "none", fontWeight: 500 }}
                  >
                    {f.name}
                  </Link>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                    {f.id.slice(0, 10)}
                  </div>
                </td>
                <td>
                  <Pill tone={statusTone(f.status)} size="xs">
                    {f.status.toLowerCase()}
                  </Pill>
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{f.timezone}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{f.versions?.length ?? 0}</td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                  {f.activeVersionId ? f.activeVersionId.slice(0, 10) : "—"}
                </td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                  {new Date(f.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
