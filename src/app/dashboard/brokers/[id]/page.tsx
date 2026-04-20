"use client";
import { CodeBlock, Pill, TabStrip, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { use, useEffect, useState } from "react";

type Tab = "config" | "mapping" | "postback" | "test" | "sync" | "health";

function healthTone(status: string) {
  if (status === "healthy") return "success" as const;
  if (status === "degraded") return "warn" as const;
  if (status === "down") return "danger" as const;
  return "neutral" as const;
}

function JsonField({
  label,
  value,
  onSave,
}: { label: string; value: unknown; onSave: (v: unknown) => void }) {
  const { theme } = useThemeCtx();
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState("");
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--mono)",
          color: "var(--fg-2)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        style={{
          ...inputStyle(theme),
          width: "100%",
          fontFamily: "var(--mono)",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button
          type="button"
          style={btnStyle(theme)}
          onClick={() => {
            try {
              const parsed = JSON.parse(text);
              setErr("");
              onSave(parsed);
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        >
          Save
        </button>
        {err && <span style={{ fontSize: 11, color: "oklch(72% 0.15 25)" }}>{err}</span>}
      </div>
    </div>
  );
}

export default function BrokerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data } = trpc.broker.byId.useQuery({ id });
  const update = trpc.broker.update.useMutation({
    onSuccess: () => utils.broker.byId.invalidate({ id }),
  });
  const test = trpc.broker.testSend.useMutation();
  const [tab, setTab] = useState<Tab>("config");

  if (!data) return <div style={{ padding: 28 }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {data.name}
        </h1>
        <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 11 }}>
          {data.id.slice(0, 10)}
        </span>
        <Pill tone={data.isActive ? "success" : "warn"} size="xs">
          {data.isActive ? "active" : "paused"}
        </Pill>
        <Pill tone={healthTone(data.lastHealthStatus)} size="xs">
          health: {data.lastHealthStatus}
        </Pill>
        <Pill size="xs">{data.syncMode}</Pill>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Link
            href={`/dashboard/brokers/${id}/mapping` as never}
            style={{ ...btnStyle(theme), textDecoration: "none" }}
          >
            Mapping editor
          </Link>
          <Link
            href={`/dashboard/brokers/${id}/errors` as never}
            style={{ ...btnStyle(theme), textDecoration: "none" }}
          >
            Errors
          </Link>
        </div>
      </div>
      <TabStrip<Tab>
        tabs={[
          { key: "config", label: "config" },
          { key: "mapping", label: "field mapping" },
          { key: "postback", label: "postback" },
          { key: "sync", label: "sync mode" },
          { key: "health", label: "health" },
          { key: "test", label: "test" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <label style={{ display: "block" }}>
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
              Endpoint URL
            </span>
            <input
              defaultValue={data.endpointUrl}
              onBlur={(e) => update.mutate({ id, endpointUrl: e.target.value })}
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
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
              Daily cap
            </span>
            <input
              type="number"
              defaultValue={data.dailyCap ?? ""}
              onBlur={(e) =>
                update.mutate({ id, dailyCap: e.target.value ? Number(e.target.value) : null })
              }
              style={{ ...inputStyle(theme), width: 160 }}
            />
          </label>
        </div>
      )}

      {tab === "mapping" && (
        <div style={{ maxWidth: 640 }}>
          <JsonField
            label="Field mapping"
            value={data.fieldMapping}
            onSave={(v) => update.mutate({ id, fieldMapping: v as never })}
          />
          <JsonField
            label="Static payload"
            value={data.staticPayload}
            onSave={(v) => update.mutate({ id, staticPayload: v as never })}
          />
        </div>
      )}

      {tab === "postback" && (
        <div style={{ maxWidth: 640 }}>
          <JsonField
            label="Headers"
            value={data.headers}
            onSave={(v) => update.mutate({ id, headers: v as never })}
          />
          <JsonField
            label="Auth config"
            value={data.authConfig}
            onSave={(v) => update.mutate({ id, authConfig: v as never })}
          />
          <JsonField
            label="Status mapping"
            value={data.statusMapping}
            onSave={(v) => update.mutate({ id, statusMapping: v as never })}
          />
        </div>
      )}

      {tab === "test" && <TestTab brokerId={id} />}
      {tab === "sync" && <SyncTab brokerId={id} />}
      {tab === "health" && <HealthTab brokerId={id} />}
    </div>
  );
}

