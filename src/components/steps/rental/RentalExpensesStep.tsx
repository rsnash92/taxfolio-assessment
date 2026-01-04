'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Receipt, ArrowLeft, Info, HelpCircle } from 'lucide-react';

// SA105 Expense Categories
const EXPENSE_CATEGORIES = [
  {
    id: 'rent_rates_insurance',
    label: 'Rent, Rates & Insurance',
    hmrcBox: 'Box 17',
    description: 'Ground rent, council tax (if you pay), building insurance',
    examples: ['Ground rent', 'Service charges', 'Building insurance'],
  },
  {
    id: 'property_repairs',
    label: 'Property Repairs & Maintenance',
    hmrcBox: 'Box 18',
    description: 'Repairs to maintain the property (not improvements)',
    examples: ['Fixing a boiler', 'Repainting', 'Replacing like-for-like items'],
  },
  {
    id: 'legal_management',
    label: 'Legal & Professional Fees',
    hmrcBox: 'Box 21',
    description: 'Letting agent fees, legal costs for short leases',
    examples: ['Letting agent fees', 'Accountancy fees', 'Legal costs'],
  },
  {
    id: 'cost_of_services',
    label: 'Cost of Services',
    hmrcBox: 'Box 22',
    description: 'Services you provide and pay for as landlord',
    examples: ['Gardening', 'Cleaning communal areas', 'Utilities you pay'],
  },
  {
    id: 'other_allowable',
    label: 'Other Allowable Expenses',
    hmrcBox: 'Box 23',
    description: 'Other allowable property expenses',
    examples: ['Advertising for tenants', 'Stationery', 'Phone calls'],
  },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function RentalExpensesStep() {
  const {
    data,
    currentPropertyId,
    updatePropertyData,
    goNext,
    goBack,
    goToStep,
  } = useWizard();

  // Get current property data
  const property = currentPropertyId
    ? data.rentalData[currentPropertyId] || {}
    : {};

  const expenses = property.expenses || {
    byCategory: {},
    total: 0,
  };

  // Get the income source for this property
  const incomeSource = data.incomeSources.find(
    (s) => s.id === currentPropertyId
  );

  const handleCategoryUpdate = (categoryId: string, value: number) => {
    if (!currentPropertyId) return;

    const newByCategory = {
      ...expenses.byCategory,
      [categoryId]: value,
    };

    const newTotal = Object.values(newByCategory).reduce(
      (sum, val) => sum + (val as number || 0),
      0
    );

    updatePropertyData(currentPropertyId, {
      expenses: {
        byCategory: newByCategory,
        total: newTotal,
      },
    });
  };

  const handleBackToList = () => {
    goToStep('rental-list');
  };

  // Calculate adjusted expenses based on ownership share
  const ownershipShare = (property.ownershipShare || 100) / 100;
  const adjustedTotal = (expenses.total || 0) * ownershipShare;

  // Get income for property allowance comparison
  const income = property.income?.total || 0;
  const propertyAllowance = 1000;
  const usePropertyAllowance = income <= propertyAllowance || propertyAllowance > (expenses.total || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all properties
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Receipt className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Property Expenses
            </h1>
            <p className="text-sm text-gray-500">
              {property.address || incomeSource?.label || 'Property'}
            </p>
          </div>
        </div>
        <p className="text-gray-600">
          Enter the allowable expenses you incurred for this property during the
          tax year.
        </p>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Property Allowance vs Actual Expenses</p>
          <p>
            You can either claim the £1,000 Property Allowance or deduct your
            actual expenses - whichever is more beneficial. We&apos;ll
            automatically choose the best option for you.
          </p>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="space-y-4">
        {EXPENSE_CATEGORIES.map((category) => (
          <div
            key={category.id}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {category.label}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {category.hmrcBox}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={category.id}>Amount (£)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id={category.id}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={expenses.byCategory[category.id] || ''}
                  onChange={(e) =>
                    handleCategoryUpdate(
                      category.id,
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <p className="text-xs text-gray-400">
                e.g., {category.examples.join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* What's Not Allowable */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">What can&apos;t be claimed:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Capital improvements (extensions, renovations)</li>
              <li>Personal expenses or your own time</li>
              <li>Mortgage capital repayments (interest is claimed separately)</li>
              <li>Costs before you started letting the property</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Expenses Summary</h3>

        <div className="space-y-3">
          {EXPENSE_CATEGORIES.map((category) => {
            const amount = expenses.byCategory[category.id] || 0;
            if (amount === 0) return null;
            return (
              <div key={category.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{category.label}</span>
                <span className="font-medium text-red-500">
                  {formatCurrency(amount)}
                </span>
              </div>
            );
          })}

          <div className="border-t border-gray-200 pt-3 flex justify-between">
            <span className="font-medium text-gray-900">Total Expenses</span>
            <span className="font-bold text-lg text-red-500">
              {formatCurrency(expenses.total || 0)}
            </span>
          </div>

          {property.ownershipShare && property.ownershipShare < 100 && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Your Share ({property.ownershipShare}%)
                </span>
                <span className="font-medium text-red-500">
                  {formatCurrency(adjustedTotal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Property Allowance Comparison */}
        {income > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Comparison:</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">Property Allowance</p>
                <p className="font-semibold">{formatCurrency(Math.min(propertyAllowance, income))}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">Actual Expenses</p>
                <p className="font-semibold">{formatCurrency(expenses.total || 0)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {usePropertyAllowance
                ? 'We recommend using the Property Allowance as it gives a better deduction.'
                : 'We recommend claiming actual expenses as they exceed the Property Allowance.'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button
          onClick={goNext}
          className="bg-[#00e3ec] hover:bg-[#00c4d4]"
        >
          Continue to Summary
        </Button>
      </div>
    </div>
  );
}
