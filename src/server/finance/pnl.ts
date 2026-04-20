import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import type { ConversionKind } from "@prisma/client";
import { applyRule, resolveAffiliateRuleAt, resolveBrokerRuleAt } from "./payout-rule-resolver";

export type ComputePnLParams = {
  from: Date;
  to: Date;
  affiliateId?: string;
  brokerId?: string;
  geo?: string;
};

export type PnLResult = {
  revenue: Prisma.Decimal;
  payout: Prisma.Decimal;
  margin: Prisma.Decimal;
  marginPct: number; // 0..100; 0 when revenue is 0
  conversionCount: number;
  breakdown: {
    byKind: Record<
      ConversionKind,
      {
        count: number;
        revenue: string;
        payout: string;
      }
    >;
  };
};

export async function computePnL(params: ComputePnLParams): Promise<PnLResult> {
  const { from, to, affiliateId, brokerId, geo } = params;

  const conversions = await prisma.conversion.findMany({
    where: {
      occurredAt: { gte: from, lt: to },
      lead: {
        ...(affiliateId ? { affiliateId } : {}),
        ...(brokerId ? { brokerId } : {}),
        ...(geo ? { geo } : {}),
      },
    },
    include: {
      lead: { select: { affiliateId: true, brokerId: true } },
    },
  });

  const brokerIds = [
    ...new Set(conversions.map((c) => c.lead.brokerId).filter((v): v is string => !!v)),
  ];
  const affiliateIds = [...new Set(conversions.map((c) => c.lead.affiliateId))];

  const [brokerRules, affiliateRules] = await Promise.all([
    prisma.brokerPayoutRule.findMany({ where: { brokerId: { in: brokerIds } } }),
    prisma.affiliatePayoutRule.findMany({ where: { affiliateId: { in: affiliateIds } } }),
  ]);

  const brokerRulesByBroker = new Map<string, typeof brokerRules>();
  for (const r of brokerRules) {
    const arr = brokerRulesByBroker.get(r.brokerId) ?? [];
    arr.push(r);
    brokerRulesByBroker.set(r.brokerId, arr);
  }

  const affiliateRulesByAffiliate = new Map<string, typeof affiliateRules>();
  for (const r of affiliateRules) {
    const arr = affiliateRulesByAffiliate.get(r.affiliateId) ?? [];
    arr.push(r);
    affiliateRulesByAffiliate.set(r.affiliateId, arr);
  }

  let revenue = new Prisma.Decimal(0);
  let payout = new Prisma.Decimal(0);
  const byKind: Record<
    ConversionKind,
    { count: number; revenue: Prisma.Decimal; payout: Prisma.Decimal }
  > = {
    REGISTRATION: {
      count: 0,
      revenue: new Prisma.Decimal(0),
      payout: new Prisma.Decimal(0),
    },
    FTD: {
      count: 0,
      revenue: new Prisma.Decimal(0),
      payout: new Prisma.Decimal(0),
    },
    REDEPOSIT: {
      count: 0,
      revenue: new Prisma.Decimal(0),
      payout: new Prisma.Decimal(0),
    },
  };

  for (const c of conversions) {
    const bRules = c.lead.brokerId ? (brokerRulesByBroker.get(c.lead.brokerId) ?? []) : [];
    const aRules = affiliateRulesByAffiliate.get(c.lead.affiliateId) ?? [];
    const brokerRule = resolveBrokerRuleAt(bRules, c.occurredAt);
    const affRule = c.lead.brokerId
      ? resolveAffiliateRuleAt(aRules, c.lead.brokerId, c.occurredAt)
      : null;

    const convRevenue = brokerRule
      ? applyRule(brokerRule, c.kind, c.amount)
      : new Prisma.Decimal(0);
    const convPayout = affRule ? applyRule(affRule, c.kind, c.amount) : new Prisma.Decimal(0);

    revenue = revenue.add(convRevenue);
    payout = payout.add(convPayout);

    byKind[c.kind].count += 1;
    byKind[c.kind].revenue = byKind[c.kind].revenue.add(convRevenue);
    byKind[c.kind].payout = byKind[c.kind].payout.add(convPayout);
  }

  const margin = revenue.sub(payout);
  const marginPct = revenue.isZero() ? 0 : margin.div(revenue).mul(100).toNumber();

  return {
    revenue,
    payout,
    margin,
    marginPct,
    conversionCount: conversions.length,
    breakdown: {
      byKind: {
        REGISTRATION: {
          count: byKind.REGISTRATION.count,
          revenue: byKind.REGISTRATION.revenue.toString(),
          payout: byKind.REGISTRATION.payout.toString(),
        },
        FTD: {
          count: byKind.FTD.count,
          revenue: byKind.FTD.revenue.toString(),
          payout: byKind.FTD.payout.toString(),
        },
        REDEPOSIT: {
          count: byKind.REDEPOSIT.count,
          revenue: byKind.REDEPOSIT.revenue.toString(),
          payout: byKind.REDEPOSIT.payout.toString(),
        },
      },
    },
  };
}
