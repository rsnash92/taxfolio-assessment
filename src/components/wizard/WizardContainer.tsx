'use client';

import { useWizard } from '@/providers/WizardProvider';
import { WizardHeader } from './WizardHeader';
import { WizardSidebar } from './WizardSidebar';
import { Loader2 } from 'lucide-react';

// Import all step components
import { ResidencyStep } from '@/components/steps/ResidencyStep';
import { IncomeSourcesStep } from '@/components/steps/IncomeSourcesStep';
import { ConnectStep } from '@/components/steps/ConnectStep';
import { NotSupportedStep } from '@/components/steps/NotSupportedStep';

export function WizardContainer() {
  const { currentStep, isLoading } = useWizard();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
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
      case 'importing':
        return <PlaceholderStep title="Importing Data..." />;

      // Transactions
      case 'transactions':
        return <PlaceholderStep title="Review Transactions" />;
      case 'transactions-summary':
        return <PlaceholderStep title="Transactions Summary" />;

      // Self Employment
      case 'self-employment-intro':
        return <PlaceholderStep title="Self Employment" />;
      case 'self-employment-income':
        return <PlaceholderStep title="Business Income" />;
      case 'self-employment-expenses':
        return <PlaceholderStep title="Business Expenses" />;
      case 'self-employment-summary':
        return <PlaceholderStep title="Self Employment Summary" />;

      // Rental
      case 'rental-intro':
        return <PlaceholderStep title="Rental Income" />;
      case 'rental-income':
        return <PlaceholderStep title="Property Income" />;
      case 'rental-expenses':
        return <PlaceholderStep title="Property Expenses" />;
      case 'rental-summary':
        return <PlaceholderStep title="Rental Summary" />;

      // Deductions
      case 'deductions-mileage':
        return <PlaceholderStep title="Mileage" />;
      case 'deductions-home-office':
        return <PlaceholderStep title="Home Office" />;

      // Personal & Review
      case 'personal-info':
        return <PlaceholderStep title="Personal Details" />;
      case 'review':
        return <PlaceholderStep title="Review Your Return" />;
      case 'submit':
        return <PlaceholderStep title="Submit to HMRC" />;
      case 'confirmation':
        return <PlaceholderStep title="Confirmation" />;

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

      <div className="flex flex-1">
        <WizardSidebar />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">{renderStep()}</div>
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
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
