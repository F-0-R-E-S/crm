"use client";
import { Pill } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import type { WizardFormData } from "../wizard";

interface Props {
  value: WizardFormData;
  onNext: (payload: WizardFormData) => void | Promise<void>;
  onBack: () => void;
}

type AuthType = "NONE" | "BEARER" | "BASIC" | "API_KEY_HEADER" | "API_KEY_QUERY";

interface HealthResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

export function Step2Broker({ value, onNext, onBack }: Props) {
  const [vertical, setVertical] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    (value.templateId as string | undefined) ?? null,
  );
  const [name, setName] = useState<string>((value.brokerName as string | undefined) ?? "");
  const [endpointUrl, setEndpointUrl] = useState<string>(
    (value.endpointUrl as string | undefined) ?? "",
  );
  const [authFields, setAuthFields] = useState<Record<string, string>>({});
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const { data: listData } = trpc.brokerTemplate.list.useQuery({
    limit: 100,
    status: "active",
    vertical: vertical || undefined,
    q: search || undefined,
  });

  const healthCheck = trpc.onboarding.healthCheckBroker.useMutation();
  const createBroker = trpc.onboarding.createBrokerFromWizard.useMutation();

  const selected = useMemo(
    () => listData?.items?.find((t) => t.id === selectedId) ?? null,
    [listData, selectedId],
  );
  const authType: AuthType = (selected?.defaultAuthType as AuthType | undefined) ?? "NONE";

  useEffect(() => {
    if (selected && !name) setName(selected.name);
  }, [selected, name]);

  async function runHealth() {
    setErr("");
    try {
      const r = await healthCheck.mutateAsync({ url: endpointUrl, method: "POST" });
      setHealth(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "health check failed");
    }
  }

  async function submit() {
    if (!selected) {
      setErr("Pick a template first");
      return;
    }
    if (!health?.ok) {
      setErr("Run a successful health check first");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const authConfig: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(authFields)) {
        authConfig[k] = v;
      }
      const broker = await createBroker.mutateAsync({
        templateId: selected.id,
        name: name.trim(),
        endpointUrl,
        authConfig,
      });
      await onNext({
        templateId: selected.id,
        brokerId: broker.id,
        brokerName: name.trim(),
        endpointUrl,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "create broker failed");
    } finally {
      setBusy(false);
    }
  }

  const authFieldDefs: Array<{ key: string; label: string; placeholder?: string }> =
    authType === "BEARER"
      ? [{ key: "token", label: "Bearer token" }]
      : authType === "BASIC"
        ? [
            { key: "user", label: "Username" },
            { key: "password", label: "Password" },
          ]
        : authType === "API_KEY_HEADER"
          ? [
              { key: "headerName", label: "Header name", placeholder: "X-API-Key" },
              { key: "token", label: "Token" },
            ]
          : authType === "API_KEY_QUERY"
            ? [
                { key: "paramName", label: "Query param", placeholder: "api_key" },
                { key: "token", label: "Token" },
              ]
            : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      {/* Left: template grid */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Pick a template</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {["", "forex", "crypto", "gambling"].map((v) => (
            <button
              key={v || "all"}
              type="button"
              onClick={() => setVertical(v)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 4,
                border: "1px solid var(--bd-2)",
                background: vertical === v ? "var(--fg-0)" : "transparent",
                color: vertical === v ? "var(--bg-1)" : "var(--fg-2)",
                cursor: "pointer",
              }}
            >
              {v || "all"}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {(listData?.items ?? []).map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedId(t.id);
                  setName(t.name);
                  setAuthFields({});
                  setHealth(null);
                }}
                style={{
                  padding: 10,
                  borderRadius: 4,
                  border: active ? "1px solid var(--fg-0)" : "1px solid var(--bd-2)",
                  background: active ? "var(--bg-4)" : "var(--bg-1)",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--fg-0)",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 500 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--fg-2)", margin: "2px 0" }}>
                  {t.vendor} · {t.vertical}
                </div>
                <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 4 }}>
                  {(t.countries ?? []).slice(0, 3).map((c) => (
                    <Pill key={c} tone="neutral" size="xs">
                      {c}
                    </Pill>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: broker form */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Configure broker</div>
        {!selected ? (
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>← select a template to continue</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={labelStyle}>Broker name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <label style={labelStyle}>Endpoint URL</label>
            <input
              type="url"
              value={endpointUrl}
              onChange={(e) => {
                setEndpointUrl(e.target.value);
                setHealth(null);
              }}
              placeholder="https://broker.example.com/api/leads"
              style={inputStyle}
            />
            {authFieldDefs.map((f) => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input
                  type={f.key === "password" || f.key === "token" ? "password" : "text"}
                  value={authFields[f.key] ?? ""}
                  onChange={(e) => setAuthFields({ ...authFields, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={runHealth}
                disabled={!endpointUrl || healthCheck.isPending}
                style={secondaryBtn(!endpointUrl || healthCheck.isPending)}
              >
                {healthCheck.isPending ? "Testing…" : "Test connection"}
              </button>
              {health?.ok && (
                <span style={{ fontSize: 12, color: "oklch(72% 0.15 145)" }}>
                  ✓ {health.status} OK in {health.latencyMs}ms
                </span>
              )}
              {health && !health.ok && (
                <span style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>
                  ✗ {health.error ?? `status ${health.status}`}
                </span>
              )}
            </div>
            {err && <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{err}</div>}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 22,
            paddingTop: 16,
            borderTop: "1px solid var(--bd-1)",
          }}
        >
          <button type="button" onClick={onBack} style={secondaryBtn(false)}>
            ← back
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selected || !health?.ok || busy}
            style={nextBtn(!selected || !health?.ok || busy)}
          >
            {busy ? "Saving…" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--fg-2)" };
const inputStyle: React.CSSProperties = {
  background: "var(--bg-4)",
  color: "var(--fg-0)",
  border: "1px solid var(--bd-2)",
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};
function nextBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 16px",
    background: "var(--fg-0)",
    color: "var(--bg-1)",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: "transparent",
    color: "var(--fg-0)",
    border: "1px solid var(--bd-2)",
    borderRadius: 4,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
