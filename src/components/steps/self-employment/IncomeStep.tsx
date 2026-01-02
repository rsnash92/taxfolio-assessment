'use client';

import { useState, useMemo } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PoundSterling,
  Plus,
  Trash2,
  Building2,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/wizard';

export function SelfEmploymentIncomeStep() {
  const {
    currentBusinessId,
    data,
    updateBusinessData,
    updateTransaction,
    bulkUpdateTransactions,
  } = useWizard();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [expandedTransactions, setExpandedTransactions] = useState(true);

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);
  const businessName = businessData.businessName || incomeSource?.label || 'My Business';

  // Get income transactions for this business
  const incomeTransactions = useMemo(() => {
    return data.transactions.filter(
      (t) =>
        t.type === 'income' &&
        t.status === 'business' &&
        (t.businessId === currentBusinessId || !t.businessId)
    );
  }, [data.transactions, currentBusinessId]);

  // Transactions that need to be assigned to this business
  const unassignedIncomeTransactions = useMemo(() => {
    return data.transactions.filter(
      (t) =>
        t.type === 'income' &&
        t.status === 'business' &&
        !t.businessId
    );
  }, [data.transactions]);

  // Calculate totals
  const transactionTotal = useMemo(() => {
    return incomeTransactions
      .filter((t) => t.businessId === currentBusinessId)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [incomeTransactions, currentBusinessId]);

  const manualEntries = businessData.income?.manual || [];
  const manualTotal = manualEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = transactionTotal + manualTotal;

  // Update business income data when totals change
  const updateIncomeTotals = (newManualEntries?: Array<{ description: string; amount: number }>) => {
    const entries = newManualEntries || manualEntries;
    const newManualTotal = entries.reduce((sum, e) => sum + e.amount, 0);

    updateBusinessData(currentBusinessId, {
      income: {
        fromTransactions: transactionTotal,
        manual: entries,
        total: transactionTotal + newManualTotal,
      },
    });
  };

  // Assign transaction to this business
  const assignTransaction = (transactionId: string) => {
    updateTransaction(transactionId, { businessId: currentBusinessId });
  };

  // Assign all unassigned transactions
  const assignAllTransactions = () => {
    const ids = unassignedIncomeTransactions.map((t) => t.id);
    bulkUpdateTransactions(ids, { businessId: currentBusinessId });
  };

  // Add manual income entry
  const addManualEntry = () => {
    if (!manualDescription || !manualAmount) return;

    const newEntries = [
      ...manualEntries,
      { description: manualDescription, amount: parseFloat(manualAmount) },
    ];

    updateIncomeTotals(newEntries);
    setManualDescription('');
    setManualAmount('');
    setShowManualEntry(false);
  };

  // Remove manual entry
  const removeManualEntry = (index: number) => {
    const newEntries = manualEntries.filter((_, i) => i !== index);
    updateIncomeTotals(newEntries);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Business Income
        </h1>
        <p className="text-gray-600">
          Review and confirm income for {businessName}. This includes money received from sales, services, and any other business income.
        </p>
      </div>

      {/* Income Summary Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <PoundSterling className="h-6 w-6" />
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Total Business Income</p>
            <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-emerald-100">From Bank Transactions</p>
            <p className="text-lg font-semibold">{formatCurrency(transactionTotal)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-emerald-100">Manual Entries</p>
            <p className="text-lg font-semibold">{formatCurrency(manualTotal)}</p>
          </div>
        </div>
      </div>

      {/* Bank Transactions Section */}
      {data.transactions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <button
            onClick={() => setExpandedTransactions(!expandedTransactions)}
            className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
          >
            <Building2 className="h-5 w-5 text-gray-400" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Bank Transactions</h3>
              <p className="text-sm text-gray-500">
                {incomeTransactions.filter((t) => t.businessId === currentBusinessId).length} income transactions assigned
              </p>
            </div>
            {expandedTransactions ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {expandedTransactions && (
            <div className="border-t border-gray-100">
              {/* Unassigned Transactions */}
              {unassignedIncomeTransactions.length > 0 && (
                <div className="p-4 bg-amber-50 border-b border-amber-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-amber-800">
                      {unassignedIncomeTransactions.length} income transactions need to be assigned
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={assignAllTransactions}
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                    >
                      Assign All to This Business
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {unassignedIncomeTransactions.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg"
                      >
                        <button
                          onClick={() => assignTransaction(t.id)}
                          className="text-gray-400 hover:text-emerald-500"
                        >
                          <Circle className="h-5 w-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-500">{t.date}</p>
                        </div>
                        <p className="text-sm font-medium text-emerald-600">
                          {formatCurrency(Math.abs(t.amount))}
                        </p>
                      </div>
                    ))}
                    {unassignedIncomeTransactions.length > 5 && (
                      <p className="text-xs text-amber-600 text-center">
                        +{unassignedIncomeTransactions.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Transactions */}
              <div className="divide-y divide-gray-100">
                {incomeTransactions
                  .filter((t) => t.businessId === currentBusinessId)
                  .map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))}
                {incomeTransactions.filter((t) => t.businessId === currentBusinessId).length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No income transactions assigned yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Income Entries */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Other Income</h3>
          <p className="text-sm text-gray-500">
            Add income not captured in your bank transactions
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {manualEntries.map((entry, index) => (
            <div key={index} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{entry.description}</p>
              </div>
              <p className="text-emerald-600 font-medium">
                {formatCurrency(entry.amount)}
              </p>
              <button
                onClick={() => removeManualEntry(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {showManualEntry ? (
            <div className="p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Cash payment from client"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addManualEntry} size="sm">
                  Add Entry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualEntry(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowManualEntry(true)}
              className="w-full p-4 flex items-center gap-2 text-emerald-600 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" />
              Add Other Income
            </button>
          )}
        </div>
      </div>

      <WizardNavigation canContinue={true} />
    </div>
  );
}

// Transaction Row Component
function TransactionRow({ transaction }: { transaction: Transaction }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(Math.abs(amount));
  };

  return (
    <div className="p-4 flex items-center gap-4">
      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
        <p className="text-sm text-gray-500">{transaction.date}</p>
      </div>
      <p className="text-emerald-600 font-medium">{formatCurrency(transaction.amount)}</p>
    </div>
  );
}
