import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://crm-node.fly.dev";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/docs",
        disallow: ["/_deep", "/dashboard", "/api", "/super-admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
