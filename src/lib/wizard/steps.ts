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

// Self Employment business steps (excluding the list)
export const SELF_EMPLOYMENT_BUSINESS_STEPS: StepId[] = [
  'self-employment-basics',
  'self-employment-income',
  'self-employment-expenses',
  'self-employment-capital-allowances',
  'self-employment-losses',
  'self-employment-summary',
];

// Rental sub-steps (per property)
export const RENTAL_STEPS: { id: StepId; label: string }[] = [
  { id: 'rental-details', label: 'Property Details' },
  { id: 'rental-income', label: 'Income' },
  { id: 'rental-expenses', label: 'Expenses' },
  { id: 'rental-summary', label: 'Summary' },
];

// Employment sub-steps (per employer)
export const EMPLOYMENT_STEPS: { id: StepId; label: string }[] = [
  { id: 'employment-details', label: 'Employer Details' },
  { id: 'employment-income', label: 'Income & Tax' },
  { id: 'employment-benefits', label: 'Benefits' },
  { id: 'employment-expenses', label: 'Expenses' },
];

// Capital Gains sub-steps
export const CAPITAL_GAINS_STEPS: { id: StepId; label: string }[] = [
  { id: 'capital-gains-overview', label: 'Overview' },
  { id: 'capital-gains-disposals', label: 'Disposals' },
  { id: 'capital-gains-summary', label: 'Summary' },
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
  {
    id: 'manual-entry',
    section: 'connect',
    title: 'Manual Entry',
    showInSidebar: false,
    condition: (data) => data.connectionMethod === 'manual',
  },

  // Self Employment list (manage multiple businesses)
  {
    id: 'self-employment-list',
    section: 'self-employment',
    title: 'Self-Employment',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'self-employment'),
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

  // Rental list (manage multiple properties)
  {
    id: 'rental-list',
    section: 'rental',
    title: 'Rental Properties',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'rental'),
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

  // Employment (PAYE) - SA102
  {
    id: 'employment-list',
    section: 'employment',
    title: 'Employment Income',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'employment'),
  },
  {
    id: 'employment-details',
    section: 'employment',
    title: 'Employer Details',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'employment'),
  },
  {
    id: 'employment-income',
    section: 'employment',
    title: 'Income & Tax',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'employment'),
  },
  {
    id: 'employment-benefits',
    section: 'employment',
    title: 'Benefits in Kind',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'employment'),
  },
  {
    id: 'employment-expenses',
    section: 'employment',
    title: 'Employment Expenses',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'employment'),
  },

  // CIS Income
  {
    id: 'cis-income',
    section: 'cis',
    title: 'CIS Income',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'cis'),
  },

  // Dividends
  {
    id: 'dividends',
    section: 'dividends',
    title: 'Dividends',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'dividends'),
  },

  // Interest
  {
    id: 'interest',
    section: 'interest',
    title: 'Interest Income',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'interest'),
  },

  // Capital Gains - SA108
  {
    id: 'capital-gains-overview',
    section: 'capital-gains',
    title: 'Capital Gains',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'capital-gains'),
  },
  {
    id: 'capital-gains-disposals',
    section: 'capital-gains',
    title: 'Disposals',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'capital-gains'),
  },
  {
    id: 'capital-gains-summary',
    section: 'capital-gains',
    title: 'CGT Summary',
    showInSidebar: false,
    condition: (data) => data.incomeSources.some((s) => s.type === 'capital-gains'),
  },

  // Pension Income
  {
    id: 'pension-income',
    section: 'pension-income',
    title: 'Pension Income',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'pension'),
  },

  // State Benefits
  {
    id: 'state-benefits',
    section: 'state-benefits',
    title: 'State Benefits',
    showInSidebar: true,
    condition: (data) => data.incomeSources.some((s) => s.type === 'state-benefits'),
  },

  // Other Income (catch-all for remaining types)
  {
    id: 'other-income',
    section: 'other-income',
    title: 'Other Income',
    showInSidebar: true,
    condition: (data) =>
      data.incomeSources.some((s) => s.type === 'other'),
  },

  // General (Tax Reliefs & Allowances)
  {
    id: 'general-overview',
    section: 'general',
    title: 'Tax Reliefs',
    showInSidebar: true,
  },
  {
    id: 'general-marriage-allowance',
    section: 'general',
    title: 'Marriage Allowance',
    showInSidebar: false,
    condition: (data) => data.general?.selectedReliefs?.includes('marriage-allowance') ?? false,
  },
  {
    id: 'general-blind-allowance',
    section: 'general',
    title: "Blind Person's Allowance",
    showInSidebar: false,
    condition: (data) => data.general?.selectedReliefs?.includes('blind-allowance') ?? false,
  },
  {
    id: 'general-pension',
    section: 'general',
    title: 'Pension Contributions',
    showInSidebar: false,
    condition: (data) => data.general?.selectedReliefs?.includes('pension') ?? false,
  },
  {
    id: 'general-charitable',
    section: 'general',
    title: 'Charitable Giving',
    showInSidebar: false,
    condition: (data) => data.general?.selectedReliefs?.includes('charitable') ?? false,
  },
  {
    id: 'general-venture-capital',
    section: 'general',
    title: 'Venture Capital Schemes',
    showInSidebar: false,
    condition: (data) => data.general?.selectedReliefs?.includes('venture-capital') ?? false,
  },

  // Personal Info
  {
    id: 'personal-info',
    section: 'personal',
    title: 'Personal Details',
    showInSidebar: true,
  },

  // Review & Submit Section
  {
    id: 'review-payment',
    section: 'review',
    title: 'Payment',
    showInSidebar: true,
  },
  {
    id: 'review-summary',
    section: 'review',
    title: 'Tax Summary',
    showInSidebar: false,
    condition: (data) => data.payment?.status === 'paid',
  },
  {
    id: 'review-submit',
    section: 'review',
    title: 'Submit to HMRC',
    showInSidebar: false,
    condition: (data) => data.payment?.status === 'paid',
  },
  {
    id: 'review-confirmation',
    section: 'review',
    title: 'Confirmation',
    showInSidebar: false,
    condition: (data) => data.submission?.status === 'submitted',
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
  // Handle self-employment list step
  if (currentStep === 'self-employment-list') {
    // From list, go to next section
    const hasRental = data.incomeSources.some((s) => s.type === 'rental');
    if (hasRental) return 'rental-list';

    const hasEmployment = data.incomeSources.some((s) => s.type === 'employment');
    if (hasEmployment) return 'employment-list';

    const hasCIS = data.incomeSources.some((s) => s.type === 'cis');
    if (hasCIS) return 'cis-income';

    const hasDividends = data.incomeSources.some((s) => s.type === 'dividends');
    if (hasDividends) return 'dividends';

    const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
    if (hasInterest) return 'interest';

    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle rental list step
  if (currentStep === 'rental-list') {
    // From list, go to next section
    const hasEmployment = data.incomeSources.some((s) => s.type === 'employment');
    if (hasEmployment) return 'employment-list';

    const hasCIS = data.incomeSources.some((s) => s.type === 'cis');
    if (hasCIS) return 'cis-income';

    const hasDividends = data.incomeSources.some((s) => s.type === 'dividends');
    if (hasDividends) return 'dividends';

    const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
    if (hasInterest) return 'interest';

    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle self-employment step progression (within a business)
  if (currentStep.startsWith('self-employment-') && currentBusinessId) {
    const stepIndex = SELF_EMPLOYMENT_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < SELF_EMPLOYMENT_STEPS.length - 1) {
      return SELF_EMPLOYMENT_STEPS[stepIndex + 1].id;
    }
    // If we're at the last self-employment step (summary), go back to the list
    return 'self-employment-list';
  }

  // Handle rental step progression (property steps only, not the list)
  const rentalPropertySteps: StepId[] = ['rental-details', 'rental-income', 'rental-expenses', 'rental-summary'];
  if (rentalPropertySteps.includes(currentStep) && currentPropertyId) {
    const stepIndex = RENTAL_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex < RENTAL_STEPS.length - 1) {
      return RENTAL_STEPS[stepIndex + 1].id;
    }
    // If we're at the last rental step (summary), go back to the list
    return 'rental-list';
  }

  // Handle transition from accounts to first income section
  if (currentStep === 'accounts') {
    const hasSelfEmployment = data.incomeSources.some((s) => s.type === 'self-employment');
    if (hasSelfEmployment) return 'self-employment-list';

    const hasRental = data.incomeSources.some((s) => s.type === 'rental');
    if (hasRental) return 'rental-list';

    const hasEmployment = data.incomeSources.some((s) => s.type === 'employment');
    if (hasEmployment) return 'employment-list';

    const hasCIS = data.incomeSources.some((s) => s.type === 'cis');
    if (hasCIS) return 'cis-income';

    const hasDividends = data.incomeSources.some((s) => s.type === 'dividends');
    if (hasDividends) return 'dividends';

    const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
    if (hasInterest) return 'interest';

    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle employment section navigation
  if (currentStep === 'employment-list') {
    const hasCIS = data.incomeSources.some((s) => s.type === 'cis');
    if (hasCIS) return 'cis-income';

    const hasDividends = data.incomeSources.some((s) => s.type === 'dividends');
    if (hasDividends) return 'dividends';

    const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
    if (hasInterest) return 'interest';

    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle employment income step (last step in employment flow)
  if (currentStep === 'employment-income') {
    // Go back to list after completing employer details
    return 'employment-list';
  }

  // Handle CIS to next section
  if (currentStep === 'cis-income') {
    const hasDividends = data.incomeSources.some((s) => s.type === 'dividends');
    if (hasDividends) return 'dividends';

    const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
    if (hasInterest) return 'interest';

    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle dividends to next section
  if (currentStep === 'dividends') {
    const hasInterest = data.incomeSources.some((s) => s.type === 'interest');
    if (hasInterest) return 'interest';

    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle interest to next section
  if (currentStep === 'interest') {
    const hasCapitalGains = data.incomeSources.some((s) => s.type === 'capital-gains');
    if (hasCapitalGains) return 'capital-gains-overview';

    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle capital gains section navigation
  if (currentStep === 'capital-gains-overview') {
    return 'capital-gains-disposals';
  }

  if (currentStep === 'capital-gains-disposals') {
    return 'capital-gains-summary';
  }

  if (currentStep === 'capital-gains-summary') {
    const hasPension = data.incomeSources.some((s) => s.type === 'pension');
    if (hasPension) return 'pension-income';

    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle pension income to next section
  if (currentStep === 'pension-income') {
    const hasStateBenefits = data.incomeSources.some((s) => s.type === 'state-benefits');
    if (hasStateBenefits) return 'state-benefits';

    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle state benefits to next section
  if (currentStep === 'state-benefits') {
    const hasOther = data.incomeSources.some((s) => s.type === 'other');
    if (hasOther) return 'other-income';

    return 'general-overview';
  }

  // Handle other-income to general
  if (currentStep === 'other-income') {
    return 'general-overview';
  }

  // Handle general section progression
  if (currentStep === 'general-overview') {
    const selectedReliefs = data.general?.selectedReliefs || [];
    if (selectedReliefs.includes('marriage-allowance')) return 'general-marriage-allowance';
    if (selectedReliefs.includes('blind-allowance')) return 'general-blind-allowance';
    if (selectedReliefs.includes('pension')) return 'general-pension';
    if (selectedReliefs.includes('charitable')) return 'general-charitable';
    if (selectedReliefs.includes('venture-capital')) return 'general-venture-capital';
    return 'personal-info';
  }

  if (currentStep === 'general-marriage-allowance') {
    const selectedReliefs = data.general?.selectedReliefs || [];
    if (selectedReliefs.includes('blind-allowance')) return 'general-blind-allowance';
    if (selectedReliefs.includes('pension')) return 'general-pension';
    if (selectedReliefs.includes('charitable')) return 'general-charitable';
    if (selectedReliefs.includes('venture-capital')) return 'general-venture-capital';
    return 'personal-info';
  }

  if (currentStep === 'general-blind-allowance') {
    const selectedReliefs = data.general?.selectedReliefs || [];
    if (selectedReliefs.includes('pension')) return 'general-pension';
    if (selectedReliefs.includes('charitable')) return 'general-charitable';
    if (selectedReliefs.includes('venture-capital')) return 'general-venture-capital';
    return 'personal-info';
  }

  if (currentStep === 'general-pension') {
    const selectedReliefs = data.general?.selectedReliefs || [];
    if (selectedReliefs.includes('charitable')) return 'general-charitable';
    if (selectedReliefs.includes('venture-capital')) return 'general-venture-capital';
    return 'personal-info';
  }

  if (currentStep === 'general-charitable') {
    const selectedReliefs = data.general?.selectedReliefs || [];
    if (selectedReliefs.includes('venture-capital')) return 'general-venture-capital';
    return 'personal-info';
  }

  if (currentStep === 'general-venture-capital') {
    return 'personal-info';
  }

  // Handle personal-info to review-payment
  if (currentStep === 'personal-info') {
    return 'review-payment';
  }

  // Handle review section progression
  if (currentStep === 'review-payment') {
    if (data.payment?.status === 'paid') {
      return 'review-summary';
    }
    // Stay on payment if not paid
    return null;
  }

  if (currentStep === 'review-summary') {
    return 'review-submit';
  }

  if (currentStep === 'review-submit') {
    if (data.submission?.status === 'submitted') {
      return 'review-confirmation';
    }
    return null;
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
  // Handle self-employment list step
  if (currentStep === 'self-employment-list') {
    // Go back to accounts or income-sources
    if (data.bankConnected) return 'accounts';
    return 'income-sources';
  }

  // Handle self-employment step progression (within a business)
  if (currentStep.startsWith('self-employment-') && currentBusinessId) {
    const stepIndex = SELF_EMPLOYMENT_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      return SELF_EMPLOYMENT_STEPS[stepIndex - 1].id;
    }
    // If we're at the first self-employment step, go back to the list
    return 'self-employment-list';
  }

  // Handle rental list step
  if (currentStep === 'rental-list') {
    // Go back to self-employment if exists
    const hasSelfEmployment = data.incomeSources.some((s) => s.type === 'self-employment');
    if (hasSelfEmployment) return 'self-employment-list';
    if (data.bankConnected) return 'accounts';
    return 'income-sources';
  }

  // Handle rental step progression (property steps only, not the list)
  const rentalPropertySteps: StepId[] = ['rental-details', 'rental-income', 'rental-expenses', 'rental-summary'];
  if (rentalPropertySteps.includes(currentStep) && currentPropertyId) {
    const stepIndex = RENTAL_STEPS.findIndex((s) => s.id === currentStep);
    if (stepIndex > 0) {
      return RENTAL_STEPS[stepIndex - 1].id;
    }
    // If we're at the first rental step (details), go back to the list
    return 'rental-list';
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
