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
  // Self Employment (list and dynamic per business)
  | 'self-employment-list'
  | 'self-employment-basics'
  | 'self-employment-income'
  | 'self-employment-expenses'
  | 'self-employment-capital-allowances'
  | 'self-employment-losses'
  | 'self-employment-summary'
  // Rental (dynamic per property)
  | 'rental-details'
  | 'rental-income'
  | 'rental-expenses'
  | 'rental-summary'
  // Other Income Types (simple amounts)
  | 'other-income'
  // General (Tax Reliefs & Allowances)
  | 'general-overview'
  | 'general-marriage-allowance'
  | 'general-blind-allowance'
  | 'general-pension'
  | 'general-charitable'
  | 'general-venture-capital'
  // General Deductions
  | 'deductions-overview'
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
  | 'self-employment'
  | 'rental'
  | 'other-income'
  | 'general'
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
  suggested_is_business?: boolean;
  status: 'business' | 'personal' | 'needs_review';
  confidence: number;
  // Link to specific business/property
  businessId?: string;
}

// Self Employment Business Data
export interface SelfEmploymentBusiness {
  // The Basics
  businessName: string;
  businessDescription: string;
  businessPostcode: string;
  detailsChanged: boolean;
  industry: string;
  accountingMethod: 'cash' | 'accruals';
  startDate: string;
  endDate: string;

  // Income
  income: {
    fromTransactions: number;
    manual: Array<{ description: string; amount: number }>;
    total: number;
  };

  // Expenses by SA103 category
  expenses: {
    byCategory: Record<string, number>;
    fromTransactions: number;
    manual: Array<{ description: string; amount: number; category?: string }>;
    total: number;
  };

  // Capital Allowances
  capitalAllowances: {
    equipment: number;
    vehicles: number;
    other: number;
    total: number;
  };

  // Losses
  losses: {
    broughtForward: number;
    carriedForward: number;
  };

  // Calculated
  profit: number;

  // Completion status
  isComplete: boolean;
}

// Rental Property Data
export interface RentalProperty {
  // Property Details
  address: string;
  postcode: string;
  propertyType: 'residential' | 'commercial' | 'holiday-let';
  ownershipShare: number; // percentage

  // Income
  income: {
    rentReceived: number;
    otherIncome: number;
    total: number;
  };

  // Expenses
  expenses: {
    byCategory: Record<string, number>;
    total: number;
  };

  // Calculated
  profit: number;
}

// General Section Data (Tax Reliefs & Allowances)
export interface GeneralData {
  selectedReliefs: string[];

  // Marriage Allowance
  marriageAllowance?: {
    type: 'transfer' | 'receive' | null;
    spouseNino?: string;
    spouseName?: string;
    spouseDob?: string;
  };

  // Blind Person's Allowance
  blindAllowance?: {
    registeredBlind: boolean;
    localAuthority?: string;
    registrationDate?: string;
    surplusFromSpouse?: number;
  };

  // Pension Contributions
  pension?: {
    personalContributions: number;
    employerContributions?: number;
    oneOffContributions?: number;
    carryForwardUsed?: boolean;
    carryForwardAmount?: number;
  };

  // Charitable Giving
  charitable?: {
    giftAidDonations: number;
    giftAidTreatedAsPreviousYear?: number;
    giftAidBroughtForward?: number;
    giftOfShares?: number;
    giftOfProperty?: number;
    giftToNonUKCharities?: number;
  };

  // Venture Capital Schemes
  ventureCapital?: {
    eisInvestments?: number;
    eisReliefClaimed?: number;
    eisCarryBack?: boolean;
    seisInvestments?: number;
    seisReliefClaimed?: number;
    seisCarryBack?: boolean;
    vctInvestments?: number;
    vctReliefClaimed?: number;
    sitrInvestments?: number;
    sitrReliefClaimed?: number;
  };
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
  bankAccounts: Array<{
    account_id: string;
    display_name: string;
    account_type: string;
    provider_name: string;
  }>;
  bankName: string | null;
  bankImportData: {
    accountCount: number;
    transactionCount: number;
    bankName: string;
  } | null;

  // Transactions (shared across all businesses/properties)
  transactions: Transaction[];
  transactionsReviewed: boolean;

  // Self Employment Data (keyed by business ID from incomeSources)
  selfEmploymentData: Record<string, Partial<SelfEmploymentBusiness>>;

  // Rental Data (keyed by property ID from incomeSources)
  rentalData: Record<string, Partial<RentalProperty>>;

  // Other Income (simple types)
  otherIncome: {
    interest: number;
    dividends: number;
    pension: number;
    stateBenefits: number;
    other: number;
  };

  // General (Tax Reliefs & Allowances)
  general: Partial<GeneralData>;

  // Deductions
  deductions: {
    mileage: { miles: number; rate: number; total: number };
    homeOffice: { amount: number; method: 'simplified' | 'actual' };
    pensionContributions: number;
    giftAid: number;
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
  currentBusinessId: string | null;
  currentPropertyId: string | null;
  data: WizardData;
  isLoading: boolean;
  isSaving: boolean;

  // Navigation
  goToStep: (step: StepId) => void;
  goToBusinessStep: (businessId: string, step: StepId) => void;
  goToPropertyStep: (propertyId: string, step: StepId) => void;
  goNext: () => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // Data updates
  updateData: (updates: Partial<WizardData>) => void;
  updateBusinessData: (businessId: string, updates: Partial<SelfEmploymentBusiness>) => void;
  updatePropertyData: (propertyId: string, updates: Partial<RentalProperty>) => void;

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
