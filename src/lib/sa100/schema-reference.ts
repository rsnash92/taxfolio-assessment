/**
 * SA100 XML Schema Reference
 *
 * Based on HMRC RIM Artefacts 2025 v1.0 (MTR-v1-0.xsd)
 * Tax Year: 2024-25
 *
 * This file documents the exact structure required by HMRC for SA100 submissions.
 */

// =============================================================================
// Namespaces
// =============================================================================

export const NAMESPACES = {
  /** GovTalk envelope namespace */
  GOVTALK: 'http://www.govtalk.gov.uk/CM/envelope',

  /** MTR (Main Tax Return) namespace for 2024-25 */
  MTR: 'http://www.govtalk.gov.uk/taxation/SA/SA100/24-25/1',

  /** XML Schema Instance namespace */
  XSI: 'http://www.w3.org/2001/XMLSchema-instance',
}

export const SCHEMA_LOCATIONS = {
  GOVTALK: 'envelope-v2-0-HMRC.xsd',
  MTR: 'MTR-v1-0.xsd',
}

// =============================================================================
// Submission Endpoints
// =============================================================================

export const SUBMISSION_URLS = {
  test: 'https://test-transaction-engine.tax.service.gov.uk/submission',
  live: 'https://transaction-engine.tax.service.gov.uk/submission',
}

export const POLL_URLS = {
  test: 'https://test-transaction-engine.tax.service.gov.uk/poll',
  live: 'https://transaction-engine.tax.service.gov.uk/poll',
}

// =============================================================================
// Message Class (Service Identifier)
// =============================================================================

export const MESSAGE_CLASS = 'HMRC-SA-SA100'
/** Message class for submissions with PDF attachments */
export const MESSAGE_CLASS_ATT = 'HMRC-SA-SA100-ATT'
export const SCHEMA_VERSION = '2024-v1.0'

// =============================================================================
// Data Types
// =============================================================================

/**
 * Monetary amounts in XML must be:
 * - Whole pounds (integers)
 * - No currency symbol
 * - Type: MTR_SAmonetaryType (-99999999999 to 99999999999)
 * - Type: MTR_SAnonNegativeMonetaryType (0 to 99999999999)
 */
export const MONETARY_CONSTRAINTS = {
  MIN_VALUE: -99999999999,
  MAX_VALUE: 99999999999,
  MIN_NON_NEGATIVE: 0,
}

/**
 * Date format: YYYY-MM-DD (xsd:date)
 */
export const DATE_FORMAT = 'YYYY-MM-DD'

/**
 * Yes/No type: 'yes' (no 'no' value - absence means no)
 */
export type YesType = 'yes'

/**
 * Taxpayer Status (C=Welsh, S=Scottish, U=Rest of UK)
 */
export type TaxpayerStatus = 'C' | 'S' | 'U'

/**
 * Sender type in IRheader
 */
export type SenderType =
  | 'Individual'
  | 'Company'
  | 'Agent'
  | 'Bureau'
  | 'Partnership'
  | 'Trust'
  | 'Employer'
  | 'Government'
  | 'Acting in Capacity'
  | 'Other'

// =============================================================================
// IRmark Configuration
// =============================================================================

/**
 * IRmark is a hash that authenticates the return content.
 *
 * Algorithm (based on HMRC documentation and test data analysis):
 * 1. Extract the content to be hashed (IRenvelope body excluding IRmark itself)
 * 2. Canonicalize using Exclusive XML Canonicalization (exc-c14n)
 * 3. Compute SHA-1 hash
 * 4. Base64 encode the result
 *
 * The IRmark element has a Type attribute: 'generic' or 'SAonly'
 * For SA100, use Type="generic"
 */
export const IRMARK_CONFIG = {
  /** Hash algorithm (SHA-1 = 160 bits = 28 chars base64) */
  algorithm: 'sha1',

  /** Canonicalization method */
  canonicalization: 'http://www.w3.org/2001/10/xml-exc-c14n#',

  /** IRmark type attribute */
  type: 'generic' as const,
}

// =============================================================================
// XML Structure Reference
// =============================================================================

