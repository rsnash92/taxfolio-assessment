'use client';

import { WizardProvider } from '@/providers/WizardProvider';
import { WizardContainer } from '@/components/wizard/WizardContainer';

export default function AssessmentPage() {
  // In production, you would get userId from server-side auth
  // For now, we use localStorage persistence in WizardProvider

  return (
    <WizardProvider>
      <WizardContainer />
    </WizardProvider>
  );
}
