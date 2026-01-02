export type StepId =
  // Getting Started
  | 'residency'
  | 'income-sources'
  // Connect Data
  | 'connect-choice'
  | 'bank-connection'
  | 'upload-statements'
  | 'manual-entry'
  | 'accounts'
  | 'importing'
  // Transactions
  | 'transactions'
  | 'transactions-summary'
  // Self Employment (dynamic - only if selected)
  | 'self-employment-intro'
  | 'self-employment-income'
  | 'self-employment-expenses'
  | 'self-employment-summary'
  // Employment (PAYE)
  | 'employment-intro'
  // CIS
  | 'cis-intro'
  // Rental (dynamic - only if selected)
  | 'rental-intro'
  | 'rental-income'
  | 'rental-expenses'
  | 'rental-summary'
  // Dividends
  | 'dividends-intro'
  // Interest
  | 'interest-intro'
  // Capital Gains
  | 'capital-gains-intro'
  // Pension
  | 'pension-intro'
  // State Benefits
  | 'state-benefits-intro'
  // Deductions
  | 'deductions-mileage'
  | 'deductions-home-office'
  // Personal & Review
  | 'personal-info'
  | 'review'
  | 'submit'
  | 'confirmation'
  // Special
  | 'not-supported';

export type SectionId =
  | 'getting-started'
  | 'connect'
  | 'transactions'
  | 'self-employment'
  | 'employment'
  | 'cis'
  | 'rental'
  | 'dividends'
  | 'interest'
  | 'capital-gains'
  | 'pension'
  | 'state-benefits'
  | 'deductions'
  | 'personal'
  | 'review';

export interface StepConfig {
  id: StepId;
  section: SectionId;
  title: string;
  showInSidebar?: boolean;
  condition?: (data: WizardData) => boolean;
}

export interface IncomeSource {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string | null;
  suggested_category: string | null;
  status: 'business' | 'personal' | 'needs_review';
  confidence: number;
}

export interface WizardData {
  // Session
  sessionId: string | null;
  taxYear: string;

  // Getting Started
  isUKResident: boolean | null;
  incomeSources: IncomeSource[];

  // Connect
  connectionMethod: 'bank' | 'upload' | 'manual' | null;
  bankConnected: boolean;
  bankImportData: {
    accountCount: number;
    transactionCount: number;
    bankName: string;
  } | null;

  // Transactions
  transactions: Transaction[];
  transactionsReviewed: boolean;

  // Self Employment
  selfEmployment: {
    businessIncome: number;
    businessExpenses: Record<string, number>;
    otherIncome: number;
  };

  // Rental
  rental: {
    properties: Array<{
      id: string;
      address: string;
      income: number;
      expenses: Record<string, number>;
    }>;
  };

  // Deductions
  deductions: {
    mileage: { miles: number; rate: number; total: number };
    homeOffice: { amount: number; method: 'simplified' | 'actual' };
  };

  // Personal
  personalInfo: {
    fullName: string;
    utr: string;
    nino: string;
    address: string;
    postcode: string;
  };

  // Calculations
  taxCalculation: {
    totalIncome: number;
    totalExpenses: number;
    totalDeductions: number;
    taxableProfit: number;
    incomeTax: number;
    nationalInsurance: number;
    totalTaxDue: number;
  };
}

export interface WizardContextType {
  // State
  currentStep: StepId;
  data: WizardData;
  isLoading: boolean;
  isSaving: boolean;

  // Navigation
  goToStep: (step: StepId) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // Data updates
  updateData: (updates: Partial<WizardData>) => void;

  // Income sources
  addIncomeSource: (source: Omit<IncomeSource, 'id'>) => void;
  updateIncomeSource: (id: string, updates: Partial<IncomeSource>) => void;
  deleteIncomeSource: (id: string) => void;

  // Transactions
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  bulkUpdateTransactions: (ids: string[], updates: Partial<Transaction>) => void;

  // Helpers
  getVisibleSteps: () => StepConfig[];
  getSectionStatus: (section: SectionId) => 'not_started' | 'in_progress' | 'completed';
  calculateTax: () => void;
  saveProgress: () => Promise<void>;
}
