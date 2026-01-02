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
  const hasOtherIncome = data.incomeSources.some((s) =>
    ['interest', 'dividends', 'pension', 'state-benefits', 'employment', 'cis', 'capital-gains'].includes(s.type)
  );

  // Check if sections are active/expanded
  const isSelfEmploymentActive = currentStep.startsWith('self-employment');
  const isRentalActive = currentStep.startsWith('rental');

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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isSelfEmploymentActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {getSectionStatus('self-employment') === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Briefcase
                    className={cn(
                      'h-5 w-5',
                      isSelfEmploymentActive ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  />
                )}
                <span className="flex-1 text-left">Self Employed</span>
                {isSelfEmploymentActive ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
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
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isRentalActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {getSectionStatus('rental') === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Home
                    className={cn(
                      'h-5 w-5',
                      isRentalActive ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  />
                )}
                <span className="flex-1 text-left">Rental</span>
                {isRentalActive ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Add Property
                    </button>
                  </li>
                </ul>
              )}
            </li>
          )}

          {/* Other Income */}
          {hasOtherIncome && (
            <SidebarItem
              icon={Coins}
              label="Other Income"
              isActive={currentStep === 'other-income'}
              isComplete={getSectionStatus('other-income') === 'completed'}
              onClick={() => goToStep('other-income')}
            />
          )}

          {/* General (Deductions) */}
          <SidebarItem
            icon={Calculator}
            label="General"
            isActive={currentStep === 'deductions-overview'}
            isComplete={getSectionStatus('deductions') === 'completed'}
            onClick={() => goToStep('deductions-overview')}
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
            isActive={currentStep === 'review' || currentStep === 'submit'}
            isComplete={getSectionStatus('review') === 'completed'}
            onClick={() => goToStep('review')}
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
            isActive ? 'text-emerald-700' : 'text-gray-700'
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
                      ? 'bg-emerald-100 text-emerald-700 font-medium'
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
            isActive ? 'text-emerald-700' : 'text-gray-700'
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
                      ? 'bg-emerald-100 text-emerald-700 font-medium'
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

// Reusable sidebar item
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
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-emerald-50 text-emerald-700'
            : 'text-gray-700 hover:bg-gray-50'
        )}
      >
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Icon
            className={cn('h-5 w-5', isActive ? 'text-emerald-600' : 'text-gray-400')}
          />
        )}
        <span>{label}</span>
      </button>
    </li>
  );
}
