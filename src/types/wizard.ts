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
  // Rental (list and dynamic per property)
  | 'rental-list'
  | 'rental-details'
  | 'rental-income'
  | 'rental-expenses'
  | 'rental-summary'
  // Employment (PAYE)
  | 'employment-list'
  | 'employment-details'
  | 'employment-income'
  | 'employment-benefits'
  | 'employment-expenses'
  // CIS
  | 'cis-income'
  // Dividends
  | 'dividends'
  // Interest
  | 'interest'
  // Capital Gains
  | 'capital-gains-disposals'
  | 'capital-gains-summary'
  // Pension Income
  | 'pension-income'
  // State Benefits
  | 'state-benefits'
  // Other Income (simple amounts)
  | 'other-income'
  // General (Tax Reliefs & Allowances)
  | 'general-overview'
  | 'general-marriage-allowance'
  | 'general-blind-allowance'
  | 'general-pension'
  | 'general-charitable'
  | 'general-venture-capital'
  // Personal
  | 'personal-info'
  // Review & Submit
  | 'review-payment'
  | 'review-summary'
  | 'review-submit'
  | 'review-confirmation'
  // Special
  | 'not-supported';

export type SectionId =
  | 'getting-started'
  | 'connect'
  | 'self-employment'
  | 'rental'
  | 'employment'
  | 'cis'
  | 'dividends'
  | 'interest'
  | 'capital-gains'
  | 'pension-income'
  | 'state-benefits'
  | 'other-income'
  | 'general'
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
  // Source bank account ID (for filtering by account)
  accountId?: string;
}

// Self Employment Business Data
export interface SelfEmploymentBusiness {
  // The Basics
  businessName: string;
  businessDescription: string;
  businessPostcode: string;
  detailsChanged: boolean;
  // Previous details (if detailsChanged is true)
  previousBusinessName?: string;
  previousBusinessDescription?: string;
  previousBusinessPostcode?: string;
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

  // Finance Costs (Section 24)
  hasMortgage: boolean;
  mortgageInterest: number;
  otherFinanceCosts: number;

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

  // Completion status
  isComplete: boolean;
}

// Employment Income (PAYE)
export interface EmploymentData {
  id: string;
  employerName: string;
  employerPAYERef?: string; // e.g., 123/AB12345
  jobTitle?: string;
  startDate?: string;
  endDate?: string; // If left during tax year

  // From P60/P45
  payReceived: number; // Box 1 - Total pay
  taxDeducted: number; // Box 2 - Tax deducted

  // Benefits in Kind (P11D)
  hasP11D: boolean;
  companyCarBenefit?: number;
  fuelBenefit?: number;
  medicalInsuranceBenefit?: number;
  otherBenefits?: number;

  // Expenses (if claiming)
  claimingExpenses: boolean;
  travelExpenses?: number;
  professionalFees?: number; // Professional subscriptions
  workingFromHome?: number;
  otherExpenses?: number;

  // Tips & other
  tipsReceived?: number;

  // Student Loan
  hasStudentLoan?: boolean;
  studentLoanDeducted?: number;
  studentLoanPlanType?: '1' | '2' | '4' | 'postgrad';

  // Completion status
  isComplete: boolean;
}

// CIS Income
export interface CISPayment {
  periodStart?: string;
  periodEnd?: string;
  grossAmount: number;
  cisDeducted: number;
  materialsAmount?: number;
}

export interface CISContractor {
  id: string;
  contractorName: string;
  contractorUTR?: string;

  grossPayments: number; // Total gross received
  cisDeductions: number; // Tax deducted at source (20% or 30%)
  materialsDeducted?: number; // Materials cost if applicable
  deductionRate?: '20' | '30' | '0'; // Registered, unregistered, or gross

  // Individual payments (for detailed submission)
  payments?: CISPayment[];

  // Net = Gross - CIS Deductions
  netPayments: number;
}

