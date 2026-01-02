import { StepConfig, StepId, WizardData } from '@/types/wizard';

// Self Employment sub-steps (per business)
export const SELF_EMPLOYMENT_STEPS: { id: StepId; label: string }[] = [
  { id: 'self-employment-basics', label: 'The Basics' },
  { id: 'self-employment-income', label: 'Income' },
  { id: 'self-employment-expenses', label: 'Expenses' },
  { id: 'self-employment-capital-allowances', label: 'Capital Allowances' },
  { id: 'self-employment-losses', label: 'Losses' },
  { id: 'self-employment-summary', label: 'Summary' },
];

// Rental sub-steps (per property)
export const RENTAL_STEPS: { id: StepId; label: string }[] = [
  { id: 'rental-details', label: 'Property Details' },
  { id: 'rental-income', label: 'Income' },
  { id: 'rental-expenses', label: 'Expenses' },
  { id: 'rental-summary', label: 'Summary' },
];

export const ALL_STEPS: StepConfig[] = [
  // Getting Started
  {
    id: 'residency',
    section: 'getting-started',
    title: 'UK Residency',
    showInSidebar: true,
  },
  {
    id: 'income-sources',
    section: 'getting-started',
    title: 'Income Sources',
    showInSidebar: true,
  },

  // Connect
  {
    id: 'connect-choice',
    section: 'connect',
    title: 'Connect Your Data',
    showInSidebar: true,
  },
  {
    id: 'bank-connection',
    section: 'connect',
    title: 'Bank Connection',
    showInSidebar: false,
    condition: (data) => data.connectionMethod === 'bank',
  },
  {
    id: 'upload-statements',
    section: 'connect',
    title: 'Upload Statements',
    showInSidebar: false,
    condition: (data) => data.connectionMethod === 'upload',
  },
  {
    id: 'accounts',
    section: 'connect',
    title: 'Your Accounts',
    showInSidebar: false,
    condition: (data) => data.connectionMethod === 'bank' && data.bankConnected,
  },
  {
    id: 'importing',
    section: 'connect',
    title: 'Importing',
    showInSidebar: false,
    condition: (data) => data.connectionMethod === 'upload',
  },

  // Self Employment (dynamic per business)
  {
    id: 'self-employment-basics',
    section: 'self-employment',
    title: 'The Basics',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },
  {
    id: 'self-employment-income',
    section: 'self-employment',
    title: 'Business Income',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },
  {
    id: 'self-employment-expenses',
    section: 'self-employment',
    title: 'Business Expenses',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },
  {
    id: 'self-employment-capital-allowances',
    section: 'self-employment',
    title: 'Capital Allowances',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },
  {
    id: 'self-employment-losses',
    section: 'self-employment',
    title: 'Business Losses',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },
  {
    id: 'self-employment-summary',
    section: 'self-employment',
    title: 'Summary',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },

  // Rental (dynamic per property)
  {
    id: 'rental-details',
    section: 'rental',
    title: 'Property Details',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'rental'),
  },
  {
    id: 'rental-income',
    section: 'rental',
    title: 'Property Income',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'rental'),
  },
  {
    id: 'rental-expenses',
    section: 'rental',
    title: 'Property Expenses',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'rental'),
  },
  {
    id: 'rental-summary',
    section: 'rental',
    title: 'Summary',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'rental'),
  },

  // Other Income (simple amounts)
  {
    id: 'other-income',
    section: 'other-income',
    title: 'Other Income',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) =>
        ['interest', 'dividends', 'pension', 'state-benefits', 'employment', 'cis', 'capital-gains'].includes(s.type)
      ),
  },

  // Deductions
  {
    id: 'deductions-overview',
    section: 'deductions',
    title: 'Deductions',
    showInSidebar: true,
  },

  // Personal Info
  {
    id: 'personal-info',
    section: 'personal',
    title: 'Personal Details',
    showInSidebar: true,
  },

  // Review & Submit
  {
    id: 'review',
    section: 'review',
    title: 'Review',
    showInSidebar: true,
  },
  {
    id: 'submit',
    section: 'review',
    title: 'Submit to HMRC',
    showInSidebar: false,
  },
  {
    id: 'confirmation',
    section: 'review',
    title: 'Confirmation',
    showInSidebar: false,
  },
];

export function getVisibleSteps(data: WizardData): StepConfig[] {
  return ALL_STEPS.filter((step) => {
    if (!step.condition) return true;
    return step.condition(data);
  });
}

