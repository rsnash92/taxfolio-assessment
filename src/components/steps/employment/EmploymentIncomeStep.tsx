'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, ArrowLeft, HelpCircle, Info } from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function EmploymentIncomeStep() {
  const { data, currentEmployerId, updateEmployerData, goBack, goToStep } = useWizard();

  // Get current employer data
  const employmentData = currentEmployerId
    ? data.employmentData?.[currentEmployerId] || {}
    : {};

  // Get the income source for this employer
  const incomeSource = data.incomeSources.find(
    (s) => s.id === currentEmployerId
  );

  const handleUpdate = (field: string, value: unknown) => {
    if (!currentEmployerId) return;
    updateEmployerData(currentEmployerId, { [field]: value } as Record<string, unknown>);
  };

  const handleBackToList = () => {
    goToStep('employment-list');
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
          Back to all employers
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#e6fafb] rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[#00c4d4]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pay & Tax</h1>
            <p className="text-sm text-gray-500">
              {employmentData.employerName || incomeSource?.label || 'Employer'}
            </p>
          </div>
        </div>
        <p className="text-gray-600">
          Enter the figures from your P60 or P45 for this employer.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#00c4d4] mt-0.5 flex-shrink-0" />
        <div className="text-sm text-[#00858c]">
          <p className="font-medium">Where to find these figures</p>
          <p>
            Your P60 shows your total pay and tax for the year. If you left this
            employer, check your P45 instead.
          </p>
        </div>
      </div>

      {/* Employer Details */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Employer Details</h3>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="employerName">Employer Name *</Label>
            <Input
              id="employerName"
              placeholder="e.g., Acme Ltd"
              value={employmentData.employerName || ''}
              onChange={(e) => handleUpdate('employerName', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="employerPAYERef" className="flex items-center gap-2">
              Employer PAYE Reference
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Label>
            <p className="text-xs text-gray-500">
              Found on your P60/P45 (e.g., 123/AB12345)
            </p>
            <Input
              id="employerPAYERef"
              placeholder="e.g., 123/AB12345"
              value={employmentData.employerPAYERef || ''}
              onChange={(e) => handleUpdate('employerPAYERef', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date (if this year)</Label>
              <Input
                id="startDate"
                type="date"
                value={employmentData.startDate || ''}
                onChange={(e) => handleUpdate('startDate', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date (if left)</Label>
              <Input
                id="endDate"
                type="date"
                value={employmentData.endDate || ''}
                onChange={(e) => handleUpdate('endDate', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pay & Tax */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Pay & Tax (from P60/P45)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="payReceived" className="flex items-center gap-2">
              Total Pay (Box 1) *
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Label>
            <p className="text-xs text-gray-500">
              &quot;Pay&quot; or &quot;Total for year&quot; on your P60
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="payReceived"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={employmentData.payReceived || ''}
                onChange={(e) =>
                  handleUpdate('payReceived', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="taxDeducted" className="flex items-center gap-2">
              Tax Deducted (Box 2) *
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </Label>
            <p className="text-xs text-gray-500">
              &quot;Tax&quot; or &quot;Tax deducted&quot; on your P60
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="taxDeducted"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={employmentData.taxDeducted || ''}
                onChange={(e) =>
                  handleUpdate('taxDeducted', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="grid gap-2">
          <Label htmlFor="tipsReceived">Tips Received (if any)</Label>
          <p className="text-xs text-gray-500">
            Cash tips not included in your P60
          </p>
          <div className="relative w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              £
            </span>
            <Input
              id="tipsReceived"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="pl-8"
              value={employmentData.tipsReceived || ''}
              onChange={(e) =>
                handleUpdate('tipsReceived', parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
      </div>

      {/* Student Loan */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Student Loan</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={employmentData.hasStudentLoan || false}
            onChange={(e) => handleUpdate('hasStudentLoan', e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 accent-[#00c4d4]"
          />
          <div>
            <p className="font-medium text-gray-900">
              Student loan deducted from this employment
            </p>
            <p className="text-sm text-gray-500">
              Check your P60 - it shows any student loan repayments
            </p>
          </div>
        </label>

        {employmentData.hasStudentLoan && (
          <div className="grid grid-cols-2 gap-4 mt-4 pl-7">
            <div className="grid gap-2">
              <Label htmlFor="studentLoanDeducted">Student Loan Deducted</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="studentLoanDeducted"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={employmentData.studentLoanDeducted || ''}
                  onChange={(e) =>
                    handleUpdate(
                      'studentLoanDeducted',
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="studentLoanPlanType">Loan Plan Type</Label>
              <select
                id="studentLoanPlanType"
                value={employmentData.studentLoanPlanType || ''}
                onChange={(e) =>
                  handleUpdate('studentLoanPlanType', e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select plan</option>
                <option value="1">Plan 1 (pre-2012)</option>
                <option value="2">Plan 2 (post-2012)</option>
                <option value="4">Plan 4 (Scotland)</option>
                <option value="postgrad">Postgraduate</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Benefits in Kind */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Benefits in Kind (P11D)</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={employmentData.hasP11D || false}
            onChange={(e) => handleUpdate('hasP11D', e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 accent-[#00c4d4]"
          />
          <div>
            <p className="font-medium text-gray-900">
              I received benefits in kind from this employer
            </p>
            <p className="text-sm text-gray-500">
              Company car, private medical insurance, etc. (check P11D)
            </p>
          </div>
        </label>

        {employmentData.hasP11D && (
          <div className="grid grid-cols-2 gap-4 mt-4 pl-7">
            <div className="grid gap-2">
              <Label htmlFor="companyCarBenefit">Company Car Benefit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="companyCarBenefit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={employmentData.companyCarBenefit || ''}
                  onChange={(e) =>
                    handleUpdate(
                      'companyCarBenefit',
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fuelBenefit">Fuel Benefit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="fuelBenefit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={employmentData.fuelBenefit || ''}
                  onChange={(e) =>
                    handleUpdate('fuelBenefit', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="medicalInsuranceBenefit">Medical Insurance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="medicalInsuranceBenefit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={employmentData.medicalInsuranceBenefit || ''}
                  onChange={(e) =>
                    handleUpdate(
                      'medicalInsuranceBenefit',
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="otherBenefits">Other Benefits</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  £
                </span>
                <Input
                  id="otherBenefits"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={employmentData.otherBenefits || ''}
                  onChange={(e) =>
                    handleUpdate('otherBenefits', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {(employmentData.payReceived || employmentData.taxDeducted) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Pay</span>
              <span className="font-medium">
                {formatCurrency(employmentData.payReceived || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax Already Paid</span>
              <span className="font-medium text-[#00c4d4]">
                {formatCurrency(employmentData.taxDeducted || 0)}
              </span>
            </div>
            {(employmentData.tipsReceived || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tips</span>
                <span className="font-medium">
                  {formatCurrency(employmentData.tipsReceived || 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <Button variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button
          onClick={() => {
            // Mark as complete and go back to list
            handleUpdate('isComplete', true);
            goToStep('employment-list');
          }}
          className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
          disabled={!employmentData.employerName || !employmentData.payReceived}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
