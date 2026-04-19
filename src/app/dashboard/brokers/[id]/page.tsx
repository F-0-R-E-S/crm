"use client";
import { use, useState } from "react";
import { btnStyle, CodeBlock, inputStyle, Pill, TabStrip } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

type Tab = "config" | "mapping" | "postback" | "test";

function JsonField({ label, value, onSave }: { label: string; value: unknown; onSave: (v: unknown) => void }) {
  const { theme } = useThemeCtx();
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState("");
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        style={{ ...inputStyle(theme), width: "100%", fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.5 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <button
          type="button"
          style={btnStyle(theme)}
          onClick={() => {
            try { const parsed = JSON.parse(text); setErr(""); onSave(parsed); }
            catch (e) { setErr((e as Error).message); }
          }}
        >Save</button>
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
  const update = trpc.broker.update.useMutation({ onSuccess: () => utils.broker.byId.invalidate({ id }) });
  const test = trpc.broker.testSend.useMutation();
  const [tab, setTab] = useState<Tab>("config");

  if (!data) return <div style={{ padding: 28 }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>{data.name}</h1>
        <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 11 }}>{data.id.slice(0, 10)}</span>
        <Pill tone={data.isActive ? "success" : "warn"} size="xs">{data.isActive ? "active" : "paused"}</Pill>
      </div>
      <TabStrip<Tab>
        tabs={[
          { key: "config",   label: "config" },
          { key: "mapping",  label: "field mapping" },
          { key: "postback", label: "postback" },
          { key: "test",     label: "test" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Endpoint URL</span>
            <input
              defaultValue={data.endpointUrl}
              onBlur={e => update.mutate({ id, endpointUrl: e.target.value })}
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Daily cap</span>
            <input
              type="number"
              defaultValue={data.dailyCap ?? ""}
              onBlur={e => update.mutate({ id, dailyCap: e.target.value ? Number(e.target.value) : null })}
              style={{ ...inputStyle(theme), width: 160 }}
            />
          </label>
        </div>
      )}

      {tab === "mapping" && (
        <div style={{ maxWidth: 640 }}>
          <JsonField label="Field mapping" value={data.fieldMapping} onSave={v => update.mutate({ id, fieldMapping: v as never })} />
          <JsonField label="Static payload" value={data.staticPayload} onSave={v => update.mutate({ id, staticPayload: v as never })} />
        </div>
      )}

      {tab === "postback" && (
        <div style={{ maxWidth: 640 }}>
          <JsonField label="Headers" value={data.headers} onSave={v => update.mutate({ id, headers: v as never })} />
          <JsonField label="Auth config" value={data.authConfig} onSave={v => update.mutate({ id, authConfig: v as never })} />
          <JsonField label="Status mapping" value={data.statusMapping} onSave={v => update.mutate({ id, statusMapping: v as never })} />
        </div>
      )}

      {tab === "test" && (
        <div style={{ maxWidth: 640 }}>
          <button type="button" onClick={() => test.mutate({ id })} style={btnStyle(theme, "primary")}>
            Send Test Lead
          </button>
          {test.data && (
            <div style={{ marginTop: 12 }}>
              <CodeBlock label="test result" data={test.data} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
