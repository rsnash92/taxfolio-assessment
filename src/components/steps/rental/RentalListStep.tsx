'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Home, Plus, ChevronRight, Trash2, Building2 } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function RentalListStep() {
  const {
    data,
    goNext,
    goBack,
    goToPropertyStep,
    canGoBack,
    addIncomeSource,
    deleteIncomeSource,
  } = useWizard();

  // Get all rental properties from income sources
  const rentalProperties = data.incomeSources.filter(
    (source) => source.type === 'rental'
  );

  const handleAddProperty = () => {
    const newProperty = {
      type: 'rental',
      label: `Property ${rentalProperties.length + 1}`,
      data: {},
    };
    addIncomeSource(newProperty);
  };

  const handleEditProperty = (propertyId: string) => {
    goToPropertyStep(propertyId, 'rental-details');
  };

  const handleDeleteProperty = (propertyId: string) => {
    if (confirm('Are you sure you want to remove this property?')) {
      deleteIncomeSource(propertyId);
    }
  };

  const getPropertyStatus = (propertyId: string) => {
    const propertyData = data.rentalData[propertyId];
    if (!propertyData) return 'not_started';

    // Check if all required fields are filled
    if (
      propertyData.address &&
      propertyData.income?.total !== undefined &&
      propertyData.expenses?.total !== undefined
    ) {
      return 'completed';
    }

    // Check if any data has been entered
    if (
      propertyData.address ||
      propertyData.income?.total ||
      propertyData.expenses?.total
    ) {
      return 'in_progress';
    }

    return 'not_started';
  };

  const getPropertySummary = (propertyId: string) => {
    const propertyData = data.rentalData[propertyId];
    if (!propertyData) return null;

    return {
      income: propertyData.income?.total || 0,
      expenses: propertyData.expenses?.total || 0,
      profit:
        (propertyData.income?.total || 0) - (propertyData.expenses?.total || 0),
    };
  };

  // Calculate totals across all properties
  const totals = rentalProperties.reduce(
    (acc, property) => {
      const summary = getPropertySummary(property.id);
      if (summary) {
        acc.income += summary.income;
        acc.expenses += summary.expenses;
        acc.profit += summary.profit;
      }
      return acc;
    },
    { income: 0, expenses: 0, profit: 0 }
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rental Properties
          </h1>
        </div>
        <p className="text-gray-600">
          Add details for each rental property you received income from during
          the tax year. This information will be used to complete the SA105
          supplementary pages of your tax return.
        </p>
      </div>

      {/* Property Allowance Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <h3 className="font-medium text-purple-900 mb-2">
          Property Income Allowance
        </h3>
        <p className="text-sm text-purple-700">
          If your total property income is less than £1,000, you don&apos;t need
          to report it. If your income is over £1,000, you can either claim the
          £1,000 allowance or deduct your actual expenses - whichever is more
          beneficial.
        </p>
      </div>

      {/* Properties List */}
      <div className="space-y-4">
        {rentalProperties.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed border-gray-200 rounded-xl">
            <Home className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No properties added yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add your first rental property to get started
            </p>
            <Button onClick={handleAddProperty} className="bg-purple-500 hover:bg-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        ) : (
          <>
            {rentalProperties.map((property) => {
              const status = getPropertyStatus(property.id);
              const summary = getPropertySummary(property.id);
              const propertyData = data.rentalData[property.id];

              return (
                <div
                  key={property.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Home className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {propertyData?.address || property.label}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : status === 'in_progress'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {status === 'completed'
                              ? 'Complete'
                              : status === 'in_progress'
                              ? 'In Progress'
                              : 'Not Started'}
                          </span>
                        </div>
                        {propertyData?.propertyType && (
                          <p className="text-sm text-gray-500 mb-2">
                            {propertyData.propertyType === 'residential'
                              ? 'Residential'
                              : propertyData.propertyType === 'commercial'
                              ? 'Commercial'
                              : 'Furnished Holiday Let'}
                            {propertyData.ownershipShare &&
                              propertyData.ownershipShare < 100 &&
                              ` • ${propertyData.ownershipShare}% ownership`}
                          </p>
                        )}

                        {summary && (summary.income > 0 || summary.expenses > 0) && (
                          <div className="flex gap-6 text-sm mt-2">
                            <div>
                              <span className="text-gray-500">Income: </span>
                              <span className="font-medium text-green-600">
                                {formatCurrency(summary.income)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Expenses: </span>
                              <span className="font-medium text-red-500">
                                {formatCurrency(summary.expenses)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Profit: </span>
                              <span
                                className={`font-medium ${
                                  summary.profit >= 0
                                    ? 'text-[#00c4d4]'
                                    : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(summary.profit)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDeleteProperty(property.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove property"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Button
                        variant="ghost"
                        onClick={() => handleEditProperty(property.id)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        {status === 'not_started' ? 'Start' : 'Edit'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add another property */}
            <button
              onClick={handleAddProperty}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Another Property
            </button>
          </>
        )}
      </div>

      {/* Totals Summary */}
      {rentalProperties.length > 0 && (totals.income > 0 || totals.expenses > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Total Across All Properties
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Income</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totals.income)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-red-500">
                {formatCurrency(totals.expenses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Net Profit</p>
              <p
                className={`text-xl font-bold ${
                  totals.profit >= 0 ? 'text-[#00c4d4]' : 'text-red-600'
                }`}
              >
                {formatCurrency(totals.profit)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        {canGoBack && (
          <Button variant="outline" onClick={goBack}>
            Back
          </Button>
        )}
        <div className="ml-auto">
          <Button
            onClick={goNext}
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
            disabled={rentalProperties.length === 0}
          >
            {rentalProperties.length === 0 ? 'Add a Property to Continue' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
