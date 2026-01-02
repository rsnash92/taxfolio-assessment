'use client';

import { createContext, useContext } from 'react';
import type { WizardContext } from '@/types';

const WizardContext = createContext<WizardContext | null>(null);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

export { WizardContext };
