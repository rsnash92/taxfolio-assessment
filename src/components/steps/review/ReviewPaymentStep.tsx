'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReviewPaymentStep() {
  const { data, updateData, goNext } = useWizard();
  const [selectedPlan, setSelectedPlan] = useState<string>(
    data.payment?.plan || 'self-file'
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
        plan: selectedPlan as 'self-file' | 'accountant',
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Secure Payment Before Final Review
        </h1>
        <p className="text-gray-600">
          You&apos;ve done the hard part. After payment you&apos;ll unlock a
          full tax summary to review and approve before we file to HMRC.
        </p>
      </div>

      {/* HMRC Badge */}
      <div className="flex items-center gap-2 mb-8">
        <Award className="h-6 w-6 text-[#00c4d4]" />
        <span className="text-sm font-medium text-gray-700">
          HMRC Recognised Software
        </span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-10 max-w-lg">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-[#00e3ec] text-white rounded-full flex items-center justify-center text-sm font-medium">
            1
          </div>
          <span className="text-xs text-gray-600 mt-1">Pay securely</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
            2
          </div>
          <span className="text-xs text-gray-500 mt-1">Review summary</span>
        </div>
        <div className="flex-1 h-px bg-gray-300 mx-2" />
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm font-medium">
            3
          </div>
          <span className="text-xs text-gray-500 mt-1">Submit to HMRC</span>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {PRICING.plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const planPricing = calculatePrice(
            plan.id,
            appliedDiscount || undefined
          );

          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                'relative flex flex-col p-6 rounded-2xl border-2 text-left transition-all',
                isSelected
                  ? 'border-[#00e3ec] bg-[#e6fafb]/50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <span className="absolute -top-3 left-4 bg-[#00e3ec] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}

              {/* Selection Indicator */}
              <div
                className={cn(
                  'absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center',
                  isSelected
                    ? 'border-[#00e3ec] bg-[#00e3ec]'
                    : 'border-gray-300'
                )}
              >
                {isSelected && <Check className="h-4 w-4 text-white" />}
              </div>

              {/* Plan Name */}
              <h3 className="text-xl font-bold text-gray-900 mb-1 pr-8">
                {plan.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              {/* Price */}
              <div className="mb-4">
                {planPricing && planPricing.discountAmount > 0 ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(planPricing.finalPrice)}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      {formatCurrency(planPricing.originalPrice)}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(plan.price)}
                  </span>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-5 w-5 text-[#00e3ec] shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                <div
                  className={cn(
                    'w-full py-3 rounded-xl text-center font-medium transition-colors',
                    isSelected
                      ? 'bg-[#00e3ec] text-white'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Discount Code Section */}
      {!appliedDiscount ? (
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          {showDiscountInput ? (
            <div className="flex gap-3">
              <Input
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && applyDiscountCode()}
              />
              <Button variant="outline" onClick={applyDiscountCode}>
                Apply
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDiscountInput(false);
                  setDiscountCode('');
                  setDiscountError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowDiscountInput(true)}
              className="flex items-center gap-2 text-sm text-[#00c4d4] hover:text-[#00a8b0]"
            >
              <Tag className="h-4 w-4" />
              Have a discount code?
            </button>
          )}
          {discountError && (
            <p className="text-sm text-red-500 mt-2">{discountError}</p>
          )}
        </div>
      ) : (
        <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[#00a8b0]">
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
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {PRICING.plans.find((p) => p.id === selectedPlan)?.name}
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
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(pricing?.finalPrice || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
        <Shield className="h-4 w-4" />
        <span>
          You&apos;ll review your return before it&apos;s submitted to HMRC.
        </span>
      </div>

      {/* Pay Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] px-8 py-6 text-lg"
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
      <p className="text-center text-xs text-gray-400 mt-4">
        Secure payment powered by Stripe. We accept all major credit and debit
        cards.
      </p>
    </div>
  );
}
