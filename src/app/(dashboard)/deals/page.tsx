"use client";

import { DealStage } from "@prisma/client";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

const stageOrder: DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.WON,
  DealStage.LOST,
];

const nextStage: Partial<Record<DealStage, DealStage>> = {
  [DealStage.NEW]: DealStage.QUALIFIED,
  [DealStage.QUALIFIED]: DealStage.PROPOSAL,
  [DealStage.PROPOSAL]: DealStage.NEGOTIATION,
  [DealStage.NEGOTIATION]: DealStage.WON,
};

export default function DealsPage() {
  const utils = trpc.useUtils();
  const list = trpc.deal.list.useQuery({});
  const pipeline = trpc.deal.pipeline.useQuery();
  const setStage = trpc.deal.setStage.useMutation({
    onSuccess: () => {
      utils.deal.list.invalidate();
      utils.deal.pipeline.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Deals</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {stageOrder.map((stage) => {
          const agg = pipeline.data?.find((p) => p.stage === stage);
          return (
            <Card key={stage}>
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
                  {stage}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-semibold">{formatCurrency(agg?.total ?? 0)}</div>
                <div className="text-xs text-slate-500">{agg?.count ?? 0} deals</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All deals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.data?.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
            >
              <div>
                <div className="font-medium">{d.title}</div>
                <div className="text-xs text-slate-500">
                  {d.company?.name ?? "No company"} · {d.contact
                    ? `${d.contact.firstName} ${d.contact.lastName}`
                    : "No contact"}
                </div>
              </div>
              <div className="text-sm text-slate-600">
                {formatCurrency(Number(d.amount), d.currency)}
              </div>
              <div className="text-xs text-slate-500">{formatDate(d.closeDate)}</div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
                {d.stage}
              </span>
              {nextStage[d.stage] && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setStage.mutate({ id: d.id, stage: nextStage[d.stage] as DealStage })
                  }
                  disabled={setStage.isPending}
                >
                  → {nextStage[d.stage]}
                </Button>
              )}
            </div>
          ))}
          {list.data?.length === 0 && (
            <p className="text-sm text-slate-500">No deals yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