function TestTab({ brokerId }: { brokerId: string }) {
  const { theme } = useThemeCtx();
  const testSend = trpc.broker.testSend.useMutation();
  const [tcResult, setTcResult] = useState<unknown>(null);
  const [tcErr, setTcErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function runConnectionTest() {
    setRunning(true);
    setTcErr(null);
    try {
      const r = await fetch(`/api/v1/brokers/${brokerId}/test-connection`, { method: "POST" });
      const body = await r.json();
      if (!r.ok) {
        setTcErr(`${r.status}: ${body.error?.code ?? "unknown"}`);
      }
      setTcResult(body);
    } catch (e) {
      setTcErr((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          Send test lead (production path)
        </div>
        <button
          type="button"
          onClick={() => testSend.mutate({ id: brokerId })}
          style={btnStyle(theme, "primary")}
        >
          Send Test Lead
        </button>
        {testSend.data && (
          <div style={{ marginTop: 12 }}>
            <CodeBlock label="test lead result" data={testSend.data} />
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--bd-1)", paddingTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
          Test connection (non-persistent, records health check)
        </div>
        <button
          type="button"
          onClick={runConnectionTest}
          disabled={running}
          style={btnStyle(theme, "primary")}
        >
          {running ? "Testing…" : "Test Connection"}
        </button>
        {tcErr && (
          <div style={{ marginTop: 8, color: "oklch(72% 0.15 25)", fontSize: 12 }}>{tcErr}</div>
        )}
        {!!tcResult && (
          <div style={{ marginTop: 12 }}>
            <CodeBlock label="connection test result" data={tcResult} />
          </div>
        )}
      </div>
    </div>
  );
}

function SyncTab({ brokerId }: { brokerId: string }) {
  const { theme } = useThemeCtx();
  const [config, setConfig] = useState<{
    mode: "webhook" | "polling";
    poll_interval_min: number | null;
    status_poll_path: string | null;
    status_poll_ids_param: string | null;
    last_polled_at: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/brokers/${brokerId}/status-sync`)
      .then((r) => r.json())
      .then((b) => setConfig(b));
  }, [brokerId]);

  async function save(next: typeof config) {
    if (!next) return;
    setSaving(true);
    setErr(null);
    const body =
      next.mode === "polling"
        ? {
            mode: "polling" as const,
            pollIntervalMin: next.poll_interval_min ?? 5,
            statusPollPath: next.status_poll_path ?? undefined,
            statusPollIdsParam: next.status_poll_ids_param ?? undefined,
          }
        : { mode: "webhook" as const };
    try {
      const r = await fetch(`/api/v1/brokers/${brokerId}/status-sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const resp = await r.json();
      if (!r.ok) setErr(resp.error?.code ?? "unknown");
      else setConfig({ ...next, poll_interval_min: resp.poll_interval_min });
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <div style={{ color: "var(--fg-2)" }}>loading…</div>;

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 13 }}>
          <input
            type="radio"
            name="sync"
            checked={config.mode === "webhook"}
            onChange={() => setConfig({ ...config, mode: "webhook" })}
          />{" "}
          webhook (broker pushes postbacks)
        </label>
        <label style={{ fontSize: 13 }}>
          <input
            type="radio"
            name="sync"
            checked={config.mode === "polling"}
            onChange={() => setConfig({ ...config, mode: "polling" })}
          />{" "}
          polling (we pull status every N min)
        </label>
      </div>
      {config.mode === "polling" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--fg-2)" }}>Poll interval (1..60 min)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={config.poll_interval_min ?? 5}
              onChange={(e) => setConfig({ ...config, poll_interval_min: Number(e.target.value) })}
              style={{ ...inputStyle(theme), width: 120 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--fg-2)" }}>Status poll path</span>
            <input
              placeholder="/status"
              value={config.status_poll_path ?? ""}
              onChange={(e) => setConfig({ ...config, status_poll_path: e.target.value || null })}
              style={inputStyle(theme)}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "var(--fg-2)" }}>IDs query param</span>
            <input
              placeholder="ids"
              value={config.status_poll_ids_param ?? ""}
              onChange={(e) =>
                setConfig({ ...config, status_poll_ids_param: e.target.value || null })
              }
              style={{ ...inputStyle(theme), width: 200 }}
            />
          </label>
        </div>
      )}
      <div>
        <button
          type="button"
          disabled={saving}
          style={btnStyle(theme, "primary")}
          onClick={() => save(config)}
        >
          {saving ? "Saving…" : "Save sync config"}
        </button>
        {err && (
          <span style={{ marginLeft: 10, color: "oklch(72% 0.15 25)", fontSize: 12 }}>{err}</span>
        )}
      </div>
      {config.last_polled_at && (
        <div style={{ fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
          last polled: {new Date(config.last_polled_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function HealthTab({ brokerId }: { brokerId: string }) {
  const { theme } = useThemeCtx();
  const [lastResult, setLastResult] = useState<unknown>(null);
  const [running, setRunning] = useState(false);

  async function runCheck() {
    setRunning(true);
    try {
      const r = await fetch(`/api/v1/brokers/${brokerId}/test-connection`, { method: "POST" });
      const body = await r.json();
      setLastResult(body);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13 }}>
        Health-check истории пишутся в `BrokerHealthCheck`. Автоматический scheduled cron (30s) —
        Operational Follow-up. Используйте кнопку ниже чтобы запустить проверку вручную прямо
        сейчас.
      </div>
      <div>
        <button
          type="button"
          onClick={runCheck}
          disabled={running}
          style={btnStyle(theme, "primary")}
        >
          {running ? "Checking…" : "Run health check now"}
        </button>
      </div>
      {!!lastResult && (
        <div>
          <CodeBlock label="last check result" data={lastResult} />
        </div>
      )}
    </div>
  );
}