export interface CISData {
  contractors: CISContractor[];
  hasAllCISStatements: boolean;
  totalGross: number;
  totalGrossPayments?: number; // Alias for HMRC mapper
  totalDeductions: number;
  totalCISDeductions?: number; // Alias for HMRC mapper
  totalMaterials?: number;
  totalNet: number;
  // Allowable business expenses (travel, tools, equipment, etc.)
  expenses?: number;
}

// Dividends
export interface DividendsData {
  ukDividends: number; // UK company dividends
  ukDividendsFromUnitTrusts?: number;
  foreignDividends?: number;
  foreignTaxPaid?: number; // For tax credit
  foreignDividendsCountry?: string; // Country code for foreign dividends
  claimForeignTaxCredit?: boolean; // Claim tax credit for foreign tax paid

  // Foreign dividends by country (for multiple countries)
  foreignDividendsByCountry?: Array<{
    countryCode: string;
    amount: number;
    taxPaid?: number;
  }>;

  // Stock dividends
  stockDividends?: number;

  // Close company loans written off
  closeCompanyLoansWrittenOff?: number;

  // Totals
  totalDividends: number;
  taxableDividends: number; // After £500 allowance
}

// Interest Income
export interface InterestData {
  // Untaxed interest (most savings now)
  untaxedUKInterest: number; // Bank/building society
  untaxedForeignInterest?: number;

  // Taxed interest (rare now)
  taxedUKInterest?: number;
  taxDeducted?: number;
  taxDeductedFromInterest?: number; // Alias for HMRC mapper

  // Gilts and bonds
  giltsInterest?: number;

  // Foreign interest details
  foreignInterest?: number;
  foreignInterestCountry?: string;
  foreignTaxPaidOnInterest?: number;
  claimForeignTaxCreditOnInterest?: boolean;

  // Foreign interest by country (for multiple countries)
  foreignInterestByCountry?: Array<{
    countryCode: string;
    amount: number;
    taxPaid?: number;
  }>;

  // Savings accounts (for detailed tracking)
  savingsAccounts?: Array<{
    accountName: string;
    interestReceived: number;
    isTaxed: boolean;
  }>;

  // Total
  totalInterest: number;
}

// Capital Gains
export type CapitalGainsAssetType =
  | 'shares'
  | 'listed-shares'
  | 'unlisted-shares'
  | 'property'
  | 'residential-property'
  | 'other-property'
  | 'crypto'
  | 'other';

export interface CapitalGainsDisposal {
  id: string;
  assetType: CapitalGainsAssetType;
  assetDescription: string;
  dateAcquired?: string;
  dateSold: string;
  proceedsAmount: number; // Sale price
  acquisitionCost: number; // Purchase price
  allowableCosts?: number; // Fees, improvements
  improvementCosts?: number; // Property improvement costs
  additionalCosts?: number; // Legal fees, etc.
  gain: number; // Calculated
  loss: number; // Calculated

  // Reliefs
  reliefClaimed?: boolean;
  reliefAmount?: number;
  privateResidenceRelief?: number; // PRR for residential property
}

export interface CapitalGainsData {
  // Asset types selected
  assetTypes: string[];

  // Disposals
  disposals: CapitalGainsDisposal[];

  // Summary
  totalGains: number;
  totalLosses: number;
  lossesFromPreviousYears?: number;
  lossesThisYear?: number; // Losses from disposals this year
  annualExemptAmount: number; // £3,000 for 2024/25
  taxableGains: number;

  // Residential property (different rates)
  residentialPropertyGains?: number;
}

// Pension Income
export interface PrivatePension {
  id: string;
  providerName: string;
  pensionAmount: number;
  grossAmount?: number; // Gross pension amount before tax
  taxDeducted: number;
  isLumpSum: boolean;
}

export interface ForeignPension {
  id: string;
  countryCode: string;
  pensionAmount: number;
  taxPaid?: number;
}

export interface PensionIncomeData {
  // State Pension
  statePension?: number;
  statePensionLumpSum?: number;

  // Private/Workplace Pensions
  privatePensions: PrivatePension[];

