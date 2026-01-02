'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// SA103 Categories matching HMRC Self Assessment
const INCOME_CATEGORIES = [
  {
    id: 'sales_turnover',
    label: 'Sales/Turnover',
    description: 'Income from sales of goods or services',
    box: 'SA103 Box 9',
  },
  {
    id: 'other_business_income',
    label: 'Other Business Income',
    description: 'Other business income including grants',
    box: 'SA103 Box 10',
  },
];

const EXPENSE_CATEGORIES = [
  {
    id: 'cost_of_goods',
    label: 'Cost of Goods Sold',
    description: 'Direct costs of goods sold',
    box: 'SA103 Box 10',
  },
  {
    id: 'employee_costs',
    label: 'Employee Costs',
    description: 'Wages, salaries, bonuses, pensions',
    box: 'SA103 Box 11',
  },
  {
    id: 'subcontractor_costs',
    label: 'Subcontractor Costs',
    description: 'CIS deductions and subcontractor payments',
    box: 'SA103 Box 12',
  },
  {
    id: 'premises_costs',
    label: 'Premises Costs',
    description: 'Rent, rates, power, insurance for business premises',
    box: 'SA103 Box 13',
  },
  {
    id: 'repairs_maintenance',
    label: 'Repairs & Maintenance',
    description: 'Repairs and maintenance of property and equipment',
    box: 'SA103 Box 14',
  },
  {
    id: 'motor_expenses',
    label: 'Motor Expenses',
    description: 'Vehicle running costs, fuel, insurance',
    box: 'SA103 Box 15',
  },
  {
    id: 'travel_subsistence',
    label: 'Travel & Subsistence',
    description: 'Business travel, accommodation, meals',
    box: 'SA103 Box 16',
  },
  {
    id: 'advertising',
    label: 'Advertising & Marketing',
    description: 'Advertising, marketing, promotion costs',
    box: 'SA103 Box 17',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    description: 'Business entertainment costs (not tax deductible)',
    box: 'SA103 Box 17',
  },
  {
    id: 'legal_professional',
    label: 'Legal & Professional',
    description: 'Accountant, solicitor, professional fees',
    box: 'SA103 Box 17',
  },
  {
    id: 'bank_charges',
    label: 'Bank Charges',
    description: 'Bank fees, interest, finance charges',
    box: 'SA103 Box 17',
  },
  {
    id: 'office_supplies',
    label: 'Office Supplies',
    description: 'Stationery, postage, printing',
    box: 'SA103 Box 17',
  },
  {
    id: 'software_subscriptions',
    label: 'Software & Subscriptions',
    description: 'Software, apps, online services',
    box: 'SA103 Box 17',
  },
  {
    id: 'telephone_internet',
    label: 'Telephone & Internet',
    description: 'Phone, broadband, mobile costs',
    box: 'SA103 Box 17',
  },
  {
    id: 'insurance',
    label: 'Insurance',
    description: 'Business insurance premiums',
    box: 'SA103 Box 17',
  },
  {
    id: 'other_expenses',
    label: 'Other Expenses',
    description: 'Other allowable business expenses',
    box: 'SA103 Box 17',
  },
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  };
  onSelectCategory: (categoryId: string, isBusiness: boolean) => void;
  onMarkPersonal: () => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  transaction,
  onSelectCategory,
  onMarkPersonal,
}: CategoryModalProps) {
  if (!isOpen) return null;

  const categories = transaction.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryTitle = transaction.type === 'income' ? 'Self-Employment Income' : 'Self-Employment Expenses';

  const formatAmount = (amount: number) => {
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}£${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Select Category</h2>
            <p className="text-sm text-gray-400">
              {transaction.description} · {formatAmount(transaction.amount)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Category Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-white">{categoryTitle}</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                SA103
              </span>
            </div>

            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onSelectCategory(category.id, true);
                    onClose();
                  }}
                  className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <div className="font-medium text-white">{category.label}</div>
                  <div className="text-sm text-gray-400">{category.description}</div>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                      {category.box}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mark as Personal */}
          <div className="pt-4 border-t border-gray-800">
            <button
              onClick={() => {
                onMarkPersonal();
                onClose();
              }}
              className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              <div className="font-medium text-gray-300">Mark as Personal</div>
              <div className="text-sm text-gray-500">This is not a business transaction</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { INCOME_CATEGORIES, EXPENSE_CATEGORIES };
