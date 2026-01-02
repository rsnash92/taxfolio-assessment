'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HelpCircle, Check } from 'lucide-react';

export function SelfEmploymentBasicsStep() {
  const { currentBusinessId, data, updateBusinessData, updateIncomeSource, goNext } = useWizard();

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);

  const handleChange = (field: string, value: string) => {
    updateBusinessData(currentBusinessId, { [field]: value });

    // Also update the income source label if business name changes
    if (field === 'businessName' && incomeSource) {
      updateIncomeSource(currentBusinessId, {
        label: value || 'My Business',
        data: { ...incomeSource.data, businessName: value },
      });
    }
  };

  const isValid = !!businessData.businessName && !!businessData.businessDescription;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Card Container */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        {/* Header with tax year badge and required indicator */}
        <div className="flex items-center justify-between mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-red-50 text-red-600 text-sm font-medium border border-red-100">
            Between 06/04/2024 and 05/04/2025
          </span>
          <span className="text-red-500 text-sm font-medium flex items-center gap-1">
            <span className="text-red-400">*</span> Required
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">The basics</h1>
        <p className="text-gray-500 mb-8">Let&apos;s get to know each other.</p>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Self-employment name */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-gray-700 font-medium">
              Self-employment name
              <span className="text-red-500">*</span>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-gray-500 text-sm">
              Your name, or the name of your business.
            </p>
            <Input
              placeholder=""
              value={businessData.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className="h-12 text-base border-gray-200 rounded-lg"
            />
          </div>

          {/* Business description */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-gray-700 font-medium">
              How would you describe your business?
              <span className="text-red-500">*</span>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-gray-500 text-sm">
              We just need a brief description of what your business or self-employment does.
            </p>
            <Input
              placeholder=""
              value={businessData.businessDescription || ''}
              onChange={(e) => handleChange('businessDescription', e.target.value)}
              className="h-12 text-base border-gray-200 rounded-lg"
            />
          </div>

          {/* Business postcode */}
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-gray-700 font-medium">
              What is the postcode of your business address?
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-gray-500 text-sm">
              If you have a separate address you run your self-employment from, provide this postcode. If not, then it is likely to be your home postcode.
            </p>
            <Input
              placeholder=""
              value={businessData.businessPostcode || ''}
              onChange={(e) => handleChange('businessPostcode', e.target.value)}
              className="h-12 text-base border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={goNext}
            disabled={!isValid}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-2 h-auto rounded-full text-white"
          >
            Next
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
