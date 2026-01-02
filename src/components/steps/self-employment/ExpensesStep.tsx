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
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Receipt,
  Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/wizard';
import { CategoryModal } from '@/components/transactions/CategoryModal';

// SA103 Expense Categories
const SA103_EXPENSE_CATEGORIES = [
  { id: 'cost-of-goods', label: 'Cost of Goods Sold', box: '10', description: 'Direct costs of products sold' },
  { id: 'car-van', label: 'Car, Van & Travel', box: '11', description: 'Vehicle costs and business travel' },
  { id: 'wages-staff', label: 'Wages, Salaries & Staff Costs', box: '12', description: 'Employee wages and related costs' },
  { id: 'rent-rates', label: 'Rent, Rates & Power', box: '13', description: 'Business premises costs' },
  { id: 'repairs-renewals', label: 'Repairs & Maintenance', box: '14', description: 'Repairs and renewals of equipment' },
  { id: 'accountancy-legal', label: 'Accountancy, Legal & Professional', box: '15', description: 'Professional fees' },
  { id: 'interest', label: 'Interest & Bank Charges', box: '16', description: 'Bank charges and loan interest' },
  { id: 'phone-internet', label: 'Phone, Fax, Stationery', box: '17', description: 'Communication and office supplies' },
  { id: 'advertising', label: 'Advertising & Marketing', box: '18', description: 'Promotion and marketing costs' },
  { id: 'other-expenses', label: 'Other Business Expenses', box: '19', description: 'All other allowable expenses' },
];

