"use client";
import { Pill } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const { data, isLoading, error } = trpc.brokerTemplate.byId.useQuery({ id }, { enabled: !!id });
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: "20px 28px", fontSize: 13, color: "var(--fg-2)" }}>loading…</div>
    );
  }
  if (error || !data) {
    return (
      <div style={{ padding: "20px 28px", fontSize: 13, color: "oklch(72% 0.15 25)" }}>
        {error?.message ?? "template not found"}
      </div>
    );
  }

  const fieldMap = (data.fieldMapping ?? {}) as Record<string, string>;
  const statusMap = (data.statusMapping ?? {}) as Record<string, string>;

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      style={{
        padding: "20px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: "transparent",
            color: "var(--fg-2)",
            border: "1px solid var(--bd-2)",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← back
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {data.name}
        </h1>
        <Pill tone="neutral">{data.vendor}</Pill>
        <Pill tone="info">{data.vertical}</Pill>
        <Pill tone={data.status === "active" ? "success" : "warn"}>{data.status}</Pill>
      </div>

      {/* Integration */}
      <Section title="Integration">
        <KV label="Protocol" value={data.protocol} />
        <KV label="HTTP method" value={data.defaultHttpMethod} />
        <KV label="Auth type" value={data.defaultAuthType} />
        <KV label="Rate limit" value={data.rateLimitPerMin ? `${data.rateLimitPerMin}/min` : "—"} />
        <KV
          label="Default headers"
          value={
            <pre style={preStyle}>{JSON.stringify(data.defaultHeaders ?? {}, null, 2)}</pre>
          }
        />
        <KV
          label="Countries"
          value={
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(data.countries ?? []).map((c) => (
                <Pill key={c} tone="neutral">
                  {c}
                </Pill>
              ))}
            </div>
          }
        />
      </Section>

      {/* Mapping */}
      <Section title="Mapping">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={mutedLabel}>Field mapping</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>source</th>
                  <th style={thStyle}>target</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(fieldMap).map(([k, v]) => (
                  <tr key={k}>
                    <td style={tdStyle}>{k}</td>
                    <td style={{ ...tdStyle, fontFamily: "var(--mono)" }}>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={mutedLabel}>Required fields</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 14 }}>
              {(data.requiredFields ?? []).map((f) => (
                <Pill key={f} tone="neutral">
                  {f}
                </Pill>
              ))}
            </div>
            <div style={mutedLabel}>Status mapping</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>broker status</th>
                  <th style={thStyle}>internal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(statusMap).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ ...tdStyle, fontFamily: "var(--mono)" }}>{k}</td>
                    <td style={tdStyle}>{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Samples */}
      <Section title="Samples">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={mutedLabel}>Sample payload</div>
            <pre style={preStyle}>{JSON.stringify(data.samplePayload ?? {}, null, 2)}</pre>
          </div>
          <div>
            <div style={mutedLabel}>Sample response</div>
            <pre style={preStyle}>{JSON.stringify(data.sampleResponse ?? {}, null, 2)}</pre>
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "14px 0 4px",
          borderTop: "1px solid var(--bd-1)",
        }}
      >
        <button
          type="button"
          onClick={() => router.push(`/dashboard/brokers/new?templateId=${data.id}` as never)}
          style={{
            background: "var(--fg-0)",
            color: "var(--bg-1)",
            border: "none",
            borderRadius: 4,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Use template
        </button>
        <button
          type="button"
          onClick={copyJson}
          style={{
            background: "transparent",
            color: "var(--fg-0)",
            border: "1px solid var(--bd-2)",
            borderRadius: 4,
            padding: "8px 14px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy template JSON"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 6,
        background: "var(--bg-1)",
        padding: "14px 18px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--fg-2)",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "6px 0", alignItems: "flex-start" }}>
      <div style={{ width: 130, color: "var(--fg-2)", fontSize: 12 }}>{label}</div>
      <div style={{ flex: 1 }}>{value}</div>
    </div>
  );
}

const mutedLabel: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "var(--mono)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--fg-2)",
  marginBottom: 6,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid var(--bd-2)",
  padding: "6px 8px",
  fontWeight: 500,
  color: "var(--fg-2)",
  fontSize: 11,
};
const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid var(--bd-1)",
};
const preStyle: React.CSSProperties = {
  background: "var(--bg-4)",
  border: "1px solid var(--bd-2)",
  borderRadius: 4,
  padding: 10,
  fontSize: 11,
  fontFamily: "var(--mono)",
  overflow: "auto",
  margin: 0,
  whiteSpace: "pre-wrap",
};
