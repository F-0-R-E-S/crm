import { loadDocsTree } from "@/lib/docs-content";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://crm-node.fly.dev";
  const tree = await loadDocsTree({ root: "content/docs" });
  const docs = tree.flatMap((n) =>
    n.pages.map((p) => ({
      url: `${base}/docs/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );
  return [
    { url: `${base}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${base}/docs`, lastModified: new Date(), priority: 0.9 },
    ...docs,
  ];
}
