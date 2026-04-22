import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import { PrevNext } from "@/components/docs/PrevNext";
import { Toc, extractToc } from "@/components/docs/Toc";
import { docsMdxComponents } from "@/components/docs/mdx";
import { findDoc, findDocAnywhere, loadDocsTree } from "@/lib/docs-content";
import { compileMDX } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { BLOCK_CATALOG } from "../../../../../scripts/docs-regen/block-catalog";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateStaticParams() {
  const tree = await loadDocsTree({ root: "content/docs" });
  return tree.flatMap((n) => n.pages.map((p) => ({ slug: p.slug.split("/") })));
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const joined = slug.join("/");

  const tree = await loadDocsTree({ root: "content/docs" });
  const page =
    findDoc(tree, joined) ??
    (joined.includes("_deep")
      ? await findDocAnywhere({ root: "content/docs", slug: joined })
      : null);
  if (!page) notFound();

  const { content } = await compileMDX({
    source: page.rawBody,
    components: docsMdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "append" }],
          [rehypePrettyCode, { theme: "github-dark" }],
        ],
      },
    },
  });

  const block = BLOCK_CATALOG.find((b) => b.id === page.frontmatter.block)!;
  const blockNode = tree.find((n) => n.blockId === block.id);
  const trail = [
    { label: "Docs", href: "/docs" },
    ...(blockNode
      ? [{ label: block.title, href: `/docs/${blockNode.pages[0].slug}` }]
      : [{ label: block.title }]),
    { label: page.frontmatter.title },
  ];

  const toc = extractToc(page.rawBody);

  return (
    <div className="flex gap-8">
      <article className="prose prose-neutral min-w-0 flex-1 dark:prose-invert">
        <Breadcrumbs trail={trail} />
        {page.audience === "ai-deep" && (
          <div className="my-4 rounded-md border-l-4 border-sky-500/50 bg-sky-500/5 p-4 text-sky-800 dark:text-sky-100">
            <div className="mb-1 font-semibold">AI-deep reference</div>
            <div className="text-sm leading-6">
              This page is auto-generated granular reference, primarily for the AI assistant. For a
              human-friendly explanation, see the {block.title} overview.
            </div>
          </div>
        )}
        {content}
        <PrevNext tree={tree} currentSlug={joined} />
      </article>
      <Toc entries={toc} />
    </div>
  );
}
