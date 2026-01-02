'use client';

import { useState, useEffect } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  Building2,
  Upload,
  Edit3,
  Loader2,
  CheckCircle2,
  CreditCard,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BankAccount {
  account_id: string;
  display_name: string;
  account_type: string;
  provider_name: string;
}

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
  const { data, updateData, goNext, goToStep, saveProgress } = useWizard();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<BankAccount[]>([]);
  const [bankName, setBankName] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Fetch connected accounts if bank is connected
  useEffect(() => {
    if (data.bankConnected) {
      setIsLoadingAccounts(true);
      fetch('/api/truelayer/accounts')
        .then((res) => res.json())
        .then((result) => {
          if (result.connected) {
            setConnectedAccounts(result.accounts);
            setBankName(result.bankName);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingAccounts(false));
    }
  }, [data.bankConnected]);

  const handleSelect = (method: 'bank' | 'upload' | 'manual') => {
    updateData({ connectionMethod: method });
    setError(null);
  };

  const handleConnectBank = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await saveProgress();
      const response = await fetch('/api/truelayer/connect', { method: 'POST' });
      const result = await response.json();

      if (result.error) {
        setError('Failed to connect to bank. Please try again.');
        setIsConnecting(false);
        return;
      }

      window.location.href = result.authUrl;
    } catch (err) {
      console.error('Bank connection error:', err);
      setError('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleContinue = async () => {
    if (data.connectionMethod === 'bank' && !data.bankConnected) {
      await handleConnectBank();
    } else if (data.connectionMethod === 'manual') {
      goNext();
    } else {
      goNext();
    }
  };

  const handleGoToAccounts = () => {
    goToStep('accounts');
  };

  // If bank is connected, show connected state
  if (data.bankConnected && connectedAccounts.length > 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Your Connected Accounts
          </h1>
          <p className="text-gray-600">
            You&apos;ve connected your bank. You can import transactions or add
            another bank.
          </p>
        </div>

        {/* Connected Bank Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{bankName}</h2>
              <p className="text-emerald-100 text-sm">
                {connectedAccounts.length} account
                {connectedAccounts.length !== 1 ? 's' : ''} connected
              </p>
            </div>
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Account List Preview */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Connected Accounts</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {connectedAccounts.slice(0, 3).map((account) => (
              <div key={account.account_id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{account.display_name}</p>
                  <p className="text-sm text-gray-500">
                    {account.account_type === 'TRANSACTION'
                      ? 'Current Account'
                      : account.account_type}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ))}
            {connectedAccounts.length > 3 && (
              <div className="p-4 text-center text-sm text-gray-500">
                +{connectedAccounts.length - 3} more account
                {connectedAccounts.length - 3 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <Button
            onClick={handleGoToAccounts}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <span>Import Transactions</span>
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>

          <Button
            onClick={handleConnectBank}
            variant="outline"
            disabled={isConnecting}
            className="w-full h-12"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Add Another Bank
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <WizardNavigation canContinue={true} />
      </div>
    );
  }

  // Loading state while fetching accounts
  if (data.bankConnected && isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading connected accounts...</p>
        </div>
      </div>
    );
  }

  // Default: show connection options
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