  // Foreign Pensions
  foreignPensions?: ForeignPension[];
  foreignPensionTotal?: number;
  foreignPensionCountry?: string;
  foreignPensionTaxPaid?: number;
  claimForeignPensionTaxCredit?: boolean;

  // Total
  totalPensionIncome: number;
  totalTaxDeducted: number;
}

// State Benefits
export interface StateBenefitsData {
  // Taxable benefits
  jobseekersAllowance?: number; // JSA (contribution-based)
  jsaStartDate?: string;
  jsaEndDate?: string;
  taxDeductedFromJSA?: number;

  employmentSupportAllowance?: number; // ESA (contribution-based)
  esaStartDate?: string;
  esaEndDate?: string;
  taxDeductedFromESA?: number;

  carersAllowance?: number;

  bereavementAllowance?: number;
  bereavementStartDate?: string;
  bereavementEndDate?: string;

  incapacityBenefit?: number;
  taxDeductedFromIncapacityBenefit?: number;

  // State Pension (also accessible here for convenience)
  statePension?: number;
  statePensionStartDate?: string;
  statePensionLumpSum?: number;
  statePensionLumpSumDate?: string;
  taxOnStatePensionLumpSum?: number;

  // Other taxable benefits
  otherTaxableBenefits?: number;

  // High Income Child Benefit Charge
  hasHighIncomeChildBenefit: boolean; // If income > £60,000
  childBenefitReceived?: number;
  childBenefitCharge?: number; // HICBC to pay back

  // Total
  totalTaxableBenefits: number;
}

// General Section Data (Tax Reliefs & Allowances)
export interface GeneralData {
  selectedReliefs: string[];

  // Marriage Allowance
  marriageAllowance?: {
    type: 'transfer' | 'receive' | null;
    transferType?: 'transfer' | 'receive'; // Alias for type
    spouseNino?: string;
    spouseName?: string;
    spouseFirstName?: string;
    spouseSurname?: string;
    spouseDob?: string;
    spouseDateOfBirth?: string; // Alias for spouseDob
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
    // Simple totals
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

    // Aggregated totals (calculated from investments or entered directly)
    totalVCT?: number;
    totalEIS?: number;
    totalSEIS?: number;

    // Detailed investments (optional, for detailed tracking)
    vctInvestmentsList?: Array<{
      companyName?: string;
      amount: number;
      dateInvested?: string;
    }>;
    eisInvestmentsList?: Array<{
      companyName?: string;
      amount: number;
      dateInvested?: string;
    }>;
    seisInvestmentsList?: Array<{
      companyName?: string;
      amount: number;
      dateInvested?: string;
    }>;
  };
}

// Payment Data
export interface PaymentData {
  status: 'pending' | 'paid' | 'failed';
  plan: 'lite' | 'pro' | 'lifetime' | null;
  amount: number;
  discountCode?: string;
  discountAmount?: number;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  paidAt?: string;
  receiptUrl?: string;
}

// Tax Calculation
export interface TaxCalculation {
  // Income
  totalIncome: number;
  selfEmploymentIncome: number;
  employmentIncome: number;
  rentalIncome: number;
  otherIncome: number;
  // Detailed income breakdowns
  cisIncome: number;
  dividendsIncome: number;
  interestIncome: number;
  pensionIncome: number;
  stateBenefitsIncome: number;
  capitalGainsIncome: number;

  // Expenses & Deductions
  totalExpenses: number;
  allowableExpenses: number;
  capitalAllowances: number;
  tradingAllowance: number; // £1,000 trading allowance for small self-employment income

  // Reliefs & Allowances
  pensionRelief: number;
  giftAidRelief: number;
  ventureCapitalRelief: number;
  marriageAllowance: number;
  blindAllowance: number;
  personalSavingsAllowance: number; // PSA: £1,000 basic rate, £500 higher rate, £0 additional
  section24Relief: number; // Finance costs tax credit for landlords

  // Tax Calculation
  taxableIncome: number;
  personalAllowance: number;
  taxableAfterAllowance: number;

  // Tax Bands
  basicRateTax: number;
  higherRateTax: number;
  additionalRateTax: number;
  savingsInterestTax: number; // Tax on savings interest (after PSA)
  dividendTax: number; // Tax on dividends at dividend rates

