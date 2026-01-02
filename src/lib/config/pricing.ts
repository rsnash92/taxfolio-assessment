// Assessment Wizard Pricing Configuration

export const PRICING = {
  plans: [
    {
      id: 'self-file' as const,
      name: 'File Online Yourself',
      price: 7900, // £79.00 in pence
      description: 'Self-employment, rental income, or CIS',
      popular: true,
      features: [
        'Your tax return filed directly to HMRC',
        'Full breakdown of your tax calculation',
        'Instant submission confirmation',
        'Download your tax return PDF',
      ],
    },
    {
      id: 'accountant' as const,
      name: 'Accountant Review',
      price: 19900, // £199.00 in pence
      description: 'Recommended for complex returns',
      popular: false,
      features: [
        'A certified accountant reviews your return',
        'Maximize allowable expenses and reliefs',
        'Full breakdown of your tax calculation',
        'We file your return with HMRC',
        'Email support for 30 days',
      ],
    },
  ],

  discountCodes: {
    LAUNCH20: { type: 'percent' as const, value: 20 },
    EARLYBIRD: { type: 'fixed' as const, value: 1000 }, // £10 off
    TAXFOLIO50: { type: 'percent' as const, value: 50 }, // For existing TaxFolio users
  } as Record<string, { type: 'percent' | 'fixed'; value: number }>,
} as const;

export type PlanId = (typeof PRICING.plans)[number]['id'];

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
