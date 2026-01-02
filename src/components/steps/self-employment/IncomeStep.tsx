'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import { CategoryModal } from '@/components/transactions/CategoryModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/types/wizard';
import {
  PoundSterling,
  Plus,
  Trash2,
  Search,
  Brain,
  Loader2,
  CheckCheck,
  Briefcase,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'needs_review' | 'business' | 'personal';

interface CategoryResult {
  id: string;
  is_business: boolean;
  category: string;
  confidence: number;
  reasoning: string;
}

const ITEMS_PER_PAGE = 25;

export function SelfEmploymentIncomeStep() {
  const {
    currentBusinessId,
    data,
    updateBusinessData,
    updateTransaction,
    updateData,
  } = useWizard();

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  // AI categorisation state
  const [isCategorising, setIsCategorising] = useState(false);
  const [categoriseProgress, setCategoriseProgress] = useState(0);
  const [categoriseStatus, setCategoriseStatus] = useState('');

  // Category modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);
  const businessName = businessData.businessName || incomeSource?.label || 'My Business';

  // Get all INCOME transactions (positive amounts / money received)
  const incomeTransactions = useMemo(() => {
    return data.transactions.filter((t) => t.type === 'income');
  }, [data.transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return incomeTransactions.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [incomeTransactions, filter, search]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Calculate stats
  const stats = useMemo(() => {
    const needsReviewTxs = incomeTransactions.filter((t) => t.status === 'needs_review');
    const uncategorisedCount = needsReviewTxs.filter((t) => !t.suggested_category).length;
    const pendingConfirmCount = needsReviewTxs.filter((t) => t.suggested_category).length;

    return {
      total: incomeTransactions.length,
      business: incomeTransactions.filter((t) => t.status === 'business').length,
      personal: incomeTransactions.filter((t) => t.status === 'personal').length,
      needsReview: needsReviewTxs.length,
      uncategorised: uncategorisedCount,
      pendingConfirm: pendingConfirmCount,
    };
  }, [incomeTransactions]);

  // Calculate totals for the summary card
  const businessTotal = useMemo(() => {
    return incomeTransactions
      .filter((t) => t.status === 'business')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }, [incomeTransactions]);

  const manualEntries = businessData.income?.manual || [];
  const manualTotal = manualEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = businessTotal + manualTotal;

  // Handle AI categorisation
  const handleCategorise = useCallback(async () => {
    const uncategorisedTxs = incomeTransactions.filter(
      (t) => t.status === 'needs_review' && !t.suggested_category
    );

    if (uncategorisedTxs.length === 0) return;

    setIsCategorising(true);
    setCategoriseProgress(0);
    setCategoriseStatus('Starting AI categorisation...');

    try {
      const response = await fetch('/api/transactions/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: uncategorisedTxs,
          businessType: businessData.industry,
          stream: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to categorise transactions');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      const results: CategoryResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'progress') {
                setCategoriseProgress(event.progress);
                setCategoriseStatus(event.status);
              } else if (event.type === 'batch_complete') {
                results.push(...event.results);
              } else if (event.type === 'complete') {
                setCategoriseProgress(100);
                setCategoriseStatus('Categorisation complete!');
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      if (results.length > 0) {
        const updatedTransactions = data.transactions.map((tx) => {
          const result = results.find((r) => r.id === tx.id);
          if (result) {
            return {
              ...tx,
              suggested_category: result.category,
              suggested_is_business: result.is_business,
              confidence: result.confidence,
            };
          }
          return tx;
        });
        updateData({ transactions: updatedTransactions });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Categorisation error:', err);
      setCategoriseStatus('Categorisation failed. Please try again.');
    } finally {
      setIsCategorising(false);
      setCategoriseProgress(0);
      setCategoriseStatus('');
    }
  }, [incomeTransactions, data.transactions, businessData.industry, updateData]);

  // Confirm all AI suggestions
  const handleConfirmAll = useCallback(() => {
    const pendingTxs = incomeTransactions.filter(
      (t) => t.status === 'needs_review' && t.suggested_category
    );

    if (pendingTxs.length === 0) return;

    const updatedTransactions = data.transactions.map((tx) => {
      if (tx.type === 'income' && tx.status === 'needs_review' && tx.suggested_category) {
        return {
          ...tx,
          status: tx.suggested_is_business ? 'business' : 'personal',
          category: tx.suggested_category,
        };
      }
      return tx;
    });

    updateData({ transactions: updatedTransactions as typeof data.transactions });
  }, [incomeTransactions, data.transactions, updateData]);

  // Handle status change
  const handleStatusChange = (id: string, status: 'business' | 'personal') => {
    updateTransaction(id, { status });
  };

  // Handle category selection from modal
  const handleCategorySelect = (categoryId: string, isBusiness: boolean) => {
    if (!editingTransaction) return;
    updateTransaction(editingTransaction.id, {
      category: categoryId,
      status: isBusiness ? 'business' : 'personal',
    });
  };

  const handleMarkPersonal = () => {
    if (!editingTransaction) return;
    updateTransaction(editingTransaction.id, { status: 'personal' });
  };

  // Manual income entry
  const addManualEntry = () => {
    if (!manualDescription || !manualAmount) return;

    const newEntries = [
      ...manualEntries,
      { description: manualDescription, amount: parseFloat(manualAmount) },
    ];

    updateBusinessData(currentBusinessId, {
      income: {
        fromTransactions: businessTotal,
        manual: newEntries,
        total: businessTotal + newEntries.reduce((sum, e) => sum + e.amount, 0),
      },
    });

    setManualDescription('');
    setManualAmount('');
    setShowManualEntry(false);
  };

  const removeManualEntry = (index: number) => {
    const newEntries = manualEntries.filter((_, i) => i !== index);
    updateBusinessData(currentBusinessId, {
      income: {
        fromTransactions: businessTotal,
        manual: newEntries,
        total: businessTotal + newEntries.reduce((sum, e) => sum + e.amount, 0),
      },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Income</h1>
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
            <p className="text-lg font-semibold">{formatCurrency(businessTotal)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-emerald-100">Manual Entries</p>
            <p className="text-lg font-semibold">{formatCurrency(manualTotal)}</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={handleCategorise}
          disabled={isCategorising || stats.uncategorised === 0}
          variant="outline"
          className="bg-white"
        >
          {isCategorising ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {categoriseProgress}%
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Categorise {stats.uncategorised > 0 ? stats.uncategorised : ''}
            </>
          )}
        </Button>

        <Button
          onClick={handleConfirmAll}
          disabled={stats.pendingConfirm === 0}
          variant="outline"
          className="bg-white"
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          Confirm All {stats.pendingConfirm > 0 ? stats.pendingConfirm : ''}
        </Button>

        <div className="flex-1" />

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search income..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Progress bar when categorising */}
      {isCategorising && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{categoriseStatus}</span>
            <span>{categoriseProgress}%</span>
          </div>
          <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${categoriseProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFilter(filter === 'business' ? 'all' : 'business')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-emerald-300',
            filter === 'business' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', filter === 'business' ? 'bg-emerald-100' : 'bg-gray-100')}>
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.business}</p>
              <p className="text-xs text-gray-500">Business</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'personal' ? 'all' : 'personal')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-gray-400',
            filter === 'personal' ? 'border-gray-500 ring-1 ring-gray-500/30' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', filter === 'personal' ? 'bg-gray-200' : 'bg-gray-100')}>
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{stats.personal}</p>
              <p className="text-xs text-gray-500">Personal</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'needs_review' ? 'all' : 'needs_review')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-amber-300',
            filter === 'needs_review' ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', filter === 'needs_review' ? 'bg-amber-100' : 'bg-gray-100')}>
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{stats.needsReview}</p>
              <p className="text-xs text-gray-500">Needs review</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter('all')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-gray-400',
            filter === 'all' ? 'border-gray-600 ring-1 ring-gray-600/30' : 'border-gray-200'
          )}
        >
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total income transactions</p>
          </div>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Date</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Description</th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">Category</th>
              <th className="p-3 text-right text-sm font-medium text-gray-600">Amount</th>
              <th className="p-3 text-center text-sm font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                isSelected={false}
                onSelect={() => {}}
                onStatusChange={(status) => handleStatusChange(transaction.id, status)}
                onEdit={() => setEditingTransaction(transaction)}
              />
            ))}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {incomeTransactions.length === 0
              ? 'No income transactions imported yet.'
              : 'No transactions match your filters.'}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{' '}
              {filteredTransactions.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Income Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-900">Other Income</h3>
          <p className="text-sm text-gray-500">Add income not captured in your bank transactions</p>
        </div>

        <div className="divide-y divide-gray-100">
          {manualEntries.map((entry, index) => (
            <div key={index} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{entry.description}</p>
              </div>
              <p className="text-emerald-600 font-medium">{formatCurrency(entry.amount)}</p>
              <button onClick={() => removeManualEntry(index)} className="text-gray-400 hover:text-red-500">
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
                <Button onClick={addManualEntry} size="sm">Add Entry</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(false)}>Cancel</Button>
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

      {/* Warning if items need review */}
      {stats.needsReview > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {stats.needsReview} income transaction{stats.needsReview !== 1 ? 's' : ''} still need review
              </p>
              <p className="text-sm text-amber-600">
                {stats.pendingConfirm > 0
                  ? `${stats.pendingConfirm} have AI suggestions ready to confirm.`
                  : 'Use the Categorise button to get AI suggestions.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation canContinue={true} />

      {/* Category Edit Modal */}
      {editingTransaction && (
        <CategoryModal
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          transaction={editingTransaction}
          onSelectCategory={handleCategorySelect}
          onMarkPersonal={handleMarkPersonal}
        />
      )}
    </div>
  );
}
