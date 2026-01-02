'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Building2, Upload, Edit3, Loader2 } from 'lucide-react';
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
  const { data, updateData, goNext, saveProgress } = useWizard();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (method: 'bank' | 'upload' | 'manual') => {
    updateData({ connectionMethod: method });
    setError(null);
  };

  const handleContinue = async () => {
    if (data.connectionMethod === 'bank') {
      setIsConnecting(true);
      setError(null);

      try {
        // Save progress before redirecting
        await saveProgress();

        // Get TrueLayer auth URL
        const response = await fetch('/api/truelayer/connect', {
          method: 'POST',
        });

        const result = await response.json();

        if (result.error) {
          setError('Failed to connect to bank. Please try again.');
          setIsConnecting(false);
          return;
        }

        // Redirect to TrueLayer
        window.location.href = result.authUrl;
      } catch (err) {
        console.error('Bank connection error:', err);
        setError('Failed to connect. Please try again.');
        setIsConnecting(false);
      }
    } else if (data.connectionMethod === 'manual') {
      // Skip bank connection and transactions, go to first income section
      goNext();
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

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
              disabled={isConnecting}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white',
                isConnecting && 'opacity-50 cursor-not-allowed'
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

      {/* Connecting State */}
      {isConnecting && (
        <div className="flex items-center justify-center gap-3 py-4 mb-8">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          <span className="text-gray-600">Connecting to your bank...</span>
        </div>
      )}

      <WizardNavigation
        canContinue={data.connectionMethod !== null && !isConnecting}
        onContinue={handleContinue}
        continueLabel={
          data.connectionMethod === 'bank' ? 'Connect Bank' : 'Continue'
        }
      />
    </div>
  );
}
