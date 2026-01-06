'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { CapitalGainsDisposal } from '@/types/wizard';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const ALL_ASSET_TYPES = ['shares', 'property', 'crypto', 'other'] as const;

const ASSET_TYPE_LABELS: Record<string, string> = {
  shares: 'Shares & Investments',
  property: 'Property',
  crypto: 'Cryptocurrency',
  other: 'Other Assets',
};

export function CapitalGainsDisposalsStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const existingDisposals = data.capitalGainsData?.disposals || [];

  const [disposals, setDisposals] = useState<Partial<CapitalGainsDisposal>[]>(
    existingDisposals.length > 0
      ? existingDisposals
      : [
          {
            id: generateId(),
            assetType: 'shares' as CapitalGainsDisposal['assetType'],
            assetDescription: '',
            dateSold: '',
            proceedsAmount: 0,
            acquisitionCost: 0,
            allowableCosts: 0,
            gain: 0,
            loss: 0,
          },
        ]
  );

  const addDisposal = () => {
    setDisposals([
      ...disposals,
      {
        id: generateId(),
        assetType: 'shares' as CapitalGainsDisposal['assetType'],
        assetDescription: '',
        dateSold: '',
        proceedsAmount: 0,
        acquisitionCost: 0,
        allowableCosts: 0,
        gain: 0,
        loss: 0,
      },
    ]);
  };

  const removeDisposal = (id: string) => {
    if (disposals.length > 1) {
      setDisposals(disposals.filter((d) => d.id !== id));
    }
  };

  const updateDisposal = (id: string, field: string, value: unknown) => {
    setDisposals(
      disposals.map((d) => {
        if (d.id !== id) return d;

        const updated = { ...d, [field]: value };

        // Calculate gain/loss
        const proceeds = (updated.proceedsAmount as number) || 0;
        const cost = (updated.acquisitionCost as number) || 0;
        const fees = (updated.allowableCosts as number) || 0;
        const gainOrLoss = proceeds - cost - fees;

        updated.gain = gainOrLoss > 0 ? gainOrLoss : 0;
        updated.loss = gainOrLoss < 0 ? Math.abs(gainOrLoss) : 0;

        return updated;
      })
    );
  };

  // Calculate totals
  const totalGains = disposals.reduce((sum, d) => sum + ((d.gain as number) || 0), 0);
  const totalLosses = disposals.reduce((sum, d) => sum + ((d.loss as number) || 0), 0);
  const netGain = totalGains - totalLosses;

  const handleContinue = () => {
    updateData({
      capitalGainsData: {
        ...data.capitalGainsData,
        disposals: disposals as CapitalGainsDisposal[],
        totalGains,
        totalLosses,
      },
    });
    goNext();
  };

  const isValid = disposals.every(
    (d) =>
      d.assetDescription &&
      d.dateSold &&
      (d.proceedsAmount || 0) > 0 &&
      (d.acquisitionCost || 0) > 0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#e6fafb] rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-[#00c4d4]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Capital Gains</h1>
        </div>
        <p className="text-gray-600">
          Enter details of each asset you sold during 2024/25.
        </p>
      </div>

      {/* Disposals List */}
      <div className="space-y-6">
        {disposals.map((disposal, index) => {
          const gainOrLoss =
            ((disposal.proceedsAmount as number) || 0) -
            ((disposal.acquisitionCost as number) || 0) -
            ((disposal.allowableCosts as number) || 0);
          const isGain = gainOrLoss > 0;

          return (
            <div
              key={disposal.id}
              className="bg-white border border-gray-200 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-gray-900">
                  Disposal {index + 1}
                </span>
                <div className="flex items-center gap-3">
                  {gainOrLoss !== 0 && (
                    <span
                      className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${
                        isGain
                          ? 'bg-[#ccf5f7] text-[#00a8b0]'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isGain ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatCurrency(Math.abs(gainOrLoss))}
                    </span>
                  )}
                  {disposals.length > 1 && (
                    <button
                      onClick={() => removeDisposal(disposal.id!)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Asset Type */}
                <div className="grid gap-2">
                  <Label htmlFor={`type-${disposal.id}`}>Asset type</Label>
                  <select
                    id={`type-${disposal.id}`}
                    value={disposal.assetType || 'shares'}
                    onChange={(e) =>
                      updateDisposal(disposal.id!, 'assetType', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {ALL_ASSET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ASSET_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor={`desc-${disposal.id}`}>Description *</Label>
                  <Input
                    id={`desc-${disposal.id}`}
                    value={disposal.assetDescription || ''}
                    onChange={(e) =>
                      updateDisposal(disposal.id!, 'assetDescription', e.target.value)
                    }
                    placeholder="e.g. Apple Inc shares"
                  />
                </div>

                {/* Date Sold */}
                <div className="grid gap-2">
                  <Label htmlFor={`date-${disposal.id}`}>Date sold *</Label>
                  <Input
                    id={`date-${disposal.id}`}
                    type="date"
                    value={disposal.dateSold || ''}
                    onChange={(e) =>
                      updateDisposal(disposal.id!, 'dateSold', e.target.value)
                    }
                  />
                </div>

                {/* Sale Proceeds */}
                <div className="grid gap-2">
                  <Label htmlFor={`proceeds-${disposal.id}`}>Sale proceeds *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      £
                    </span>
                    <Input
                      id={`proceeds-${disposal.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      value={disposal.proceedsAmount || ''}
                      onChange={(e) =>
                        updateDisposal(
                          disposal.id!,
                          'proceedsAmount',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {/* Acquisition Cost */}
                <div className="grid gap-2">
                  <Label htmlFor={`cost-${disposal.id}`}>Original cost *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      £
                    </span>
                    <Input
                      id={`cost-${disposal.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      value={disposal.acquisitionCost || ''}
                      onChange={(e) =>
                        updateDisposal(
                          disposal.id!,
                          'acquisitionCost',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>

                {/* Allowable Costs */}
                <div className="grid gap-2">
                  <Label htmlFor={`fees-${disposal.id}`}>Fees & costs</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      £
                    </span>
                    <Input
                      id={`fees-${disposal.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-8"
                      value={disposal.allowableCosts || ''}
                      onChange={(e) =>
                        updateDisposal(
                          disposal.id!,
                          'allowableCosts',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Disposal Button */}
      <Button variant="outline" onClick={addDisposal} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Another Disposal
      </Button>

      {/* Summary */}
      {(totalGains > 0 || totalLosses > 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total gains</span>
              <span className="font-medium text-[#00c4d4]">
                {formatCurrency(totalGains)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total losses</span>
              <span className="font-medium text-red-500">
                {formatCurrency(totalLosses)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Net position</span>
              <span
                className={`font-bold ${
                  netGain >= 0 ? 'text-[#00c4d4]' : 'text-red-500'
                }`}
              >
                {formatCurrency(netGain)}
              </span>
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
