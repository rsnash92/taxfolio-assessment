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
  CheckCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const stats = useMemo(() => {
    const needsReviewTxs = transactions.filter((t) => t.status === 'needs_review');
    const uncategorisedCount = needsReviewTxs.filter((t) => !t.suggested_category).length;
    const pendingConfirmCount = needsReviewTxs.filter((t) => t.suggested_category).length;

    return {
      total: transactions.length,
      business: transactions.filter((t) => t.status === 'business').length,
      personal: transactions.filter((t) => t.status === 'personal').length,
      needsReview: needsReviewTxs.length,
      uncategorised: uncategorisedCount,
      pendingConfirm: pendingConfirmCount,
    };
  }, [transactions]);

  // Handle AI categorisation with streaming - stores suggestions but keeps status as needs_review
  const handleCategorise = useCallback(async () => {
    // Only categorise uncategorised transactions (no suggestion yet)
    const uncategorisedTxs = transactions.filter(
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

      // Apply suggestions but keep status as needs_review (user must confirm)
      if (results.length > 0) {
        const updatedTransactions = transactions.map((tx) => {
          const result = results.find((r) => r.id === tx.id);
          if (result) {
            return {
              ...tx,
              // Keep status as needs_review - user must confirm
              suggested_category: result.category,
              suggested_is_business: result.is_business,
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

  // Confirm all AI suggestions
  const handleConfirmAll = useCallback(() => {
    const pendingTxs = transactions.filter(
      (t) => t.status === 'needs_review' && t.suggested_category
    );

    if (pendingTxs.length === 0) return;

    const updatedTransactions = transactions.map((tx) => {
      if (tx.status === 'needs_review' && tx.suggested_category) {
        return {
          ...tx,
          status: tx.suggested_is_business ? 'business' : 'personal',
          category: tx.suggested_category,
        };
      }
      return tx;
    });

    updateData({ transactions: updatedTransactions as typeof transactions });
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

  // Can continue when all transactions are categorised (not needs_review)
  const canContinue = stats.total > 0 && stats.needsReview === 0;

  // Handle continue
  const handleContinue = () => {
    console.log('[TransactionsStep] handleContinue called');
    updateData({ transactionsReviewed: true });
    goNext();
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

      {/* Action Bar - like main app */}
      <div className="flex items-center gap-3 mb-6">
        {/* Categorise Button */}
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

        {/* Confirm All Button */}
        <Button
          onClick={handleConfirmAll}
          disabled={stats.pendingConfirm === 0}
          variant="outline"
          className="bg-white"
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          Confirm All {stats.pendingConfirm > 0 ? stats.pendingConfirm : ''}
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Progress bar when categorising */}
      {isCategorising && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
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

      {/* Clickable Stat Cards - Filter by clicking */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Business */}
        <button
          onClick={() => setFilter(filter === 'business' ? 'all' : 'business')}
          className={cn(
            'bg-gray-900 rounded-xl p-4 text-left transition-all',
            filter === 'business'
              ? 'ring-2 ring-emerald-500 ring-offset-2'
              : 'hover:bg-gray-800'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats.business}</p>
              <p className="text-xs text-gray-400">Business</p>
            </div>
          </div>
        </button>

        {/* Personal */}
        <button
          onClick={() => setFilter(filter === 'personal' ? 'all' : 'personal')}
          className={cn(
            'bg-gray-900 rounded-xl p-4 text-left transition-all',
            filter === 'personal'
              ? 'ring-2 ring-gray-500 ring-offset-2'
              : 'hover:bg-gray-800'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-300">{stats.personal}</p>
              <p className="text-xs text-gray-400">Personal</p>
            </div>
          </div>
        </button>

        {/* Needs Review */}
        <button
          onClick={() => setFilter(filter === 'needs_review' ? 'all' : 'needs_review')}
          className={cn(
            'bg-gray-900 rounded-xl p-4 text-left transition-all',
            filter === 'needs_review'
              ? 'ring-2 ring-amber-500 ring-offset-2'
              : 'hover:bg-gray-800'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{stats.needsReview}</p>
              <p className="text-xs text-gray-400">Needs review</p>
            </div>
          </div>
        </button>

        {/* Total */}
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'bg-gray-900 rounded-xl p-4 text-left transition-all',
            filter === 'all'
              ? 'ring-2 ring-white ring-offset-2'
              : 'hover:bg-gray-800'
          )}
        >
          <div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Total transactions</p>
          </div>
        </button>
      </div>

      {/* Bulk Actions - when items selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-100 rounded-lg">
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                {stats.needsReview} transaction
                {stats.needsReview !== 1 ? 's' : ''} still need review
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

      <WizardNavigation
        canContinue={canContinue}
        continueLabel="Continue to Summary"
        onContinue={handleContinue}
      />
    </div>
  );
}
