'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PoundSterling, ArrowLeft, Plus, Trash2, Info } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function RentalIncomeStep() {
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

  const income = property.income || {
    rentReceived: 0,
    otherIncome: 0,
    total: 0,
  };

  // Get the income source for this property
  const incomeSource = data.incomeSources.find(
    (s) => s.id === currentPropertyId
  );

  const handleUpdate = (field: string, value: number) => {
    if (!currentPropertyId) return;

    const newRentReceived = field === 'rentReceived' ? value : income.rentReceived || 0;
    const newOtherIncome = field === 'otherIncome' ? value : income.otherIncome || 0;

    updatePropertyData(currentPropertyId, {
      income: {
        rentReceived: newRentReceived,
        otherIncome: newOtherIncome,
        total: newRentReceived + newOtherIncome,
      },
    });
  };

  const handleBackToList = () => {
    goToStep('rental-list');
  };

  // Calculate adjusted income based on ownership share
  const ownershipShare = (property.ownershipShare || 100) / 100;
  const adjustedTotal = (income.total || 0) * ownershipShare;

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
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <PoundSterling className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rental Income</h1>
            <p className="text-sm text-gray-500">
              {property.address || incomeSource?.label || 'Property'}
            </p>
          </div>
        </div>
        <p className="text-gray-600">
          Enter the total rental income you received from this property during
          the tax year.
        </p>
      </div>

      {/* HMRC Box Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">SA105 Box 5: Total rents and other income from property</p>
          <p>Enter the gross rental income before deducting any expenses.</p>
        </div>
      </div>

      {/* Rent Received */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Rent Received</h3>
        <p className="text-sm text-gray-500">
          The total rent you received from tenants during the tax year
        </p>

        <div className="grid gap-2">
          <Label htmlFor="rentReceived">Total Rent (£)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="rentReceived"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={income.rentReceived || ''}
              onChange={(e) =>
                handleUpdate('rentReceived', parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
      </div>

      {/* Other Income */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Other Property Income</h3>
        <p className="text-sm text-gray-500">
          Any other income from the property (optional)
        </p>

        <div className="grid gap-2">
          <Label htmlFor="otherIncome">Other Income (£)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="otherIncome"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={income.otherIncome || ''}
              onChange={(e) =>
                handleUpdate('otherIncome', parseFloat(e.target.value) || 0)
              }
            />
          </div>
          <p className="text-xs text-gray-500">
            e.g., parking income, service charges received, insurance claim
            payouts
          </p>
        </div>
      </div>

      {/* Total Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Income Summary</h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Rent Received</span>
            <span className="font-medium">
              {formatCurrency(income.rentReceived || 0)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Other Income</span>
            <span className="font-medium">
              {formatCurrency(income.otherIncome || 0)}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between">
            <span className="font-medium text-gray-900">Total Income</span>
            <span className="font-bold text-lg text-green-600">
              {formatCurrency(income.total || 0)}
            </span>
          </div>

          {property.ownershipShare && property.ownershipShare < 100 && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Your Share ({property.ownershipShare}%)
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(adjustedTotal)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This adjusted amount will be included in your tax return
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Property Allowance Comparison */}
      {(income.total || 0) > 0 && (income.total || 0) <= 1000 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Property Income Allowance Applies</p>
              <p>
                Your property income is £1,000 or less. You can use the Property
                Income Allowance instead of claiming actual expenses. This means
                you won&apos;t need to report this income or pay tax on it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button
          onClick={goNext}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          Continue to Expenses
        </Button>
      </div>
    </div>
  );
}