/**
 * Complete document structure:
 *
 * GovTalkMessage (xmlns:hd)
 *   ├── EnvelopeVersion: "2.0"
 *   ├── Header
 *   │   ├── MessageDetails
 *   │   │   ├── Class: "HMRC-SA-SA100"
 *   │   │   ├── Qualifier: "request"
 *   │   │   ├── Function: "submit"
 *   │   │   ├── TransactionID: (optional, max 32 hex chars)
 *   │   │   └── CorrelationID: (optional)
 *   │   └── SenderDetails
 *   │       └── IDAuthentication
 *   │           ├── SenderID: (Gateway User ID)
 *   │           └── Authentication
 *   │               ├── Method: "clear"
 *   │               └── Value: (Gateway Password)
 *   ├── GovTalkDetails
 *   │   ├── Keys
 *   │   │   └── Key[@Type="UTR"]: (10 digit UTR)
 *   │   ├── TargetDetails
 *   │   │   └── Organisation: "IR"
 *   │   └── ChannelRouting
 *   │       └── Channel
 *   │           ├── URI: (Vendor URI)
 *   │           ├── Product: (Product name)
 *   │           └── Version: (Product version)
 *   └── Body
 *       └── IRenvelope (xmlns:MTR)
 *           ├── IRheader
 *           │   ├── Keys
 *           │   │   └── Key[@Type="UTR"]
 *           │   ├── PeriodEnd: "2025-04-05"
 *           │   ├── Principal (optional - taxpayer contact)
 *           │   ├── Agent (optional - if filing as agent)
 *           │   ├── DefaultCurrency: "GBP"
 *           │   ├── Manifest
 *           │   │   └── Contains
 *           │   │       └── Reference
 *           │   │           ├── Namespace: MTR namespace
 *           │   │           ├── SchemaVersion: "2024-v1.0"
 *           │   │           └── TopElementName: "MTR"
 *           │   ├── IRmark[@Type="generic"]: (base64 hash)
 *           │   └── Sender: "Individual" | "Agent" | ...
 *           └── MTR
 *               └── SA100
 *                   ├── YourPersonalDetails
 *                   ├── YourTaxReturn (schedule counts)
 *                   ├── StudentLoanRepayments (optional)
 *                   ├── UKInterestEtc (optional)
 *                   ├── UKDividends (optional)
 *                   ├── UKPensionsAnnuities (optional)
 *                   ├── StateBenefits (optional)
 *                   ├── Reliefs (optional)
 *                   ├── BlindPersonsAllowance (optional)
 *                   ├── TaxOwed (optional)
 *                   ├── Marriage (optional)
 *                   ├── Finishing (declaration)
 *                   ├── SA102 (employment - repeatable)
 *                   ├── SA103F/SA103S (self-employment)
 *                   ├── SA105 (UK property)
 *                   ├── SA106 (foreign)
 *                   ├── SA108 (capital gains)
 *                   └── SA101 (additional information)
 */

// =============================================================================
// Field Mappings (from MTRboxes)
// =============================================================================

/**
 * Maps wizard field names to SA100 XML XPaths
 * Based on 2025 MTRboxes v1.1.xml
 */
export const FIELD_MAPPINGS = {
  // Personal Details (SA100)
  'personalDetails.dateOfBirth': '/MTR/SA100/YourPersonalDetails/DateOfBirth',
  'personalDetails.address.line1': '/MTR/SA100/YourPersonalDetails/NewAddress/AddressLine1',
  'personalDetails.address.line2': '/MTR/SA100/YourPersonalDetails/NewAddress/AddressLine2',
  'personalDetails.address.line3': '/MTR/SA100/YourPersonalDetails/NewAddress/AddressLine3',
  'personalDetails.address.line4': '/MTR/SA100/YourPersonalDetails/NewAddress/AddressLine4',
  'personalDetails.address.postcode': '/MTR/SA100/YourPersonalDetails/NewAddress/Postcode',
  'personalDetails.addressEffectiveFrom': '/MTR/SA100/YourPersonalDetails/NewAddress/EffectiveFrom',
  'personalDetails.telephone': '/MTR/SA100/YourPersonalDetails/TelephoneNumber',
  'personalDetails.nino': '/MTR/SA100/YourPersonalDetails/NationalInsuranceNumber',
  'personalDetails.taxpayerStatus': '/MTR/SA100/YourPersonalDetails/TaxpayerStatus',

  // Student Loan (SA100)
  'studentLoan.notification': '/MTR/SA100/StudentLoanRepayments/IncomeContingentStudentLoanNotification',
  'studentLoan.repaymentDeducted': '/MTR/SA100/StudentLoanRepayments/StudentLoanRepaymentDeductedAmount',
  'studentLoan.postgraduateDeducted': '/MTR/SA100/StudentLoanRepayments/PostgraduateLoanRepaymentDeductedAmount',

  // UK Interest (SA100)
  'interest.untaxed': '/MTR/SA100/UKInterestEtc/UntaxedUKInterestAmount',
  'interest.taxed': '/MTR/SA100/UKInterestEtc/TaxedUKInterestAmount',

  // UK Dividends (SA100)
  'dividends.uk': '/MTR/SA100/UKDividends/UKDividendsAmount',
  'dividends.other': '/MTR/SA100/UKDividends/OtherDividendsAmount',

  // Employment (SA102) - per employment
  'employment.employerName': '/MTR/SA100/SA102/EmployerDetails/EmployerName',
  'employment.payeRef': '/MTR/SA100/SA102/EmployerDetails/PAYEReference',
  'employment.payReceived': '/MTR/SA100/SA102/PayFromEmployment',
  'employment.taxDeducted': '/MTR/SA100/SA102/UKTaxDeducted',
  'employment.tips': '/MTR/SA100/SA102/TipsAndOtherPayments',

  // Self-Employment Short (SA103S)
  'selfEmployment.businessName': '/MTR/SA100/SA103S/BusinessDetails/BusinessName',
  'selfEmployment.description': '/MTR/SA100/SA103S/BusinessDetails/DescriptionOfBusiness',
  'selfEmployment.turnover': '/MTR/SA100/SA103S/Turnover',
  'selfEmployment.allowableExpenses': '/MTR/SA100/SA103S/AllowableBusinessExpenses',
  'selfEmployment.netProfit': '/MTR/SA100/SA103S/NetProfitOrLoss',

  // UK Property (SA105)
  'property.income': '/MTR/SA100/SA105/PropertyIncome/TotalRentsAndOtherIncome',
  'property.expenses': '/MTR/SA100/SA105/PropertyIncome/TotalAllowableExpenses',
  'property.profit': '/MTR/SA100/SA105/PropertyIncome/NetProfitOrLoss',

  // Capital Gains (SA108)
  'capitalGains.disposalProceeds': '/MTR/SA100/SA108/ListedSharesAndSecurities/DisposalProceeds',
  'capitalGains.allowableCosts': '/MTR/SA100/SA108/ListedSharesAndSecurities/AllowableCosts',
  'capitalGains.gainsInYear': '/MTR/SA100/SA108/ListedSharesAndSecurities/GainsInYear',
  'capitalGains.lossesInYear': '/MTR/SA100/SA108/ListedSharesAndSecurities/LossesInYear',

  // Declaration (SA100 Finishing)
  'declaration.declarantType': '/MTR/SA100/Finishing/ReturnSigner',
  'declaration.signerCapacity': '/MTR/SA100/Finishing/SignerCapacity',
} as const

