"use client";
import { use, useState } from "react";
import { trpc } from "@/lib/trpc";

function JsonField({ label, value, onSave }: { label: string; value: unknown; onSave: (v: unknown) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState("");
  return (
    <div className="mb-4">
      <div className="text-sm mb-1">{label}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="w-full border rounded p-2 font-mono text-xs" />
      <button className="text-sm border rounded px-2 py-1 mt-1"
        onClick={() => {
          try { const parsed = JSON.parse(text); setErr(""); onSave(parsed); }
          catch (e) { setErr((e as Error).message); }
        }}>Save</button>
      {err && <span className="text-red-600 text-xs ml-2">{err}</span>}
    </div>
  );
}

export default function BrokerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data } = trpc.broker.byId.useQuery({ id });
  const update = trpc.broker.update.useMutation({ onSuccess: () => utils.broker.byId.invalidate({ id }) });
  const test = trpc.broker.testSend.useMutation();

  if (!data) return <div>Loading…</div>;
  return (
    <div className="max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">{data.name}</h1>
      <label className="block"><span className="text-sm">Endpoint URL</span>
        <input defaultValue={data.endpointUrl} onBlur={(e) => update.mutate({ id, endpointUrl: e.target.value })}
          className="block border rounded px-2 py-1 mt-1 w-full" />
      </label>
      <label className="block"><span className="text-sm">Daily cap</span>
        <input type="number" defaultValue={data.dailyCap ?? ""} onBlur={(e) => update.mutate({ id, dailyCap: e.target.value ? Number(e.target.value) : null })}
          className="block border rounded px-2 py-1 mt-1" />
      </label>
      <JsonField label="Field mapping" value={data.fieldMapping} onSave={(v) => update.mutate({ id, fieldMapping: v as never })} />
      <JsonField label="Static payload" value={data.staticPayload} onSave={(v) => update.mutate({ id, staticPayload: v as never })} />
      <JsonField label="Status mapping" value={data.statusMapping} onSave={(v) => update.mutate({ id, statusMapping: v as never })} />
      <JsonField label="Headers" value={data.headers} onSave={(v) => update.mutate({ id, headers: v as never })} />
      <JsonField label="Auth config" value={data.authConfig} onSave={(v) => update.mutate({ id, authConfig: v as never })} />
      <hr />
      <div>
        <button onClick={() => test.mutate({ id })} className="border rounded px-3 py-1 bg-black text-white">Send Test Lead</button>
        {test.data && (
          <pre className="mt-2 text-xs bg-gray-50 p-3 rounded">{JSON.stringify(test.data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
