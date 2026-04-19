"use client";
import { use, useState } from "react";
import { trpc } from "@/lib/trpc";

const TABS = ["general", "postback", "history"] as const;

export default function AffiliateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data } = trpc.affiliate.byId.useQuery({ id });
  const update = trpc.affiliate.update.useMutation({ onSuccess: () => utils.affiliate.byId.invalidate({ id }) });
  const gen = trpc.affiliate.generateApiKey.useMutation({ onSuccess: () => utils.affiliate.byId.invalidate({ id }) });
  const revoke = trpc.affiliate.revokeApiKey.useMutation({ onSuccess: () => utils.affiliate.byId.invalidate({ id }) });
  const [tab, setTab] = useState<typeof TABS[number]>("general");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [showRaw, setShowRaw] = useState<string | null>(null);

  if (!data) return <div>Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">{data.name}</h1>
      <div className="flex gap-2 mb-4 border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 ${tab === t ? "border-b-2 border-black font-medium" : ""}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="space-y-4 max-w-xl">
          <label className="block"><span className="text-sm">Total daily cap</span>
            <input type="number" defaultValue={data.totalDailyCap ?? ""}
              onBlur={(e) => update.mutate({ id, totalDailyCap: e.target.value ? Number(e.target.value) : null })}
              className="block border rounded px-2 py-1 mt-1" />
          </label>
          <label className="block"><span className="text-sm">Active</span>
            <input type="checkbox" defaultChecked={data.isActive}
              onChange={(e) => update.mutate({ id, isActive: e.target.checked })} className="ml-2" />
          </label>

          <h3 className="font-medium mt-6">API Keys</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newKeyLabel) return;
            const r = await gen.mutateAsync({ affiliateId: id, label: newKeyLabel });
            setShowRaw(r.rawKey); setNewKeyLabel("");
          }} className="flex gap-2">
            <input value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="Label" className="border rounded px-2 py-1" />
            <button className="border rounded px-3 py-1 bg-black text-white">Generate</button>
          </form>
          {showRaw && (
            <div className="bg-yellow-50 border rounded p-3 mt-2 font-mono text-sm">
              Save this now — it won't be shown again:<br /><strong>{showRaw}</strong>
              <button onClick={() => setShowRaw(null)} className="ml-4 text-gray-600">Dismiss</button>
            </div>
          )}
          <table className="w-full text-sm mt-2">
            <thead><tr><th className="text-left">Prefix</th><th>Label</th><th>Last used</th><th>Revoked</th><th></th></tr></thead>
            <tbody>
              {data.apiKeys.map((k) => (
                <tr key={k.id} className="border-b">
                  <td className="font-mono">{k.keyPrefix}…</td>
                  <td>{k.label}</td>
                  <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</td>
                  <td>{k.isRevoked ? "✗" : "✓"}</td>
                  <td>{!k.isRevoked && <button onClick={() => revoke.mutate({ id: k.id })} className="text-red-600">Revoke</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "postback" && (
        <div className="space-y-4 max-w-2xl">
          <label className="block"><span className="text-sm">Postback URL</span>
            <input defaultValue={data.postbackUrl ?? ""}
              onBlur={(e) => update.mutate({ id, postbackUrl: e.target.value || null })}
              placeholder="http://tracker.example.com/?click_id={sub_id}&status={status}"
              className="block border rounded px-2 py-1 mt-1 w-full" />
          </label>
          <label className="block"><span className="text-sm">HMAC secret (optional)</span>
            <input defaultValue={data.postbackSecret ?? ""}
              onBlur={(e) => update.mutate({ id, postbackSecret: e.target.value || null })}
              className="block border rounded px-2 py-1 mt-1 w-full" />
          </label>
          <fieldset>
            <legend className="text-sm mb-1">Events</legend>
            {["lead_pushed", "accepted", "declined", "ftd", "failed"].map((ev) => (
              <label key={ev} className="block">
                <input type="checkbox" defaultChecked={data.postbackEvents.includes(ev)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...data.postbackEvents, ev]
                      : data.postbackEvents.filter((x) => x !== ev);
                    update.mutate({ id, postbackEvents: next as never });
                  }} /> {ev}
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {tab === "history" && (
        <table className="w-full text-sm">
          <thead><tr><th className="text-left">When</th><th>Event</th><th>URL</th><th>Status</th><th>Delivered</th><th>Attempts</th></tr></thead>
          <tbody>
            {data.outboundPostbacks.map((o) => (
              <tr key={o.id} className="border-b">
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>{o.event}</td>
                <td className="truncate max-w-md">{o.url}</td>
                <td>{o.httpStatus ?? "—"}</td>
                <td>{o.deliveredAt ? "✓" : "✗"}</td>
                <td>{o.attemptN}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
