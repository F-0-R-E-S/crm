"use client";
import Link from "next/link";
import { MiniBars, Pill } from "@/components/router-crm";
import { trpc } from "@/lib/trpc";

export default function BrokersPage() {
  const { data } = trpc.broker.list.useQuery();
  return (
    <div style={{ padding: "20px 28px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>Brokers</h1>
      <table style={{ width: "100%", fontSize: 12 }}>
        <thead><tr style={{ textAlign: "left", color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <th style={{ padding: "8px 0" }}>name</th><th>auth</th><th>cap</th><th>last 1h</th><th>status</th>
        </tr></thead>
        <tbody>
          {data?.map(b => (
            <tr key={b.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "10px 0" }}>
                <Link href={`/dashboard/brokers/${b.id}` as never} style={{ color: "var(--fg-0)", textDecoration: "none", fontWeight: 500 }}>
                  {b.name} <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 10 }}>{b.id.slice(0, 6)}</span>
                </Link>
              </td>
              <td><Pill size="xs">{b.authType}</Pill></td>
              <td style={{ fontFamily: "var(--mono)" }}>{b.dailyCap ?? "∞"}</td>
              <td><MiniBars values={Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))} width={120} height={20} color="var(--fg-1)" /></td>
              <td>{b.isActive ? <Pill tone="success" size="xs">active</Pill> : <Pill tone="warn" size="xs">paused</Pill>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
