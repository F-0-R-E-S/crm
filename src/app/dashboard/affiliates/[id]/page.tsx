"use client";
import { use, useState } from "react";
import { btnStyle, inputStyle, Pill, TabStrip } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

type Tab = "overview" | "keys" | "postback" | "history";

const EVENT_KINDS = ["lead_pushed", "accepted", "declined", "ftd", "failed"] as const;

export default function AffiliateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data } = trpc.affiliate.byId.useQuery({ id });
  const update = trpc.affiliate.update.useMutation({ onSuccess: () => utils.affiliate.byId.invalidate({ id }) });
  const gen = trpc.affiliate.generateApiKey.useMutation({ onSuccess: () => utils.affiliate.byId.invalidate({ id }) });
  const revoke = trpc.affiliate.revokeApiKey.useMutation({ onSuccess: () => utils.affiliate.byId.invalidate({ id }) });
  const [tab, setTab] = useState<Tab>("overview");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [showRaw, setShowRaw] = useState<string | null>(null);

  if (!data) return <div style={{ padding: 28 }}>Loading…</div>;

  return (
    <div style={{ padding: "20px 28px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>{data.name}</h1>
      <TabStrip<Tab>
        tabs={[
          { key: "overview", label: "overview" },
          { key: "keys",     label: "api keys" },
          { key: "postback", label: "postback" },
          { key: "history",  label: "history" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "leads / 24h", value: 0 },
            { label: "ftds / 24h", value: 0 },
            { label: "rejects / 24h", value: 0 },
            { label: "cap usage", value: `0 / ${data.totalDailyCap ?? "∞"}` },
          ].map(t => (
            <div key={t.label} style={{ padding: "14px 16px", border: "1px solid var(--bd-1)", borderRadius: 6 }}>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.label}</div>
              <div style={{ fontSize: 28, fontWeight: 500, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{t.value}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "keys" && (
        <div style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>API Keys</h3>
          <form onSubmit={async e => {
            e.preventDefault();
            if (!newKeyLabel) return;
            const r = await gen.mutateAsync({ affiliateId: id, label: newKeyLabel });
            setShowRaw(r.rawKey); setNewKeyLabel("");
          }} style={{ display: "flex", gap: 8 }}>
            <input value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} placeholder="Label" style={{ ...inputStyle(theme), width: 200 }} />
            <button type="submit" style={btnStyle(theme, "primary")}>Generate</button>
          </form>
          {showRaw && (
            <div style={{ padding: 12, marginTop: 12, background: "rgba(230,180,80,0.08)", border: "1px solid rgba(230,180,80,0.25)", borderRadius: 4, fontFamily: "var(--mono)", fontSize: 12 }}>
              Save this now — won't be shown again:<br />
              <strong>{showRaw}</strong>
              <button type="button" onClick={() => setShowRaw(null)} style={{ marginLeft: 12, color: "var(--fg-2)", background: "transparent", border: "none", cursor: "pointer" }}>Dismiss</button>
            </div>
          )}
          <table style={{ width: "100%", fontSize: 12, marginTop: 12 }}>
            <thead><tr style={{ textAlign: "left", color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              <th style={{ padding: "8px 0" }}>prefix</th><th>label</th><th>last used</th><th>status</th><th></th>
            </tr></thead>
            <tbody>
              {data.apiKeys.map(k => (
                <tr key={k.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                  <td style={{ padding: "8px 0", fontFamily: "var(--mono)" }}>{k.keyPrefix}…</td>
                  <td>{k.label}</td>
                  <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</td>
                  <td>{k.isRevoked ? <Pill tone="danger" size="xs">revoked</Pill> : <Pill tone="success" size="xs">active</Pill>}</td>
                  <td>{!k.isRevoked && <button type="button" onClick={() => revoke.mutate({ id: k.id })} style={{ ...btnStyle(theme), color: "oklch(72% 0.15 25)" }}>revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "postback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Postback URL</span>
            <input
              defaultValue={data.postbackUrl ?? ""}
              onBlur={e => update.mutate({ id, postbackUrl: e.target.value || null })}
              placeholder="http://tracker.example.com/?click_id={sub_id}&status={status}"
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>HMAC secret (optional)</span>
            <input
              defaultValue={data.postbackSecret ?? ""}
              onBlur={e => update.mutate({ id, postbackSecret: e.target.value || null })}
              style={{ ...inputStyle(theme), width: "100%" }}
            />
          </label>
          <fieldset style={{ border: "1px solid var(--bd-1)", borderRadius: 4, padding: 12 }}>
            <legend style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--fg-2)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 6px" }}>Events</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {EVENT_KINDS.map(ev => (
                <label key={ev} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: "var(--mono)" }}>
                  <input
                    type="checkbox"
                    defaultChecked={data.postbackEvents.includes(ev)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...data.postbackEvents, ev]
                        : data.postbackEvents.filter(x => x !== ev);
                      update.mutate({ id, postbackEvents: next as never });
                    }}
                  />
                  {ev}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {tab === "history" && (
        <table style={{ width: "100%", fontSize: 11 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--fg-2)", fontFamily: "var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            <th style={{ padding: "8px 0" }}>when</th><th>event</th><th>url</th><th>status</th><th>delivered</th><th>attempts</th>
          </tr></thead>
          <tbody>
            {data.outboundPostbacks.map(o => (
              <tr key={o.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "6px 0", fontFamily: "var(--mono)", color: "var(--fg-2)" }}>{new Date(o.createdAt).toLocaleString()}</td>
                <td><Pill size="xs">{o.event}</Pill></td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.url}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{o.httpStatus ?? "—"}</td>
                <td>{o.deliveredAt ? "✓" : "✗"}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{o.attemptN}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
