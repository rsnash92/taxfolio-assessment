'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Building2, Plus, ChevronRight, Trash2 } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function EmploymentListStep() {
  const {
    data,
    goNext,
    goBack,
    canGoBack,
    addIncomeSource,
    deleteIncomeSource,
    goToEmployerStep,
  } = useWizard();

  // Get all employment sources from income sources
  const employments = data.incomeSources.filter(
    (source) => source.type === 'employment'
  );

  const handleAddEmployment = () => {
    const newEmployment = {
      type: 'employment',
      label: `Employer ${employments.length + 1}`,
      data: {},
    };
    addIncomeSource(newEmployment);
  };

  const handleEditEmployment = (employmentId: string) => {
    // Set current employment and navigate to income step
    goToEmployerStep(employmentId, 'employment-income');
  };

  const handleDeleteEmployment = (employmentId: string) => {
    if (confirm('Are you sure you want to remove this employer?')) {
      deleteIncomeSource(employmentId);
    }
  };

  const getEmploymentStatus = (employmentId: string) => {
    const employmentData = data.employmentData?.[employmentId];
    if (!employmentData) return 'not_started';

    if (
      employmentData.employerName &&
      employmentData.payReceived !== undefined &&
      employmentData.taxDeducted !== undefined
    ) {
      return 'completed';
    }

    if (employmentData.employerName || employmentData.payReceived) {
      return 'in_progress';
    }

    return 'not_started';
  };

  const getEmploymentSummary = (employmentId: string) => {
    const employmentData = data.employmentData?.[employmentId];
    if (!employmentData) return null;

    return {
      pay: employmentData.payReceived || 0,
      tax: employmentData.taxDeducted || 0,
    };
  };

  // Calculate totals
  const totals = employments.reduce(
    (acc, employment) => {
      const summary = getEmploymentSummary(employment.id);
      if (summary) {
        acc.totalPay += summary.pay;
        acc.totalTax += summary.tax;
      }
      return acc;
    },
    { totalPay: 0, totalTax: 0 }
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Employment Income</h1>
        </div>
        <p className="text-gray-600">
          Add details for each employer you worked for during the tax year. This
          information is reported on the SA102 supplementary pages.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-medium text-blue-900 mb-2">What you&apos;ll need</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>P60 (end of year certificate) from each employer</li>
          <li>P45 if you left an employer during the year</li>
          <li>P11D if you received benefits in kind</li>
        </ul>
      </div>

      {/* Employers List */}
      <div className="space-y-4">
        {employments.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-dashed border-gray-200 rounded-xl">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No employers added yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add your first employer to get started
            </p>
            <Button onClick={handleAddEmployment} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Employer
            </Button>
          </div>
        ) : (
          <>
            {employments.map((employment) => {
              const status = getEmploymentStatus(employment.id);
              const summary = getEmploymentSummary(employment.id);
              const employmentData = data.employmentData?.[employment.id];

              return (
                <div
                  key={employment.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {employmentData?.employerName || employment.label}
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
                        {employmentData?.employerPAYERef && (
                          <p className="text-sm text-gray-500 mb-2">
                            PAYE Ref: {employmentData.employerPAYERef}
                          </p>
                        )}

                        {summary && (summary.pay > 0 || summary.tax > 0) && (
                          <div className="flex gap-6 text-sm mt-2">
                            <div>
                              <span className="text-gray-500">Pay: </span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(summary.pay)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Tax paid: </span>
                              <span className="font-medium text-[#00c4d4]">
                                {formatCurrency(summary.tax)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDeleteEmployment(employment.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove employer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Button
                        variant="ghost"
                        onClick={() => handleEditEmployment(employment.id)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        {status === 'not_started' ? 'Start' : 'Edit'}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add another employer */}
            <button
              onClick={handleAddEmployment}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Another Employer
            </button>
          </>
        )}
      </div>

      {/* Totals Summary */}
      {employments.length > 0 && (totals.totalPay > 0 || totals.totalTax > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Total Across All Employers
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Pay</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.totalPay)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Tax Paid</p>
              <p className="text-xl font-bold text-[#00c4d4]">
                {formatCurrency(totals.totalTax)}
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
            disabled={employments.length === 0}
          >
            {employments.length === 0 ? 'Add an Employer to Continue' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