export function SelfEmploymentExpensesStep() {
  const {
    currentBusinessId,
    data,
    updateBusinessData,
    updateTransaction,
    bulkUpdateTransactions,
  } = useWizard();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['other-expenses']));
  const [showManualEntry, setShowManualEntry] = useState<string | null>(null);
  const [manualAmount, setManualAmount] = useState('');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);
  const businessName = businessData.businessName || incomeSource?.label || 'My Business';

  // Get expense transactions for this business
  const expenseTransactions = useMemo(() => {
    return data.transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.status === 'business' &&
        (t.businessId === currentBusinessId || !t.businessId)
    );
  }, [data.transactions, currentBusinessId]);

  // Unassigned expense transactions
  const unassignedExpenses = useMemo(() => {
    return data.transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.status === 'business' &&
        !t.businessId
    );
  }, [data.transactions]);

  // Group transactions by category
  const transactionsByCategory = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    SA103_EXPENSE_CATEGORIES.forEach((cat) => {
      grouped[cat.id] = [];
    });

    expenseTransactions
      .filter((t) => t.businessId === currentBusinessId)
      .forEach((t) => {
        const category = t.category || 'other-expenses';
        if (grouped[category]) {
          grouped[category].push(t);
        } else {
          grouped['other-expenses'].push(t);
        }
      });

    return grouped;
  }, [expenseTransactions, currentBusinessId]);

  // Calculate totals
  const manualByCategory = businessData.expenses?.byCategory || {};

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { transactions: number; manual: number; total: number }> = {};

    SA103_EXPENSE_CATEGORIES.forEach((cat) => {
      const transactionSum = transactionsByCategory[cat.id].reduce(
        (sum, t) => sum + Math.abs(t.amount),
        0
      );
      const manualSum = manualByCategory[cat.id] || 0;
      totals[cat.id] = {
        transactions: transactionSum,
        manual: manualSum,
        total: transactionSum + manualSum,
      };
    });

    return totals;
  }, [transactionsByCategory, manualByCategory]);

  const totalExpenses = Object.values(categoryTotals).reduce(
    (sum, cat) => sum + cat.total,
    0
  );

  const transactionTotal = Object.values(categoryTotals).reduce(
    (sum, cat) => sum + cat.transactions,
    0
  );

  const manualTotal = Object.values(categoryTotals).reduce(
    (sum, cat) => sum + cat.manual,
    0
  );

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Assign all unassigned to this business
  const assignAllExpenses = () => {
    const ids = unassignedExpenses.map((t) => t.id);
    bulkUpdateTransactions(ids, { businessId: currentBusinessId });
  };

  // Assign single transaction
  const assignTransaction = (transactionId: string) => {
    updateTransaction(transactionId, { businessId: currentBusinessId });
  };

  // Add manual expense to category
  const addManualExpense = (categoryId: string) => {
    if (!manualAmount) return;

    const newByCategory = {
      ...manualByCategory,
      [categoryId]: (manualByCategory[categoryId] || 0) + parseFloat(manualAmount),
    };

    updateBusinessData(currentBusinessId, {
      expenses: {
        byCategory: newByCategory,
        fromTransactions: transactionTotal,
        manual: Object.values(newByCategory).reduce((sum, v) => sum + v, 0),
        total: transactionTotal + Object.values(newByCategory).reduce((sum, v) => sum + v, 0),
      },
    });

    setManualAmount('');
    setShowManualEntry(null);
  };

  // Open category modal for transaction
  const openCategoryModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCategoryModalOpen(true);
  };

  // Handle category selection from modal
  const handleCategorySelect = (categoryId: string, isBusiness: boolean) => {
    if (selectedTransaction) {
      updateTransaction(selectedTransaction.id, {
        category: categoryId,
        status: isBusiness ? 'business' : 'personal',
      });
    }
    setCategoryModalOpen(false);
    setSelectedTransaction(null);
  };

  // Handle mark as personal
  const handleMarkPersonal = () => {
    if (selectedTransaction) {
      updateTransaction(selectedTransaction.id, { status: 'personal' });
    }
    setCategoryModalOpen(false);
    setSelectedTransaction(null);
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
          Business Expenses
        </h1>
        <p className="text-gray-600">
          Review and categorise expenses for {businessName}. Expenses are grouped by SA103 category for your tax return.
        </p>
      </div>

      {/* Expenses Summary Card */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <p className="text-red-100 text-sm">Total Business Expenses</p>
            <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-red-100">From Bank Transactions</p>
            <p className="text-lg font-semibold">{formatCurrency(transactionTotal)}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-red-100">Manual Entries</p>
            <p className="text-lg font-semibold">{formatCurrency(manualTotal)}</p>
          </div>
        </div>
      </div>

      {/* Unassigned Expenses Alert */}
      {unassignedExpenses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-amber-800">
              {unassignedExpenses.length} expense transactions need to be assigned
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={assignAllExpenses}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Assign All to This Business
            </Button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {unassignedExpenses.slice(0, 3).map((t) => (
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
                </div>
                <p className="text-sm font-medium text-red-600">
                  {formatCurrency(Math.abs(t.amount))}
                </p>
              </div>
            ))}
            {unassignedExpenses.length > 3 && (
              <p className="text-xs text-amber-600 text-center">
                +{unassignedExpenses.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expense Categories */}
      <div className="space-y-3 mb-6">
        {SA103_EXPENSE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const transactions = transactionsByCategory[category.id];
          const totals = categoryTotals[category.id];

          return (
            <div
              key={category.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{category.label}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      Box {category.box}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'font-semibold',
                    totals.total > 0 ? 'text-gray-900' : 'text-gray-400'
                  )}>
                    {formatCurrency(totals.total)}
                  </p>
                  {transactions.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Transactions in this category */}
                  {transactions.length > 0 && (
                    <div className="divide-y divide-gray-100">
                      {transactions.map((t) => (
                        <div key={t.id} className="p-4 flex items-center gap-4">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {t.description}
                            </p>
                            <p className="text-sm text-gray-500">{t.date}</p>
                          </div>
                          <p className="text-red-600 font-medium">
                            {formatCurrency(Math.abs(t.amount))}
                          </p>
                          <button
                            onClick={() => openCategoryModal(t)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual amount for this category */}
                  {manualByCategory[category.id] > 0 && (
                    <div className="p-4 bg-gray-50 flex items-center gap-4">
                      <div className="w-5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Manual Entry</p>
                      </div>
                      <p className="text-red-600 font-medium">
                        {formatCurrency(manualByCategory[category.id])}
                      </p>
                    </div>
                  )}

                  {/* Add manual entry */}
                  {showManualEntry === category.id ? (
                    <div className="p-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Label className="sr-only">Amount</Label>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                          />
                        </div>
                        <Button size="sm" onClick={() => addManualExpense(category.id)}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowManualEntry(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowManualEntry(category.id)}
                      className="w-full p-3 flex items-center gap-2 text-sm text-emerald-600 hover:bg-emerald-50 border-t border-gray-100"
                    >
                      <Plus className="h-4 w-4" />
                      Add Manual Expense
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <WizardNavigation canContinue={true} />

      {/* Category Modal */}
      {selectedTransaction && (
        <CategoryModal
          isOpen={categoryModalOpen}
          onClose={() => {
            setCategoryModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onSelectCategory={handleCategorySelect}
          onMarkPersonal={handleMarkPersonal}
        />
      )}
    </div>
  );
}
