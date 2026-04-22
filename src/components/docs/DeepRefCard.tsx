import Link from "next/link";

export function DeepRefCard({
  title, description, block, kind, anchor,
}: {
  title: string;
  description?: string;
  block: string;
  kind: "prisma" | "trpc" | "rest" | "env" | "errors" | "telegram" | "jobs" | "invariants";
  anchor?: string;
}) {
  const filename =
    kind === "prisma" ? "db-schema"
      : kind === "trpc" ? "trpc-surface"
      : kind === "rest" ? "rest-surface"
      : kind === "env" ? "env-vars"
      : kind === "errors" ? "error-catalog"
      : kind === "telegram" ? "telegram-events"
      : kind === "jobs" ? "jobs"
      : "invariants";
  const href = `/docs/${block}/_deep/${filename}${anchor ? `#${anchor}` : ""}`;
  return (
    <Link
      href={href as any}
      className="my-4 flex items-center justify-between rounded-md border p-4 hover:bg-muted"
    >
      <div>
        <div className="font-medium">{title}</div>
        {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
      </div>
      <span className="text-sm text-muted-foreground">Deep reference →</span>
    </Link>
  );
}
