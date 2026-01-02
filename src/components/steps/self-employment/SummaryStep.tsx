'use client';

import { useMemo, useCallback } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  PoundSterling,
  Briefcase,
  Receipt,
  Laptop,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function SelfEmploymentSummaryStep() {
  const { currentBusinessId, data, updateBusinessData, goToStep } = useWizard();

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);
  const businessName = businessData.businessName || incomeSource?.label || 'My Business';

  // Calculate totals
  const income = businessData.income?.total || 0;
  const expenses = businessData.expenses?.total || 0;
  const capitalAllowances = businessData.capitalAllowances?.total || 0;
  const lossesBroughtForward = businessData.losses?.broughtForward || 0;

  const grossProfit = income - expenses;
  const profit = grossProfit - capitalAllowances - lossesBroughtForward;

  // Update the profit in business data
  useMemo(() => {
    if (businessData.profit !== profit) {
      updateBusinessData(currentBusinessId, { profit });
    }
  }, [profit, businessData.profit, currentBusinessId, updateBusinessData]);

  // Handle save and continue - mark business as complete
  const handleSaveAndContinue = useCallback(() => {
    updateBusinessData(currentBusinessId, { isComplete: true });
    goToStep('self-employment-list');
  }, [currentBusinessId, updateBusinessData, goToStep]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const isProfit = profit > 0;
  const isLoss = profit < 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Business Summary
        </h1>
        <p className="text-gray-600">
          Here&apos;s a summary of {businessName} for the 2024-25 tax year.
        </p>
      </div>

      {/* Profit/Loss Card */}
      <div
        className={cn(
          'rounded-xl p-6 mb-6 text-white',
          isProfit
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            : isLoss
            ? 'bg-gradient-to-br from-red-500 to-red-600'
            : 'bg-gradient-to-br from-gray-500 to-gray-600'
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            {isProfit ? (
              <TrendingUp className="h-6 w-6" />
            ) : isLoss ? (
              <TrendingDown className="h-6 w-6" />
            ) : (
              <Minus className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-white/80 text-sm">
              {isProfit ? 'Net Profit' : isLoss ? 'Net Loss' : 'Break Even'}
            </p>
            <p className="text-3xl font-bold">{formatCurrency(Math.abs(profit))}</p>
          </div>
        </div>
        {isProfit && (
          <p className="text-white/80 text-sm">
            This amount will be added to your taxable income
          </p>
        )}
        {isLoss && (
          <p className="text-white/80 text-sm">
            You can carry this loss forward to offset future profits
          </p>
        )}
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Profit Calculation</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Income */}
          <SummaryRow
            icon={PoundSterling}
            label="Total Income"
            amount={income}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            amountColor="text-emerald-600"
          />

          {/* Expenses */}
          <SummaryRow
            icon={Receipt}
            label="Total Expenses"
            amount={-expenses}
            iconBg="bg-red-100"
            iconColor="text-red-600"
            amountColor="text-red-600"
            isNegative
          />

          {/* Gross Profit */}
          <div className="p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Gross Profit</span>
              <span className={cn('font-semibold', grossProfit >= 0 ? 'text-gray-900' : 'text-red-600')}>
                {formatCurrency(grossProfit)}
              </span>
            </div>
          </div>

          {/* Capital Allowances */}
          {capitalAllowances > 0 && (
            <SummaryRow
              icon={Laptop}
              label="Capital Allowances"
              amount={-capitalAllowances}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              amountColor="text-blue-600"
              isNegative
            />
          )}

          {/* Losses */}
          {lossesBroughtForward > 0 && (
            <SummaryRow
              icon={AlertTriangle}
              label="Losses Brought Forward"
              amount={-lossesBroughtForward}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              amountColor="text-amber-600"
              isNegative
            />
          )}

          {/* Net Profit */}
          <div className={cn(
            'p-4',
            isProfit ? 'bg-emerald-50' : isLoss ? 'bg-red-50' : 'bg-gray-50'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className={cn(
                  'h-5 w-5',
                  isProfit ? 'text-emerald-600' : isLoss ? 'text-red-600' : 'text-gray-600'
                )} />
                <span className="font-medium text-gray-900">
                  Net {isProfit ? 'Profit' : isLoss ? 'Loss' : 'Result'}
                </span>
              </div>
              <span className={cn(
                'text-lg font-bold',
                isProfit ? 'text-emerald-600' : isLoss ? 'text-red-600' : 'text-gray-600'
              )}>
                {formatCurrency(Math.abs(profit))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Business Details</h3>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Business Name</span>
            <span className="font-medium text-gray-900">{businessName}</span>
          </div>
          {businessData.businessDescription && (
            <div className="flex justify-between">
              <span className="text-gray-500">Nature of Business</span>
              <span className="font-medium text-gray-900 text-right max-w-[60%]">
                {businessData.businessDescription}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Accounting Method</span>
            <span className="font-medium text-gray-900">
              {businessData.accountingMethod === 'cash' ? 'Cash Basis' : 'Traditional (Accruals)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Accounting Period</span>
            <span className="font-medium text-gray-900">
              {businessData.startDate || '6 Apr 2024'} to {businessData.endDate || '5 Apr 2025'}
            </span>
          </div>
        </div>
      </div>

      {/* Completion Status */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <div>
            <p className="font-medium text-emerald-900">
              Self-employment section complete
            </p>
            <p className="text-sm text-emerald-700">
              This business is ready for your tax return
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        canContinue={true}
        continueLabel="Save & Continue"
        onContinue={handleSaveAndContinue}
        showCheckmark={true}
      />
    </div>
  );
}

// Summary Row Component
function SummaryRow({
  icon: Icon,
  label,
  amount,
  iconBg,
  iconColor,
  amountColor,
  isNegative,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  amount: number;
  iconBg: string;
  iconColor: string;
  amountColor: string;
  isNegative?: boolean;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(Math.abs(value));
  };

  return (
    <div className="p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBg)}>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </div>
      <div className="flex-1">
        <span className="text-gray-700">{label}</span>
      </div>
      <span className={cn('font-semibold', amountColor)}>
        {isNegative ? '-' : ''}{formatCurrency(amount)}
      </span>
    </div>
  );
}
