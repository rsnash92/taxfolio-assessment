'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Heart, Eye, Landmark, Gift, TrendingUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const RELIEF_OPTIONS = [
  {
    id: 'marriage-allowance',
    label: 'Marriage Allowance',
    description: 'Transfer £1,260 of personal allowance to your spouse or civil partner',
    icon: Heart,
    helpText:
      'You can transfer if you earn less than £12,570 and your partner is a basic rate taxpayer',
  },
  {
    id: 'blind-allowance',
    label: "Blind Person's Allowance",
    description: 'Claim an extra £3,070 tax-free allowance',
    icon: Eye,
    helpText: 'You must be registered as blind with your local authority',
  },
  {
    id: 'pension',
    label: 'Pension Contributions',
    description: 'Get tax relief on personal pension payments',
    icon: Landmark,
    helpText: 'Includes SIPPs, personal pensions, and one-off contributions',
  },
  {
    id: 'charitable',
    label: 'Charitable Giving',
    description: 'Claim higher rate relief on Gift Aid donations',
    icon: Gift,
    helpText: 'Donations to registered UK charities via Gift Aid',
  },
  {
    id: 'venture-capital',
    label: 'Venture Capital Schemes',
    description: 'EIS, SEIS, VCT investments for tax relief',
    icon: TrendingUp,
    helpText: 'Investments in qualifying startups and venture capital trusts',
  },
];

export function GeneralOverviewStep() {
  const { data, goNextWithData } = useWizard();
  const [selected, setSelected] = useState<string[]>(
    data.general?.selectedReliefs || []
  );

  const toggleRelief = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    // Use goNextWithData to ensure navigation uses the updated selectedReliefs
    goNextWithData({
      general: {
        ...data.general,
        selectedReliefs: selected,
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">General</h1>
        <p className="text-gray-600">Which of the following apply to you?</p>
        <p className="text-sm text-gray-500 mt-1">
          Click &apos;Next&apos; if none apply
        </p>
      </div>

      {/* Relief Options Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {RELIEF_OPTIONS.map((relief) => {
          const Icon = relief.icon;
          const isSelected = selected.includes(relief.id);

          return (
            <button
              key={relief.id}
              onClick={() => toggleRelief(relief.id)}
              className={cn(
                'relative flex flex-col items-start p-5 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-[#00e3ec] bg-[#e6fafb]'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {/* Checkmark */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-[#00e3ec] rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              {/* Icon */}
              <Icon
                className={cn(
                  'h-8 w-8 mb-3',
                  isSelected ? 'text-[#00c4d4]' : 'text-gray-400'
                )}
              />

              {/* Label */}
              <p
                className={cn(
                  'font-medium',
                  isSelected ? 'text-[#004a4e]' : 'text-gray-900'
                )}
              >
                {relief.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Summary */}
      {selected.length > 0 && (
        <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 mb-6">
          <p className="text-sm text-[#006b70]">
            <strong>{selected.length}</strong> relief
            {selected.length !== 1 ? 's' : ''} selected. You&apos;ll answer a
            few questions about each.
          </p>
        </div>
      )}

      <WizardNavigation
        canContinue={true}
        continueLabel={selected.length > 0 ? 'Continue' : 'Skip - None Apply'}
        onContinue={handleContinue}
      />
    </div>
  );
}