export function getNextStep(
  currentStep: StepId,
  data: WizardData,
  currentBusinessId?: string | null,
  currentPropertyId?: string | null
): StepId | null {
  // Handle self-employment step progression
  if (currentStep.startsWith('self-employment-') && currentBusinessId) {
    const stepIndex = SELF_EMPLOYMENT_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < SELF_EMPLOYMENT_STEPS.length - 1) {
      return SELF_EMPLOYMENT_STEPS[stepIndex + 1].id;
    }
    // If we're at the last self-employment step, check for more businesses or move to next section
    const businesses = data.incomeSources.filter((s) => s.type === 'self-employment');
    const currentBusinessIndex = businesses.findIndex((b) => b.id === currentBusinessId);
    if (currentBusinessIndex < businesses.length - 1) {
      // Move to next business
      return 'self-employment-basics';
    }
    // Move to next section (rental or other-income or deductions)
    const hasRental = data.incomeSources.some((s) => s.type === 'rental');
    if (hasRental) return 'rental-details';

    const hasOtherIncome = data.incomeSources.some((s) =>
      ['interest', 'dividends', 'pension', 'state-benefits', 'employment', 'cis', 'capital-gains'].includes(s.type)
    );
    if (hasOtherIncome) return 'other-income';

    return 'deductions-overview';
  }

  // Handle rental step progression
  if (currentStep.startsWith('rental-') && currentPropertyId) {
    const stepIndex = RENTAL_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < RENTAL_STEPS.length - 1) {
      return RENTAL_STEPS[stepIndex + 1].id;
    }
    // If we're at the last rental step, check for more properties or move to next section
    const properties = data.incomeSources.filter((s) => s.type === 'rental');
    const currentPropertyIndex = properties.findIndex((p) => p.id === currentPropertyId);
    if (currentPropertyIndex < properties.length - 1) {
      // Move to next property
      return 'rental-details';
    }
    // Move to next section
    const hasOtherIncome = data.incomeSources.some((s) =>
      ['interest', 'dividends', 'pension', 'state-benefits', 'employment', 'cis', 'capital-gains'].includes(s.type)
    );
    if (hasOtherIncome) return 'other-income';

    return 'deductions-overview';
  }

  // Handle transition from accounts to first self-employment business
  if (currentStep === 'accounts') {
    const hasSelfEmployment = data.incomeSources.some((s) => s.type === 'self-employment');
    if (hasSelfEmployment) return 'self-employment-basics';

    const hasRental = data.incomeSources.some((s) => s.type === 'rental');
    if (hasRental) return 'rental-details';

    const hasOtherIncome = data.incomeSources.some((s) =>
      ['interest', 'dividends', 'pension', 'state-benefits', 'employment', 'cis', 'capital-gains'].includes(s.type)
    );
    if (hasOtherIncome) return 'other-income';

    return 'deductions-overview';
  }

  // Default step progression
  const visibleSteps = getVisibleSteps(data);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  if (currentIndex === -1 || currentIndex >= visibleSteps.length - 1) {
    return null;
  }

  return visibleSteps[currentIndex + 1].id;
}

export function getPreviousStep(
  currentStep: StepId,
  data: WizardData,
  currentBusinessId?: string | null,
  currentPropertyId?: string | null
): StepId | null {
  // Handle self-employment step progression
  if (currentStep.startsWith('self-employment-') && currentBusinessId) {
    const stepIndex = SELF_EMPLOYMENT_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      return SELF_EMPLOYMENT_STEPS[stepIndex - 1].id;
    }
    // If we're at the first self-employment step, check for previous businesses
    const businesses = data.incomeSources.filter((s) => s.type === 'self-employment');
    const currentBusinessIndex = businesses.findIndex((b) => b.id === currentBusinessId);
    if (currentBusinessIndex > 0) {
      return 'self-employment-summary'; // Go to summary of previous business
    }
    // Go back to accounts or income-sources
    if (data.bankConnected) return 'accounts';
    return 'income-sources';
  }

  // Handle rental step progression
  if (currentStep.startsWith('rental-') && currentPropertyId) {
    const stepIndex = RENTAL_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      return RENTAL_STEPS[stepIndex - 1].id;
    }
    // If we're at the first rental step, check for previous properties or self-employment
    const properties = data.incomeSources.filter((s) => s.type === 'rental');
    const currentPropertyIndex = properties.findIndex((p) => p.id === currentPropertyId);
    if (currentPropertyIndex > 0) {
      return 'rental-summary'; // Go to summary of previous property
    }
    // Go back to self-employment if exists
    const hasSelfEmployment = data.incomeSources.some((s) => s.type === 'self-employment');
    if (hasSelfEmployment) return 'self-employment-summary';
    if (data.bankConnected) return 'accounts';
    return 'income-sources';
  }

  // Default step progression
  const visibleSteps = getVisibleSteps(data);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  if (currentIndex <= 0) {
    return null;
  }

  return visibleSteps[currentIndex - 1].id;
}

export function getStepSection(stepId: StepId): string {
  const step = ALL_STEPS.find((s) => s.id === stepId);
  return step?.section || 'getting-started';
}
