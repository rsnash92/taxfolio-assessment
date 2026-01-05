'use client';

import { useState, useEffect } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import {
  Building2,
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Download,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BankAccount {
  account_id: string;
  display_name: string;
  account_type: string;
  provider_name: string;
}

export function AccountsStep() {
  const { data: wizardData, updateData, goNext } = useWizard();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bankName, setBankName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on mount - use saved accounts as fallback if cookie expired
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/truelayer/accounts');
        const apiData = await response.json();

        if (apiData.connected) {
          setAccounts(apiData.accounts);
          setBankName(apiData.bankName);
          // Select all accounts by default
          setSelectedAccounts(new Set(apiData.accounts.map((a: BankAccount) => a.account_id)));

          // Save accounts to wizard data for persistence
          updateData({
            bankAccounts: apiData.accounts,
            bankName: apiData.bankName,
          });
        } else if (wizardData.bankAccounts && wizardData.bankAccounts.length > 0) {
          // Use saved accounts from localStorage if cookie expired
          console.log('[AccountsStep] Using saved accounts from localStorage');
          setAccounts(wizardData.bankAccounts);
          setBankName(wizardData.bankName || 'Connected Bank');
          setSelectedAccounts(new Set(wizardData.bankAccounts.map((a) => a.account_id)));
        } else {
          setError(apiData.error || 'No bank connection found');
        }
      } catch {
        // Try to use saved accounts on error
        if (wizardData.bankAccounts && wizardData.bankAccounts.length > 0) {
          console.log('[AccountsStep] API error, using saved accounts');
          setAccounts(wizardData.bankAccounts);
          setBankName(wizardData.bankName || 'Connected Bank');
          setSelectedAccounts(new Set(wizardData.bankAccounts.map((a) => a.account_id)));
        } else {
          setError('Failed to fetch accounts');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId);
    } else {
      newSelected.add(accountId);
    }
    setSelectedAccounts(newSelected);
  };

  // Select/deselect all accounts
  const toggleAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map((a) => a.account_id)));
    }
  };

  // Import transactions from selected accounts
  const handleImport = async () => {
    if (selectedAccounts.size === 0) {
      setError('Please select at least one account to import from');
      return;
    }

    setIsImporting(true);
    setImportProgress('Connecting to bank...');
    setError(null);

    try {
      setImportProgress('Fetching transactions...');

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_ids: Array.from(selectedAccounts),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsImporting(false);
        return;
      }

      console.log('[AccountsStep] Imported', data.count, 'transactions');

      // Update wizard data with imported transactions
      updateData({
        bankImportData: {
          accountCount: data.accountCount,
          transactionCount: data.count,
          bankName: data.bankName || bankName,
        },
        transactions: data.transactions,
      });

      setImportProgress(`Imported ${data.count} transactions!`);

      // Brief delay to show success message
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Move to transactions step
      goNext();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00e3ec] mx-auto mb-4" />
          <p className="text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Connection Error
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Connected Accounts
        </h1>
        <p className="text-gray-600">
          We found {accounts.length} account{accounts.length !== 1 ? 's' : ''} from{' '}
          {bankName}. Select which accounts to import transactions from.
        </p>
      </div>

      {/* Bank Card */}
      <div className="bg-gradient-to-br from-[#00e3ec] to-[#00c4d4] rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{bankName}</h2>
            <p className="text-white/80 text-sm">
              Connected successfully
            </p>
          </div>
          <CheckCircle2 className="h-6 w-6 ml-auto" />
        </div>
      </div>

      {/* Account List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Select Accounts to Import</h3>
          <button
            onClick={toggleAll}
            className="text-sm text-[#00c4d4] hover:text-[#00a8b0] font-medium"
          >
            {selectedAccounts.size === accounts.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {accounts.map((account) => {
            const isSelected = selectedAccounts.has(account.account_id);
            return (
              <button
                key={account.account_id}
                onClick={() => toggleAccount(account.account_id)}
                className={cn(
                  'w-full p-4 flex items-center gap-4 text-left transition-colors',
                  isSelected ? 'bg-[#e6fafb]' : 'hover:bg-gray-50'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-[#ccf5f7]' : 'bg-gray-100'
                  )}
                >
                  <CreditCard
                    className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-[#00c4d4]' : 'text-gray-500'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      'font-medium',
                      isSelected ? 'text-[#004a4e]' : 'text-gray-900'
                    )}
                  >
                    {account.display_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {account.account_type === 'TRANSACTION'
                      ? 'Current Account'
                      : account.account_type}
                  </p>
                </div>
                {isSelected ? (
                  <CheckCircle2 className="h-6 w-6 text-[#00e3ec]" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Import Button */}
      <div className="mb-8">
        <Button
          onClick={handleImport}
          disabled={isImporting || selectedAccounts.size === 0}
          className={cn(
            'w-full h-14 text-lg font-medium',
            isImporting
              ? 'bg-[#ccf5f7] text-[#00a8b0]'
              : 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white'
          )}
        >
          {isImporting ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{importProgress}</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5" />
              <span>
                Import from {selectedAccounts.size} Account
                {selectedAccounts.size !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </Button>
        <p className="text-center text-sm text-gray-500 mt-3">
          We&apos;ll import transactions from the current tax year (6 April 2024 - 5 April 2025)
        </p>
      </div>

      <WizardNavigation canContinue={false} />
    </div>
  );
}
