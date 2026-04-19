"use client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function BrokersPage() {
  const { data } = trpc.broker.list.useQuery();
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Brokers</h1>
      <table className="w-full text-sm">
        <thead className="text-left border-b">
          <tr>
            <th className="py-2">Name</th>
            <th>Endpoint</th>
            <th>Active</th>
            <th>Cap</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((b) => (
            <tr key={b.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/dashboard/brokers/${b.id}` as never} className="text-blue-600">
                  {b.name}
                </Link>
              </td>
              <td className="text-gray-600">{b.endpointUrl}</td>
              <td>{b.isActive ? "✓" : "✗"}</td>
              <td>{b.dailyCap ?? "∞"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
