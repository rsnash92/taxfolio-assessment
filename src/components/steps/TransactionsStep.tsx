'use client';

import { useState, useMemo, useCallback } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Brain,
  Search,
  Loader2,
  Briefcase,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';

type FilterStatus = 'all' | 'needs_review' | 'business' | 'personal';

interface CategoryResult {
  id: string;
  is_business: boolean;
  category: string;
  confidence: number;
  reasoning: string;
}

const ITEMS_PER_PAGE = 50;

export function TransactionsStep() {
  const { data, updateTransaction, bulkUpdateTransactions, goNext, updateData } =
    useWizard();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // AI categorisation state
  const [isCategorising, setIsCategorising] = useState(false);
  const [categoriseProgress, setCategoriseProgress] = useState(0);
  const [categoriseStatus, setCategoriseStatus] = useState('');

  const transactions = data.transactions || [];

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Status filter
      if (filter !== 'all' && t.status !== filter) return false;
      // Search filter
      if (
        search &&
        !t.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [transactions, filter, search]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Reset to page 1 when filter/search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [filter, search]);

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: transactions.length,
      business: transactions.filter((t) => t.status === 'business').length,
      personal: transactions.filter((t) => t.status === 'personal').length,
      needsReview: transactions.filter((t) => t.status === 'needs_review')
        .length,
      hasSuggestions: transactions.some((t) => t.suggested_category !== null),
    }),
    [transactions]
  );

  // Calculate totals
  const totals = useMemo(() => {
    const businessTxs = transactions.filter((t) => t.status === 'business');
    return {
      income: businessTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expenses: businessTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  }, [transactions]);

  // Handle AI categorisation with streaming
  const handleCategorise = useCallback(async () => {
    if (transactions.length === 0) return;

    setIsCategorising(true);
    setCategoriseProgress(0);
    setCategoriseStatus('Starting AI categorisation...');

    try {
      const response = await fetch('/api/transactions/categorise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to categorise transactions');
      }

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
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Apply results to transactions
      if (results.length > 0) {
        const updatedTransactions = transactions.map((tx) => {
          const result = results.find((r) => r.id === tx.id);
          if (result) {
            return {
              ...tx,
              status: result.is_business ? 'business' : 'personal',
              suggested_category: result.category,
              confidence: result.confidence,
            };
          }
          return tx;
        });

        updateData({ transactions: updatedTransactions as typeof transactions });
      }

      // Brief delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Categorisation error:', err);
      setCategoriseStatus('Categorisation failed. Please try again.');
    } finally {
      setIsCategorising(false);
      setCategoriseProgress(0);
      setCategoriseStatus('');
    }
  }, [transactions, updateData]);

  // Handle status change for single transaction
  const handleStatusChange = (id: string, status: 'business' | 'personal') => {
    updateTransaction(id, { status });
  };

  // Handle bulk actions
  const handleBulkAction = (status: 'business' | 'personal') => {
    bulkUpdateTransactions(Array.from(selected), { status });
    setSelected(new Set());
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  // Select all filtered
  const selectAll = () => {
    if (selected.size === filteredTransactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  // Can always continue - allow users to proceed even with uncategorised transactions
  // They can come back and review later
  const canContinue = stats.total > 0;

  // Handle continue
  const handleContinue = () => {
    console.log('[TransactionsStep] handleContinue called');
    console.log('[TransactionsStep] Current data:', data);
    console.log('[TransactionsStep] Income sources:', data.incomeSources);
    console.log('[TransactionsStep] Connection method:', data.connectionMethod);
    updateData({ transactionsReviewed: true });
    // Use setTimeout to allow state to update before navigation
    setTimeout(() => {
      console.log('[TransactionsStep] Calling goNext() after timeout');
      goNext();
    }, 0);
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Review your transactions
        </h1>
        <p className="text-gray-600">
          We&apos;ve imported {stats.total} transactions. Mark each as business
          or personal.
        </p>
      </div>

      {/* AI Categorise Banner - show if transactions need review */}
      {stats.needsReview > 0 && !stats.hasSuggestions && (
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">
                  Let AI categorise your transactions
                </p>
                <p className="text-sm text-gray-600">
                  Our AI will analyse each transaction and mark it as business or personal.
                </p>
              </div>
            </div>
            <Button
              onClick={handleCategorise}
              disabled={isCategorising}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isCategorising ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{categoriseProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span>Categorise All</span>
                </div>
              )}
            </Button>
          </div>

          {/* Progress bar */}
          {isCategorising && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>{categoriseStatus}</span>
                <span>{categoriseProgress}%</span>
              </div>
              <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${categoriseProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Summary Banner - show after categorisation */}
      {stats.hasSuggestions && stats.needsReview < stats.total && (
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">
                  AI has categorised your transactions
                </p>
                <p className="text-sm text-gray-600">
                  {stats.business} marked as business, {stats.personal} as
                  personal.
                  {stats.needsReview > 0 && (
                    <span className="text-amber-600 font-medium">
                      {' '}
                      {stats.needsReview} need your review.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              onClick={handleContinue}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Clickable Stat Cards - Filter by clicking */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Business */}
        <button
          onClick={() => setFilter(filter === 'business' ? 'all' : 'business')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-emerald-300',
            filter === 'business'
              ? 'border-emerald-500 ring-1 ring-emerald-500/30'
              : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                filter === 'business' ? 'bg-emerald-100' : 'bg-gray-100'
              )}
            >
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.business}</p>
              <p className="text-xs text-gray-500">Business</p>
            </div>
          </div>
        </button>

        {/* Personal */}
        <button
          onClick={() => setFilter(filter === 'personal' ? 'all' : 'personal')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-gray-400',
            filter === 'personal'
              ? 'border-gray-500 ring-1 ring-gray-500/30'
              : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                filter === 'personal' ? 'bg-gray-200' : 'bg-gray-100'
              )}
            >
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{stats.personal}</p>
              <p className="text-xs text-gray-500">Personal (excluded)</p>
            </div>
          </div>
        </button>

        {/* Needs Review */}
        <button
          onClick={() => setFilter(filter === 'needs_review' ? 'all' : 'needs_review')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-amber-300',
            filter === 'needs_review'
              ? 'border-amber-500 ring-1 ring-amber-500/30'
              : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                filter === 'needs_review' ? 'bg-amber-100' : 'bg-gray-100'
              )}
            >
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-500">{stats.needsReview}</p>
              <p className="text-xs text-gray-500">Needs review</p>
            </div>
          </div>
        </button>

        {/* Total */}
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'bg-white border-2 rounded-xl p-4 text-left transition-all hover:border-gray-400',
            filter === 'all'
              ? 'border-gray-600 ring-1 ring-gray-600/30'
              : 'border-gray-200'
          )}
        >
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total transactions</p>
          </div>
        </button>
      </div>

      {/* Search & Bulk Actions */}
      <div className="flex items-center gap-4 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selected.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('business')}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Business
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('personal')}
              className="text-gray-600"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Personal
            </Button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 p-3 text-left">
                <input
                  type="checkbox"
                  onChange={selectAll}
                  checked={
                    selected.size === filteredTransactions.length &&
                    filteredTransactions.length > 0
                  }
                  className="rounded border-gray-300"
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">
                Date
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">
                Description
              </th>
              <th className="p-3 text-left text-sm font-medium text-gray-600">
                Category
              </th>
              <th className="p-3 text-right text-sm font-medium text-gray-600">
                Amount
              </th>
              <th className="p-3 text-center text-sm font-medium text-gray-600">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                isSelected={selected.has(transaction.id)}
                onSelect={() => toggleSelect(transaction.id)}
                onStatusChange={(status) =>
                  handleStatusChange(transaction.id, status)
                }
              />
            ))}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {transactions.length === 0
              ? 'No transactions imported yet.'
              : 'No transactions match your filters.'}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-emerald-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info if items need review */}
      {stats.needsReview > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                {stats.needsReview} transaction
                {stats.needsReview !== 1 ? 's' : ''} still need review
              </p>
              <p className="text-sm text-blue-600">
                You can continue and come back to review these later, or categorise them now.
              </p>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        canContinue={canContinue}
        continueLabel={
          stats.needsReview > 0
            ? `Continue (${stats.needsReview} uncategorised)`
            : 'Continue'
        }
        onContinue={handleContinue}
      />
    </div>
  );
}
