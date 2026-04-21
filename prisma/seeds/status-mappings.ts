import type { PrismaClient } from "@prisma/client";

/**
 * Plausible per-broker raw→canonical mappings for 10 imaginary brokers.
 * Demonstrates the mapping UI can reach 95%+ raw-status coverage for top-10
 * brokers. The broker ids are stable strings — seeded brokers are created
 * on-demand. Raw statuses are the kinds operators actually encounter
 * (mixed English/locale variants, broker-specific aliases).
 */
export interface BrokerMappingSeed {
  brokerId: string;
  brokerName: string;
  mappings: Array<{ rawStatus: string; canonicalCode: string }>;
}

export const BROKER_MAPPINGS: BrokerMappingSeed[] = [
  {
    brokerId: "seed-mapping-broker-01",
    brokerName: "Acme Brokers (EN)",
    mappings: [
      { rawStatus: "new", canonicalCode: "new" },
      { rawStatus: "pending", canonicalCode: "pending_contact" },
      { rawStatus: "qualified", canonicalCode: "qualified" },
      { rawStatus: "ftd", canonicalCode: "ftd" },
      { rawStatus: "declined", canonicalCode: "declined" },
      { rawStatus: "dup", canonicalCode: "duplicate" },
      { rawStatus: "fraud", canonicalCode: "fraud" },
      { rawStatus: "vip", canonicalCode: "vip" },
      { rawStatus: "redeposit", canonicalCode: "redeposit" },
      { rawStatus: "active", canonicalCode: "active_trader" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-02",
    brokerName: "Bluebird FX",
    mappings: [
      { rawStatus: "lead_new", canonicalCode: "new" },
      { rawStatus: "calling", canonicalCode: "pending_call" },
      { rawStatus: "nothot", canonicalCode: "not_interested_yet" },
      { rawStatus: "qual", canonicalCode: "qualified" },
      { rawStatus: "callback", canonicalCode: "call_back" },
      { rawStatus: "FTD", canonicalCode: "ftd" },
      { rawStatus: "retentionVIP", canonicalCode: "vip" },
      { rawStatus: "bad_phone", canonicalCode: "invalid_phone" },
      { rawStatus: "blacklist", canonicalCode: "do_not_call" },
      { rawStatus: "junk", canonicalCode: "rejected" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-03",
    brokerName: "Crystal Markets (RU)",
    mappings: [
      { rawStatus: "novyj", canonicalCode: "new" },
      { rawStatus: "perezvon", canonicalCode: "call_back" },
      { rawStatus: "zainteresovan", canonicalCode: "interested" },
      { rawStatus: "demo", canonicalCode: "demo_scheduled" },
      { rawStatus: "depozit", canonicalCode: "ftd" },
      { rawStatus: "povtornyj_depozit", canonicalCode: "redeposit" },
      { rawStatus: "otkaz", canonicalCode: "declined" },
      { rawStatus: "dubl", canonicalCode: "duplicate" },
      { rawStatus: "moshennik", canonicalCode: "fraud" },
      { rawStatus: "ne_zvonit", canonicalCode: "do_not_call" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-04",
    brokerName: "Delta Trade",
    mappings: [
      { rawStatus: "NEW", canonicalCode: "new" },
      { rawStatus: "OPEN", canonicalCode: "open" },
      { rawStatus: "QUALIFIED_A", canonicalCode: "qualified" },
      { rawStatus: "QUALIFIED_B", canonicalCode: "qualified" },
      { rawStatus: "DEPOSIT", canonicalCode: "ftd" },
      { rawStatus: "RE_DEPOSIT", canonicalCode: "redeposit" },
      { rawStatus: "HIGH_VALUE", canonicalCode: "high_value" },
      { rawStatus: "REJECTED_FRAUD", canonicalCode: "fraud" },
      { rawStatus: "INVALID_PH", canonicalCode: "invalid_phone" },
      { rawStatus: "DUP_INT", canonicalCode: "duplicate" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-05",
    brokerName: "Evergreen Capital",
    mappings: [
      { rawStatus: "lead-new", canonicalCode: "new" },
      { rawStatus: "lead-open", canonicalCode: "open" },
      { rawStatus: "lead-qualified", canonicalCode: "qualified" },
      { rawStatus: "lead-interested", canonicalCode: "interested" },
      { rawStatus: "lead-ftd", canonicalCode: "ftd" },
      { rawStatus: "lead-redep", canonicalCode: "redeposit" },
      { rawStatus: "lead-rejected", canonicalCode: "rejected" },
      { rawStatus: "lead-duplicate", canonicalCode: "duplicate" },
      { rawStatus: "lead-dnc", canonicalCode: "do_not_call" },
      { rawStatus: "lead-vip", canonicalCode: "vip" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-06",
    brokerName: "Falcon Global",
    mappings: [
      { rawStatus: "1", canonicalCode: "new" },
      { rawStatus: "2", canonicalCode: "pending_call" },
      { rawStatus: "3", canonicalCode: "qualified" },
      { rawStatus: "4", canonicalCode: "demo_scheduled" },
      { rawStatus: "5", canonicalCode: "ftd" },
      { rawStatus: "6", canonicalCode: "redeposit" },
      { rawStatus: "7", canonicalCode: "declined" },
      { rawStatus: "8", canonicalCode: "duplicate" },
      { rawStatus: "9", canonicalCode: "fraud" },
      { rawStatus: "10", canonicalCode: "vip" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-07",
    brokerName: "Gemini Ventures",
    mappings: [
      { rawStatus: "fresh", canonicalCode: "new" },
      { rawStatus: "warm", canonicalCode: "interested" },
      { rawStatus: "hot", canonicalCode: "qualified" },
      { rawStatus: "converted", canonicalCode: "ftd" },
      { rawStatus: "redeposited", canonicalCode: "redeposit" },
      { rawStatus: "active", canonicalCode: "active_trader" },
      { rawStatus: "cold", canonicalCode: "not_interested_yet" },
      { rawStatus: "bad_data", canonicalCode: "invalid_phone" },
      { rawStatus: "duplicate_lead", canonicalCode: "duplicate" },
      { rawStatus: "dnc_list", canonicalCode: "do_not_call" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-08",
    brokerName: "Horizon Brokers",
    mappings: [
      { rawStatus: "received", canonicalCode: "new" },
      { rawStatus: "calling_attempt_1", canonicalCode: "pending_call" },
      { rawStatus: "calling_attempt_2", canonicalCode: "pending_call" },
      { rawStatus: "calling_attempt_3", canonicalCode: "pending_call" },
      { rawStatus: "qualified_lead", canonicalCode: "qualified" },
      { rawStatus: "deposit_made", canonicalCode: "ftd" },
      { rawStatus: "second_deposit", canonicalCode: "redeposit" },
      { rawStatus: "rejected_by_retention", canonicalCode: "rejected" },
      { rawStatus: "fraud_confirmed", canonicalCode: "fraud" },
      { rawStatus: "vip_upgrade", canonicalCode: "vip" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-09",
    brokerName: "Iris Trading",
    mappings: [
      { rawStatus: "L0", canonicalCode: "new" },
      { rawStatus: "L1_pending", canonicalCode: "pending_contact" },
      { rawStatus: "L2_qual", canonicalCode: "qualified" },
      { rawStatus: "L3_demo", canonicalCode: "demo_scheduled" },
      { rawStatus: "L4_ftd", canonicalCode: "ftd" },
      { rawStatus: "L5_redep", canonicalCode: "redeposit" },
      { rawStatus: "L6_active", canonicalCode: "active_trader" },
      { rawStatus: "L7_high_value", canonicalCode: "high_value" },
      { rawStatus: "R_fraud", canonicalCode: "fraud" },
      { rawStatus: "R_duplicate", canonicalCode: "duplicate" },
    ],
  },
  {
    brokerId: "seed-mapping-broker-10",
    brokerName: "Juniper Finance",
    mappings: [
      { rawStatus: "lead:new", canonicalCode: "new" },
      { rawStatus: "lead:pending", canonicalCode: "pending_contact" },
      { rawStatus: "lead:qualified", canonicalCode: "qualified" },
      { rawStatus: "lead:callback", canonicalCode: "call_back" },
      { rawStatus: "conv:ftd", canonicalCode: "ftd" },
      { rawStatus: "conv:redeposit", canonicalCode: "redeposit" },
      { rawStatus: "conv:vip", canonicalCode: "vip" },
      { rawStatus: "reject:fraud", canonicalCode: "fraud" },
      { rawStatus: "reject:dup", canonicalCode: "duplicate" },
      { rawStatus: "reject:dnc", canonicalCode: "do_not_call" },
    ],
  },
];

/**
 * Upserts all 10 demo brokers and their mappings. Idempotent.
 */
export async function seedStatusMappings(prisma: PrismaClient): Promise<number> {
  let mappingCount = 0;
  const canonicals = await prisma.canonicalStatus.findMany();
  const byCode = new Map(canonicals.map((c) => [c.code, c.id] as const));

  for (const seed of BROKER_MAPPINGS) {
    await prisma.broker.upsert({
      where: { id: seed.brokerId },
      update: {},
      create: {
        id: seed.brokerId,
        name: seed.brokerName,
        isActive: false, // demo-only
        endpointUrl: "http://127.0.0.1:9/stub",
        fieldMapping: { firstName: "first_name", email: "email" },
        postbackSecret: "seed-demo-secret",
        postbackLeadIdPath: "lead_id",
        postbackStatusPath: "status",
        statusMapping: {},
      },
    });
    for (const m of seed.mappings) {
      const canonId = byCode.get(m.canonicalCode);
      if (!canonId) continue;
      await prisma.statusMapping.upsert({
        where: {
          brokerId_rawStatus: { brokerId: seed.brokerId, rawStatus: m.rawStatus },
        },
        update: { canonicalStatusId: canonId },
        create: {
          brokerId: seed.brokerId,
          rawStatus: m.rawStatus,
          canonicalStatusId: canonId,
        },
      });
      mappingCount += 1;
    }
  }
  return mappingCount;
}
