import { cn } from "@/lib/utils";

const STYLES = {
  info:    "border-sky-500/50 bg-sky-500/5 text-sky-800 dark:text-sky-100",
  warning: "border-amber-500/50 bg-amber-500/5 text-amber-900 dark:text-amber-100",
  danger:  "border-rose-500/50 bg-rose-500/5 text-rose-900 dark:text-rose-100",
  success: "border-emerald-500/50 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100",
} as const;

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: keyof typeof STYLES;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={cn("my-4 rounded-md border-l-4 p-4", STYLES[type])}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      <div className="text-sm leading-6">{children}</div>
    </aside>
  );
}
