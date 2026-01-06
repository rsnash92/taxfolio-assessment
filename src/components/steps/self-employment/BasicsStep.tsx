'use client';

import { useState } from 'react';
import { useWizard } from '@/providers/WizardProvider';
import { WizardNavigation } from '@/components/wizard/WizardNavigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  Info,
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
  ArrowRight,
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
  { id: 'skip', label: 'Skip this question', icon: Circle },
];

export function SelfEmploymentBasicsStep() {
  const { currentBusinessId, data, updateBusinessData, updateIncomeSource, goNext, goBack } = useWizard();
  const [step, setStep] = useState<'details' | 'changed' | 'previous-details' | 'industry'>('details');

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
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500 mb-2">Self-employment details</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            The basics
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Let&apos;s get to know your business. This information helps us complete your tax return accurately.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 mb-6 sm:mb-8">
          {/* Self-employment name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
              Self-employment name
              <span className="text-red-500">*</span>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-xs sm:text-sm text-gray-500">
              Your name, or the name of your business.
            </p>
            <Input
              placeholder="e.g. John Smith Consulting"
              value={businessData.businessName || ''}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className="h-11 sm:h-12 text-sm sm:text-base border-gray-200 rounded-xl bg-white focus:border-[#00e3ec] focus:ring-[#00e3ec]"
            />
          </div>

          {/* Business description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
              How would you describe your business?
              <span className="text-red-500">*</span>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-xs sm:text-sm text-gray-500">
              A brief description of what your business or self-employment does.
            </p>
            <Input
              placeholder="e.g. IT consulting services"
              value={businessData.businessDescription || ''}
              onChange={(e) => handleChange('businessDescription', e.target.value)}
              className="h-11 sm:h-12 text-sm sm:text-base border-gray-200 rounded-xl bg-white focus:border-[#00e3ec] focus:ring-[#00e3ec]"
            />
          </div>

          {/* Business postcode */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
              Business postcode
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-xs sm:text-sm text-gray-500">
              If you have a separate business address, provide that postcode. Otherwise, use your home postcode.
            </p>
            <Input
              placeholder="e.g. SW1A 1AA"
              value={businessData.businessPostcode || ''}
              onChange={(e) => handleChange('businessPostcode', e.target.value)}
              className="h-11 sm:h-12 text-sm sm:text-base border-gray-200 rounded-xl bg-white focus:border-[#00e3ec] focus:ring-[#00e3ec] max-w-xs"
            />
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="flex items-start gap-2 sm:gap-3">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="text-blue-800 font-medium">Tax year 2024/25</p>
              <p className="text-blue-600">
                This covers income from 6 April 2024 to 5 April 2025.
              </p>
            </div>
          </div>
        </div>

        <WizardNavigation
          canContinue={isDetailsValid}
          onContinue={() => setStep('changed')}
          continueLabel="Next"
        />
      </div>
    );
  }

  // Step 2: Details changed question
  if (step === 'changed') {
    return (
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500 mb-2">Self-employment details</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Have any of these details changed?
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            If your business details have changed since your last tax return, we&apos;ll need your old details to update HMRC.
          </p>
        </div>

        {/* Yes/No Options */}
        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          <button
            onClick={() => handleChange('detailsChanged', true)}
            className={cn(
              'w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all text-left',
              businessData.detailsChanged === true
                ? 'border-[#00e3ec] bg-[#e6fafb]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0',
                businessData.detailsChanged === true ? 'bg-[#00e3ec]' : 'bg-gray-100'
              )}
            >
              <span className={cn(
                'text-sm font-bold',
                businessData.detailsChanged === true ? 'text-white' : 'text-gray-500'
              )}>
                Yes
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm sm:text-base">
                Yes, details have changed
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                My business name, description, or address changed this year
              </p>
            </div>
          </button>

          <button
            onClick={() => handleChange('detailsChanged', false)}
            className={cn(
              'w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all text-left',
              businessData.detailsChanged === false
                ? 'border-[#00e3ec] bg-[#e6fafb]'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            <div
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0',
                businessData.detailsChanged === false ? 'bg-[#00e3ec]' : 'bg-gray-100'
              )}
            >
              <span className={cn(
                'text-sm font-bold',
                businessData.detailsChanged === false ? 'text-white' : 'text-gray-500'
              )}>
                No
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm sm:text-base">
                No, everything is the same
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                My details are the same as my last tax return
              </p>
            </div>
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={() => setStep('details')}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={() => setStep(businessData.detailsChanged ? 'previous-details' : 'industry')}
            disabled={!isChangedAnswered}
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Previous details (only shown if details have changed)
  if (step === 'previous-details') {
    return (
      <div>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-gray-500 mb-2">Self-employment details</p>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            What were your previous details?
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Please enter your business details as they appeared on your last tax return. This helps HMRC update their records.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-6 mb-6 sm:mb-8">
          {/* Previous business name */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
              Previous business name
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-xs sm:text-sm text-gray-500">
              The name of your business as it was on your last tax return.
            </p>
            <Input
              placeholder="e.g. John Smith Consulting"
              value={businessData.previousBusinessName || ''}
              onChange={(e) => handleChange('previousBusinessName', e.target.value)}
              className="h-11 sm:h-12 text-sm sm:text-base border-gray-200 rounded-xl bg-white focus:border-[#00e3ec] focus:ring-[#00e3ec]"
            />
          </div>

          {/* Previous business description */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
              Previous business description
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-xs sm:text-sm text-gray-500">
              How your business was described on your last tax return.
            </p>
            <Input
              placeholder="e.g. IT consulting services"
              value={businessData.previousBusinessDescription || ''}
              onChange={(e) => handleChange('previousBusinessDescription', e.target.value)}
              className="h-11 sm:h-12 text-sm sm:text-base border-gray-200 rounded-xl bg-white focus:border-[#00e3ec] focus:ring-[#00e3ec]"
            />
          </div>

          {/* Previous business postcode */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-900">
              Previous business postcode
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </label>
            <p className="text-xs sm:text-sm text-gray-500">
              The postcode associated with your business on your last tax return.
            </p>
            <Input
              placeholder="e.g. SW1A 1AA"
              value={businessData.previousBusinessPostcode || ''}
              onChange={(e) => handleChange('previousBusinessPostcode', e.target.value)}
              className="h-11 sm:h-12 text-sm sm:text-base border-gray-200 rounded-xl bg-white focus:border-[#00e3ec] focus:ring-[#00e3ec] max-w-xs"
            />
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="flex items-start gap-2 sm:gap-3">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="text-amber-800 font-medium">Why do we need this?</p>
              <p className="text-amber-600">
                HMRC needs to match your old records with your new details to ensure continuity of your self-employment history.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={() => setStep('changed')}
            className="text-gray-600"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={() => setStep('industry')}
            className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Industry selection
  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <p className="text-sm text-gray-500 mb-2">Self-employment details</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          What industry is your business in?
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          This helps us categorise your transactions and suggest relevant expense categories.
          If your business isn&apos;t listed, you can skip this question.
        </p>
      </div>

      {/* Industry Options */}
      <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 max-h-[50vh] overflow-y-auto">
        {INDUSTRIES.map((industry) => {
          const Icon = industry.icon;
          const isSelected = businessData.industry === industry.id;

          return (
            <button
              key={industry.id}
              onClick={() => handleChange('industry', industry.id)}
              className={cn(
                'w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-[#00e3ec] bg-[#e6fafb]'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  isSelected ? 'bg-[#00e3ec]' : 'bg-gray-100'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 sm:h-5 sm:w-5',
                    isSelected ? 'text-white' : 'text-gray-500'
                  )}
                />
              </div>
              <span className={cn(
                'flex-1 font-medium text-sm sm:text-base',
                isSelected ? 'text-[#00a8b0]' : 'text-gray-900'
              )}>
                {industry.label}
              </span>
              <div
                className={cn(
                  'w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  isSelected ? 'border-[#00e3ec]' : 'border-gray-300'
                )}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#00e3ec]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-gray-200">
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
          className="bg-gradient-to-r from-[#0f172a] to-[#1e293b] hover:from-[#1e293b] hover:to-[#334155] text-white"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
