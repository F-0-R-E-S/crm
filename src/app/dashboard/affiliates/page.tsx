"use client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";

export default function AffiliatesPage() {
  const utils = trpc.useUtils();
  const { data } = trpc.affiliate.list.useQuery();
  const create = trpc.affiliate.create.useMutation({
    onSuccess: () => utils.affiliate.list.invalidate(),
  });
  const [name, setName] = useState("");

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Affiliates</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name) create.mutate({ name });
          setName("");
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New affiliate name"
          className="border rounded px-2 py-1"
        />
        <button type="submit" className="border rounded px-3 py-1 bg-black text-white">
          Add
        </button>
      </form>
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>
            <th className="py-2">Name</th>
            <th>Active</th>
            <th>Cap</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((a) => (
            <tr key={a.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/dashboard/affiliates/${a.id}` as never} className="text-blue-600">
                  {a.name}
                </Link>
              </td>
              <td>{a.isActive ? "✓" : "✗"}</td>
              <td>{a.totalDailyCap ?? "∞"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
