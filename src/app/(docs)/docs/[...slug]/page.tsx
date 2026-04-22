import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import { Toc, extractToc } from "@/components/docs/Toc";
import { docsMdxComponents } from "@/components/docs/mdx";
import { findDoc, loadDocsTree } from "@/lib/docs-content";
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
  if (joined.includes("_deep")) notFound();

  const tree = await loadDocsTree({ root: "content/docs" });
  const page = findDoc(tree, joined);
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
  const blockNode = tree.find((n) => n.blockId === block.id)!;
  const trail = [
    { label: "Docs", href: "/docs" },
    { label: block.title, href: `/docs/${blockNode.pages[0].slug}` },
    { label: page.frontmatter.title },
  ];

  const toc = extractToc(page.rawBody);

  return (
    <div className="flex gap-8">
      <article className="prose prose-neutral min-w-0 flex-1 dark:prose-invert">
        <Breadcrumbs trail={trail} />
        {content}
      </article>
      <Toc entries={toc} />
    </div>
  );
}
