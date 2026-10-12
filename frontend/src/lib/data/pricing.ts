export interface PricingFeature {
  label: string;
  included: boolean;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  billingNote: string;
  cta: string;
  href: string;
  featured?: boolean;
  features: PricingFeature[];
}

export const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    billingNote: "Forever. No card needed.",
    cta: "Get Started Free",
    href: "/register",
    features: [
      { label: "100 AI-drafted replies / mo", included: true },
      { label: "Website widget only", included: true },
      { label: "1 document", included: true },
      { label: "Conversation history", included: true },
    ],
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    billingNote: "Billed monthly. Cancel anytime.",
    cta: "Start Pro Free for 14 Days",
    href: "/register",
    featured: true,
    features: [
      { label: "Unlimited replies", included: true },
      { label: "WhatsApp + Email + Website", included: true },
      { label: "Up to 10 documents", included: true },
      { label: "Selective auto-reply", included: true },
      { label: "History + analytics", included: true },
    ],
  },
  {
    name: "Business",
    price: "$49",
    period: "/mo",
    billingNote: "For growing teams.",
    cta: "Start Business Free for 14 Days",
    href: "/register",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Unlimited documents", included: true },
      { label: "Full analytics", included: true },
      { label: "Multi-staff access (coming soon)", included: false },
      { label: "Instagram DM (coming soon)", included: false },
      { label: "Priority support", included: true },
    ],
  },
];