  // National Insurance
  class2NIC: number;
  class4NIC: number;

  // Capital Gains Tax
  cgtBasicRateTax: number; // CGT at 10% (or 18% for residential)
  cgtHigherRateTax: number; // CGT at 20% (or 24% for residential)
  totalCGTDue: number;

  // Student Loan
  studentLoanDue: number; // Calculated repayment based on income and plan type
  studentLoanDeducted: number; // Already deducted via PAYE
  studentLoanToPay: number; // Net amount to pay (due - deducted)
  studentLoanPlanType?: '1' | '2' | '4' | 'postgrad';

  // Tax Already Paid
  payeTaxDeducted: number; // PAYE tax deducted by employers
  cisDeductions: number; // CIS tax deducted by contractors
  taxAlreadyPaid: number; // Total tax already paid (PAYE + CIS)

  // Final
  totalTaxDue: number;
  totalNICDue: number;
  totalDue: number;

  // Or refund
  refundDue?: number;
}

// Submission Data
export interface SubmissionData {
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: string;
  hmrcReferenceNumber?: string;
  calculationId?: string;
  declarationAccepted: boolean;
  declarationTimestamp?: string;
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
  selectedAccountIds: string[]; // Persisted account selection
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

  // Employment Data (keyed by employer ID from incomeSources)
  employmentData: Record<string, Partial<EmploymentData>>;

  // CIS Data
  cisData: Partial<CISData>;

  // Dividends Data
  dividendsData: Partial<DividendsData>;

  // Interest Data
  interestData: Partial<InterestData>;

  // Capital Gains Data
  capitalGainsData: Partial<CapitalGainsData>;

  // Pension Income Data
  pensionIncomeData: Partial<PensionIncomeData>;

  // State Benefits Data
  stateBenefitsData: Partial<StateBenefitsData>;

  // Other Income (simple types - legacy, may be removed)
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
    // Address change during tax year
    addressChanged: boolean | null;
    newAddress?: string;
    newPostcode?: string;
    moveDate?: string; // ISO date string
  };

  // Calculations
  taxCalculation: TaxCalculation | null;

  // Payment
  payment: PaymentData | null;

  // Submission
  submission: SubmissionData | null;

  // Intro wizard data (pre-filled from intro wizard)
  introData?: {
    intent: string | null;
    incomeSource: string | null;
    incomeSources: string[]; // Array of selected income sources from intro wizard
    filingExperience: string | null;
    situation: string | null;
    experienceLevel: 'beginner' | 'intermediate' | 'expert';
    suggestedSources: string[];
  };
}

export interface WizardContextType {
  // State
  currentStep: StepId;
  currentBusinessId: string | null;
  currentPropertyId: string | null;
  currentEmployerId: string | null;
  data: WizardData;
  isLoading: boolean;
  isSaving: boolean;
  navigationDirection: 'forward' | 'backward';

  // Navigation
  goToStep: (step: StepId) => void;
  goToBusinessStep: (businessId: string, step: StepId) => void;
  goToPropertyStep: (propertyId: string, step: StepId) => void;
  goToEmployerStep: (employerId: string, step: StepId) => void;
  goNext: () => void;
  goNextWithData: (updatedData: Partial<WizardData>) => void;
  goBack: () => void;
  canGoNext: boolean;
  canGoBack: boolean;

  // Data updates
  updateData: (updates: Partial<WizardData>) => void;
  updateBusinessData: (businessId: string, updates: Partial<SelfEmploymentBusiness>) => void;
  updatePropertyData: (propertyId: string, updates: Partial<RentalProperty>) => void;
  updateEmployerData: (employerId: string, updates: Partial<EmploymentData>) => void;

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
  isSectionUnlocked: (section: SectionId) => boolean;
  calculateTax: () => void;
  saveProgress: () => Promise<void>;

  // Tax year switching
  switchTaxYear: (newTaxYear: string) => Promise<void>;
  isSwitchingYear: boolean;
}
