import { type PrismaClient, StatusCategory } from "@prisma/client";

export interface CanonicalStatusSeed {
  code: string;
  label: string;
  description: string;
  category: StatusCategory;
  sortOrder: number;
}

/**
 * 20 canonical statuses spanning the 4 categories.
 * Codes are stable identifiers (snake_case) used for analytics grouping +
 * StatusMapping lookups; labels are display strings; descriptions ship as
 * operator help-text.
 */
export const CANONICAL_STATUSES: CanonicalStatusSeed[] = [
  // --- NEW (5) ---
  {
    code: "new",
    label: "New",
    description: "Lead received, not yet contacted.",
    category: StatusCategory.NEW,
    sortOrder: 10,
  },
  {
    code: "open",
    label: "Open",
    description: "Lead open for processing.",
    category: StatusCategory.NEW,
    sortOrder: 20,
  },
  {
    code: "pending_call",
    label: "Pending Call",
    description: "Awaiting first outbound call.",
    category: StatusCategory.NEW,
    sortOrder: 30,
  },
  {
    code: "pending_contact",
    label: "Pending Contact",
    description: "Awaiting any contact attempt.",
    category: StatusCategory.NEW,
    sortOrder: 40,
  },
  {
    code: "not_interested_yet",
    label: "Not Interested Yet",
    description: "Early-funnel lukewarm, still on nurture.",
    category: StatusCategory.NEW,
    sortOrder: 50,
  },
  // --- QUALIFIED (4) ---
  {
    code: "qualified",
    label: "Qualified",
    description: "Lead passed broker qualification.",
    category: StatusCategory.QUALIFIED,
    sortOrder: 110,
  },
  {
    code: "call_back",
    label: "Call Back",
    description: "Requested call back.",
    category: StatusCategory.QUALIFIED,
    sortOrder: 120,
  },
  {
    code: "interested",
    label: "Interested",
    description: "Actively interested; warm.",
    category: StatusCategory.QUALIFIED,
    sortOrder: 130,
  },
  {
    code: "demo_scheduled",
    label: "Demo Scheduled",
    description: "Demo/onboarding call booked.",
    category: StatusCategory.QUALIFIED,
    sortOrder: 140,
  },
  // --- REJECTED (6) ---
  {
    code: "rejected",
    label: "Rejected",
    description: "Generic rejection.",
    category: StatusCategory.REJECTED,
    sortOrder: 210,
  },
  {
    code: "declined",
    label: "Declined",
    description: "Broker declined after push.",
    category: StatusCategory.REJECTED,
    sortOrder: 220,
  },
  {
    code: "duplicate",
    label: "Duplicate",
    description: "Duplicate of another lead.",
    category: StatusCategory.REJECTED,
    sortOrder: 230,
  },
  {
    code: "fraud",
    label: "Fraud",
    description: "Flagged as fraudulent.",
    category: StatusCategory.REJECTED,
    sortOrder: 240,
  },
  {
    code: "invalid_phone",
    label: "Invalid Phone",
    description: "Phone number failed validation.",
    category: StatusCategory.REJECTED,
    sortOrder: 250,
  },
  {
    code: "do_not_call",
    label: "Do Not Call",
    description: "On do-not-call list.",
    category: StatusCategory.REJECTED,
    sortOrder: 260,
  },
  // --- CONVERTED (5) ---
  {
    code: "ftd",
    label: "FTD",
    description: "First-time deposit completed.",
    category: StatusCategory.CONVERTED,
    sortOrder: 310,
  },
  {
    code: "redeposit",
    label: "Redeposit",
    description: "Additional deposit after FTD.",
    category: StatusCategory.CONVERTED,
    sortOrder: 320,
  },
  {
    code: "active_trader",
    label: "Active Trader",
    description: "Currently active trading.",
    category: StatusCategory.CONVERTED,
    sortOrder: 330,
  },
  {
    code: "high_value",
    label: "High Value",
    description: "High-deposit high-activity trader.",
    category: StatusCategory.CONVERTED,
    sortOrder: 340,
  },
  {
    code: "vip",
    label: "VIP",
    description: "VIP tier customer.",
    category: StatusCategory.CONVERTED,
    sortOrder: 350,
  },
];

export async function seedCanonicalStatuses(prisma: PrismaClient): Promise<number> {
  let count = 0;
  for (const s of CANONICAL_STATUSES) {
    await prisma.canonicalStatus.upsert({
      where: { code: s.code },
      update: {
        label: s.label,
        description: s.description,
        category: s.category,
        sortOrder: s.sortOrder,
      },
      create: s,
    });
    count += 1;
  }
  return count;
}
