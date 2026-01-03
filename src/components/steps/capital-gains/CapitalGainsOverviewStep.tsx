'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Button } from '@/components/ui/button';
import { TrendingUp, Home, Bitcoin, BarChart3, Check, Info } from 'lucide-react';

const ASSET_TYPES = [
  {
    id: 'shares',
    label: 'Shares & Investments',
    description: 'Stocks, funds, bonds',
    icon: BarChart3,
  },
  {
    id: 'property',
    label: 'Property',
    description: 'Buy-to-let, second homes',
    icon: Home,
  },
  {
    id: 'crypto',
    label: 'Cryptocurrency',
    description: 'Bitcoin, Ethereum, etc.',
    icon: Bitcoin,
  },
  {
    id: 'other',
    label: 'Other Assets',
    description: 'Art, collectibles, etc.',
    icon: TrendingUp,
  },
];

const ANNUAL_EXEMPT_AMOUNT = 3000; // 2024/25

export function CapitalGainsOverviewStep() {
  const { data, updateData, goNext, goBack, canGoBack } = useWizard();

  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    data.capitalGainsData?.assetTypes || []
  );

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    updateData({
      capitalGainsData: {
        ...data.capitalGainsData,
        assetTypes: selectedTypes,
        annualExemptAmount: ANNUAL_EXEMPT_AMOUNT,
      },
    });
    goNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Capital Gains</h1>
        </div>
        <p className="text-gray-600">
          What types of assets did you sell during 2024/25?
        </p>
      </div>

      {/* Annual Exempt Amount Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">
            Annual Exempt Amount 2024/25: £{ANNUAL_EXEMPT_AMOUNT.toLocaleString()}
          </p>
          <p>
            The first £{ANNUAL_EXEMPT_AMOUNT.toLocaleString()} of gains is
            tax-free. Gains above this are taxed at:
          </p>
          <ul className="list-disc list-inside mt-1">
            <li>10% (basic rate) or 20% (higher rate) for most assets</li>
            <li>18% (basic rate) or 24% (higher rate) for residential property</li>
          </ul>
        </div>
      </div>

      {/* Asset Type Selection */}
      <div className="grid grid-cols-2 gap-4">
        {ASSET_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedTypes.includes(type.id);

          return (
            <button
              key={type.id}
              onClick={() => toggleType(type.id)}
              className={`relative flex flex-col items-start p-5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              <Icon
                className={`h-8 w-8 mb-3 ${
                  isSelected ? 'text-violet-600' : 'text-gray-400'
                }`}
              />

              <p
                className={`font-medium ${
                  isSelected ? 'text-violet-900' : 'text-gray-900'
                }`}
              >
                {type.label}
              </p>
              <p className="text-sm text-gray-500">{type.description}</p>
            </button>
          );
        })}
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
            className="bg-emerald-500 hover:bg-emerald-600"
            disabled={selectedTypes.length === 0}
          >
            {selectedTypes.length > 0
              ? 'Continue'
              : 'Select at least one asset type'}
          </Button>
        </div>
      </div>
    </div>
  );
}
