'use client';

import { useWizard } from '@/providers/WizardProvider';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Building2,
  Briefcase,
  Home,
  Calculator,
  User,
  Send,
  Plus,
  Coins,
  TrendingUp,
  Landmark,
  Heart,
  Banknote,
  HardHat,
  PiggyBank,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepId } from '@/types/wizard';
import { SELF_EMPLOYMENT_STEPS, RENTAL_STEPS } from '@/lib/wizard/steps';

export function WizardSidebar() {
  const {
    currentStep,
    currentBusinessId,
    currentPropertyId,
    data,
    goToStep,
    goToBusinessStep,
    goToPropertyStep,
    getSectionStatus,
  } = useWizard();

  // Get businesses and properties from income sources
  const selfEmploymentBusinesses = data.incomeSources.filter(
    (s) => s.type === 'self-employment'
  );
  const rentalProperties = data.incomeSources.filter((s) => s.type === 'rental');

  // Check for each income type
  const hasEmployment = data.incomeSources.some((s) => s.type === 'employment');
  const hasCIS = data.incomeSources.some((s) => s.type === 'cis');
  const hasDividends = data.incomeSources.some((s) => s.type === 'dividends');
  const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
  const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
  const hasPension = data.incomeSources.some((s) => s.type === 'pension');
  const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
  const hasOtherIncome = data.incomeSources.some((s) => s.type === 'other');

  // Check if sections are active/expanded
  const isSelfEmploymentActive = currentStep.startsWith('self-employment');
  const isRentalActive = currentStep.startsWith('rental');
  const isEmploymentActive = currentStep.startsWith('employment');
  const isCapitalGainsActive = currentStep.startsWith('capital-gains');

  return (
    <aside className="w-full h-full bg-white border-r border-gray-200 hidden lg:block">
      <nav className="p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Menu
        </p>

        <ul className="space-y-1">
          {/* Getting Started */}
          <SidebarItem
            icon={PlayCircle}
            label="Getting Started"
            isActive={currentStep === 'residency' || currentStep === 'income-sources'}
            isComplete={getSectionStatus('getting-started') === 'completed'}
            onClick={() => goToStep('residency')}
          />

          {/* Bank Connection */}
          <SidebarItem
            icon={Building2}
            label="Bank Connection"
            isActive={
              currentStep === 'connect-choice' ||
              currentStep === 'bank-connection' ||
              currentStep === 'accounts'
            }
            isComplete={getSectionStatus('connect') === 'completed'}
            onClick={() => goToStep('connect-choice')}
          />

          {/* Self Employment - Expandable */}
          {selfEmploymentBusinesses.length > 0 && (
            <li>
              <button
                onClick={() =>
                  goToBusinessStep(selfEmploymentBusinesses[0].id, 'self-employment-basics')
                }
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                  isSelfEmploymentActive
                    ? 'bg-[#e6fafb] text-[#00a8b0]'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {getSectionStatus('self-employment') === 'completed' ? (
                  <CheckCircle2 className="h-6 w-6 text-[#00e3ec]" />
                ) : (
                  <Briefcase
                    className={cn(
                      'h-6 w-6',
                      isSelfEmploymentActive ? 'text-[#00c4d4]' : 'text-gray-400'
                    )}
                  />
                )}
                <span className="flex-1 text-left">Self Employed</span>
                {isSelfEmploymentActive ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>

              {/* Expanded: Show each business */}
              {isSelfEmploymentActive && (
                <ul className="mt-1 ml-4 space-y-1">
                  {selfEmploymentBusinesses.map((business) => (
                    <BusinessSubMenu
                      key={business.id}
                      business={business}
                      isActive={currentBusinessId === business.id}
                      currentStep={currentStep}
                      onStepClick={(step) => goToBusinessStep(business.id, step)}
                    />
                  ))}

                  {/* Add Another Business */}
                  <li>
                    <button
                      onClick={() => goToStep('income-sources')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#00c4d4] hover:bg-[#e6fafb] rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Add Self Employment
                    </button>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Rental - Expandable */}
          {rentalProperties.length > 0 && (
            <li>
              <button
                onClick={() =>
                  goToPropertyStep(rentalProperties[0].id, 'rental-details')
                }
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                  isRentalActive
                    ? 'bg-[#e6fafb] text-[#00a8b0]'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {getSectionStatus('rental') === 'completed' ? (
                  <CheckCircle2 className="h-6 w-6 text-[#00e3ec]" />
                ) : (
                  <Home
                    className={cn(
                      'h-6 w-6',
                      isRentalActive ? 'text-[#00c4d4]' : 'text-gray-400'
                    )}
                  />
                )}
                <span className="flex-1 text-left">Rental</span>
                {isRentalActive ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>

              {isRentalActive && (
                <ul className="mt-1 ml-4 space-y-1">
                  {rentalProperties.map((property) => (
                    <PropertySubMenu
                      key={property.id}
                      property={property}
                      isActive={currentPropertyId === property.id}
                      currentStep={currentStep}
                      onStepClick={(step) => goToPropertyStep(property.id, step)}
                    />
                  ))}

                  <li>
                    <button
                      onClick={() => goToStep('income-sources')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#00c4d4] hover:bg-[#e6fafb] rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Add Property
                    </button>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Employment (PAYE) */}
          {hasEmployment && (
            <SidebarItem
              icon={Building2}
              label="Employment"
              isActive={isEmploymentActive}
              isComplete={getSectionStatus('employment') === 'completed'}
              onClick={() => goToStep('employment-list')}
            />
          )}

          {/* CIS Income */}
          {hasCIS && (
            <SidebarItem
              icon={HardHat}
              label="CIS Income"
              isActive={currentStep === 'cis-income'}
              isComplete={getSectionStatus('cis') === 'completed'}
              onClick={() => goToStep('cis-income')}
            />
          )}

          {/* Dividends */}
          {hasDividends && (
            <SidebarItem
              icon={Coins}
              label="Dividends"
              isActive={currentStep === 'dividends'}
              isComplete={getSectionStatus('dividends') === 'completed'}
              onClick={() => goToStep('dividends')}
            />
          )}

          {/* Interest */}
          {hasInterest && (
            <SidebarItem
              icon={PiggyBank}
              label="Interest"
              isActive={currentStep === 'interest'}
              isComplete={getSectionStatus('interest') === 'completed'}
              onClick={() => goToStep('interest')}
            />
          )}

          {/* Capital Gains */}
          {hasCapitalGains && (
            <SidebarItem
              icon={TrendingUp}
              label="Capital Gains"
              isActive={isCapitalGainsActive}
              isComplete={getSectionStatus('capital-gains') === 'completed'}
              onClick={() => goToStep('capital-gains-overview')}
            />
          )}

          {/* Pension Income */}
          {hasPension && (
            <SidebarItem
              icon={Landmark}
              label="Pension Income"
              isActive={currentStep === 'pension-income'}
              isComplete={getSectionStatus('pension-income') === 'completed'}
              onClick={() => goToStep('pension-income')}
            />
          )}

          {/* State Benefits */}
          {hasStateBenefits && (
            <SidebarItem
              icon={Heart}
              label="State Benefits"
              isActive={currentStep === 'state-benefits'}
              isComplete={getSectionStatus('state-benefits') === 'completed'}
              onClick={() => goToStep('state-benefits')}
            />
          )}

          {/* Other Income */}
          {hasOtherIncome && (
            <SidebarItem
              icon={Banknote}
              label="Other Income"
              isActive={currentStep === 'other-income'}
              isComplete={getSectionStatus('other-income') === 'completed'}
              onClick={() => goToStep('other-income')}
            />
          )}

          {/* General (Tax Reliefs & Allowances) */}
          <SidebarItem
            icon={Calculator}
            label="General"
            isActive={currentStep.startsWith('general-')}
            isComplete={getSectionStatus('general') === 'completed'}
            onClick={() => goToStep('general-overview')}
          />

          {/* Personal Info */}
          <SidebarItem
            icon={User}
            label="Personal Info"
            isActive={currentStep === 'personal-info'}
            isComplete={getSectionStatus('personal') === 'completed'}
            onClick={() => goToStep('personal-info')}
          />

          {/* Review & Submit */}
          <SidebarItem
            icon={Send}
            label="Review & Submit"
            isActive={currentStep.startsWith('review-')}
            isComplete={getSectionStatus('review') === 'completed'}
            onClick={() => goToStep('review-payment')}
          />
        </ul>
      </nav>
    </aside>
  );
}

// Sub-menu for each business
function BusinessSubMenu({
  business,
  isActive,
  currentStep,
  onStepClick,
}: {
  business: { id: string; label: string; data: Record<string, unknown> };
  isActive: boolean;
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
}) {
  const businessName =
    (business.data?.businessName as string) || business.label || 'My Business';

  return (
    <li>
      <div className={cn('px-3 py-2 rounded-lg', isActive && 'bg-gray-50')}>
        <p
          className={cn(
            'text-sm font-medium mb-1',
            isActive ? 'text-[#00a8b0]' : 'text-gray-700'
          )}
        >
          {businessName}
        </p>

        {isActive && (
          <ul className="space-y-0.5">
            {SELF_EMPLOYMENT_STEPS.map((step) => (
              <li key={step.id}>
                <button
                  onClick={() => onStepClick(step.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded transition-colors',
                    currentStep === step.id
                      ? 'bg-[#ccf5f7] text-[#00a8b0] font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {step.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// Sub-menu for each property
function PropertySubMenu({
  property,
  isActive,
  currentStep,
  onStepClick,
}: {
  property: { id: string; label: string; data: Record<string, unknown> };
  isActive: boolean;
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
}) {
  const propertyAddress =
    (property.data?.address as string) || property.label || 'My Property';

  return (
    <li>
      <div className={cn('px-3 py-2 rounded-lg', isActive && 'bg-gray-50')}>
        <p
          className={cn(
            'text-sm font-medium mb-1',
            isActive ? 'text-[#00a8b0]' : 'text-gray-700'
          )}
        >
          {propertyAddress}
        </p>

        {isActive && (
          <ul className="space-y-0.5">
            {RENTAL_STEPS.map((step) => (
              <li key={step.id}>
                <button
                  onClick={() => onStepClick(step.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-sm rounded transition-colors',
                    currentStep === step.id
                      ? 'bg-[#ccf5f7] text-[#00a8b0] font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {step.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

// Reusable sidebar item - larger to match main app
function SidebarItem({
  icon: Icon,
  label,
  isActive,
  isComplete,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  isComplete: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
          isActive
            ? 'bg-[#e6fafb] text-[#00a8b0]'
            : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-6 w-6 text-[#00e3ec]" />
        ) : (
          <Icon
            className={cn('h-6 w-6', isActive ? 'text-[#00c4d4]' : 'text-gray-400')}
          />
        )}
        <span>{label}</span>
      </button>
    </li>
  );
}
