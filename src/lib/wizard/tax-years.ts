// Tax Year Configuration
// Contains all rates, thresholds, and allowances for each supported tax year

export type TaxYearId = '2023-24' | '2024-25';

export interface TaxYearConfig {
  id: TaxYearId;
  label: string;
  // Tax period dates
  startDate: string; // 6 April
  endDate: string; // 5 April
  // Filing deadline
  filingDeadline: string;
  // Is this the current tax year for filing?
  isCurrent: boolean;

  // Income Tax
  personalAllowance: number;
  basicRateThreshold: number; // Where basic rate ends (£50,270)
  higherRateThreshold: number; // Where higher rate ends (£125,140)
  basicRate: number;
  higherRate: number;
  additionalRate: number;

  // Dividend Tax
  dividendAllowance: number;
  dividendBasicRate: number;
  dividendHigherRate: number;
  dividendAdditionalRate: number;

  // Savings
  personalSavingsAllowanceBasic: number;
  personalSavingsAllowanceHigher: number;
  personalSavingsAllowanceAdditional: number;

  // Capital Gains Tax
  cgtAnnualExemptAmount: number;
  cgtBasicRate: number;
  cgtHigherRate: number;
  cgtResidentialBasicRate: number;
  cgtResidentialHigherRate: number;

  // National Insurance
  class2NicWeekly: number;
  class2SmallProfitsThreshold: number;
  class4LowerProfitsLimit: number;
  class4UpperProfitsLimit: number;
  class4MainRate: number;
  class4UpperRate: number;

  // Trading Allowance
  tradingAllowance: number;

  // Marriage Allowance
  marriageAllowanceAmount: number;

  // Student Loan Thresholds
  studentLoanPlan1Threshold: number;
  studentLoanPlan2Threshold: number;
  studentLoanPlan4Threshold: number;
  studentLoanPostgradThreshold: number;
  studentLoanRate: number;
  studentLoanPostgradRate: number;
}

export const TAX_YEARS: Record<TaxYearId, TaxYearConfig> = {
  '2023-24': {
    id: '2023-24',
    label: '2023-24',
    startDate: '2023-04-06',
    endDate: '2024-04-05',
    filingDeadline: '2025-01-31',
    isCurrent: false,

    // Income Tax (same as 2024-25)
    personalAllowance: 12570,
    basicRateThreshold: 50270,
    higherRateThreshold: 125140,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,

    // Dividend Tax
    dividendAllowance: 1000, // Was £1,000 in 2023-24
    dividendBasicRate: 0.0875,
    dividendHigherRate: 0.3375,
    dividendAdditionalRate: 0.3935,

    // Savings
    personalSavingsAllowanceBasic: 1000,
    personalSavingsAllowanceHigher: 500,
    personalSavingsAllowanceAdditional: 0,

    // Capital Gains Tax
    cgtAnnualExemptAmount: 6000, // Was £6,000 in 2023-24
    cgtBasicRate: 0.1,
    cgtHigherRate: 0.2,
    cgtResidentialBasicRate: 0.18,
    cgtResidentialHigherRate: 0.28, // Was 28% in 2023-24

    // National Insurance - Class 4 changed mid-year in 2023-24
    // For simplicity, we use the rate that applied from Jan 2024 (9% -> 8%)
    // But the main rate was 9% for most of the year
    class2NicWeekly: 3.45,
    class2SmallProfitsThreshold: 6725,
    class4LowerProfitsLimit: 12570,
    class4UpperProfitsLimit: 50270,
    class4MainRate: 0.09, // 9% for 2023-24 (before Jan 2024 cut)
    class4UpperRate: 0.02,

    // Trading Allowance
    tradingAllowance: 1000,

    // Marriage Allowance
    marriageAllowanceAmount: 1260,

    // Student Loan Thresholds
    studentLoanPlan1Threshold: 22015,
    studentLoanPlan2Threshold: 27295,
    studentLoanPlan4Threshold: 27660,
    studentLoanPostgradThreshold: 21000,
    studentLoanRate: 0.09,
    studentLoanPostgradRate: 0.06,
  },

  '2024-25': {
    id: '2024-25',
    label: '2024-25',
    startDate: '2024-04-06',
    endDate: '2025-04-05',
    filingDeadline: '2026-01-31',
    isCurrent: true,

    // Income Tax
    personalAllowance: 12570,
    basicRateThreshold: 50270,
    higherRateThreshold: 125140,
    basicRate: 0.2,
    higherRate: 0.4,
    additionalRate: 0.45,

    // Dividend Tax
    dividendAllowance: 500, // Reduced to £500 in 2024-25
    dividendBasicRate: 0.0875,
    dividendHigherRate: 0.3375,
    dividendAdditionalRate: 0.3935,

    // Savings
    personalSavingsAllowanceBasic: 1000,
    personalSavingsAllowanceHigher: 500,
    personalSavingsAllowanceAdditional: 0,

    // Capital Gains Tax
    cgtAnnualExemptAmount: 3000, // Reduced to £3,000 in 2024-25
    cgtBasicRate: 0.1,
    cgtHigherRate: 0.2,
    cgtResidentialBasicRate: 0.18,
    cgtResidentialHigherRate: 0.24, // Reduced to 24% in 2024-25

    // National Insurance
    class2NicWeekly: 3.45,
    class2SmallProfitsThreshold: 6725,
    class4LowerProfitsLimit: 12570,
    class4UpperProfitsLimit: 50270,
    class4MainRate: 0.06, // Reduced to 6% in 2024-25
    class4UpperRate: 0.02,

    // Trading Allowance
    tradingAllowance: 1000,

    // Marriage Allowance
    marriageAllowanceAmount: 1260,

    // Student Loan Thresholds
    studentLoanPlan1Threshold: 24990,
    studentLoanPlan2Threshold: 27295,
    studentLoanPlan4Threshold: 31395,
    studentLoanPostgradThreshold: 21000,
    studentLoanRate: 0.09,
    studentLoanPostgradRate: 0.06,
  },
};

// Helper to get config for a tax year
export function getTaxYearConfig(taxYear: string): TaxYearConfig {
  const config = TAX_YEARS[taxYear as TaxYearId];
  if (!config) {
    // Default to current year if invalid
    return TAX_YEARS['2024-25'];
  }
  return config;
}

// Get all supported tax years for the selector
export function getSupportedTaxYears(): TaxYearConfig[] {
  return Object.values(TAX_YEARS).sort((a, b) => b.id.localeCompare(a.id));
}

// Get the current tax year (most recent)
export function getCurrentTaxYear(): TaxYearConfig {
  return Object.values(TAX_YEARS).find((y) => y.isCurrent) || TAX_YEARS['2024-25'];
}

// Format tax year for display
export function formatTaxYear(taxYear: string): string {
  return taxYear; // Already in format "2024-25"
}

// Get deadline status
export function getDeadlineStatus(taxYear: string): {
  isPastDeadline: boolean;
  daysUntilDeadline: number;
  deadlineDate: Date;
} {
  const config = getTaxYearConfig(taxYear);
  const deadline = new Date(config.filingDeadline);
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isPastDeadline: diffDays < 0,
    daysUntilDeadline: diffDays,
    deadlineDate: deadline,
  };
}
