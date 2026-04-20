import { prisma } from "@/server/db";

export type DedupMatchBy =
  | "external_lead_id"
  | "phone_hash"
  | "email_hash"
  | "fingerprint"
  | "ip_landing_url";

export interface DedupInput {
  affiliateId: string;
  externalLeadId: string | null | undefined;
  phoneHash: string | null;
  emailHash: string | null;
  fingerprint: string | null;
  ipLandingFingerprint?: string | null;
  windowDays: number;
  crossAffiliate: boolean;
}

export interface DedupHit {
  duplicate: true;
  matchedBy: DedupMatchBy;
  existingLeadId: string;
  firstSeenAt: Date;
  confidence: "high" | "low";
}

export interface DedupMiss {
  duplicate: false;
}

export type DedupResult = DedupHit | DedupMiss;

export async function detectDuplicate(input: DedupInput): Promise<DedupResult> {
  const since = new Date(Date.now() - input.windowDays * 24 * 3600 * 1000);
  const scope = input.crossAffiliate ? {} : { affiliateId: input.affiliateId };

  // Strategy 1: external_lead_id + affiliate_id (всегда scoped to affiliate)
  if (input.externalLeadId) {
    const m = await prisma.lead.findFirst({
      where: {
        affiliateId: input.affiliateId,
        externalLeadId: input.externalLeadId,
        createdAt: { gte: since },
      },
      select: { id: true, receivedAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (m)
      return {
        duplicate: true,
        matchedBy: "external_lead_id",
        existingLeadId: m.id,
        firstSeenAt: m.receivedAt,
        confidence: "high",
      };
  }

  // Strategy 2: phone_hash
  if (input.phoneHash) {
    const m = await prisma.lead.findFirst({
      where: { ...scope, phoneHash: input.phoneHash, createdAt: { gte: since } },
      select: { id: true, receivedAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (m)
      return {
        duplicate: true,
        matchedBy: "phone_hash",
        existingLeadId: m.id,
        firstSeenAt: m.receivedAt,
        confidence: "high",
      };
  }

  // Strategy 3: email_hash
  if (input.emailHash) {
    const m = await prisma.lead.findFirst({
      where: { ...scope, emailHash: input.emailHash, createdAt: { gte: since } },
      select: { id: true, receivedAt: true },
      orderBy: { createdAt: "asc" },
    });
    if (m)
      return {
        duplicate: true,
        matchedBy: "email_hash",
        existingLeadId: m.id,
        firstSeenAt: m.receivedAt,
        confidence: "high",
      };
  }

  // Strategy 4: fingerprint (low-confidence) sha256(email|phone|geo), stored in phoneHash column
  if (input.fingerprint) {
    const m = await prisma.lead.findFirst({
      where: { ...scope, phoneHash: input.fingerprint, createdAt: { gte: since } },
      select: { id: true, receivedAt: true },
    });
    if (m)
      return {
        duplicate: true,
        matchedBy: "fingerprint",
        existingLeadId: m.id,
        firstSeenAt: m.receivedAt,
        confidence: "low",
      };
  }

  // Strategy 5: ip + landing_url 10-min window (very low confidence, fallback)
  if (input.ipLandingFingerprint) {
    const ipSince = new Date(Date.now() - 10 * 60 * 1000);
    const m = await prisma.lead.findFirst({
      where: { ...scope, phoneHash: input.ipLandingFingerprint, createdAt: { gte: ipSince } },
      select: { id: true, receivedAt: true },
    });
    if (m)
      return {
        duplicate: true,
        matchedBy: "ip_landing_url",
        existingLeadId: m.id,
        firstSeenAt: m.receivedAt,
        confidence: "low",
      };
  }

  return { duplicate: false };
}

// Backward-compat wrapper for existing callers
export async function isDuplicate(
  affiliateId: string,
  hashes: { phoneHash: string | null; emailHash: string | null },
  windowDays: number,
): Promise<boolean> {
  const r = await detectDuplicate({
    affiliateId,
    externalLeadId: null,
    phoneHash: hashes.phoneHash,
    emailHash: hashes.emailHash,
    fingerprint: null,
    windowDays,
    crossAffiliate: false,
  });
  return r.duplicate;
}
