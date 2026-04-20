import { prisma } from "@/server/db";
import type { BrokerTemplate, Prisma } from "@prisma/client";

export interface ListTemplatesFilter {
  vertical?: string;
  protocol?: string;
  country?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "createdAt";
  sortDir?: "asc" | "desc";
}

export interface ListTemplatesResult {
  items: BrokerTemplate[];
  total: number;
  limit: number;
  offset: number;
}

export async function listTemplates(f: ListTemplatesFilter): Promise<ListTemplatesResult> {
  const where: Prisma.BrokerTemplateWhereInput = {
    status: f.status ?? "active",
  };
  if (f.vertical) where.vertical = f.vertical;
  if (f.protocol) where.protocol = f.protocol;
  if (f.country) where.countries = { has: f.country.toUpperCase() };
  if (f.q && f.q.trim().length > 0) {
    where.name = { contains: f.q.trim(), mode: "insensitive" };
  }

  const limit = Math.min(Math.max(f.limit ?? 25, 1), 100);
  const offset = Math.max(f.offset ?? 0, 0);
  const sortBy = f.sortBy ?? "name";
  const sortDir = f.sortDir ?? "asc";

  const [items, total] = await Promise.all([
    prisma.brokerTemplate.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      take: limit,
      skip: offset,
    }),
    prisma.brokerTemplate.count({ where }),
  ]);
  return { items, total, limit, offset };
}

export async function getTemplateById(id: string): Promise<BrokerTemplate | null> {
  return prisma.brokerTemplate.findUnique({ where: { id } });
}

export async function getTemplateBySlug(slug: string): Promise<BrokerTemplate | null> {
  return prisma.brokerTemplate.findUnique({ where: { slug } });
}
