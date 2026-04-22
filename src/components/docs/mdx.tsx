import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type HProps = ComponentPropsWithoutRef<"h1">;
type PProps = ComponentPropsWithoutRef<"p">;
type AProps = ComponentPropsWithoutRef<"a">;
type UlProps = ComponentPropsWithoutRef<"ul">;
type OlProps = ComponentPropsWithoutRef<"ol">;
type CodeProps = ComponentPropsWithoutRef<"code">;
type PreProps = ComponentPropsWithoutRef<"pre">;
type BqProps = ComponentPropsWithoutRef<"blockquote">;
type TableProps = ComponentPropsWithoutRef<"table">;
type ThProps = ComponentPropsWithoutRef<"th">;
type TdProps = ComponentPropsWithoutRef<"td">;

// biome-ignore lint/suspicious/noExplicitAny: MDXComponents type is not available without @types/mdx
export const docsMdxComponents: Record<string, any> = {
  h1: (props: HProps) => (
    <h1 {...props} className={cn("scroll-mt-20 text-3xl font-semibold", props.className)} />
  ),
  h2: (props: HProps) => (
    <h2
      {...props}
      className={cn("mt-8 scroll-mt-20 border-b pb-1 text-2xl font-semibold", props.className)}
    />
  ),
  h3: (props: HProps) => (
    <h3 {...props} className={cn("mt-6 scroll-mt-20 text-xl font-semibold", props.className)} />
  ),
  p: (props: PProps) => <p {...props} className={cn("my-4 leading-7", props.className)} />,
  ul: (props: UlProps) => (
    <ul {...props} className={cn("my-4 list-disc space-y-1 pl-6", props.className)} />
  ),
  ol: (props: OlProps) => (
    <ol {...props} className={cn("my-4 list-decimal space-y-1 pl-6", props.className)} />
  ),
  code: (props: CodeProps) => (
    <code {...props} className={cn("rounded bg-muted px-1 py-0.5 text-sm", props.className)} />
  ),
  pre: (props: PreProps) => (
    <pre
      {...props}
      className={cn("my-4 overflow-x-auto rounded-lg border p-4 text-sm", props.className)}
    />
  ),
  a: (props: AProps) => (
    <a
      {...props}
      className={cn("underline underline-offset-2 hover:text-foreground", props.className)}
    />
  ),
  blockquote: (props: BqProps) => (
    <blockquote
      {...props}
      className={cn("my-4 border-l-4 border-muted pl-4 text-muted-foreground", props.className)}
    />
  ),
  table: (props: TableProps) => (
    <table {...props} className={cn("my-4 w-full border-collapse text-sm", props.className)} />
  ),
  th: (props: ThProps) => (
    <th {...props} className={cn("border-b p-2 text-left font-medium", props.className)} />
  ),
  td: (props: TdProps) => <td {...props} className={cn("border-b p-2", props.className)} />,
};
