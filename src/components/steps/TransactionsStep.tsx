'use client';

import { useState, useMemo } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { TransactionRow } from '@/components/transactions/TransactionRow';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';

type FilterStatus = 'all' | 'needs_review' | 'business' | 'personal';

export function TransactionsStep() {
  const { data, updateTransaction, bulkUpdateTransactions, goNext, updateData } =
    useWizard();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: transactions.length,
      business: transactions.filter((t) => t.status === 'business').length,
      personal: transactions.filter((t) => t.status === 'personal').length,
      needsReview: transactions.filter((t) => t.status === 'needs_review')
        .length,
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

  // Can continue only if no transactions need review
  const canContinue = stats.needsReview === 0;

  // Handle continue
  const handleContinue = () => {
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

      {/* AI Summary Banner */}
      {stats.needsReview < stats.total && (
        <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
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
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Business Income</p>
          <p className="text-xl font-bold text-emerald-600">
            {formatCurrency(totals.income)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Business Expenses</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(totals.expenses)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Net Profit</p>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(totals.income - totals.expenses)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500 mb-1">Needs Review</p>
          <p
            className={cn(
              'text-xl font-bold',
              stats.needsReview > 0 ? 'text-amber-600' : 'text-emerald-600'
            )}
          >
            {stats.needsReview}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 mb-4">
        {/* Status Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { value: 'all', label: 'All', count: stats.total },
            {
              value: 'needs_review',
              label: 'Needs Review',
              count: stats.needsReview,
            },
            { value: 'business', label: 'Business', count: stats.business },
            { value: 'personal', label: 'Personal', count: stats.personal },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as FilterStatus)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                filter === tab.value
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                    filter === tab.value ? 'bg-gray-200' : 'bg-gray-200/50'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

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
            {filteredTransactions.map((transaction) => (
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
      </div>

      {/* Warning if items need review */}
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
                Mark all transactions as business or personal before continuing.
              </p>
            </div>
          </div>
        </div>
      )}

      <WizardNavigation
        canContinue={canContinue}
        continueLabel={
          canContinue ? 'Continue' : `Review ${stats.needsReview} remaining`
        }
        onContinue={handleContinue}
      />
    </div>
  );
}
