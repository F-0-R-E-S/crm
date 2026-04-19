import type { LeadEventKind, Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function writeLeadEvent(
  leadId: string,
  kind: LeadEventKind,
  meta: Prisma.InputJsonValue = {},
) {
  await prisma.leadEvent.create({ data: { leadId, kind, meta } });
}
