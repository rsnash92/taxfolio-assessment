'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import {
  Home,
  ArrowLeft,
  Check,
  Edit2,
  PoundSterling,
  Receipt,
  Calculator,
  Info,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function RentalSummaryStep() {
  const {
    data,
    currentPropertyId,
    updatePropertyData,
    goToStep,
    goToPropertyStep,
  } = useWizard();

  // Get current property data
  const property = currentPropertyId
    ? data.rentalData[currentPropertyId] || {}
    : {};

  // Get the income source for this property
  const incomeSource = data.incomeSources.find(
    (s) => s.id === currentPropertyId
  );

  const income = property.income || { rentReceived: 0, otherIncome: 0, total: 0 };
  const expenses = property.expenses || { byCategory: {}, total: 0 };

  // Calculate profit/loss
  const ownershipShare = (property.ownershipShare || 100) / 100;
  const adjustedIncome = (income.total || 0) * ownershipShare;
  const adjustedExpenses = (expenses.total || 0) * ownershipShare;

  // Property allowance comparison
  const propertyAllowance = 1000;
  const usePropertyAllowance =
    adjustedIncome <= propertyAllowance ||
    (adjustedIncome > propertyAllowance && propertyAllowance > adjustedExpenses);

  // Calculate taxable profit
  let taxableProfit: number;
  if (adjustedIncome <= propertyAllowance) {
    taxableProfit = 0;
  } else if (usePropertyAllowance) {
    taxableProfit = adjustedIncome - propertyAllowance;
  } else {
    taxableProfit = adjustedIncome - adjustedExpenses;
  }

  // Finance cost tax credit (Section 24)
  const totalFinanceCosts =
    (property.mortgageInterest || 0) + (property.otherFinanceCosts || 0);
  const financeCostTaxCredit = totalFinanceCosts * 0.2 * ownershipShare;

  const handleEditSection = (section: 'details' | 'income' | 'expenses') => {
    if (!currentPropertyId) return;
    switch (section) {
      case 'details':
        goToPropertyStep(currentPropertyId, 'rental-details');
        break;
      case 'income':
        goToPropertyStep(currentPropertyId, 'rental-income');
        break;
      case 'expenses':
        goToPropertyStep(currentPropertyId, 'rental-expenses');
        break;
    }
  };

  const handleBackToList = () => {
    goToStep('rental-list');
  };

  const handleComplete = () => {
    if (currentPropertyId) {
      // Mark property as complete
      updatePropertyData(currentPropertyId, { isComplete: true });
    }
    goToStep('rental-list');
  };

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
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Calculator className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Property Summary
            </h1>
            <p className="text-sm text-gray-500">
              {property.address || incomeSource?.label || 'Property'}
            </p>
          </div>
        </div>
        <p className="text-gray-600">
          Review the details for this property before continuing.
        </p>
      </div>

      {/* Property Details Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Property Details</h3>
          </div>
          <button
            onClick={() => handleEditSection('details')}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Address</p>
            <p className="font-medium">{property.address || 'Not set'}</p>
          </div>
          <div>
            <p className="text-gray-500">Postcode</p>
            <p className="font-medium">{property.postcode || 'Not set'}</p>
          </div>
          <div>
            <p className="text-gray-500">Property Type</p>
            <p className="font-medium capitalize">
              {property.propertyType?.replace('-', ' ') || 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Ownership Share</p>
            <p className="font-medium">{property.ownershipShare || 100}%</p>
          </div>
        </div>
      </div>

      {/* Income Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">Income (SA105 Box 5)</h3>
          </div>
          <button
            onClick={() => handleEditSection('income')}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Rent Received</span>
            <span className="font-medium">{formatCurrency(income.rentReceived || 0)}</span>
          </div>
          {(income.otherIncome || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Other Income</span>
              <span className="font-medium">{formatCurrency(income.otherIncome || 0)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-medium text-gray-900">Total Income</span>
            <span className="font-bold text-green-600">
              {formatCurrency(income.total || 0)}
            </span>
          </div>
          {property.ownershipShare && property.ownershipShare < 100 && (
            <div className="flex justify-between text-gray-500">
              <span>Your Share ({property.ownershipShare}%)</span>
              <span>{formatCurrency(adjustedIncome)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-gray-900">Expenses</h3>
          </div>
          <button
            onClick={() => handleEditSection('expenses')}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </button>
        </div>

        <div className="space-y-2 text-sm">
          {Object.entries(expenses.byCategory || {}).map(([category, amount]) => {
            if (!amount) return null;
            const categoryLabel = category
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
            return (
              <div key={category} className="flex justify-between">
                <span className="text-gray-600">{categoryLabel}</span>
                <span className="font-medium text-red-500">
                  {formatCurrency(amount as number)}
                </span>
              </div>
            );
          })}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="font-medium text-gray-900">Total Expenses</span>
            <span className="font-bold text-red-500">
              {formatCurrency(expenses.total || 0)}
            </span>
          </div>
          {property.ownershipShare && property.ownershipShare < 100 && (
            <div className="flex justify-between text-gray-500">
              <span>Your Share ({property.ownershipShare}%)</span>
              <span>{formatCurrency(adjustedExpenses)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Finance Costs (Section 24) */}
      {totalFinanceCosts > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-purple-900">
              Section 24 Finance Costs
            </h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-700">Mortgage Interest</span>
              <span className="font-medium">
                {formatCurrency(property.mortgageInterest || 0)}
              </span>
            </div>
            {(property.otherFinanceCosts || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-purple-700">Other Finance Costs</span>
                <span className="font-medium">
                  {formatCurrency(property.otherFinanceCosts || 0)}
                </span>
              </div>
            )}
            <div className="border-t border-purple-200 pt-2 flex justify-between">
              <span className="font-medium text-purple-900">Tax Credit (20%)</span>
              <span className="font-bold text-purple-700">
                -{formatCurrency(financeCostTaxCredit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Profit Calculation */}
      <div className="bg-gray-900 text-white rounded-xl p-6">
        <h3 className="font-semibold mb-4">Profit Calculation</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300">Total Income</span>
            <span className="font-medium">{formatCurrency(adjustedIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">
              Less: {usePropertyAllowance ? 'Property Allowance' : 'Expenses'}
            </span>
            <span className="font-medium text-red-400">
              -{formatCurrency(usePropertyAllowance ? Math.min(propertyAllowance, adjustedIncome) : adjustedExpenses)}
            </span>
          </div>
          <div className="border-t border-gray-700 pt-3 flex justify-between">
            <span className="font-medium">Taxable Profit</span>
            <span className="font-bold text-xl">
              {formatCurrency(Math.max(0, taxableProfit))}
            </span>
          </div>
          {financeCostTaxCredit > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Section 24 Tax Credit</span>
              <span className="text-green-400">
                -{formatCurrency(financeCostTaxCredit)}
              </span>
            </div>
          )}
        </div>

        {usePropertyAllowance && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Using the £1,000 Property Income Allowance as it&apos;s more
              beneficial than claiming your actual expenses of{' '}
              {formatCurrency(adjustedExpenses)}.
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={handleBackToList}>
          Back to Properties
        </Button>
        <Button
          onClick={handleComplete}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Check className="h-4 w-4 mr-2" />
          Complete Property
        </Button>
      </div>
    </div>
  );
}
