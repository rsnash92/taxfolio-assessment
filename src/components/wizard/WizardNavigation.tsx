'use client';

import { useWizard } from '@/providers/WizardProvider';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  canContinue?: boolean;
  continueLabel?: string;
  backLabel?: string;
  onContinue?: () => void | Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
  isSubmitting?: boolean;
}

export function WizardNavigation({
  canContinue = true,
  continueLabel = 'Continue',
  backLabel = 'Back',
  onContinue,
  onBack,
  showBack = true,
  isSubmitting = false,
}: WizardNavigationProps) {
  const { goNext, goBack, canGoNext, canGoBack, isSaving } = useWizard();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  const handleContinue = async () => {
    if (onContinue) {
      await onContinue();
    } else {
      goNext();
    }
  };

  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200">
      {/* Back Button */}
      {showBack && canGoBack ? (
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isSubmitting}
          className="text-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backLabel}
        </Button>
      ) : (
        <div />
      )}

      {/* Continue Button */}
      <Button
        onClick={handleContinue}
        disabled={!canContinue || isSubmitting || isSaving}
        className="bg-emerald-500 hover:bg-emerald-600"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {continueLabel}
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
