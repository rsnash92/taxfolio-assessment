// HMRC API Module - Main Export
// Provides a unified interface for all HMRC MTD API interactions

// Client
export { hmrcClient, HMRCError, getHMRCTokens, isHMRCConnected } from './client';

// Types
export type {
  // OAuth
  HMRCTokens,
  StoredHMRCTokens,

  // Self Employment
  SelfEmploymentPeriodSummary,
  SelfEmploymentAnnualSubmission,

  // Property
  UKPropertyPeriodSummary,
  UKPropertyAnnualSubmission,

  // Employment
  EmploymentFinancialData,
  EmploymentSource,

  // Dividends
  UKDividendsIncome,
  OtherDividendsIncome,
  ForeignDividendsIncome,
  ForeignDividendItem,

  // Savings
  SavingsIncome,
  UKSavingsAccountsIncome,
  SavingsAccountItem,
  ForeignInterestItem,

  // CIS
  CISDeductionsSubmission,
  CISDeductionsResponse,
  CISDeductionPeriod,

  // State Benefits
  StateBenefitsSubmission,
  StateBenefitItem,
  StateBenefitType,

  // Pensions
  PensionsIncome,
  ForeignPensionItem,

  // Capital Gains
  CapitalGainsSubmission,
  CapitalGainsDisposal,
  CapitalGainsAssetType,
  CapitalGainsLosses,
  ResidentialPropertyDisposal,

  // Reliefs
  PensionReliefs,
  InvestmentReliefs,
  MarriageAllowance,
  GiftAidPayments,
  VCTSubscriptionItem,
  EISSubscriptionItem,
  SEISSubscriptionItem,

  // Calculations
  TaxCalculationResult,
  CalculationType,
  TaxBand,
  NIC4Band,

  // Errors
  HMRCApiError,

  // Obligations
  Obligation,
  ObligationsResponse,
} from './types';

// Employment API
export {
  listEmployments,
  getEmployment,
  submitEmploymentFinancialData,
  ignoreEmployment,
  deleteCustomEmployment,
  mapEmploymentDataToHMRC,
  mapHMRCToEmploymentData,
  submitAllEmploymentData,
} from './employment';

// Self-Employment API (SA103)
export {
  getSelfEmploymentBusinesses,
  createSelfEmploymentBusiness,
  submitSelfEmploymentPeriod,
  submitAnnualSummary,
  submitAllSelfEmploymentData,
  calculateSelfEmploymentSummary,
} from './self-employment';
export type { SelfEmploymentSubmissionResult } from './self-employment';

// Property API (SA105)
export {
  getPropertyBusiness,
  createPropertyBusiness,
  submitPropertyPeriod,
  submitPropertyAnnualSummary,
  submitAllPropertyData,
  calculatePropertySummary,
} from './property';
export type { PropertySubmissionResult } from './property';

// Dividends API
export {
  getUKDividends,
  submitUKDividends,
  deleteUKDividends,
  getOtherDividends,
  submitOtherDividends,
  getForeignDividends,
  submitForeignDividends,
  mapDividendsToHMRCUKDividends,
  mapDividendsToHMRCForeignDividends,
  mapDividendsToHMRCOtherDividends,
  mapHMRCToDividendsData,
  submitAllDividendsData,
  DIVIDEND_ALLOWANCE_2024_25,
  calculateTaxableDividends,
} from './dividends';

// Savings/Interest API
export {
  getSavingsIncome,
  submitSavingsIncome,
  deleteSavingsIncome,
  getUKSavingsAccounts,
  submitUKSavingsAccounts,
  mapInterestToHMRCSavingsIncome,
  mapInterestToHMRCUKSavingsAccounts,
  mapHMRCToInterestData,
  submitAllInterestData,
  PERSONAL_SAVINGS_ALLOWANCE,
  getPersonalSavingsAllowance,
  calculateTaxableInterest,
} from './savings';

// CIS API
export {
  getCISCurrentPosition,
  getCISDeductions,
  createCISDeductions,
  amendCISDeductions,
  deleteCISDeductions,
  mapContractorToHMRCFormat,
  mapCISDataToHMRC,
  mapHMRCToCISData,
  submitAllCISData,
  CIS_DEDUCTION_RATES,
  calculateCISDeduction,
  calculateCISSummary,
} from './cis';

// State Benefits API
export {
  getStateBenefits,
  submitStateBenefits,
  deleteStateBenefits,
  mapStateBenefitsToHMRC,
  mapHMRCToStateBenefitsData,
  submitAllStateBenefitsData,
  HICBC_THRESHOLDS,
  calculateHICBC,
  calculateStateBenefitsSummary,
} from './state-benefits';

// Pensions API
export {
  getPensionsIncome,
  submitPensionsIncome,
  deletePensionsIncome,
  mapPensionIncomeToHMRC,
  mapHMRCToPensionIncomeData,
  submitAllPensionIncomeData,
  mapPrivatePensionToEmploymentData,
  calculatePensionIncomeSummary,
  PENSION_ANNUAL_ALLOWANCE,
  PENSION_ANNUAL_ALLOWANCE_TAPERED_MIN,
  PENSION_MONEY_PURCHASE_ANNUAL_ALLOWANCE,
  calculatePensionAnnualAllowance,
} from './pensions';

// Capital Gains API
export {
  getCapitalGains,
  submitCapitalGains,
  deleteCapitalGains,
  mapCapitalGainsToHMRC,
  mapHMRCToCapitalGainsData,
  submitAllCapitalGainsData,
  CGT_ANNUAL_EXEMPT_AMOUNT_2024_25,
  CGT_RATES,
  calculateCGT,
  calculateDisposalsSummary,
} from './capital-gains';

// Reliefs API
export {
  getPensionReliefs,
  submitPensionReliefs,
  deletePensionReliefs,
  getInvestmentReliefs,
  submitInvestmentReliefs,
  deleteInvestmentReliefs,
  getMarriageAllowance,
  submitMarriageAllowance,
  mapPensionContributionsToHMRC,
  mapInvestmentReliefsToHMRC,
  mapMarriageAllowanceToHMRC,
  submitAllReliefsData,
  RELIEF_LIMITS,
  calculateGiftAidRelief,
  calculateVentureCapitalRelief,
} from './reliefs';

// Submission Orchestrator
export {
  triggerCalculation,
  retrieveCalculation,
  submitFinalDeclaration,
  submitSelfAssessment,
  validateForSubmission,
} from './submission';
export type {
  SubmissionStep,
  SubmissionResult,
  ValidationResult,
} from './submission';

// Submission Preview (Dry Run)
export { generateSubmissionPreview } from './preview';
export type { PreviewItem, SubmissionPreview } from './preview';

// Submission Logging
export {
  createSubmissionLogger,
  getSubmissionLogs,
  generateSubmissionId,
} from './submission-logger';
export type { SubmissionLogEntry } from './submission-logger';
