export interface TierFeatures {
  leadsPerMonth: string;
  brokerSlots: string;
  teamSeats: string;
  telegramBot: boolean;
  sla: string;
  support: string;
}

export interface Tier {
  key: "STARTER" | "GROWTH" | "PRO";
  name: string;
  price: string;
  priceLabel: string;
  tagline: string;
  cta: { label: string; href: string };
  features: TierFeatures;
  highlight?: boolean;
}

export const TIERS: Tier[] = [
  {
    key: "STARTER",
    name: "Starter",
    price: "$399",
    priceLabel: "/mo",
    tagline: "For teams validating their first affiliate funnel.",
    cta: { label: "Start 14-day trial", href: "/signup" },
    features: {
      leadsPerMonth: "50,000",
      brokerSlots: "3",
      teamSeats: "2",
      telegramBot: true,
      sla: "Business hours",
      support: "Email",
    },
  },
  {
    key: "GROWTH",
    name: "Growth",
    price: "$599",
    priceLabel: "/mo",
    tagline: "For scaling affiliate networks that need reliability.",
    cta: { label: "Start 14-day trial", href: "/signup" },
    features: {
      leadsPerMonth: "250,000",
      brokerSlots: "10",
      teamSeats: "10",
      telegramBot: true,
      sla: "15-min response",
      support: "Email + Telegram",
    },
    highlight: true,
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$899",
    priceLabel: "/mo",
    tagline: "For enterprise ops running 7-figure monthly volume.",
    cta: { label: "Contact sales", href: "mailto:sales@gambchamp.io" },
    features: {
      leadsPerMonth: "Unlimited",
      brokerSlots: "Unlimited",
      teamSeats: "Unlimited",
      telegramBot: true,
      sla: "15-min + dedicated channel",
      support: "Email + Telegram + phone",
    },
  },
];
