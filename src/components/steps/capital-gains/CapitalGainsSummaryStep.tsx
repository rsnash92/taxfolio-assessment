'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Info, Check } from 'lucide-react';

const ANNUAL_EXEMPT_AMOUNT = 3000; // 2024/25

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function CapitalGainsSummaryStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const capitalGains = data.capitalGainsData || {};
  const totalGains = capitalGains.totalGains || 0;
  const totalLosses = capitalGains.totalLosses || 0;
  const lossesFromPreviousYears = capitalGains.lossesFromPreviousYears || 0;

  // Calculate taxable gains
  const netGains = totalGains - totalLosses - lossesFromPreviousYears;
  const taxableGains = Math.max(0, netGains - ANNUAL_EXEMPT_AMOUNT);

  // Check if any disposals are residential property
  const hasResidentialProperty = capitalGains.disposals?.some(
    (d) => d.assetType === 'property'
  );

  const handleUpdate = (field: string, value: number) => {
    updateData({
      capitalGainsData: {
        ...capitalGains,
        [field]: value,
      },
    });
  };

  const handleContinue = () => {
    updateData({
      capitalGainsData: {
        ...capitalGains,
        taxableGains,
        annualExemptAmount: ANNUAL_EXEMPT_AMOUNT,
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Capital Gains Summary
          </h1>
        </div>
        <p className="text-gray-600">
          Review your capital gains calculation.
        </p>
      </div>

      {/* Gains from Disposals */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Gains from Disposals
        </h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              Total gains ({capitalGains.disposals?.length || 0} disposals)
            </span>
            <span className="font-medium text-[#00c4d4]">
              {formatCurrency(totalGains)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total losses</span>
            <span className="font-medium text-red-500">
              -{formatCurrency(totalLosses)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="font-medium">Net gains/losses this year</span>
            <span
              className={`font-medium ${
                totalGains - totalLosses >= 0
                  ? 'text-[#00c4d4]'
                  : 'text-red-500'
              }`}
            >
              {formatCurrency(totalGains - totalLosses)}
            </span>
          </div>
        </div>
      </div>

      {/* Losses Brought Forward */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Losses from Previous Years
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          If you have unused capital losses from previous tax years, you can use
          them to offset this year&apos;s gains.
        </p>

        <div className="grid gap-2 max-w-xs">
          <Label htmlFor="lossesFromPreviousYears">
            Losses brought forward
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="lossesFromPreviousYears"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={lossesFromPreviousYears || ''}
              onChange={(e) =>
                handleUpdate(
                  'lossesFromPreviousYears',
                  parseFloat(e.target.value) || 0
                )
              }
            />
          </div>
        </div>
      </div>

      {/* Tax Calculation */}
      <div className="bg-gray-900 text-white rounded-xl p-6">
        <h3 className="font-semibold mb-4">Capital Gains Tax Calculation</h3>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Net gains this year</span>
            <span>{formatCurrency(totalGains - totalLosses)}</span>
          </div>
          {lossesFromPreviousYears > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Less: Losses brought forward</span>
              <span className="text-red-400">
                -{formatCurrency(lossesFromPreviousYears)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-300">Less: Annual Exempt Amount</span>
            <span className="text-[#33e9f0]">
              -{formatCurrency(Math.min(ANNUAL_EXEMPT_AMOUNT, Math.max(0, netGains)))}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-700">
            <span className="font-medium">Taxable gains</span>
            <span className="font-bold text-xl">
              {formatCurrency(taxableGains)}
            </span>
          </div>
        </div>

        {taxableGains === 0 && netGains <= ANNUAL_EXEMPT_AMOUNT && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-2 text-[#33e9f0]">
            <Check className="h-5 w-5" />
            <span className="text-sm">
              No Capital Gains Tax due - gains within annual exempt amount
            </span>
          </div>
        )}
      </div>

      {/* Tax Rates Info */}
      {taxableGains > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Tax Rates (2024/25)</p>
            {hasResidentialProperty ? (
              <p>
                Residential property gains: 18% (basic rate) or 24% (higher rate).
                Other gains: 10% (basic rate) or 20% (higher rate).
              </p>
            ) : (
              <p>
                10% if you&apos;re a basic rate taxpayer, or 20% if you&apos;re a
                higher/additional rate taxpayer.
              </p>
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
            className="bg-[#00e3ec] hover:bg-[#00c4d4]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
