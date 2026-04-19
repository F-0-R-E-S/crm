"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default function ActivitiesPage() {
  const utils = trpc.useUtils();
  const list = trpc.activity.list.useQuery({});
  const complete = trpc.activity.complete.useMutation({
    onSuccess: () => utils.activity.list.invalidate(),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My open activities</h1>
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.data?.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
            >
              <div>
                <div className="font-medium">
                  <span className="mr-2 rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {a.type}
                  </span>
                  {a.subject}
                </div>
                <div className="text-xs text-slate-500">
                  Due {formatDate(a.dueAt)}
                  {a.contact && ` · ${a.contact.firstName} ${a.contact.lastName}`}
                  {a.deal && ` · ${a.deal.title}`}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => complete.mutate(a.id)}
                disabled={complete.isPending}
              >
                Complete
              </Button>
            </div>
          ))}
          {list.data?.length === 0 && (
            <p className="text-sm text-slate-500">Nothing to do. 🎉</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
