"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FilterState = {
  vertical: string;
  protocol: string;
  country: string;
  q: string;
};

export default function BrokerTemplatesPage() {
  const { theme } = useThemeCtx();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>({
    vertical: "",
    protocol: "",
    country: "",
    q: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = trpc.brokerTemplate.list.useQuery({
    vertical: filters.vertical || undefined,
    protocol: filters.protocol || undefined,
    country: filters.country || undefined,
    q: filters.q || undefined,
    status: "active",
    limit: 100,
  });
  const selected = trpc.brokerTemplate.byId.useQuery(
    { id: selectedId ?? "" },
    { enabled: !!selectedId },
  );
  const utils = trpc.useUtils();
  const createBroker = trpc.brokerTemplate.createBroker.useMutation({
    onSuccess: (b) => {
      utils.broker.list.invalidate();
      router.push(`/dashboard/brokers/${b.id}` as never);
    },
  });

  const [form, setForm] = useState({
    name: "",
    endpointUrl: "",
    token: "",
  });

  return (
    <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Broker Templates
        </h1>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
          {data?.total ?? 0} active
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={filters.vertical}
          onChange={(e) => setFilters({ ...filters, vertical: e.target.value })}
          style={{ ...inputStyle(theme), width: 140 }}
        >
          <option value="">all verticals</option>
          <option value="forex">forex</option>
          <option value="crypto">crypto</option>
          <option value="gambling">gambling</option>
          <option value="nutra">nutra</option>
        </select>
        <select
          value={filters.protocol}
          onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
          style={{ ...inputStyle(theme), width: 140 }}
        >
          <option value="">all protocols</option>
          <option value="rest-json">REST JSON</option>
          <option value="rest-form">REST Form</option>
          <option value="soap">SOAP</option>
        </select>
        <input
          placeholder="country (UA/DE/…)"
          value={filters.country}
          onChange={(e) => setFilters({ ...filters, country: e.target.value.toUpperCase() })}
          maxLength={2}
          style={{ ...inputStyle(theme), width: 140 }}
        />
        <input
          placeholder="search by name…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          style={{ ...inputStyle(theme), flex: 1, minWidth: 160 }}
        />
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10,
        }}
      >
        {isLoading && <div style={{ color: "var(--fg-2)" }}>loading…</div>}
        {!isLoading && (data?.items?.length ?? 0) === 0 && (
          <div style={{ color: "var(--fg-2)" }}>No templates match filters.</div>
        )}
        {data?.items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelectedId(t.id);
              setCreateOpen(false);
            }}
            style={{
              textAlign: "left",
              border: selectedId === t.id ? "1px solid var(--fg-1)" : "1px solid var(--bd-1)",
              borderRadius: 6,
              padding: 14,
              background: selectedId === t.id ? "var(--bg-3)" : "transparent",
              cursor: "pointer",
              color: "var(--fg-0)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <span style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                {t.vendor}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Pill size="xs" tone="info">
                {t.vertical}
              </Pill>
              <Pill size="xs">{t.protocol}</Pill>
              <Pill size="xs">{t.defaultAuthType}</Pill>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
              {t.countries.slice(0, 6).join(" · ")}
              {t.countries.length > 6 ? ` +${t.countries.length - 6}` : ""}
            </div>
            {t.rateLimitPerMin && (
              <div style={{ fontSize: 10, color: "var(--fg-2)" }}>
                rate limit: {t.rateLimitPerMin}/min
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selectedId && selected.data && (
        <div
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            padding: 16,
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selected.data.name}</div>
              <div style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
                {selected.data.slug}
              </div>
            </div>
            <button
              type="button"
              style={btnStyle(theme, "primary")}
              onClick={() => setCreateOpen((v) => !v)}
            >
              {createOpen ? "Cancel" : "Create broker from template"}
            </button>
          </div>

          {selected.data.description && (
            <p style={{ fontSize: 13, color: "var(--fg-1)", margin: "12px 0" }}>
              {selected.data.description}
            </p>
          )}

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}
              >
                Required fields
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {selected.data.requiredFields.map((f: string) => (
                  <Pill key={f} size="xs">
                    {f}
                  </Pill>
                ))}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-2)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                }}
              >
                Status mapping
              </div>
              <pre
                style={{
                  fontSize: 11,
                  fontFamily: "var(--mono)",
                  background: "var(--bg-3)",
                  padding: 8,
                  borderRadius: 4,
                  margin: 0,
                  overflow: "auto",
                  maxHeight: 120,
                }}
              >
                {JSON.stringify(selected.data.statusMapping, null, 2)}
              </pre>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-2)",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              Sample payload
            </div>
            <pre
              style={{
                fontSize: 11,
                fontFamily: "var(--mono)",
                background: "var(--bg-3)",
                padding: 8,
                borderRadius: 4,
                margin: 0,
                overflow: "auto",
                maxHeight: 200,
              }}
            >
              {JSON.stringify(selected.data.samplePayload, null, 2)}
            </pre>
          </div>

          {createOpen && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--bd-1)", paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
                Create broker from this template
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  placeholder="Broker name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle(theme)}
                />
                <input
                  placeholder="https://broker.example.com/leads"
                  value={form.endpointUrl}
                  onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
                  style={inputStyle(theme)}
                />
                <input
                  placeholder="Auth token / credential (stored encrypted)"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  style={inputStyle(theme)}
                />
                <button
                  type="button"
                  style={btnStyle(theme, "primary")}
                  disabled={createBroker.isPending || !form.name || !form.endpointUrl}
                  onClick={() => {
                    createBroker.mutate({
                      templateId: selected.data.id,
                      name: form.name,
                      endpointUrl: form.endpointUrl,
                      authConfig: form.token ? { token: form.token } : {},
                    });
                  }}
                >
                  {createBroker.isPending ? "Creating…" : "Create"}
                </button>
                {createBroker.error && (
                  <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>
                    {createBroker.error.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
