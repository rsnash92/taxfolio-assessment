'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

export function SelfEmploymentLossesStep() {
  const { currentBusinessId, data, updateBusinessData } = useWizard();

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);
  const businessName = businessData.businessName || incomeSource?.label || 'My Business';

  const losses = businessData.losses || {
    broughtForward: 0,
    carriedForward: 0,
  };

  const handleChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    updateBusinessData(currentBusinessId, {
      losses: {
        ...losses,
        [field]: numValue,
      },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Business Losses
        </h1>
        <p className="text-gray-600">
          If your business made a loss in previous years, you can use it to reduce this year&apos;s tax bill. This applies to {businessName}.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900 mb-1">About Loss Relief</h3>
            <p className="text-sm text-amber-800">
              You can carry forward losses from previous tax years to offset against future profits.
              This reduces the amount of tax you pay. Losses must be used within 4 years of the end of
              the tax year in which the loss was made.
            </p>
          </div>
        </div>
      </div>

      {/* Loss Fields */}
      <div className="space-y-6">
        {/* Brought Forward */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <Label htmlFor="broughtForward" className="text-base font-medium">
                Losses Brought Forward
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Unused losses from previous tax years that you want to use this year
              </p>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  id="broughtForward"
                  type="number"
                  className="pl-7"
                  placeholder="0.00"
                  value={losses.broughtForward || ''}
                  onChange={(e) => handleChange('broughtForward', e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This should match the losses carried forward from your previous tax return
              </p>
            </div>
          </div>
        </div>

        {/* Carried Forward */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <Label htmlFor="carriedForward" className="text-base font-medium">
                Losses to Carry Forward
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                If you made a loss this year, enter the amount to carry forward to next year
              </p>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  id="carriedForward"
                  type="number"
                  className="pl-7"
                  placeholder="0.00"
                  value={losses.carriedForward || ''}
                  onChange={(e) => handleChange('carriedForward', e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This will be available to use against profits in future years
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {(losses.broughtForward > 0 || losses.carriedForward > 0) && (
        <div className="mt-6 bg-gray-50 rounded-xl p-4">
          <h3 className="font-medium text-gray-900 mb-3">Loss Summary</h3>
          <div className="space-y-2 text-sm">
            {losses.broughtForward > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Using from previous years</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(losses.broughtForward)}
                </span>
              </div>
            )}
            {losses.carriedForward > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Carrying forward to next year</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(losses.carriedForward)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <WizardNavigation canContinue={true} />
      </div>
    </div>
  );
}
