'use client';

import { useState, useMemo } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRICING, calculatePrice, formatCurrency } from '@/lib/config/pricing';
import {
  Check,
  Shield,
  Tag,
  Loader2,
  ChevronRight,
  Award,
  Lock,
  X,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Lite plan eligibility criteria
const LITE_LIMITS = {
  maxTransactions: 100,
  maxIncomeSources: 2,
  // Complex income types that require Pro
  complexIncomeTypes: ['capital-gains', 'rental', 'cis'],
};

export function ReviewPaymentStep() {
  const { data, updateData, goNext } = useWizard();

  // Check if user exceeds Lite plan criteria
  const liteEligibility = useMemo(() => {
    const transactionCount = data.transactions?.length || 0;
    const incomeSourceCount = data.incomeSources?.length || 0;
    const hasComplexIncome = data.incomeSources?.some((source) =>
      LITE_LIMITS.complexIncomeTypes.includes(source.type)
    );

    const reasons: string[] = [];

    if (transactionCount > LITE_LIMITS.maxTransactions) {
      reasons.push(`${transactionCount} transactions (max ${LITE_LIMITS.maxTransactions})`);
    }
    if (incomeSourceCount > LITE_LIMITS.maxIncomeSources) {
      reasons.push(`${incomeSourceCount} income sources (max ${LITE_LIMITS.maxIncomeSources})`);
    }
    if (hasComplexIncome) {
      reasons.push('Complex income types (capital gains, rental, or CIS)');
    }

    return {
      isEligible: reasons.length === 0,
      reasons,
    };
  }, [data.transactions, data.incomeSources]);

  // Default to Pro if Lite is not eligible
  const defaultPlan = liteEligibility.isEligible ? 'pro' : 'pro';
  const [selectedPlan, setSelectedPlan] = useState<string>(
    data.payment?.plan || defaultPlan
  );
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const pricing = calculatePrice(selectedPlan, appliedDiscount || undefined);

  const applyDiscountCode = () => {
    setDiscountError(null);
    const code = discountCode.toUpperCase().trim();

    if (PRICING.discountCodes[code]) {
      setAppliedDiscount(code);
      setShowDiscountInput(false);
    } else {
      setDiscountError('Invalid discount code');
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    // Simulate payment processing
    // In production, this would integrate with Stripe
    await new Promise((resolve) => setTimeout(resolve, 2000));

    updateData({
      payment: {
        status: 'paid',
        plan: selectedPlan as 'lite' | 'pro' | 'lifetime',
        amount: pricing?.finalPrice || 0,
        discountCode: appliedDiscount || undefined,
        discountAmount: pricing?.discountAmount || 0,
        paidAt: new Date().toISOString(),
      },
    });

    setIsProcessing(false);
    goNext();
  };

  // If already paid, show success and continue
  if (data.payment?.status === 'paid') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[#ccf5f7] rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-[#00c4d4]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Complete
        </h1>
        <p className="text-gray-600 mb-8">
          You can now review your tax summary and submit to HMRC.
        </p>
        <Button
          onClick={goNext}
          className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
        >
          Review Tax Summary
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Choose Your Plan
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          You&apos;ve done the hard part. Select a plan to unlock your full tax
          summary and submit directly to HMRC.
        </p>
      </div>

      {/* HMRC Badge */}
      <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
        <Award className="h-5 w-5 sm:h-6 sm:w-6 text-[#00c4d4]" />
        <span className="text-xs sm:text-sm font-medium text-gray-700">
          HMRC Recognised Software
        </span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 sm:mb-10 max-w-md mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
            1
          </div>
          <span className="text-[10px] sm:text-xs text-gray-600 mt-1">Pay securely</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
            2
          </div>
          <span className="text-[10px] sm:text-xs text-gray-500 mt-1">Review summary</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium">
            3
          </div>
          <span className="text-[10px] sm:text-xs text-gray-500 mt-1">Submit to HMRC</span>
        </div>
      </div>

      {/* Plan Selection - 3 columns on lg, 1 on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {PRICING.plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const planPricing = calculatePrice(
            plan.id,
            appliedDiscount || undefined
          );
          const planWithLabel = plan as typeof plan & { priceLabel?: string };

          // Check if Lite plan is disabled
          const isLiteDisabled = plan.id === 'lite' && !liteEligibility.isEligible;

          return (
            <button
              key={plan.id}
              onClick={() => !isLiteDisabled && setSelectedPlan(plan.id)}
              disabled={isLiteDisabled}
              className={cn(
                'relative flex flex-col p-4 sm:p-6 rounded-2xl border-2 text-left transition-all',
                isLiteDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75'
                  : isSelected
                    ? 'border-[#00e3ec] bg-[#e6fafb]/50 ring-2 ring-[#00e3ec]/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white',
                plan.popular && !isLiteDisabled && 'lg:scale-105 lg:shadow-lg lg:z-10'
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#00e3ec] to-[#00c4d4] text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  MOST POPULAR
                </span>
              )}

              {/* Unavailable Badge for Lite */}
              {isLiteDisabled && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  UNAVAILABLE
                </span>
              )}

              {/* Selection Indicator */}
              <div
                className={cn(
                  'absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center',
                  isLiteDisabled
                    ? 'border-gray-300 bg-gray-200'
                    : isSelected
                      ? 'border-[#00e3ec] bg-[#00e3ec]'
                      : 'border-gray-300'
                )}
              >
                {isSelected && !isLiteDisabled && <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                {isLiteDisabled && <Lock className="h-3 w-3 text-gray-400" />}
              </div>

              {/* Plan Name */}
              <h3 className={cn(
                'text-lg sm:text-xl font-bold mb-1 pr-8',
                isLiteDisabled ? 'text-gray-400' : 'text-gray-900'
              )}>
                {plan.name}
              </h3>
              <p className={cn(
                'text-xs sm:text-sm mb-3 sm:mb-4',
                isLiteDisabled ? 'text-gray-400' : 'text-gray-500'
              )}>
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-3 sm:mb-4">
                {planPricing && planPricing.discountAmount > 0 && !isLiteDisabled ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {formatCurrency(planPricing.finalPrice)}
                    </span>
                    <span className="text-base sm:text-lg text-gray-400 line-through">
                      {formatCurrency(planPricing.originalPrice)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-2xl sm:text-3xl font-bold',
                      isLiteDisabled ? 'text-gray-400' : 'text-gray-900'
                    )}>
                      {formatCurrency(plan.price)}
                    </span>
                    {planWithLabel.priceLabel && (
                      <span className={cn(
                        'text-xs sm:text-sm',
                        isLiteDisabled ? 'text-gray-400' : 'text-gray-500'
                      )}>
                        {planWithLabel.priceLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 flex-1">
                {plan.features.map((feature, index) => {
                  const featureObj = feature as { text: string; included: boolean; highlight?: boolean };
                  const isIncluded = featureObj.included;
                  const isHighlight = featureObj.highlight;

                  return (
                    <li key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                      {isHighlight ? (
                        <Star className={cn(
                          'h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5',
                          isLiteDisabled ? 'text-gray-300' : 'text-amber-400 fill-amber-400'
                        )} />
                      ) : isIncluded ? (
                        <Check className={cn(
                          'h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5',
                          isLiteDisabled ? 'text-gray-300' : 'text-[#00e3ec]'
                        )} />
                      ) : (
                        <X className={cn(
                          'h-4 w-4 sm:h-5 sm:w-5 shrink-0 mt-0.5',
                          isLiteDisabled ? 'text-gray-300' : 'text-gray-300'
                        )} />
                      )}
                      <span className={cn(
                        isLiteDisabled
                          ? 'text-gray-400'
                          : isIncluded
                            ? 'text-gray-600'
                            : 'text-gray-400'
                      )}>
                        {featureObj.text}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Reason why Lite is unavailable */}
              {isLiteDisabled && liteEligibility.reasons.length > 0 && (
                <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-amber-700 font-medium mb-1">
                    Your return exceeds Lite limits:
                  </p>
                  <ul className="text-[10px] sm:text-xs text-amber-600 space-y-0.5">
                    {liteEligibility.reasons.map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div className="mt-auto">
                <div
                  className={cn(
                    'w-full py-2.5 sm:py-3 rounded-xl text-center text-sm sm:text-base font-medium transition-colors',
                    isLiteDisabled
                      ? 'bg-gray-200 text-gray-400'
                      : isSelected
                        ? 'bg-[#00e3ec] text-white'
                        : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {isLiteDisabled ? 'Not Available' : isSelected ? 'Selected' : 'Select Plan'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Section - Centered with max width */}
      <div className="max-w-lg mx-auto">
        {/* Discount Code Section */}
        {!appliedDiscount ? (
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
            {showDiscountInput ? (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Input
                  placeholder="Enter discount code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 text-sm sm:text-base"
                  onKeyDown={(e) => e.key === 'Enter' && applyDiscountCode()}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={applyDiscountCode} className="flex-1 sm:flex-none">
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowDiscountInput(false);
                      setDiscountCode('');
                      setDiscountError(null);
                    }}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDiscountInput(true)}
                className="flex items-center gap-2 text-xs sm:text-sm text-[#00c4d4] hover:text-[#00a8b0] mx-auto"
              >
                <Tag className="h-4 w-4" />
                Have a discount code?
              </button>
            )}
            {discountError && (
              <p className="text-xs sm:text-sm text-red-500 mt-2 text-center">{discountError}</p>
            )}
          </div>
        ) : (
          <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#00a8b0]">
                <Tag className="h-4 w-4" />
                <span className="font-medium">
                  Code &quot;{appliedDiscount}&quot; applied!
                </span>
                <span className="text-[#00c4d4]">
                  You save {formatCurrency(pricing?.discountAmount || 0)}
                </span>
              </div>
              <button
                onClick={() => setAppliedDiscount(null)}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Order Summary</h3>
          <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">
                {PRICING.plans.find((p) => p.id === selectedPlan)?.name} Plan
              </span>
              <span className="text-gray-900">
                {formatCurrency(pricing?.originalPrice || 0)}
              </span>
            </div>
            {pricing && pricing.discountAmount > 0 && (
              <div className="flex justify-between text-[#00c4d4]">
                <span>Discount ({appliedDiscount})</span>
                <span>-{formatCurrency(pricing.discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 sm:pt-3">
              <div className="flex justify-between font-semibold text-base sm:text-lg">
                <span>Total</span>
                <span>{formatCurrency(pricing?.finalPrice || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
          <Shield className="h-4 w-4" />
          <span>
            You&apos;ll review your return before it&apos;s submitted to HMRC.
          </span>
        </div>

        {/* Pay Button */}
        <div className="flex justify-center">
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full sm:w-auto bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing...
              </>
            ) : (
              <>
                Pay {formatCurrency(pricing?.finalPrice || 0)}
                <ChevronRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Payment Methods Note */}
        <p className="text-center text-[10px] sm:text-xs text-gray-400 mt-3 sm:mt-4">
          Secure payment powered by Stripe. We accept all major credit and debit
          cards.
        </p>
      </div>
    </div>
  );
}
