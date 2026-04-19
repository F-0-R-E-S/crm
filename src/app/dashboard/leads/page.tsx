"use client";
import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const STATES = ["", "NEW", "PUSHING", "PUSHED", "ACCEPTED", "DECLINED", "FTD", "REJECTED", "FAILED"];

export default function LeadsPage() {
  const [state, setState] = useState("");
  const [geo, setGeo] = useState("");
  const [page, setPage] = useState(1);
  const { data } = trpc.lead.list.useQuery({ page, pageSize: 50, state: state || undefined, geo: geo.toUpperCase() || undefined });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Leads</h1>
      <div className="flex gap-2 mb-3">
        <select value={state} onChange={(e) => { setState(e.target.value); setPage(1); }} className="border rounded px-2 py-1">
          {STATES.map((s) => <option key={s} value={s}>{s || "any state"}</option>)}
        </select>
        <input value={geo} onChange={(e) => { setGeo(e.target.value); setPage(1); }} placeholder="GEO (UA)" className="border rounded px-2 py-1 w-24" />
      </div>
      <table className="w-full text-sm">
        <thead className="text-left border-b"><tr>
          <th className="py-2">Created</th><th>Affiliate</th><th>GEO</th><th>Phone</th><th>State</th><th>Broker</th><th>Reject</th>
        </tr></thead>
        <tbody>
          {data?.items.map((l) => (
            <tr key={l.id} className="border-b hover:bg-gray-50">
              <td className="py-2"><Link href={`/dashboard/leads/${l.id}` as never} className="text-blue-600">{new Date(l.createdAt).toLocaleString()}</Link></td>
              <td>{l.affiliate.name}</td>
              <td>{l.geo}</td>
              <td>{l.phone ? `${l.phone.slice(0, 4)}…${l.phone.slice(-2)}` : "—"}</td>
              <td>{l.state}</td>
              <td>{l.broker?.name ?? "—"}</td>
              <td>{l.rejectReason ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border rounded px-3 py-1 disabled:opacity-50">Prev</button>
        <span className="text-sm">Page {page}</span>
        <button disabled={(data?.items.length ?? 0) < 50} onClick={() => setPage((p) => p + 1)} className="border rounded px-3 py-1 disabled:opacity-50">Next</button>
        <span className="text-sm text-gray-500 ml-4">{data?.total ?? 0} total</span>
      </div>
    </div>
  );
}
