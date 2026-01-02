'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HelpCircle, Check, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SelfEmploymentBasicsStep() {
  const { currentBusinessId, data, updateBusinessData, updateIncomeSource, goNext, goBack } = useWizard();
  const [step, setStep] = useState<'details' | 'changed'>('details');

  if (!currentBusinessId) {
    return <div>No business selected</div>;
  }

  const businessData = data.selfEmploymentData[currentBusinessId] || {};
  const incomeSource = data.incomeSources.find((s) => s.id === currentBusinessId);

  const handleChange = (field: string, value: string | boolean) => {
    updateBusinessData(currentBusinessId, { [field]: value });

    // Also update the income source label if business name changes
    if (field === 'businessName' && incomeSource) {
      updateIncomeSource(currentBusinessId, {
        label: (value as string) || 'My Business',
        data: { ...incomeSource.data, businessName: value },
      });
    }
  };

  const isDetailsValid = !!businessData.businessName && !!businessData.businessDescription;
  const isChangedAnswered = businessData.detailsChanged !== undefined;

  // Step 1: Basic details
  if (step === 'details') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {/* Header */}
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
              onClick={() => setStep('changed')}
              disabled={!isDetailsValid}
              className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2 h-auto rounded-full text-white"
            >
              Next
              <Check className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Details changed question
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-red-50 text-red-600 text-sm font-medium border border-red-100">
            Between 06/04/2024 and 05/04/2025
          </span>
          <span className="text-red-500 text-sm font-medium flex items-center gap-1">
            <span className="text-red-400">*</span> Required
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Have any of the details above changed within the past year?
        </h1>
        <p className="text-gray-500 mb-8">
          If your details have changed since your last tax return was submitted, we&apos;ll need your old details to update HMRC.
        </p>

        {/* Yes/No Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => handleChange('detailsChanged', true)}
            className={cn(
              'flex-1 py-4 px-6 rounded-xl border-2 text-lg font-medium transition-colors',
              businessData.detailsChanged === true
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            )}
          >
            Yes
          </button>
          <button
            onClick={() => handleChange('detailsChanged', false)}
            className={cn(
              'flex-1 py-4 px-6 rounded-xl border-2 text-lg font-medium transition-colors',
              businessData.detailsChanged === false
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            )}
          >
            No
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep('details')}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={goNext}
            disabled={!isChangedAnswered}
            className="bg-emerald-500 hover:bg-emerald-600 px-6 py-2 h-auto rounded-full text-white"
          >
            Next
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
