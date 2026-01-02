import { StepConfig, StepId, WizardData } from '@/types/wizard';

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
    id: 'importing',
    section: 'connect',
    title: 'Importing',
    showInSidebar: false,
    condition: (data) =>
      data.connectionMethod === 'bank' || data.connectionMethod === 'upload',
  },

  // Transactions
  {
    id: 'transactions',
    section: 'transactions',
    title: 'Review Transactions',
    showInSidebar: true,
    condition: (data) => data.connectionMethod !== 'manual',
  },
  {
    id: 'transactions-summary',
    section: 'transactions',
    title: 'Summary',
    showInSidebar: false,
    condition: (data) => data.connectionMethod !== 'manual',
  },

  // Self Employment (conditional)
  {
    id: 'self-employment-intro',
    section: 'self-employment',
    title: 'Self Employment',
    showInSidebar: true,
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
    id: 'self-employment-summary',
    section: 'self-employment',
    title: 'Summary',
    showInSidebar: false,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
  },

  // Employment (PAYE) - conditional
  {
    id: 'employment-intro',
    section: 'employment',
    title: 'Employment (PAYE)',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'employment'),
  },

  // CIS - conditional
  {
    id: 'cis-intro',
    section: 'cis',
    title: 'Construction (CIS)',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'cis'),
  },

  // Rental (conditional)
  {
    id: 'rental-intro',
    section: 'rental',
    title: 'Rental Income',
    showInSidebar: true,
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

  // Dividends - conditional
  {
    id: 'dividends-intro',
    section: 'dividends',
    title: 'Dividends',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'dividends'),
  },

  // Interest - conditional
  {
    id: 'interest-intro',
    section: 'interest',
    title: 'Interest Income',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'interest'),
  },

  // Capital Gains - conditional
  {
    id: 'capital-gains-intro',
    section: 'capital-gains',
    title: 'Capital Gains',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'capital-gains'),
  },

  // Pension - conditional
  {
    id: 'pension-intro',
    section: 'pension',
    title: 'Pension Income',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'pension'),
  },

  // State Benefits - conditional
  {
    id: 'state-benefits-intro',
    section: 'state-benefits',
    title: 'State Benefits',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'state-benefits'),
  },

  // Deductions
  {
    id: 'deductions-mileage',
    section: 'deductions',
    title: 'Mileage',
    showInSidebar: true,
  },
  {
    id: 'deductions-home-office',
    section: 'deductions',
    title: 'Home Office',
    showInSidebar: false,
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
  data: WizardData
): StepId | null {
  const visibleSteps = getVisibleSteps(data);
  const currentIndex = visibleSteps.findIndex((s) => s.id === currentStep);

  if (currentIndex === -1 || currentIndex >= visibleSteps.length - 1) {
    return null;
  }

  return visibleSteps[currentIndex + 1].id;
}

export function getPreviousStep(
  currentStep: StepId,
  data: WizardData
): StepId | null {
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
