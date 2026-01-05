'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { HelpCircle, Info } from 'lucide-react';

export function PensionContributionsStep() {
  const { data, updateData, goNext } = useWizard();
  const existing = data.general?.pension;

  const [form, setForm] = useState({
    personalContributions: existing?.personalContributions || 0,
    oneOffContributions: existing?.oneOffContributions || 0,
    carryForwardUsed: existing?.carryForwardUsed || false,
    carryForwardAmount: existing?.carryForwardAmount || 0,
  });

  // Calculate tax relief preview
  const totalContributions =
    form.personalContributions + form.oneOffContributions;
  const basicRateRelief = totalContributions * 0.2; // Already in pension
  const higherRateRelief = totalContributions * 0.2; // Claimed via SA

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const handleContinue = () => {
    updateData({
      general: {
        ...data.general,
        pension: form,
      },
    });
    goNext();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
          2024/25 Tax Year
        </span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Pension Contributions
      </h1>
      <p className="text-gray-600 mb-8">
        Personal pension payments you made this tax year (not workplace pensions
        via your employer).
      </p>

      {/* How Relief Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How pension tax relief works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Basic rate (20%) is added to your pension automatically</li>
              <li>Higher/additional rate relief is claimed via Self Assessment</li>
              <li>Annual allowance is £60,000 (or 100% of earnings if lower)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Regular Contributions */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          Regular pension contributions
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </label>
        <p className="text-sm text-gray-500 mb-2">
          Total payments to personal pensions (SIPPs, etc.) during 2024/25.
          Enter the gross amount (before tax relief was added).
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            £
          </span>
          <Input
            type="number"
            value={form.personalContributions || ''}
            onChange={(e) =>
              setForm({
                ...form,
                personalContributions: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
            className="pl-7"
          />
        </div>
      </div>

      {/* One-off Contributions */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          One-off or lump sum contributions
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </label>
        <p className="text-sm text-gray-500 mb-2">
          Any additional lump sum payments made this year
        </p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            £
          </span>
          <Input
            type="number"
            value={form.oneOffContributions || ''}
            onChange={(e) =>
              setForm({
                ...form,
                oneOffContributions: parseFloat(e.target.value) || 0,
              })
            }
            placeholder="0.00"
            className="pl-7"
          />
        </div>
      </div>

      {/* Carry Forward */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.carryForwardUsed}
            onChange={(e) =>
              setForm({ ...form, carryForwardUsed: e.target.checked })
            }
            className="w-5 h-5 rounded border-gray-300 text-[#00e3ec] focus:ring-[#00e3ec]"
          />
          <div>
            <p className="font-medium text-gray-900">Use carry forward</p>
            <p className="text-sm text-gray-500">
              Use unused annual allowance from the previous 3 tax years
            </p>
          </div>
        </label>

        {form.carryForwardUsed && (
          <div className="mt-4 ml-8">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Carry forward amount being used
            </label>
            <div className="relative w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                type="number"
                value={form.carryForwardAmount || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    carryForwardAmount: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tax Relief Summary */}
      {totalContributions > 0 && (
        <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-[#006b70] mb-2">
            Estimated tax relief:
          </p>
          <div className="space-y-1 text-sm text-[#00a8b0]">
            <div className="flex justify-between">
              <span>Total contributions:</span>
              <span>{formatCurrency(totalContributions)}</span>
            </div>
            <div className="flex justify-between">
              <span>Basic rate relief (added to pension):</span>
              <span>{formatCurrency(basicRateRelief)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Higher rate relief (claimed via SA):</span>
              <span>{formatCurrency(higherRateRelief)}</span>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation canContinue={true} onContinue={handleContinue} />
    </div>
  );
}
