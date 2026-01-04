'use client';

import { useWizard } from '@/providers/WizardProvider';
import { ArrowLeft, ArrowRight, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  canContinue?: boolean;
  continueLabel?: string;
  nextLabel?: string;
  backLabel?: string;
  onContinue?: () => void | Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
  isSubmitting?: boolean;
  showCheckmark?: boolean;
}

export function WizardNavigation({
  canContinue = true,
  continueLabel = 'Continue',
  nextLabel,
  backLabel = 'Back',
  onContinue,
  onBack,
  showBack = true,
  isSubmitting = false,
  showCheckmark = false,
}: WizardNavigationProps) {
  const label = nextLabel || continueLabel;
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
        className={showCheckmark
          ? "bg-blue-500 hover:bg-blue-600 px-6 py-2 h-auto rounded-full"
          : "bg-[#00e3ec] hover:bg-[#00c4d4]"
        }
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : showCheckmark ? (
          <>
            {label}
            <Check className="h-4 w-4 ml-2" />
          </>
        ) : (
          <>
            {label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
}
