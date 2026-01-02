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
  const { updateData, goNext } = useWizard();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [bankName, setBankName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/truelayer/accounts');
        const data = await response.json();

        if (data.connected) {
          setAccounts(data.accounts);
          setBankName(data.bankName);
        } else {
          setError(data.error || 'No bank connection found');
        }
      } catch {
        setError('Failed to fetch accounts');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  // Import transactions from all accounts
  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress('Connecting to bank...');
    setError(null);

    try {
      setImportProgress('Fetching transactions...');

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Import from all accounts
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
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
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
          {bankName}. Import transactions to categorise them for your tax return.
        </p>
      </div>

      {/* Bank Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{bankName}</h2>
            <p className="text-emerald-100 text-sm">
              Connected successfully
            </p>
          </div>
          <CheckCircle2 className="h-6 w-6 ml-auto" />
        </div>
      </div>

      {/* Account List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Accounts to Import</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {accounts.map((account) => (
            <div
              key={account.account_id}
              className="p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {account.display_name}
                </p>
                <p className="text-sm text-gray-500">
                  {account.account_type === 'TRANSACTION'
                    ? 'Current Account'
                    : account.account_type}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          ))}
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
          disabled={isImporting}
          className={cn(
            'w-full h-14 text-lg font-medium',
            isImporting
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
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
              <span>Import Transactions</span>
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
