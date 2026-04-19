"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

function Tile({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href as never} className="block border rounded p-6 hover:bg-gray-50">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </Link>
  );
}

export default function DashboardHome() {
  const { data, isLoading } = trpc.lead.counters.useQuery();
  if (isLoading || !data) return <div>Loading…</div>;
  return (
    <div className="grid grid-cols-4 gap-4 max-w-4xl">
      <Tile label="Leads today" value={data.leadsToday} href="/dashboard/leads" />
      <Tile label="FTDs today" value={data.ftdsToday} href="/dashboard/leads?state=FTD" />
      <Tile label="Active brokers" value={data.activeBrokers} href="/dashboard/brokers" />
      <Tile label="Rejects today" value={data.rejectsToday} href="/dashboard/leads?state=REJECTED" />
    </div>
  );
}
