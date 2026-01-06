'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Heart, Info, AlertTriangle } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

const TAXABLE_BENEFITS = [
  {
    id: 'jobseekersAllowance',
    label: "Jobseeker's Allowance (JSA)",
    description: 'Contribution-based JSA only',
  },
  {
    id: 'employmentSupportAllowance',
    label: 'Employment & Support Allowance (ESA)',
    description: 'Contribution-based ESA only',
  },
  {
    id: 'carersAllowance',
    label: "Carer's Allowance",
    description: 'If you care for someone at least 35 hours a week',
  },
  {
    id: 'bereavementAllowance',
    label: 'Bereavement Allowance',
    description: 'Widowed Parent\'s Allowance or Bereavement Support Payment (taxable part)',
  },
  {
    id: 'incapacityBenefit',
    label: 'Incapacity Benefit',
    description: 'If you still receive this legacy benefit',
  },
];

export function StateBenefitsStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const benefitsData = data.stateBenefitsData || {
    hasHighIncomeChildBenefit: false,
    totalTaxableBenefits: 0,
  };

  // Calculate HICBC (High Income Child Benefit Charge)
  // Charge starts at £60,000 and you lose 1% for every £200 over
  // Full charge at £80,000 (100% clawback)
  const calculateHICBC = (income: number, childBenefitReceived: number) => {
    if (income <= 60000) return 0;
    if (income >= 80000) return childBenefitReceived;
    const percentageToRepay = Math.min(100, ((income - 60000) / 200));
    return (childBenefitReceived * percentageToRepay) / 100;
  };

  // Get total income for HICBC calculation (simplified - would need full calculation in real app)
  const estimatedIncome =
    (data.taxCalculation?.totalIncome || 0) +
    Object.values(data.employmentData || {}).reduce(
      (sum, emp) => sum + (emp.payReceived || 0),
      0
    );

  const childBenefitCharge = calculateHICBC(
    estimatedIncome,
    benefitsData.childBenefitReceived || 0
  );

  // Calculate total taxable benefits
  const taxableBenefitTotal = TAXABLE_BENEFITS.reduce(
    (sum, benefit) =>
      sum + ((benefitsData as Record<string, number>)[benefit.id] || 0),
    0
  );

  const handleBenefitUpdate = (field: string, value: number) => {
    const newData = {
      ...benefitsData,
      [field]: value,
    };

    // Recalculate total
    const newTotal = TAXABLE_BENEFITS.reduce(
      (sum, benefit) =>
        sum + ((newData as Record<string, number>)[benefit.id] || 0),
      0
    );

    updateData({
      stateBenefitsData: {
        ...newData,
        totalTaxableBenefits: newTotal,
      },
    });
  };

  const handleHICBCToggle = (checked: boolean) => {
    updateData({
      stateBenefitsData: {
        ...benefitsData,
        hasHighIncomeChildBenefit: checked,
        childBenefitReceived: checked ? benefitsData.childBenefitReceived : 0,
        childBenefitCharge: checked ? childBenefitCharge : 0,
      },
    });
  };

  const handleChildBenefitUpdate = (value: number) => {
    const charge = calculateHICBC(estimatedIncome, value);
    updateData({
      stateBenefitsData: {
        ...benefitsData,
        childBenefitReceived: value,
        childBenefitCharge: charge,
      },
    });
  };

  const handleContinue = () => {
    updateData({
      stateBenefitsData: {
        ...benefitsData,
        totalTaxableBenefits: taxableBenefitTotal,
        childBenefitCharge,
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#e6fafb] rounded-lg flex items-center justify-center">
            <Heart className="h-5 w-5 text-[#00c4d4]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">State Benefits</h1>
        </div>
        <p className="text-gray-600">
          Enter any taxable state benefits you received during the tax year.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#00c4d4] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#00858c]">
          <p className="font-medium mb-1">Most Benefits Are Not Taxable</p>
          <p>
            Benefits like Universal Credit, Housing Benefit, Personal Independence
            Payment (PIP), and Child Benefit are not taxable and don&apos;t need to
            be reported here (unless you&apos;re affected by the High Income Child
            Benefit Charge).
          </p>
        </div>
      </div>

      {/* Taxable Benefits */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Taxable State Benefits
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Only enter benefits where you received a P60 or similar document
          showing the taxable amount.
        </p>

        <div className="space-y-6">
          {TAXABLE_BENEFITS.map((benefit) => (
            <div key={benefit.id} className="space-y-2">
              <Label htmlFor={benefit.id}>{benefit.label}</Label>
              <p className="text-xs text-gray-500">{benefit.description}</p>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id={benefit.id}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={
                    (benefitsData as Record<string, number>)[benefit.id] || ''
                  }
                  onChange={(e) =>
                    handleBenefitUpdate(
                      benefit.id,
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High Income Child Benefit Charge */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              High Income Child Benefit Charge
            </h2>
            <p className="text-sm text-gray-500">
              If you or your partner earned over £60,000 and received Child Benefit
            </p>
          </div>
          <Switch
            checked={benefitsData.hasHighIncomeChildBenefit || false}
            onCheckedChange={handleHICBCToggle}
          />
        </div>

        {benefitsData.hasHighIncomeChildBenefit && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Income-based charge</p>
                <p>
                  If your income is between £60,000 and £80,000, you&apos;ll need
                  to repay a percentage of Child Benefit received. At £80,000+,
                  you repay 100%.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="childBenefitReceived">
                Total Child Benefit Received This Year
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="childBenefitReceived"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={benefitsData.childBenefitReceived || ''}
                  onChange={(e) =>
                    handleChildBenefitUpdate(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <p className="text-xs text-gray-500">
                2024/25 rates: £25.60/week for eldest child, £16.95/week for
                additional children
              </p>
            </div>

            {(benefitsData.childBenefitReceived || 0) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-red-800">
                      High Income Child Benefit Charge
                    </p>
                    <p className="text-sm text-red-600">
                      Based on estimated income of{' '}
                      {formatCurrency(estimatedIncome)}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(childBenefitCharge)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {(taxableBenefitTotal > 0 || childBenefitCharge > 0) && (
        <div className="bg-gray-900 text-white rounded-xl p-6">
          <h3 className="font-semibold mb-4">State Benefits Summary</h3>

          <div className="space-y-3 text-sm">
            {TAXABLE_BENEFITS.map((benefit) => {
              const amount =
                (benefitsData as Record<string, number>)[benefit.id] || 0;
              if (amount === 0) return null;
              return (
                <div key={benefit.id} className="flex justify-between">
                  <span className="text-gray-300">{benefit.label}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              );
            })}

            {taxableBenefitTotal > 0 && (
              <div className="flex justify-between pt-3 border-t border-gray-700">
                <span className="font-medium">Total Taxable Benefits</span>
                <span className="font-bold">
                  {formatCurrency(taxableBenefitTotal)}
                </span>
              </div>
            )}

            {childBenefitCharge > 0 && (
              <div className="flex justify-between text-red-400 pt-3 border-t border-gray-700">
                <span>High Income Child Benefit Charge</span>
                <span className="font-bold">
                  {formatCurrency(childBenefitCharge)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        {canGoBack && (
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
        )}
        <div className="ml-auto">
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