// =============================================================================
// Schedule Indicators
// =============================================================================

/**
 * The YourTaxReturn section indicates which schedules are included.
 * Each has a Yes indicator and optionally a count.
 */
export const SCHEDULE_INDICATORS = {
  employment: {
    indicator: 'EmploymentSchedule',
    count: 'NumberOfEmploymentSchedules',
    maxCount: 50,
  },
  ministerOfReligion: {
    indicator: 'MinisterOfReligionSchedule',
    count: 'NumberOfMinisterOfReligionSchedules',
    maxCount: 50,
  },
  selfEmploymentFull: {
    indicator: 'FullSelfEmploymentSchedule',
    count: 'NumberOfFullSelfEmploymentSchedules',
    maxCount: 50,
  },
  selfEmploymentShort: {
    indicator: 'ShortSelfEmploymentSchedule',
    count: 'NumberOfShortSelfEmploymentSchedules',
    maxCount: 50,
  },
  partnershipFull: {
    indicator: 'FullPartnershipSchedule',
    count: 'NumberOfFullPartnershipSchedules',
    maxCount: 50,
  },
  partnershipShort: {
    indicator: 'ShortPartnershipSchedule',
    count: 'NumberOfShortPartnershipSchedules',
    maxCount: 50,
  },
  ukProperty: {
    indicator: 'UKPropertySchedule',
    count: null,
  },
  foreign: {
    indicator: 'ForeignSchedule',
    count: null,
  },
  trusts: {
    indicator: 'TrustsSchedule',
    count: null,
  },
  capitalGains: {
    indicator: 'CapitalGainsSchedule',
    count: null,
  },
  additionalInfo: {
    indicator: 'AdditionalInformationSchedule',
    count: null,
  },
}

// =============================================================================
// Validation Patterns
// =============================================================================

export const VALIDATION_PATTERNS = {
  /** UTR: 10 digits */
  UTR: /^\d{10}$/,

  /** NINO: 2 letters, 6 digits, 1 letter (A-D) */
  NINO: /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/,

  /** Postcode: UK format */
  POSTCODE: /^(GIR 0AA)|((([A-Z][0-9][0-9]?)|(([A-Z][A-HJ-Y][0-9][0-9]?)|(([A-Z][0-9][A-Z])|([A-Z][A-HJ-Y][0-9]?[A-Z])))) [0-9][A-Z]{2})$/,

  /** Transaction ID: 0-32 hex characters */
  TRANSACTION_ID: /^[0-9A-F]{0,32}$/,

  /** Correlation ID: 0-32 hex characters */
  CORRELATION_ID: /^[0-9A-F]{0,32}$/,

  /** Tax year format: YYYY-YY (e.g., 2024-25) */
  TAX_YEAR: /^\d{4}-\d{2}$/,
}

// =============================================================================
// Tax Year Dates
// =============================================================================

/**
 * Get period end date for a tax year
 * @param taxYear - Tax year in format "2024-25"
 * @returns Period end date in YYYY-MM-DD format
 */
export function getPeriodEndDate(taxYear: string): string {
  // Tax year 2024-25 ends on 2025-04-05
  const endYearShort = taxYear.split('-')[1]
  const endYear = 2000 + parseInt(endYearShort, 10)
  return `${endYear}-04-05`
}

/**
 * Get period start date for a tax year
 * @param taxYear - Tax year in format "2024-25"
 * @returns Period start date in YYYY-MM-DD format
 */
export function getPeriodStartDate(taxYear: string): string {
  const startYear = parseInt(taxYear.split('-')[0], 10)
  return `${startYear}-04-06`
}
