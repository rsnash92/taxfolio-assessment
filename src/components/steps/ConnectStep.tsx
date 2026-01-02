'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Building2, Upload, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONNECTION_OPTIONS = [
  {
    id: 'bank',
    label: 'Connect your bank',
    description: 'Securely link your business accounts for automatic import',
    icon: Building2,
    recommended: true,
  },
  {
    id: 'upload',
    label: 'Upload statements',
    description: 'Upload PDF or CSV bank statements',
    icon: Upload,
  },
  {
    id: 'manual',
    label: 'Enter manually',
    description: "I'll add my income and expenses by hand",
    icon: Edit3,
  },
];

export function ConnectStep() {
  const { data, updateData, goNext } = useWizard();

  const handleSelect = (method: 'bank' | 'upload' | 'manual') => {
    updateData({ connectionMethod: method });
  };

  const handleContinue = () => {
    if (data.connectionMethod === 'manual') {
      // Skip bank connection and transactions, go to first income section
      if (data.incomeSources.some((s) => s.type === 'self-employment')) {
        goNext(); // Will go to self-employment based on step conditions
      } else if (data.incomeSources.some((s) => s.type === 'rental')) {
        goNext();
      } else {
        goNext();
      }
    } else {
      goNext();
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          How would you like to add your data?
        </h1>
        <p className="text-gray-600">
          Choose how you&apos;d like to import your business transactions. You
          can always add more data later.
        </p>
      </div>

      {/* Connection Options */}
      <div className="space-y-3 mb-8">
        {CONNECTION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = data.connectionMethod === option.id;

          return (
            <button
              key={option.id}
              onClick={() =>
                handleSelect(option.id as 'bank' | 'upload' | 'manual')
              }
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  isSelected ? 'bg-emerald-500' : 'bg-gray-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6',
                    isSelected ? 'text-white' : 'text-gray-500'
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{option.label}</p>
                  {option.recommended && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-emerald-500' : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info about bank connection */}
      {data.connectionMethod === 'bank' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-blue-800">
            <strong>Secure connection:</strong> We use Open Banking to securely
            connect to your bank. We can only read your transactions - we can
            never move money or make changes to your accounts.
          </p>
        </div>
      )}

      <WizardNavigation
        canContinue={data.connectionMethod !== null}
        onContinue={handleContinue}
      />
    </div>
  );
}
