'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Plus, Trash2, AlertCircle, HelpCircle } from 'lucide-react';
import { CISContractor } from '@/types/wizard';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function CISIncomeStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const existingContractors = data.cisData?.contractors || [];
  const [contractors, setContractors] = useState<Partial<CISContractor>[]>(
    existingContractors.length > 0
      ? existingContractors
      : [{ id: generateId(), contractorName: '', grossPayments: 0, cisDeductions: 0, netPayments: 0 }]
  );

  const addContractor = () => {
    setContractors([
      ...contractors,
      { id: generateId(), contractorName: '', grossPayments: 0, cisDeductions: 0, netPayments: 0 },
    ]);
  };

  const removeContractor = (id: string) => {
    if (contractors.length > 1) {
      setContractors(contractors.filter((c) => c.id !== id));
    }
  };

  const updateContractor = (id: string, field: string, value: unknown) => {
    setContractors(
      contractors.map((c) => {
        if (c.id !== id) return c;

        const updated = { ...c, [field]: value };

        // Calculate net payments
        const gross = (updated.grossPayments as number) || 0;
        const deductions = (updated.cisDeductions as number) || 0;
        updated.netPayments = gross - deductions;

        return updated;
      })
    );
  };

  // Calculate totals
  const totalGross = contractors.reduce((sum, c) => sum + ((c.grossPayments as number) || 0), 0);
  const totalDeductions = contractors.reduce((sum, c) => sum + ((c.cisDeductions as number) || 0), 0);
  const totalNet = totalGross - totalDeductions;

  const handleContinue = () => {
    updateData({
      cisData: {
        contractors: contractors as CISContractor[],
        totalGross,
        totalDeductions,
        totalNet,
        hasAllCISStatements: true,
      },
    });
    goNext();
  };

  const isValid = contractors.every(
    (c) => c.contractorName && (c.grossPayments || 0) > 0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <HardHat className="h-5 w-5 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CIS Income</h1>
        </div>
        <p className="text-gray-600">
          Enter details from your CIS payment and deduction statements for each
          contractor you worked for.
        </p>
      </div>

      {/* Important Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-1">Important</p>
          <p>
            CIS deductions are tax you&apos;ve already paid. We&apos;ll reclaim any
            overpayment when we submit your return. Make sure you have all your
            CIS statements to hand.
          </p>
        </div>
      </div>

      {/* Contractors List */}
      <div className="space-y-6">
        {contractors.map((contractor, index) => (
          <div
            key={contractor.id}
            className="bg-white border border-gray-200 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <HardHat className="h-5 w-5 text-orange-600" />
                </div>
                <span className="font-medium text-gray-900">
                  Contractor {index + 1}
                </span>
              </div>
              {contractors.length > 1 && (
                <button
                  onClick={() => removeContractor(contractor.id!)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Contractor Name */}
              <div className="grid gap-2">
                <Label htmlFor={`name-${contractor.id}`}>Contractor Name *</Label>
                <Input
                  id={`name-${contractor.id}`}
                  value={contractor.contractorName || ''}
                  onChange={(e) =>
                    updateContractor(contractor.id!, 'contractorName', e.target.value)
                  }
                  placeholder="e.g., ABC Construction Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Gross Payments */}
                <div className="grid gap-2">
                  <Label
                    htmlFor={`gross-${contractor.id}`}
                    className="flex items-center gap-2"
                  >
                    Gross Payments *
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Label>
                  <p className="text-xs text-gray-500">
                    Total before CIS deductions
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      £
                    </span>
                    <Input
                      id={`gross-${contractor.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      value={contractor.grossPayments || ''}
                      onChange={(e) =>
                        updateContractor(
                          contractor.id!,
                          'grossPayments',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {/* CIS Deductions */}
                <div className="grid gap-2">
                  <Label
                    htmlFor={`deductions-${contractor.id}`}
                    className="flex items-center gap-2"
                  >
                    CIS Deducted *
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </Label>
                  <p className="text-xs text-gray-500">
                    Tax deducted (usually 20%)
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      £
                    </span>
                    <Input
                      id={`deductions-${contractor.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      value={contractor.cisDeductions || ''}
                      onChange={(e) =>
                        updateContractor(
                          contractor.id!,
                          'cisDeductions',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Materials */}
              <div className="grid gap-2">
                <Label htmlFor={`materials-${contractor.id}`}>
                  Materials Cost Deducted (optional)
                </Label>
                <p className="text-xs text-gray-500">
                  If contractor deducted materials from your payment
                </p>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    £
                  </span>
                  <Input
                    id={`materials-${contractor.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8"
                    value={contractor.materialsDeducted || ''}
                    onChange={(e) =>
                      updateContractor(
                        contractor.id!,
                        'materialsDeducted',
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>

              {/* Net Amount */}
              {(contractor.grossPayments || 0) > 0 && (
                <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-600">Net received:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(contractor.netPayments || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Contractor Button */}
      <Button variant="outline" onClick={addContractor} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Another Contractor
      </Button>

      {/* Totals Summary */}
      {totalGross > 0 && (
        <div className="bg-[#e6fafb] border border-[#99ebef] rounded-xl p-6">
          <h3 className="font-semibold text-[#004a4e] mb-4">CIS Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Gross CIS Income</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(totalGross)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total CIS Tax Deducted</span>
              <span className="font-semibold text-[#00c4d4]">
                {formatCurrency(totalDeductions)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#99ebef]">
              <span className="font-medium text-gray-900">Net Received</span>
              <span className="font-bold text-gray-900">
                {formatCurrency(totalNet)}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#00a8b0] mt-4">
            The {formatCurrency(totalDeductions)} CIS tax you&apos;ve already paid
            will be offset against your final tax bill.
          </p>
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
            onClick={handleContinue}
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155]"
            disabled={!isValid}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
