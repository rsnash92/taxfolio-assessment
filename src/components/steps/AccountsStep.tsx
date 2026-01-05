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
  AlertTriangle,
  X,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface BankAccount {
  account_id: string;
  display_name: string;
  account_type: string;
  provider_name: string;
}

export function AccountsStep() {
  const { data: wizardData, updateData, goNext, saveProgress } = useWizard();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [bankName, setBankName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [pendingDeselect, setPendingDeselect] = useState<BankAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false); // True if live TrueLayer connection
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Get transaction counts per account
  const transactionsByAccount = useMemo(() => {
    const counts: Record<string, number> = {};
    if (wizardData.transactions) {
      for (const tx of wizardData.transactions) {
        if (tx.accountId) {
          counts[tx.accountId] = (counts[tx.accountId] || 0) + 1;
        }
      }
    }
    return counts;
  }, [wizardData.transactions]);

  // Fetch accounts on mount - use saved accounts as fallback if cookie expired
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/truelayer/accounts');
        const apiData = await response.json();

        if (apiData.connected) {
          setAccounts(apiData.accounts);
          setBankName(apiData.bankName);
          setIsConnected(true); // Live connection

          // Restore previously selected accounts, or select all by default
          if (wizardData.selectedAccountIds && wizardData.selectedAccountIds.length > 0) {
            setSelectedAccounts(new Set(wizardData.selectedAccountIds));
          } else {
            setSelectedAccounts(new Set(apiData.accounts.map((a: BankAccount) => a.account_id)));
          }
          setError(null); // Clear any previous error

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
          setIsConnected(false); // Using cached data, connection expired

          // Restore previously selected accounts, or select all by default
          if (wizardData.selectedAccountIds && wizardData.selectedAccountIds.length > 0) {
            setSelectedAccounts(new Set(wizardData.selectedAccountIds));
          } else {
            setSelectedAccounts(new Set(wizardData.bankAccounts.map((a) => a.account_id)));
          }
          setError(null); // Clear any previous error - we have valid saved accounts
        } else {
          setError(apiData.error || 'No bank connection found');
        }
      } catch {
        // Try to use saved accounts on error
        if (wizardData.bankAccounts && wizardData.bankAccounts.length > 0) {
          console.log('[AccountsStep] API error, using saved accounts');
          setAccounts(wizardData.bankAccounts);
          setBankName(wizardData.bankName || 'Connected Bank');
          setIsConnected(false); // Using cached data

          // Restore previously selected accounts, or select all by default
          if (wizardData.selectedAccountIds && wizardData.selectedAccountIds.length > 0) {
            setSelectedAccounts(new Set(wizardData.selectedAccountIds));
          } else {
            setSelectedAccounts(new Set(wizardData.bankAccounts.map((a) => a.account_id)));
          }
          setError(null); // Clear any previous error - we have valid saved accounts
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
  const toggleAccount = (account: BankAccount) => {
    const accountId = account.account_id;
    const isCurrentlySelected = selectedAccounts.has(accountId);

    // If deselecting and account has transactions, show confirmation
    if (isCurrentlySelected && transactionsByAccount[accountId] > 0) {
      setPendingDeselect(account);
      return;
    }

    const newSelected = new Set(selectedAccounts);
    if (isCurrentlySelected) {
      newSelected.delete(accountId);
    } else {
      newSelected.add(accountId);
    }
    setSelectedAccounts(newSelected);
    // Persist selection to wizard data
    updateData({ selectedAccountIds: Array.from(newSelected) });
  };

  // Confirm deselection and remove transactions
  const confirmDeselect = () => {
    if (!pendingDeselect) return;

    const accountId = pendingDeselect.account_id;

    // Remove transactions from this account
    const filteredTransactions = wizardData.transactions?.filter(
      (tx) => tx.accountId !== accountId
    ) || [];

    // Deselect the account
    const newSelected = new Set(selectedAccounts);
    newSelected.delete(accountId);
    setSelectedAccounts(newSelected);

    // Persist both transaction removal and selection change
    updateData({
      transactions: filteredTransactions,
      selectedAccountIds: Array.from(newSelected),
    });

    setPendingDeselect(null);
  };

  // Cancel deselection
  const cancelDeselect = () => {
    setPendingDeselect(null);
  };

  // Select/deselect all accounts
  const toggleAll = () => {
    if (selectedAccounts.size === accounts.length) {
      // Check if any selected accounts have transactions
      const accountsWithTransactions = accounts.filter(
        (a) => transactionsByAccount[a.account_id] > 0
      );
      if (accountsWithTransactions.length > 0) {
        // Show modal for first account with transactions
        setPendingDeselect(accountsWithTransactions[0]);
        return;
      }
      setSelectedAccounts(new Set());
      updateData({ selectedAccountIds: [] });
    } else {
      const allIds = accounts.map((a) => a.account_id);
      setSelectedAccounts(new Set(allIds));
      updateData({ selectedAccountIds: allIds });
    }
  };

  // Reconnect to bank
  const handleReconnect = async () => {
    setIsReconnecting(true);
    setError(null);

    try {
      await saveProgress();
      const response = await fetch('/api/truelayer/connect', { method: 'POST' });
      const result = await response.json();

      if (result.error) {
        setError('Failed to reconnect. Please try again.');
        setIsReconnecting(false);
        return;
      }

      window.location.href = result.authUrl;
    } catch (err) {
      console.error('Reconnect error:', err);
      setError('Failed to reconnect. Please try again.');
      setIsReconnecting(false);
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
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
            <Building2 className="h-6 w-6 text-[#00e3ec]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{bankName}</h2>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="text-green-400 text-sm">Connected</p>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <p className="text-amber-400 text-sm">Session expired</p>
                </>
              )}
            </div>
          </div>
          {isConnected ? (
            <CheckCircle2 className="h-6 w-6 text-[#00e3ec]" />
          ) : (
            <Button
              onClick={handleReconnect}
              disabled={isReconnecting}
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-0"
            >
              {isReconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <WifiOff className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Bank session expired</p>
              <p className="text-sm text-amber-700 mt-1">
                Your bank connection has expired. Reconnect to import new transactions, or continue with your existing data.
              </p>
            </div>
          </div>
        </div>
      )}

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
            const txCount = transactionsByAccount[account.account_id] || 0;
            return (
              <button
                key={account.account_id}
                onClick={() => toggleAccount(account)}
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
                    {txCount > 0 && (
                      <span className="ml-2 text-[#00a8b0]">
                        • {txCount} transaction{txCount !== 1 ? 's' : ''} imported
                      </span>
                    )}
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

      {/* Confirmation Modal for Removing Account with Transactions */}
      {pendingDeselect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <button
                onClick={cancelDeselect}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Remove account?
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>{pendingDeselect.display_name}</strong> has{' '}
              <strong>{transactionsByAccount[pendingDeselect.account_id]}</strong>{' '}
              imported transaction{transactionsByAccount[pendingDeselect.account_id] !== 1 ? 's' : ''}.
              Removing this account will delete all associated transactions.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800">
                This action cannot be undone. You&apos;ll need to re-import transactions if you want them back.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelDeselect}
                className="flex-1"
              >
                Keep Account
              </Button>
              <Button
                onClick={confirmDeselect}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Remove & Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
