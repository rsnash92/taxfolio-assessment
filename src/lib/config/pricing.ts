// Assessment Wizard Pricing Configuration

export const PRICING = {
  plans: [
    {
      id: 'lite' as const,
      name: 'Lite',
      price: 2900, // £29.00 in pence
      description: 'Perfect for simple tax returns',
      popular: false,
      priceLabel: 'per return',
      features: [
        'Self-assessment tax return',
        'Direct HMRC submission',
        'Tax calculation breakdown',
        'Download PDF copy',
      ],
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: 9900, // £99.00 in pence
      description: 'Most comprehensive option',
      popular: true,
      priceLabel: 'per return',
      features: [
        'Everything in Lite',
        'Priority email support',
        'Accountant review available',
        'Expense optimization tips',
        'Tax-saving recommendations',
      ],
    },
    {
      id: 'lifetime' as const,
      name: 'Lifetime',
      price: 24900, // £249.00 in pence
      description: 'Best value for ongoing filers',
      popular: false,
      priceLabel: 'one-time payment',
      features: [
        'Everything in Pro',
        'Unlimited future returns',
        'Priority support forever',
        'Early access to new features',
        'Never pay again',
      ],
    },
  ],

  discountCodes: {
    LAUNCH20: { type: 'percent' as const, value: 20 },
    EARLYBIRD: { type: 'fixed' as const, value: 1000 }, // £10 off
    TAXFOLIO50: { type: 'percent' as const, value: 50 }, // For existing TaxFolio users
  } as Record<string, { type: 'percent' | 'fixed'; value: number }>,
} as const;

export type PlanId = 'lite' | 'pro' | 'lifetime';

export function calculatePrice(
  planId: string,
  discountCode?: string
): {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
} | null {
  const plan = PRICING.plans.find((p) => p.id === planId);
  if (!plan) return null;

  let finalPrice = plan.price;
  let discountAmount = 0;

  if (discountCode) {
    const code = discountCode.toUpperCase().trim();
    const discount = PRICING.discountCodes[code];

    if (discount) {
      if (discount.type === 'percent') {
        discountAmount = Math.round(plan.price * (discount.value / 100));
      } else {
        discountAmount = discount.value;
      }
      finalPrice = plan.price - discountAmount;
    }
  }

  return {
    originalPrice: plan.price,
    discountAmount,
    finalPrice: Math.max(0, finalPrice),
  };
}

export function formatCurrency(amountInPence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amountInPence / 100);
}

export function getPlanById(planId: string) {
  return PRICING.plans.find((p) => p.id === planId);
}
