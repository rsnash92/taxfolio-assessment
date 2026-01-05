'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PoundSterling, Laptop, Car, Package } from 'lucide-react';

export function SelfEmploymentCapitalAllowancesStep() {
  const { currentBusinessId, data, updateBusinessData } = useWizard();

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);
  const businessName = businessData.businessName || incomeSource?.label || 'My Business';

  const capitalAllowances = businessData.capitalAllowances || {
    equipment: 0,
    vehicles: 0,
    other: 0,
    total: 0,
  };

  const handleChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newAllowances = {
      ...capitalAllowances,
      [field]: numValue,
    };
    newAllowances.total = newAllowances.equipment + newAllowances.vehicles + newAllowances.other;

    updateBusinessData(currentBusinessId, {
      capitalAllowances: newAllowances,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Capital Allowances
        </h1>
        <p className="text-gray-600">
          Capital allowances let you deduct the cost of business assets from your profits before tax. This applies to {businessName}.
        </p>
      </div>

      {/* Total Card */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
            <PoundSterling className="h-6 w-6 text-[#00e3ec]" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total Capital Allowances</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(capitalAllowances.total)}</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">What qualifies?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>&bull; Equipment, machinery, and tools used for your business</li>
          <li>&bull; Vehicles used for business (you can claim AIA or writing down allowances)</li>
          <li>&bull; Computers, software, and office furniture</li>
          <li>&bull; The Annual Investment Allowance (AIA) lets you claim up to £1,000,000 per year</li>
        </ul>
      </div>

      {/* Allowance Categories */}
      <div className="space-y-4">
        {/* Equipment */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Laptop className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <Label htmlFor="equipment" className="text-base font-medium">
                Equipment & Machinery
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Computers, tools, office equipment, machinery
              </p>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  id="equipment"
                  type="number"
                  className="pl-7"
                  placeholder="0.00"
                  value={capitalAllowances.equipment || ''}
                  onChange={(e) => handleChange('equipment', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vehicles */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <Label htmlFor="vehicles" className="text-base font-medium">
                Vehicles
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Cars, vans, or other vehicles used for business
              </p>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  id="vehicles"
                  type="number"
                  className="pl-7"
                  placeholder="0.00"
                  value={capitalAllowances.vehicles || ''}
                  onChange={(e) => handleChange('vehicles', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Other */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <Label htmlFor="other" className="text-base font-medium">
                Other Capital Allowances
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Any other qualifying assets not listed above
              </p>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  id="other"
                  type="number"
                  className="pl-7"
                  placeholder="0.00"
                  value={capitalAllowances.other || ''}
                  onChange={(e) => handleChange('other', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <WizardNavigation canContinue={true} />
      </div>
    </div>
  );
}
