"use client";
import { trpc } from "@/lib/trpc";
import { use } from "react";

export default function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data } = trpc.lead.byId.useQuery({ id });
  const setState = trpc.lead.setState.useMutation({
    onSuccess: () => utils.lead.byId.invalidate({ id }),
  });
  const repush = trpc.lead.repush.useMutation({
    onSuccess: () => utils.lead.byId.invalidate({ id }),
  });
  const resend = trpc.lead.resendOutboundPostback.useMutation({
    onSuccess: () => utils.lead.byId.invalidate({ id }),
  });

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Lead {data.id}</h1>
      <div className="grid grid-cols-2 gap-6">
        <section className="border rounded p-4">
          <h2 className="font-medium mb-2">Core</h2>
          <dl className="text-sm grid grid-cols-[110px_1fr] gap-1">
            <dt>State</dt>
            <dd>{data.state}</dd>
            <dt>Trace ID</dt>
            <dd>{data.traceId}</dd>
            <dt>Affiliate</dt>
            <dd>{data.affiliate.name}</dd>
            <dt>Broker</dt>
            <dd>{data.broker?.name ?? "—"}</dd>
            <dt>GEO</dt>
            <dd>{data.geo}</dd>
            <dt>Phone</dt>
            <dd>{data.phone}</dd>
            <dt>Reject</dt>
            <dd>{data.rejectReason ?? "—"}</dd>
          </dl>
        </section>
        <section className="border rounded p-4">
          <h2 className="font-medium mb-2">Actions</h2>
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => setState.mutate({ id, state: "REJECTED", reason: "manual" })}
              className="border rounded px-3 py-1"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setState.mutate({ id, state: "FTD" })}
              className="border rounded px-3 py-1"
            >
              Mark FTD
            </button>
            <button
              type="button"
              onClick={() => repush.mutate({ id })}
              className="border rounded px-3 py-1"
            >
              Re-push
            </button>
          </div>
        </section>
      </div>
      <section className="border rounded p-4">
        <h2 className="font-medium mb-2">Events timeline</h2>
        <ul className="text-sm space-y-1">
          {data.events.map((e) => (
            <li key={e.id}>
              <span className="text-gray-500">{new Date(e.createdAt).toLocaleString()}</span> —{" "}
              <strong>{e.kind}</strong>
              <pre className="inline ml-2 text-xs text-gray-600">{JSON.stringify(e.meta)}</pre>
            </li>
          ))}
        </ul>
      </section>
      <section className="border rounded p-4">
        <h2 className="font-medium mb-2">Outbound postbacks</h2>
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th>Event</th>
              <th>URL</th>
              <th>Status</th>
              <th>Delivered</th>
              <th>Attempt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.outboundPostbacks.map((o) => (
              <tr key={o.id} className="border-b">
                <td>{o.event}</td>
                <td className="truncate max-w-sm">{o.url}</td>
                <td>{o.httpStatus ?? "—"}</td>
                <td>{o.deliveredAt ? "✓" : "—"}</td>
                <td>{o.attemptN}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => resend.mutate({ outboundId: o.id })}
                    className="text-blue-600"
                  >
                    Resend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
