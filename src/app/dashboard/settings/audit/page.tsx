"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function AuditPage() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data } = trpc.audit.list.useQuery({ page, entity: entity || undefined });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Audit log</h1>
      <div className="flex gap-2 mb-3">
        <input
          value={entity}
          onChange={(e) => {
            setEntity(e.target.value);
            setPage(1);
          }}
          placeholder="Entity (e.g., Broker)"
          className="border rounded px-2 py-1"
        />
      </div>
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>
            <th className="py-2">When</th>
            <th>User</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Diff</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="py-2">{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.user.email}</td>
              <td className="font-mono">{r.action}</td>
              <td>
                {r.entity}
                {r.entityId ? ` / ${r.entityId}` : ""}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                  className="text-blue-600 text-xs"
                >
                  {expanded[r.id] ? "hide" : "show"}
                </button>
                {expanded[r.id] && (
                  <pre className="text-xs bg-gray-50 p-2 mt-1 whitespace-pre-wrap">
                    {JSON.stringify(r.diff, null, 2)}
                  </pre>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm">Page {page}</span>
        <button
          type="button"
          disabled={(data?.items.length ?? 0) < 50}
          onClick={() => setPage((p) => p + 1)}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          Next
        </button>
        <span className="text-sm text-gray-500 ml-4">{data?.total ?? 0} total</span>
      </div>
    </div>
  );
}
