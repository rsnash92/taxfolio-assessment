'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Landmark,
  Plus,
  Trash2,
  Info,
  Building2,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

interface PrivatePension {
  id: string;
  providerName: string;
  pensionAmount: number;
  taxDeducted: number;
  isLumpSum: boolean;
}

export function PensionIncomeStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const pensionData = data.pensionIncomeData || {
    statePension: 0,
    statePensionLumpSum: 0,
    privatePensions: [],
    totalPensionIncome: 0,
    totalTaxDeducted: 0,
  };

  const privatePensions: PrivatePension[] = pensionData.privatePensions || [];

  // Calculate totals
  const statePensionTotal =
    (pensionData.statePension || 0) + (pensionData.statePensionLumpSum || 0);
  const privatePensionTotal = privatePensions.reduce(
    (sum, p) => sum + (p.pensionAmount || 0),
    0
  );
  const totalTaxDeducted = privatePensions.reduce(
    (sum, p) => sum + (p.taxDeducted || 0),
    0
  );
  const totalPensionIncome = statePensionTotal + privatePensionTotal;

  const handleStatePensionUpdate = (field: string, value: number) => {
    updateData({
      pensionIncomeData: {
        ...pensionData,
        [field]: value,
        totalPensionIncome:
          field === 'statePension'
            ? value + (pensionData.statePensionLumpSum || 0) + privatePensionTotal
            : field === 'statePensionLumpSum'
              ? (pensionData.statePension || 0) + value + privatePensionTotal
              : totalPensionIncome,
      },
    });
  };

  const handleAddPension = () => {
    const newPension: PrivatePension = {
      id: `pension-${Date.now()}`,
      providerName: '',
      pensionAmount: 0,
      taxDeducted: 0,
      isLumpSum: false,
    };

    updateData({
      pensionIncomeData: {
        ...pensionData,
        privatePensions: [...privatePensions, newPension],
      },
    });
  };

  const handleUpdatePension = (
    id: string,
    field: keyof PrivatePension,
    value: string | number | boolean
  ) => {
    const updated = privatePensions.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );

    const newPrivateTotal = updated.reduce(
      (sum, p) => sum + (p.pensionAmount || 0),
      0
    );
    const newTaxTotal = updated.reduce(
      (sum, p) => sum + (p.taxDeducted || 0),
      0
    );

    updateData({
      pensionIncomeData: {
        ...pensionData,
        privatePensions: updated,
        totalPensionIncome: statePensionTotal + newPrivateTotal,
        totalTaxDeducted: newTaxTotal,
      },
    });
  };

  const handleRemovePension = (id: string) => {
    const updated = privatePensions.filter((p) => p.id !== id);

    const newPrivateTotal = updated.reduce(
      (sum, p) => sum + (p.pensionAmount || 0),
      0
    );
    const newTaxTotal = updated.reduce(
      (sum, p) => sum + (p.taxDeducted || 0),
      0
    );

    updateData({
      pensionIncomeData: {
        ...pensionData,
        privatePensions: updated,
        totalPensionIncome: statePensionTotal + newPrivateTotal,
        totalTaxDeducted: newTaxTotal,
      },
    });
  };

  const handleContinue = () => {
    updateData({
      pensionIncomeData: {
        ...pensionData,
        totalPensionIncome,
        totalTaxDeducted,
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Landmark className="h-5 w-5 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pension Income</h1>
        </div>
        <p className="text-gray-600">
          Enter your State Pension and any private or workplace pension income
          you received.
        </p>
      </div>

      {/* State Pension Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Landmark className="h-4 w-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">State Pension</h2>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          The State Pension is taxable but paid without tax deducted. You can
          find your annual amount on your State Pension letter or online account.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="statePension">Annual State Pension</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="statePension"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={pensionData.statePension || ''}
                onChange={(e) =>
                  handleStatePensionUpdate(
                    'statePension',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <p className="text-xs text-gray-400">
              Full new State Pension is £11,502.40 for 2024/25
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statePensionLumpSum">
              State Pension Lump Sum (if any)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                £
              </span>
              <Input
                id="statePensionLumpSum"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={pensionData.statePensionLumpSum || ''}
                onChange={(e) =>
                  handleStatePensionUpdate(
                    'statePensionLumpSum',
                    parseFloat(e.target.value) || 0
                  )
                }
              />
            </div>
            <p className="text-xs text-gray-400">
              If you deferred your State Pension
            </p>
          </div>
        </div>
      </div>

      {/* Private Pensions Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Private & Workplace Pensions
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddPension}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pension
          </Button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Include all private, workplace, and personal pensions you received.
          You&apos;ll find the amounts on your P60 or pension statement.
        </p>

        {privatePensions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No private pensions added yet</p>
            <p className="text-sm">
              Click &quot;Add Pension&quot; to add a pension provider
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {privatePensions.map((pension, index) => (
              <div
                key={pension.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">
                    Pension {index + 1}
                  </h3>
                  <button
                    onClick={() => handleRemovePension(pension.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Pension Provider Name</Label>
                    <Input
                      placeholder="e.g., Aviva, Scottish Widows"
                      value={pension.providerName}
                      onChange={(e) =>
                        handleUpdatePension(
                          pension.id,
                          'providerName',
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Pension Amount Received</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          £
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          value={pension.pensionAmount || ''}
                          onChange={(e) =>
                            handleUpdatePension(
                              pension.id,
                              'pensionAmount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tax Deducted</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          £
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          value={pension.taxDeducted || ''}
                          onChange={(e) =>
                            handleUpdatePension(
                              pension.id,
                              'taxDeducted',
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>This is a lump sum payment</Label>
                      <p className="text-xs text-gray-500">
                        e.g., tax-free lump sum or pension commencement
                      </p>
                    </div>
                    <Switch
                      checked={pension.isLumpSum}
                      onCheckedChange={(checked) =>
                        handleUpdatePension(pension.id, 'isLumpSum', checked)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Tax-Free Pension Lump Sums</p>
          <p>
            You can usually take up to 25% of your pension pot as a tax-free
            lump sum. This doesn&apos;t need to be reported. Only enter the
            taxable pension income here.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 text-white rounded-xl p-6">
        <h3 className="font-semibold mb-4">Pension Income Summary</h3>

        <div className="space-y-3 text-sm">
          {(pensionData.statePension || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">State Pension</span>
              <span>{formatCurrency(pensionData.statePension || 0)}</span>
            </div>
          )}
          {(pensionData.statePensionLumpSum || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">State Pension Lump Sum</span>
              <span>{formatCurrency(pensionData.statePensionLumpSum || 0)}</span>
            </div>
          )}
          {privatePensions.map((pension) =>
            pension.pensionAmount > 0 ? (
              <div key={pension.id} className="flex justify-between">
                <span className="text-gray-300">
                  {pension.providerName || 'Private Pension'}
                </span>
                <span>{formatCurrency(pension.pensionAmount)}</span>
              </div>
            ) : null
          )}

          <div className="flex justify-between pt-3 border-t border-gray-700">
            <span className="font-medium">Total Pension Income</span>
            <span className="font-bold text-lg">
              {formatCurrency(totalPensionIncome)}
            </span>
          </div>

          {totalTaxDeducted > 0 && (
            <div className="flex justify-between text-[#33e9f0]">
              <span>Tax Already Deducted</span>
              <span>{formatCurrency(totalTaxDeducted)}</span>
            </div>
          )}
        </div>
      </div>

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
            className="bg-[#00e3ec] hover:bg-[#00c4d4]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
