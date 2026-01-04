'use client';

import { useWizard } from '@/providers/WizardProvider';
import { Sparkles, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Notice shown when wizard data was pre-populated from intro wizard
 */
export function IntroDataNotice() {
  const { data } = useWizard();
  const [dismissed, setDismissed] = useState(false);

  if (!data.introData || dismissed) {
    return null;
  }

  const experienceLabels: Record<string, string> = {
    beginner: 'We\'ll guide you through each step',
    intermediate: 'We\'ll provide helpful tips along the way',
    expert: 'Streamlined experience for quick filing',
  };

  return (
    <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Personalized for you
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {experienceLabels[data.introData.experienceLevel] || experienceLabels.beginner}
          </p>
          {data.introData.suggestedSources.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              We&apos;ve pre-selected income sources based on your answers.
            </p>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
