"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function RoutingPage() {
  const utils = trpc.useUtils();
  const { data } = trpc.rotation.listByGeo.useQuery();
  const brokers = trpc.broker.list.useQuery();
  const create = trpc.rotation.create.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const reorder = trpc.rotation.reorder.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const toggle = trpc.rotation.toggle.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const del = trpc.rotation.delete.useMutation({
    onSuccess: () => utils.rotation.listByGeo.invalidate(),
  });
  const [geo, setGeo] = useState("");
  const [brokerId, setBrokerId] = useState("");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Routing</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!geo || !brokerId) return;
          const existing = data?.[geo.toUpperCase()] ?? [];
          const priority = (existing[existing.length - 1]?.priority ?? 0) + 1;
          create.mutate({ geo, brokerId, priority });
          setGeo("");
          setBrokerId("");
        }}
        className="mb-6 flex gap-2 items-end"
      >
        <label>
          GEO
          <input
            value={geo}
            onChange={(e) => setGeo(e.target.value)}
            maxLength={2}
            className="block border rounded px-2 py-1 w-20"
          />
        </label>
        <label>
          Broker
          <select
            value={brokerId}
            onChange={(e) => setBrokerId(e.target.value)}
            className="block border rounded px-2 py-1"
          >
            <option value="">select…</option>
            {brokers.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="border rounded px-3 py-1 bg-black text-white">
          Add rule
        </button>
      </form>
      {Object.entries(data ?? {}).map(([g, rules]) => (
        <div key={g} className="mb-6">
          <h2 className="font-medium mb-2">{g}</h2>
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th>Priority</th>
                <th>Broker</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b">
                  <td>{r.priority}</td>
                  <td>
                    {r.broker.name} {r.broker.isActive ? "" : "(inactive)"}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.isActive}
                      onChange={(e) => toggle.mutate({ id: r.id, isActive: e.target.checked })}
                    />
                  </td>
                  <td className="space-x-2">
                    <button
                      type="button"
                      onClick={() => reorder.mutate({ id: r.id, direction: "up" })}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => reorder.mutate({ id: r.id, direction: "down" })}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => del.mutate({ id: r.id })}
                      className="text-red-600"
                    >
                      del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
