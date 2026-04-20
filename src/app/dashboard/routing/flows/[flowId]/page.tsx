"use client";
import { CodeBlock, Pill, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type Cap = {
  scope: string;
  scope_ref_id: string;
  window: string;
  limit: number;
  used: number;
  remaining: number;
  resets_at: string;
};

function statusTone(s: string) {
  if (s === "PUBLISHED") return "success" as const;
  if (s === "ARCHIVED") return "neutral" as const;
  return "warn" as const;
}

export default function FlowDetailPage({ params }: { params: Promise<{ flowId: string }> }) {
  const { flowId } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data: flow, isLoading } = trpc.routing.byId.useQuery({ id: flowId });
  const publish = trpc.routing.publish.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });
  const archive = trpc.routing.archive.useMutation({
    onSuccess: () => utils.routing.byId.invalidate({ id: flowId }),
  });

  const [caps, setCaps] = useState<Cap[]>([]);
  const [capsErr, setCapsErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/routing/caps/${flowId}`)
      .then(async (r) => {
        if (!r.ok) {
          setCapsErr((await r.json()).error?.code ?? "unknown");
          return;
        }
        const body = await r.json();
        setCaps(body.caps ?? []);
      })
      .catch((e) => setCapsErr(e.message));
  }, [flowId]);

  if (isLoading) return <div style={{ padding: 28 }}>Loading…</div>;
  if (!flow) return <div style={{ padding: 28 }}>Flow not found.</div>;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {flow.name}
        </h1>
        <Pill tone={statusTone(flow.status)} size="xs">
          {flow.status.toLowerCase()}
        </Pill>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {flow.id.slice(0, 10)}
        </span>
        <Link
          href={"/dashboard/routing/flows" as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← all flows
        </Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Link
            href={`/dashboard/routing/flows/${flowId}/simulator` as never}
            style={{ ...btnStyle(theme), textDecoration: "none" }}
          >
            Simulator
          </Link>
          {flow.status === "DRAFT" && (
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              disabled={publish.isPending}
              onClick={() => publish.mutate({ id: flowId })}
            >
              {publish.isPending ? "Publishing…" : "Publish"}
            </button>
          )}
          {flow.status === "PUBLISHED" && (
            <button
              type="button"
              style={btnStyle(theme)}
              disabled={archive.isPending}
              onClick={() => archive.mutate({ id: flowId })}
            >
              {archive.isPending ? "Archiving…" : "Archive"}
            </button>
          )}
        </div>
      </div>

      {publish.error && (
        <div
          style={{
            border: "1px solid oklch(60% 0.15 25)",
            borderRadius: 6,
            padding: 10,
            marginBottom: 12,
            fontSize: 12,
            color: "oklch(72% 0.15 25)",
          }}
        >
          Publish failed: {publish.error.message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Flow meta + graph */}
        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Flow configuration
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <Meta label="Timezone" value={flow.timezone} mono />
            <Meta label="Versions" value={String(flow.versions?.length ?? 0)} mono />
            <Meta
              label="Active version"
              value={flow.activeVersionId ? flow.activeVersionId.slice(0, 12) : "—"}
              mono
            />
            <Meta label="Created at" value={new Date(flow.createdAt).toLocaleString()} mono />
            <Meta label="Updated at" value={new Date(flow.updatedAt).toLocaleString()} mono />
          </div>
        </section>

        {/* Active version details */}
        <section style={{ border: "1px solid var(--bd-1)", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--bd-1)",
              background: "var(--bg-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Active version
          </div>
          <div style={{ padding: 14 }}>
            {flow.activeVersion ? (
              <>
                <div style={{ fontSize: 12, color: "var(--fg-2)", marginBottom: 8 }}>
                  version #{flow.activeVersion.versionNumber} published{" "}
                  {flow.activeVersion.publishedAt
                    ? new Date(flow.activeVersion.publishedAt).toLocaleString()
                    : "—"}
                </div>
                <CodeBlock label="graph" data={flow.activeVersion.graph} />
              </>
            ) : (
              <div style={{ color: "var(--fg-2)" }}>No active version (flow is in DRAFT).</div>
            )}
          </div>
        </section>
      </div>

      {/* Caps panel */}
      <section
        style={{
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          overflow: "hidden",
          marginTop: 16,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--bd-1)",
            background: "var(--bg-2)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Caps
        </div>
        {capsErr && (
          <div style={{ padding: 14, color: "oklch(72% 0.15 25)", fontSize: 12 }}>
            caps error: {capsErr}
          </div>
        )}
        {!capsErr && caps.length === 0 && (
          <div style={{ padding: 14, color: "var(--fg-2)" }}>
            No cap definitions on active version.
          </div>
        )}
        {caps.length > 0 && (
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
                <th style={{ padding: "8px 14px" }}>scope</th>
                <th>ref</th>
                <th>window</th>
                <th>used / limit</th>
                <th>remaining</th>
                <th>resets</th>
              </tr>
            </thead>
            <tbody>
              {caps.map((c, i) => (
                <tr key={`${c.scope}-${c.scope_ref_id}-${i}`} style={{ borderTop: "1px solid var(--bd-1)" }}>
                  <td style={{ padding: "8px 14px" }}>
                    <Pill size="xs">{c.scope}</Pill>
                  </td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 10 }}>
                    {c.scope_ref_id.slice(0, 10)}
                  </td>
                  <td style={{ fontFamily: "var(--mono)" }}>{c.window.toLowerCase()}</td>
                  <td style={{ fontFamily: "var(--mono)" }}>
                    {c.used} / {c.limit}
                  </td>
                  <td style={{ fontFamily: "var(--mono)", color: c.remaining === 0 ? "oklch(72% 0.15 25)" : "var(--fg-0)" }}>
                    {c.remaining}
                  </td>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                    {new Date(c.resets_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--fg-2)" }}>{label}</span>
      <span
        style={{ fontFamily: mono ? "var(--mono)" : "inherit", color: "var(--fg-0)" }}
      >
        {value}
      </span>
    </div>
  );
}
