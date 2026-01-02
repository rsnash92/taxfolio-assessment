'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { CheckCircle2, Globe, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResidencyStep() {
  const { data, updateData, goNext, goToStep } = useWizard();
  const [selected, setSelected] = useState<boolean | null>(data.isUKResident);

  const handleSelect = (isResident: boolean) => {
    setSelected(isResident);
    updateData({ isUKResident: isResident });
  };

  const handleContinue = () => {
    if (selected === true) {
      goNext();
    } else {
      goToStep('not-supported');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-2">Quick check before we start</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          TaxFolio is designed for UK residents with UK income.
        </h1>
        <p className="text-gray-600">
          Were you a UK resident for the full 2024/25 tax year?
          <span className="text-gray-400 ml-1">(6 April 2024 - 5 April 2025)</span>
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-8">
        {/* Yes option */}
        <button
          onClick={() => handleSelect(true)}
          className={cn(
            'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
            selected === true
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          )}
        >
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              selected === true ? 'bg-emerald-500' : 'bg-gray-100'
            )}
          >
            <CheckCircle2
              className={cn(
                'h-5 w-5',
                selected === true ? 'text-white' : 'text-gray-400'
              )}
            />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              Yes, I lived in the UK the whole year
            </p>
            <p className="text-sm text-gray-500">
              I was a UK resident for the full tax year
            </p>
          </div>
        </button>

        {/* No option */}
        <button
          onClick={() => handleSelect(false)}
          className={cn(
            'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
            selected === false
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          )}
        >
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              selected === false ? 'bg-amber-500' : 'bg-gray-100'
            )}
          >
            <Globe
              className={cn(
                'h-5 w-5',
                selected === false ? 'text-white' : 'text-gray-400'
              )}
            />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              No, I lived abroad or moved during the year
            </p>
            <p className="text-sm text-gray-500">
              I left/arrived in the UK, or had foreign income
            </p>
          </div>
        </button>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-800 font-medium">Why do we ask this?</p>
            <p className="text-blue-600">
              If you lived abroad or moved during the tax year, you may need form
              SA109 (Residence). TaxFolio currently supports UK residents with UK
              income only.
            </p>
          </div>
        </div>
      </div>

      <WizardNavigation
        canContinue={selected !== null}
        onContinue={handleContinue}
        showBack={false}
      />
    </div>
  );
}
