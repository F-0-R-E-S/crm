"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { FilterBar, type Filters } from "./components/FilterBar";
import { LeadsGrid } from "./components/LeadsGrid";
import { LeadDrawer } from "./components/LeadDrawer";

type Lead = RouterOutputs["lead"]["list"]["items"][number];

export default function LeadsPage() {
  const params = useSearchParams();
  const [filters, setFilters] = useState<Filters>({
    search: "", state: params.get("state") ?? "",
    geo: "", affiliateId: "", brokerId: "",
  });
  const [selected, setSelected] = useState<Lead | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string>>(new Set());

  const list = trpc.lead.list.useQuery(
    {
      page: 1, pageSize: 200,
      state: filters.state || undefined,
      geo: filters.geo || undefined,
      affiliateId: filters.affiliateId || undefined,
      brokerId: filters.brokerId || undefined,
    },
    { refetchInterval: 4000 },
  );

  useEffect(() => {
    if (!list.data) return;
    const freshIds = new Set<string>();
    for (const l of list.data.items) {
      if (!seen.current.has(l.id)) {
        freshIds.add(l.id);
        seen.current.add(l.id);
      }
    }
    if (freshIds.size === 0) return;
    setNewIds(prev => new Set([...prev, ...freshIds]));
    const t = setTimeout(() => {
      setNewIds(prev => {
        const next = new Set(prev);
        for (const id of freshIds) next.delete(id);
        return next;
      });
    }, 1800);
    return () => clearTimeout(t);
  }, [list.data]);

  const filtered = (list.data?.items ?? []).filter(l => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      l.traceId.toLowerCase().includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      `${l.firstName ?? ""} ${l.lastName ?? ""}`.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={p => setFilters(f => ({ ...f, ...p }))}
        total={list.data?.total}
        showing={filtered.length}
      />
      <LeadsGrid
        leads={filtered}
        selectedId={selected?.id}
        onSelect={setSelected}
        newIds={newIds}
      />
      {selected && <LeadDrawer leadId={selected.id} onClose={() => setSelected(null)} />}
    </div>
  );
}
