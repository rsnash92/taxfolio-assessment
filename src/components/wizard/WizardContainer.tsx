'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardHeader } from './WizardHeader';
import { WizardSidebar } from './WizardSidebar';
import { Loader2 } from 'lucide-react';

// Import all step components
import { ResidencyStep } from '@/components/steps/ResidencyStep';
import { IncomeSourcesStep } from '@/components/steps/IncomeSourcesStep';
import { ConnectStep } from '@/components/steps/ConnectStep';
import { AccountsStep } from '@/components/steps/AccountsStep';
import { ImportingStep } from '@/components/steps/ImportingStep';
import { NotSupportedStep } from '@/components/steps/NotSupportedStep';

// Self Employment Steps
import {
  SelfEmploymentListStep,
  SelfEmploymentBasicsStep,
  SelfEmploymentIncomeStep,
  SelfEmploymentExpensesStep,
  SelfEmploymentCapitalAllowancesStep,
  SelfEmploymentLossesStep,
  SelfEmploymentSummaryStep,
} from '@/components/steps/self-employment';

// Rental Steps
import {
  RentalListStep,
  RentalDetailsStep,
  RentalIncomeStep,
  RentalExpensesStep,
  RentalSummaryStep,
} from '@/components/steps/rental';

// Employment Steps
import {
  EmploymentListStep,
  EmploymentIncomeStep,
} from '@/components/steps/employment';

// CIS Steps
import { CISIncomeStep } from '@/components/steps/cis';

// Dividends Steps
import { DividendsStep } from '@/components/steps/dividends';

// Interest Steps
import { InterestStep } from '@/components/steps/interest';

// Capital Gains Steps
import {
  CapitalGainsOverviewStep,
  CapitalGainsDisposalsStep,
  CapitalGainsSummaryStep,
} from '@/components/steps/capital-gains';

// Pension Income Steps
import { PensionIncomeStep } from '@/components/steps/pension-income';

// State Benefits Steps
import { StateBenefitsStep } from '@/components/steps/state-benefits';

// General Steps (Tax Reliefs & Allowances)
import {
  GeneralOverviewStep,
  MarriageAllowanceStep,
  BlindAllowanceStep,
  PensionContributionsStep,
  CharitableGivingStep,
  VentureCapitalStep,
} from '@/components/steps/general';

// Review Steps (Payment, Summary, Submit, Confirmation)
import {
  ReviewPaymentStep,
  ReviewSummaryStep,
  ReviewSubmitStep,
  ReviewConfirmationStep,
} from '@/components/steps/review';

export function WizardContainer() {
  const { currentStep, isLoading } = useWizard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00e3ec] mx-auto mb-4" />
          <p className="text-gray-600">Loading your tax return...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      // Getting Started
      case 'residency':
        return <ResidencyStep />;
      case 'income-sources':
        return <IncomeSourcesStep />;

      // Connect
      case 'connect-choice':
        return <ConnectStep />;
      case 'bank-connection':
        return <PlaceholderStep title="Bank Connection" />;
      case 'upload-statements':
        return <PlaceholderStep title="Upload Statements" />;
      case 'accounts':
        return <AccountsStep />;
      case 'importing':
        return <ImportingStep />;

      // Self Employment (list and per business)
      case 'self-employment-list':
        return <SelfEmploymentListStep />;
      case 'self-employment-basics':
        return <SelfEmploymentBasicsStep />;
      case 'self-employment-income':
        return <SelfEmploymentIncomeStep />;
      case 'self-employment-expenses':
        return <SelfEmploymentExpensesStep />;
      case 'self-employment-capital-allowances':
        return <SelfEmploymentCapitalAllowancesStep />;
      case 'self-employment-losses':
        return <SelfEmploymentLossesStep />;
      case 'self-employment-summary':
        return <SelfEmploymentSummaryStep />;

      // Rental (list and per property)
      case 'rental-list':
        return <RentalListStep />;
      case 'rental-details':
        return <RentalDetailsStep />;
      case 'rental-income':
        return <RentalIncomeStep />;
      case 'rental-expenses':
        return <RentalExpensesStep />;
      case 'rental-summary':
        return <RentalSummaryStep />;

      // Employment (PAYE)
      case 'employment-list':
        return <EmploymentListStep />;
      case 'employment-details':
        return <PlaceholderStep title="Employer Details" />;
      case 'employment-income':
        return <EmploymentIncomeStep />;
      case 'employment-benefits':
        return <PlaceholderStep title="Benefits in Kind" />;
      case 'employment-expenses':
        return <PlaceholderStep title="Employment Expenses" />;

      // CIS
      case 'cis-income':
        return <CISIncomeStep />;

      // Dividends
      case 'dividends':
        return <DividendsStep />;

      // Interest
      case 'interest':
        return <InterestStep />;

      // Capital Gains
      case 'capital-gains-overview':
        return <CapitalGainsOverviewStep />;
      case 'capital-gains-disposals':
        return <CapitalGainsDisposalsStep />;
      case 'capital-gains-summary':
        return <CapitalGainsSummaryStep />;

      // Pension Income
      case 'pension-income':
        return <PensionIncomeStep />;

      // State Benefits
      case 'state-benefits':
        return <StateBenefitsStep />;

      // Other Income
      case 'other-income':
        return <PlaceholderStep title="Other Income" />;

      // General (Tax Reliefs & Allowances)
      case 'general-overview':
        return <GeneralOverviewStep />;
      case 'general-marriage-allowance':
        return <MarriageAllowanceStep />;
      case 'general-blind-allowance':
        return <BlindAllowanceStep />;
      case 'general-pension':
        return <PensionContributionsStep />;
      case 'general-charitable':
        return <CharitableGivingStep />;
      case 'general-venture-capital':
        return <VentureCapitalStep />;

      // Personal
      case 'personal-info':
        return <PlaceholderStep title="Personal Details" />;

      // Review & Submit
      case 'review-payment':
        return <ReviewPaymentStep />;
      case 'review-summary':
        return <ReviewSummaryStep />;
      case 'review-submit':
        return <ReviewSubmitStep />;
      case 'review-confirmation':
        return <ReviewConfirmationStep />;

      // Special
      case 'not-supported':
        return <NotSupportedStep />;

      default:
        return <ResidencyStep />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <WizardHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed sidebar - w-72 to match main app */}
        <div className="w-72 flex-shrink-0 h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <WizardSidebar />
        </div>

        {/* Scrollable main content - matches main app styling */}
        <main className="flex-1 p-4 overflow-y-auto h-[calc(100vh-64px)]">
          <div className="bg-gray-100/60 rounded-2xl min-h-full">
            <div className={
              currentStep === 'self-employment-income' ||
              currentStep === 'self-employment-expenses' ||
              currentStep === 'self-employment-list' ||
              currentStep === 'rental-list' ||
              currentStep === 'employment-list' ||
              currentStep === 'capital-gains-disposals'
                ? 'max-w-4xl mx-auto py-6 px-4 md:px-6'
                : 'max-w-3xl mx-auto py-6 px-4 md:px-6'
            }>
              {renderStep()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Placeholder component for steps not yet implemented
function PlaceholderStep({ title }: { title: string }) {
  const { goNext, goBack, canGoNext, canGoBack } = useWizard();

  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-500 mb-8">This step is coming soon.</p>

      <div className="flex justify-center gap-4">
        {canGoBack && (
          <button
            onClick={goBack}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Back
          </button>
        )}
        {canGoNext && (
          <button
            onClick={goNext}
            className="px-6 py-2 bg-[#00e3ec] text-white rounded-lg hover:bg-[#00c4d4]"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
