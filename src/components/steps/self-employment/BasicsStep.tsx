'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Check,
  ArrowLeft,
  Wrench,
  Stethoscope,
  Camera,
  Dumbbell,
  Music,
  Palette,
  GraduationCap,
  Truck,
  Car,
  UtensilsCrossed,
  Tag,
  Star,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Industry options with icons - these help AI categorize transactions
const INDUSTRIES = [
  { id: 'construction', label: 'Construction or trades', icon: Wrench },
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope },
  { id: 'content-creator', label: 'Content creator', icon: Camera },
  { id: 'health-fitness', label: 'Health and fitness', icon: Dumbbell },
  { id: 'musician', label: 'Musician', icon: Music },
  { id: 'freelancer', label: 'Freelancer or creative', icon: Palette },
  { id: 'teacher', label: 'Teacher or tutor', icon: GraduationCap },
  { id: 'courier', label: 'Courier Delivery', icon: Truck },
  { id: 'taxi', label: 'Taxi Service', icon: Car },
  { id: 'food-delivery', label: 'Food Delivery', icon: UtensilsCrossed },
  { id: 'retail', label: 'Retail', icon: Tag },
  { id: 'entertainment', label: 'Entertainment / Sports', icon: Star },
  { id: 'skip', label: 'Skip', icon: Circle },
];

export function SelfEmploymentBasicsStep() {
  const { currentBusinessId, data, updateBusinessData, updateIncomeSource, goNext } = useWizard();
  const [step, setStep] = useState<'details' | 'changed' | 'industry'>('details');

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
  const isIndustrySelected = !!businessData.industry;

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
              className="bg-[#00e3ec] hover:bg-[#00c4d4] px-6 py-2 h-auto rounded-full text-white"
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
  if (step === 'changed') {
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
                  ? 'border-[#00e3ec] bg-[#e6fafb] text-[#00a8b0]'
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
                  ? 'border-[#00e3ec] bg-[#e6fafb] text-[#00a8b0]'
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
              onClick={() => setStep('industry')}
              disabled={!isChangedAnswered}
              className="bg-[#00e3ec] hover:bg-[#00c4d4] px-6 py-2 h-auto rounded-full text-white"
            >
              Next
              <Check className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Industry selection
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-md bg-red-50 text-red-600 text-sm font-medium border border-red-100">
            Between 06/04/2024 and 05/04/2025
          </span>
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-sm font-medium flex items-center gap-1">
              <span className="text-red-400">*</span> Required
            </span>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your industry</h1>
        <p className="text-gray-500 mb-2">
          Please select which one of the below options best describes your self-employment service.
        </p>
        <p className="text-gray-500 mb-6">
          If your business isn&apos;t listed, simply skip this question.
        </p>

        {/* Industry Options */}
        <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto">
          {INDUSTRIES.map((industry) => {
            const Icon = industry.icon;
            const isSelected = businessData.industry === industry.id;

            return (
              <button
                key={industry.id}
                onClick={() => handleChange('industry', industry.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left',
                  isSelected
                    ? 'border-[#00e3ec] bg-[#e6fafb] text-[#00a8b0]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className={cn('h-5 w-5', isSelected ? 'text-[#00c4d4]' : 'text-gray-400')} />
                <span className="flex-1 font-medium">{industry.label}</span>
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    isSelected ? 'border-[#00e3ec] bg-[#00e3ec]' : 'border-gray-300'
                  )}
                >
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep('changed')}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={goNext}
            disabled={!isIndustrySelected}
            className="bg-[#00e3ec] hover:bg-[#00c4d4] px-6 py-2 h-auto rounded-full text-white"
          >
            Next
            <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
