"use client";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const KINDS = ["IP_CIDR", "IP_EXACT", "EMAIL_DOMAIN", "PHONE_E164"] as const;

export default function BlacklistPage() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("IP_EXACT");
  const utils = trpc.useUtils();
  const { data } = trpc.blacklist.list.useQuery({ kind });
  const add = trpc.blacklist.add.useMutation({
    onSuccess: () => utils.blacklist.list.invalidate(),
  });
  const remove = trpc.blacklist.remove.useMutation({
    onSuccess: () => utils.blacklist.list.invalidate(),
  });
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Blacklist</h1>
      <div className="flex gap-2 mb-4 border-b">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`px-3 py-2 ${kind === k ? "border-b-2 border-black font-medium" : ""}`}
          >
            {k}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value) return;
          add.mutate({ kind, value, reason: reason || undefined });
          setValue("");
          setReason("");
        }}
        className="flex gap-2 mb-4"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            kind === "IP_CIDR"
              ? "10.0.0.0/8"
              : kind === "EMAIL_DOMAIN"
                ? "mailinator.com"
                : kind === "PHONE_E164"
                  ? "+380671234567"
                  : "1.2.3.4"
          }
          className="border rounded px-2 py-1 flex-1"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="border rounded px-2 py-1 flex-1"
        />
        <button type="submit" className="border rounded px-3 py-1 bg-black text-white">
          Add
        </button>
      </form>
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>
            <th className="py-2">Value</th>
            <th>Reason</th>
            <th>Added</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-1 font-mono">{r.value}</td>
              <td>{r.reason ?? ""}</td>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>
                <button
                  type="button"
                  onClick={() => remove.mutate({ id: r.id })}
                  className="text-red-600"
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
