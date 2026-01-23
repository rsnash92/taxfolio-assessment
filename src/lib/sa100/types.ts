/**
 * SA100 XML API Types
 *
 * These types represent the data structures for HMRC Self Assessment
 * submission via the Transaction Engine XML API.
 *
 * Based on HMRC RIM Artefacts 2025 v1.0 (MTR-v1-0.xsd)
 * Tax Year: 2024-25
 *
 * Key difference from MTD ITSA:
 * - MTD ITSA = REST/JSON APIs with OAuth (for quarterly submissions from 2026)
 * - SA100 = XML API with Government Gateway auth (for annual tax returns)
 */

// =============================================================================
// Core Data Types (from HMRC schema)
// =============================================================================

/**
 * Taxpayer Status - determines which tax rates apply
 * - C = Welsh taxpayer (Welsh rates apply)
 * - S = Scottish taxpayer (Scottish rates apply)
 * - U = Rest of UK (main rates apply)
 *
 * This is a MANDATORY field in the SA100 submission.
 */
export type TaxpayerStatus = 'C' | 'S' | 'U'

/**
 * Yes indicator type - presence means 'yes', absence means 'no'
 * HMRC schema doesn't use 'no' values - just omit the element
 */
export type YesIndicator = 'yes'

/**
 * Sender type for IRheader
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

/**
 * Declaration signer type
 */
export type DeclarantType = 'Individual' | 'Agent' | 'Nominee'

// =============================================================================
// Government Gateway Authentication
// =============================================================================

export interface GatewayCredentials {
  /** Government Gateway User ID */
  userId: string
  /** Government Gateway Password */
  password: string
}

export interface TaxpayerIdentification {
  /** Unique Taxpayer Reference (10 digits) */
  utr: string
  /** National Insurance Number (format: XX999999X) */
  nino: string
}

// =============================================================================
// GovTalk Envelope
// =============================================================================

export interface GovTalkHeader {
  /** Message class identifies the service - must be 'HMRC-SA-SA100' for SA100 */
  messageClass: 'HMRC-SA-SA100'
  /** Qualifier indicates message direction */
  qualifier: 'request' | 'acknowledgement' | 'response' | 'error'
  /** Function type */
  function: 'submit' | 'delete' | 'list'
  /** Transaction ID - max 32 hex characters */
  transactionId?: string
  /** Correlation ID - max 32 hex characters */
  correlationId?: string
  /** Response endpoint URL */
  responseEndpoint?: string
  /** Transformation endpoint URL */
  transformationEndpoint?: string
}

export interface GovTalkSenderDetails {
  senderId: string // Government Gateway User ID
  authentication: {
    method: 'clear' // Password sent in clear (over HTTPS)
    value: string // Government Gateway Password
  }
  emailAddress?: string
}

export interface GovTalkKeys {
  utr: string
}

export interface GovTalkEnvelope {
  envelopeVersion: '2.0'
  header: {
    messageDetails: GovTalkHeader
    senderDetails: GovTalkSenderDetails
  }
  govTalkDetails: {
    keys: GovTalkKeys
    targetDetails?: {
      organisation: string // e.g., "HMRC"
    }
    channelRouting?: {
      channel: {
        uri: string
        product: string
        version: string
      }
    }
  }
  body: {
    irEnvelope: IREnvelope
  }
}

// =============================================================================
// IR Envelope (Inside GovTalk Body)
// =============================================================================

export interface IREnvelope {
  irHeader: IRHeader
  sa100: SA100Return
}

export interface IRHeader {
  /** Keys section contains UTR */
  keys: {
    key: Array<{ type: 'UTR'; value: string }>
  }
  /** Period end date (tax year end: YYYY-04-05) */
  periodEnd: string // YYYY-MM-DD (e.g., "2025-04-05" for 2024-25)
  /** Principal details (taxpayer contact info) - optional */
  principal?: {
    contact: {
      name: {
        title?: string
        forename: string
        surname: string
      }
      email?: string
      telephone?: string
    }
  }
  /** Agent details - if filing as agent */
  agent?: {
    contact: {
      name: {
        title?: string
        forename: string
        surname: string
      }
      email?: string
      telephone?: string
    }
    agentId?: string
  }
  /** Default currency - always GBP for UK returns */
  defaultCurrency: 'GBP'
  /** Manifest - describes the body content */
  manifest: {
    contains: {
      reference: {
        namespace: string
        schemaVersion: string
        topElementName: 'MTR'
      }
    }
  }
  /** IRmark - digital signature (calculated before submission) */
  irMark?: {
    type: 'generic'
    value: string // Base64 encoded SHA-1 hash
  }
  /** Sender type */
  sender: SenderType
}

// =============================================================================
// SA100 Main Return
// =============================================================================

/**
 * SA100 Main Tax Return structure
 * Maps to /MTR/SA100 in the XML schema
 */
export interface SA100Return {
  /** Tax year in format 2024-25 */
  taxYear: string

  /** Your Personal Details section - MANDATORY */
  yourPersonalDetails: SA100YourPersonalDetails

  /** Your Tax Return section - indicates which schedules are included */
  yourTaxReturn: SA100YourTaxReturn

  /** Student Loan Repayments (boxes 1-4) */
  studentLoanRepayments?: SA100StudentLoan

  /** UK Interest etc (boxes 1-4) */
  ukInterestEtc?: SA100UKInterest

  /** UK Dividends (boxes 1-2) */
  ukDividends?: SA100UKDividends

  /** UK Pensions and Annuities */
  ukPensionsAnnuities?: SA100UKPensions

  /** State Benefits */
  stateBenefits?: SA100StateBenefits

  /** Reliefs section */
  reliefs?: SA100Reliefs

  /** Blind Person's Allowance */
  blindPersonsAllowance?: SA100BlindPersons

  /** Tax Owed calculation adjustments */
  taxOwed?: SA100TaxOwed

  /** Marriage Allowance */
  marriage?: SA100Marriage

  /** High Income Child Benefit Charge (HICBC) section */
  highIncomeChildBenefitCharge?: SA100HighIncomeChildBenefitCharge

  /** Finishing section - declaration - MANDATORY */
  finishing: SA100Finishing

  /** Employment schedules (SA102) - 0-50 */
  sa102?: SA102Employment[]

  /** Self-employment full schedules (SA103F) - 0-50 */
  sa103F?: SA103SelfEmploymentFull[]

  /** Self-employment short schedules (SA103S) - 0-50 */
  sa103S?: SA103SelfEmploymentShort[]

  /** UK Property schedule (SA105) - 0-1 */
  sa105?: SA105UKProperty

  /** Foreign schedule (SA106) - 0-1 */
  sa106?: SA106Foreign

  /** Capital Gains schedule (SA108) - 0-1 */
  sa108?: SA108CapitalGains

  /** Additional Information schedule (SA101) - 0-1 */
  sa101?: SA101AdditionalInfo

  /** Tax Calculation Summary (SA110) - auto-generated if not provided */
  sa110?: SA110TaxCalculation
}

// =============================================================================
// SA100 Personal Details (YourPersonalDetails in XML)
// =============================================================================

/**
 * Maps to /MTR/SA100/YourPersonalDetails
 * Reference: Box numbers from SA100 form
 */
export interface SA100YourPersonalDetails {
  /** Date of birth (box 1) - YYYY-MM-DD format */
  dateOfBirth: string

  /** National Insurance Number (box 2) - format: XX999999X */
  nationalInsuranceNumber: string

  /** Taxpayer Status (box 3) - MANDATORY
   * C = Welsh, S = Scottish, U = Rest of UK */
  taxpayerStatus: TaxpayerStatus

  /** New address - only include if address has changed */
  newAddress?: {
    addressLine1: string
    addressLine2?: string
    addressLine3?: string
    addressLine4?: string
    postcode: string
    /** Date address became effective - YYYY-MM-DD */
    effectiveFrom?: string
  }

  /** Telephone number (box 6) */
  telephoneNumber?: string

  /** Email address */
  email?: string
}

/**
 * Maps to /MTR/SA100/YourTaxReturn
 * Indicates which supplementary schedules are included
 */
export interface SA100YourTaxReturn {
  /** Employment schedule included */
  employmentSchedule?: YesIndicator
  numberOfEmploymentSchedules?: number

  /** Minister of Religion schedule */
  ministerOfReligionSchedule?: YesIndicator
  numberOfMinisterOfReligionSchedules?: number

  /** Full self-employment schedule */
  fullSelfEmploymentSchedule?: YesIndicator
  numberOfFullSelfEmploymentSchedules?: number

  /** Short self-employment schedule */
  shortSelfEmploymentSchedule?: YesIndicator
  numberOfShortSelfEmploymentSchedules?: number

  /** Full partnership schedule */
  fullPartnershipSchedule?: YesIndicator
  numberOfFullPartnershipSchedules?: number

  /** Short partnership schedule */
  shortPartnershipSchedule?: YesIndicator
  numberOfShortPartnershipSchedules?: number

  /** UK property schedule (SA105) */
  ukPropertySchedule?: YesIndicator

  /** Foreign schedule (SA106) */
  foreignSchedule?: YesIndicator

  /** Trusts schedule (SA107) */
  trustsSchedule?: YesIndicator

  /** Capital gains schedule (SA108) */
  capitalGainsSchedule?: YesIndicator

  /** Additional information schedule (SA101) */
  additionalInformationSchedule?: YesIndicator

  /** Residence, remittance schedule (SA109) */
  residenceRemittanceSchedule?: YesIndicator

  /** Lloyd's schedule (SA103L) */
  lloydsSchedule?: YesIndicator
}

/**
 * Maps to /MTR/SA100/StudentLoanRepayments
 * Schema element order: IncomeContingentStudentLoanNotification, StudentLoanRepaymentDeductedAmount,
 * PostgraduateLoanRepaymentDeductedAmount, PlanType, PostgraduateLoanPlanType
 */
export interface SA100StudentLoan {
  /** Income Contingent Student Loan notification received (box 1) - indicates loan exists */
  incomeContingentStudentLoanNotification?: YesIndicator
  /** Student loan repayment deducted by employer (box 3) - whole pounds */
  studentLoanRepaymentDeductedAmount?: number
  /** Postgraduate loan repayment deducted by employer (box 4) - whole pounds */
  postgraduateLoanRepaymentDeductedAmount?: number
  /** Student Loan Plan Type: "01" (Plan 1), "02" (Plan 2), "04" (Plan 4) */
  planType?: '01' | '02' | '04'
  /** Postgraduate Loan Plan Type: "03" - indicates postgrad loan exists */
  postgraduateLoanPlanType?: '03'
}

/**
 * Maps to /MTR/SA100/UKInterestEtc
 */
export interface SA100UKInterest {
  /** Untaxed UK interest (box 1) - whole pounds */
  untaxedUKInterestAmount?: number
  /** Taxed UK interest (box 2) - whole pounds */
  taxedUKInterestAmount?: number
  /** Tax taken off box 2 (box 3) - whole pounds */
  taxTakenOffBox2Amount?: number
  /** Untaxed foreign interest (box 4) - whole pounds */
  untaxedForeignInterestAmount?: number
}

/**
 * Maps to /MTR/SA100/UKDividends
 */
export interface SA100UKDividends {
  /** UK dividends (box 1) - whole pounds */
  ukDividendsAmount?: number
  /** Other dividends (box 2) - whole pounds */
  otherDividendsAmount?: number
  /** Stock dividends (box 3) - whole pounds */
  stockDividendsAmount?: number
  /** Non-qualifying distributions (box 4) - whole pounds */
  nonQualifyingDistributionsAmount?: number
}

/**
 * Maps to /MTR/SA100/UKPensionsAnnuities
 */
export interface SA100UKPensions {
  /** State pension (box 1) - whole pounds */
  statePensionAmount?: number
  /** State pension lump sum (box 2) - whole pounds */
  statePensionLumpSumAmount?: number
  /** Tax taken off state pension lump sum (box 3) - whole pounds */
  taxTakenOffStatePensionLumpSum?: number
  /** Taxed pensions/retirement annuities (box 4) - whole pounds */
  taxedPensionsAndRetirementAnnuitiesAmount?: number
  /** Tax taken off box 4 (box 5) - whole pounds */
  taxTakenOffBox4Amount?: number
}

/**
 * Maps to /MTR/SA100/StateBenefits
 */
export interface SA100StateBenefits {
  /** Incapacity benefit (box 1) - whole pounds */
  incapacityBenefitAmount?: number
  /** Jobseeker's allowance (box 2) - whole pounds */
  jobseekersAllowanceAmount?: number
  /** Tax taken off Jobseeker's allowance (box 3) - whole pounds */
  taxTakenOffJobseekersAllowance?: number
  /** Employment and Support Allowance (box 4) - whole pounds */
  employmentSupportAllowanceAmount?: number
  /** Tax taken off ESA (box 5) - whole pounds */
  taxTakenOffESAAmount?: number
  /** Other taxable benefits (box 6) - whole pounds */
  otherTaxableBenefitsAmount?: number
  /** Total of any tax taken off benefits (box 7) - whole pounds */
  totalTaxTakenOffBenefitsAmount?: number
}

/**
 * Maps to /MTR/SA100/BlindPersonsAllowance
 */
export interface SA100BlindPersons {
  /** Registered blind or severely sight impaired (box 1) */
  registeredBlindIndicator?: YesIndicator
  /** Name of local authority (box 2) */
  localAuthorityName?: string
  /** Wants to transfer surplus to spouse (box 3) */
  transferSurplusIndicator?: YesIndicator
  /** Spouse/partner's full name (box 4) */
  spouseName?: string
  /** Spouse/partner's NI number (box 5) */
  spouseNINO?: string
}

/**
 * Maps to /MTR/SA100/TaxOwed
 */
export interface SA100TaxOwed {
  /** Underpaid tax for earlier years in tax code (box 1) - whole pounds */
  underpaidTaxForEarlierYearsAmount?: number
  /** Underpaid tax for 2024-25 included in tax code (box 2) - whole pounds */
  underpaidTaxIncludedInCodeAmount?: number
  /** Reduce payments on account (box 3) - whole pounds */
  reducePaymentsOnAccountAmount?: number
}

/**
 * Maps to /MTR/SA100/Marriage
 */
export interface SA100Marriage {
  /** Transfer some of personal allowance to spouse (box 1) */
  transferToSpouseIndicator?: YesIndicator
  /** Receive transfer from spouse (box 2) */
  receiveFromSpouseIndicator?: YesIndicator
  /** Spouse/partner's NI number (box 3) */
  spouseNINO?: string
  /** Spouse/partner's date of birth (box 4) */
  spouseDateOfBirth?: string
  /** Spouse/partner's full name (box 5) */
  spouseName?: string
  /** Date of marriage or civil partnership */
  dateOfMarriage?: string
}

/**
 * Maps to /MTR/SA100/HighIncomeChildBenefitCharge
 * HICBC section for taxpayers with ANI over £60,000 who receive child benefit
 */
export interface SA100HighIncomeChildBenefitCharge {
  /** Amount of child benefit received in tax year (CBC1) - whole pounds */
  amountReceived: number
  /** Number of children (CBC2) - required if amount received > 0 */
  numberOfChildren?: number
  /** Date stopped receiving all child benefit payments (CBC3) - YYYY-MM-DD */
  dateStoppedReceiving?: string
}

/**
 * Maps to /MTR/SA100/Finishing
 * Declaration section - MANDATORY
 */
export interface SA100Finishing {
  /** Who is signing the return */
  returnSigner: DeclarantType
  /** Capacity if signing as agent/nominee */
  signerCapacity?: string
  /** Person preparing the return (for agent) */
  preparer?: {
    name: string
    reference?: string
  }
  /** Repayment claim */
  repaymentClaim?: {
    /** Claim repayment to taxpayer */
    claimToTaxpayer?: YesIndicator
    /** Nominee details for repayment */
    nomineeDetails?: {
      name: string
      address: {
        line1: string
        line2?: string
        postcode: string
      }
    }
  }
}

// =============================================================================
// SA101 Additional Information Schedule
// =============================================================================

/**
 * SA101 Additional Information schedule
 * Maps to /MTR/SA100/SA101
 */
export interface SA101AdditionalInfo {
  /** Other UK income not included elsewhere */
  otherUKIncome?: {
    /** Description of income */
    description?: string
    /** Amount - whole pounds */
    amount?: number
    /** Tax deducted - whole pounds */
    taxDeducted?: number
  }

  /** Share schemes */
  shareSchemes?: {
    /** Taxable amount from share schemes - whole pounds */
    taxableAmount?: number
  }

  /** Disguised remuneration */
  disguisedRemuneration?: {
    /** Amount received - whole pounds */
    amount?: number
  }

  /** Employment lump sums and compensation */
  employmentLumpSums?: {
    /** Taxable lump sum - whole pounds */
    taxableLumpSum?: number
    /** Tax deducted - whole pounds */
    taxDeducted?: number
  }

  /** Income from transferring or licensing assets */
  assetTransferIncome?: {
    /** Amount - whole pounds */
    amount?: number
  }

  /** Gains on life insurance policies */
  lifeInsuranceGains?: {
    /** Number of years policy held */
    yearsHeld?: number
    /** Chargeable gain - whole pounds */
    chargeableGain?: number
    /** Deficiency relief claimed - whole pounds */
    deficiencyRelief?: number
  }

  /** Pension savings tax charges */
  pensionSavingsTaxCharges?: {
    /** Annual allowance charge - whole pounds */
    annualAllowanceCharge?: number
    /** Scheme paid charge - whole pounds */
    schemePaidCharge?: number
  }
}

// =============================================================================
// SA102 Employment Income Schedule
// =============================================================================

/**
 * SA102 Employment schedule
 * Maps to /MTR/SA100/SA102
 * Up to 50 employments can be included
 */
export interface SA102Employment {
  /** Employer details */
  employerDetails: {
    /** Employer name (box 1) */
    employerName: string
    /** PAYE reference (box 2) - format: 999/XXXX */
    payeReference?: string
  }

  /** Pay from this employment (box 1) - whole pounds */
  payFromEmployment: number

  /** UK tax deducted (box 2) - whole pounds */
  ukTaxDeducted: number

  /** Tips and other payments not on P60 (box 3) - whole pounds */
  tipsAndOtherPayments?: number

  /** PAYE tax reference (if different from box 2) */
  taxReference?: string

  /** Benefits and expenses section */
  benefitsAndExpenses?: {
    /** Company cars and vans (box 9) - whole pounds */
    companyCarsAndVans?: number
    /** Fuel for company cars and vans (box 10) - whole pounds */
    fuelForCompanyCarsAndVans?: number
    /** Private medical and dental insurance (box 11) - whole pounds */
    privateMedicalInsurance?: number
    /** Vouchers, credit cards, excess mileage (box 12) - whole pounds */
    vouchersCreditCards?: number
    /** Goods and assets (box 13) - whole pounds */
    goodsAndAssets?: number
    /** Accommodation (box 14) - whole pounds */
    accommodation?: number
    /** Other benefits (box 15) - whole pounds */
    otherBenefits?: number
    /** Expenses payments and benefits (box 16) - whole pounds */
    expensesPaymentsAndBenefits?: number
  }

  /** Employment expenses section */
  employmentExpenses?: {
    /** Business travel (box 17) - whole pounds */
    businessTravel?: number
    /** Fixed deductions for expenses (box 18) - whole pounds */
    fixedDeductions?: number
    /** Professional fees and subscriptions (box 19) - whole pounds */
    professionalFees?: number
    /** Other expenses (box 20) - whole pounds */
    otherExpenses?: number
  }

  /** Lump sums section */
  lumpSums?: {
    /** Taxable lump sums (box 6) - whole pounds */
    taxableLumpSums?: number
    /** Tax on lump sums (box 7) - whole pounds */
    taxOnLumpSums?: number
  }

  /** Share schemes section */
  shareSchemes?: {
    /** Amount from share schemes (box 8) - whole pounds */
    amountFromShareSchemes?: number
  }

  /** Seafarers' Earnings Deduction */
  seafarersEarningsDeduction?: {
    /** Days away from UK */
    daysAwayFromUK?: number
    /** Amount claimed - whole pounds */
    amountClaimed?: number
  }

  /** Foreign earnings not taxable in UK */
  foreignEarningsNotTaxable?: {
    /** Amount - whole pounds */
    amount?: number
  }
}

// =============================================================================
// SA103 Self-Employment Income Schedules
// =============================================================================

/**
 * SA103S Short Self-Employment schedule
 * Maps to /MTR/SA100/SA103S
 * Use for turnover under £85,000 and not using full expenses
 */
export interface SA103SelfEmploymentShort {
  /** Business details */
  businessDetails: {
    /** Business name (box 1) */
    businessName: string
    /** Description of business (box 2) */
    descriptionOfBusiness: string
    /** Business address */
    businessAddress?: {
      addressLine1: string
      addressLine2?: string
      postcode: string
    }
    /** Business start date (box 3) - if started this tax year */
    businessStartDate?: string
    /** Business end date (box 4) - if ceased this tax year */
    businessEndDate?: string
  }

  /** Accounting period */
  accountingPeriod: {
    /** Start date - YYYY-MM-DD */
    startDate: string
    /** End date - YYYY-MM-DD */
    endDate: string
  }

  /** Cash basis indicator (box 5) */
  cashBasisIndicator?: YesIndicator

  /** Income section */
  income: {
    /** Turnover (box 9) - whole pounds */
    turnover: number
    /** Other business income (box 10) - whole pounds */
    otherBusinessIncome?: number
  }

  /** Allowable expenses - total only for short version (box 11) */
  totalAllowableExpenses?: number

  /** Net profit or loss (box 12) - whole pounds (negative for loss) */
  netProfitOrLoss: number

  /** Tax adjustments section */
  taxAdjustments?: {
    /** Goods/services for own use (box 13) - whole pounds */
    goodsForOwnUse?: number
    /** Balancing charges (box 14) - whole pounds */
    balancingCharges?: number
    /** Capital allowances (box 15) - whole pounds */
    capitalAllowances?: number
  }

  /** Losses section */
  losses?: {
    /** Losses brought forward (box 16) - whole pounds */
    lossesBroughtForward?: number
    /** Loss to carry forward (box 17) - whole pounds */
    lossToCarryForward?: number
    /** Loss offset against other income (box 18) - whole pounds */
    lossOffsetAgainstOtherIncome?: number
  }

  /** Class 2 NIC voluntary payment indicator (box 36) */
  class2NICVoluntary?: YesIndicator

  /** Class 2 NIC amount (SSECL2) - required when class2NICVoluntary is 'yes' */
  class2NICAmount?: number

  /** Class 4 NIC section */
  class4NIC?: {
    /** Exempt indicator (box 37) */
    exemptIndicator?: YesIndicator
    /** Adjustment to profits */
    adjustmentToProfits?: number
  }

  /** Total taxable profits (box 21) - whole pounds */
  totalTaxableProfits: number
}

/**
 * SA103F Full Self-Employment schedule
 * Maps to /MTR/SA100/SA103F
 * Use for turnover £85,000 or more, or choosing full expenses
 */
export interface SA103SelfEmploymentFull {
  /** Business details - same as short version */
  businessDetails: {
    businessName: string
    descriptionOfBusiness: string
    businessAddress?: {
      addressLine1: string
      addressLine2?: string
      postcode: string
    }
    businessStartDate?: string
    businessEndDate?: string
  }

  /** Accounting period */
  accountingPeriod: {
    startDate: string
    endDate: string
  }

  /** Cash basis indicator */
  cashBasisIndicator?: YesIndicator

  /** Income section */
  income: {
    /** Turnover - whole pounds */
    turnover: number
    /** Other business income - whole pounds */
    otherBusinessIncome?: number
  }

  /** Itemized expenses (for full version) */
  expenses: {
    /** Cost of goods bought for resale (box 10) - whole pounds */
    costOfGoods?: number
    /** Construction industry subcontractor costs (box 11) - whole pounds */
    constructionCosts?: number
    /** Other direct costs (box 12) - whole pounds */
    otherDirectCosts?: number
    /** Employee costs (box 13) - whole pounds */
    employeeCosts?: number
    /** Premises costs (box 14) - whole pounds */
    premisesCosts?: number
    /** Repairs (box 15) - whole pounds */
    repairs?: number
    /** General administrative expenses (box 16) - whole pounds */
    generalAdmin?: number
    /** Motor expenses (box 17) - whole pounds */
    motorExpenses?: number
    /** Travel and subsistence (box 18) - whole pounds */
    travelSubsistence?: number
    /** Advertising, promotion, entertainment (box 19) - whole pounds */
    advertising?: number
    /** Legal and professional costs (box 20) - whole pounds */
    legalProfessional?: number
    /** Bad debts (box 21) - whole pounds */
    badDebts?: number
    /** Interest (box 22) - whole pounds */
    interest?: number
    /** Other finance charges (box 23) - whole pounds */
    otherFinanceCharges?: number
    /** Depreciation (box 24) - whole pounds */
    depreciation?: number
    /** Other expenses (box 25) - whole pounds */
    other?: number
    /** Total expenses (box 26) - whole pounds */
    totalExpenses: number
  }

  /** Net profit or loss (box 27) - whole pounds */
  netProfitOrLoss: number

  /** Tax adjustments section */
  taxAdjustments?: {
    disallowableExpenses?: number
    goodsForOwnUse?: number
    balancingCharges?: number
    capitalAllowances?: number
    totalBasisPeriodProfits?: number
  }

  /** Losses section */
  losses?: {
    lossesBroughtForward?: number
    lossToCarryForward?: number
    lossOffsetAgainstOtherIncome?: number
    lossOffsetAgainstCapitalGains?: number
  }

  /** Class 4 NIC section */
  class4NIC?: {
    exemptIndicator?: YesIndicator
    adjustmentToProfits?: number
  }

  /** Total taxable profits - whole pounds */
  totalTaxableProfits: number
}

// =============================================================================
// SA105 UK Property Income Schedule
// =============================================================================

/**
 * SA105 UK Property schedule
 * Maps to /MTR/SA100/SA105
 */
export interface SA105UKProperty {
  /** Property income section */
  propertyIncome: {
    /** Total rents and other income (box 3) - whole pounds */
    totalRentsAndOtherIncome: number
    /** Premiums for granting lease (box 4) - whole pounds */
    premiumsForGrantingLease?: number
    /** Reverse premiums (box 5) - whole pounds */
    reversePremiums?: number
  }

  /** Property expenses - choose itemized or consolidated */
  propertyExpenses: {
    /** Using property allowance indicator */
    usingPropertyAllowance?: YesIndicator

    /** Consolidated expenses - if not itemizing (box 6) - whole pounds */
    consolidatedExpenses?: number

    /** OR itemized expenses */
    itemizedExpenses?: {
      /** Rent, rates, insurance (box 7) - whole pounds */
      rentsRatesInsurance?: number
      /** Property repairs and maintenance (box 8) - whole pounds */
      propertyRepairs?: number
      /** Finance charges/interest (box 9) - whole pounds */
      financeCharges?: number
      /** Legal and professional fees (box 10) - whole pounds */
      legalProfessional?: number
      /** Costs of services (box 11) - whole pounds */
      costsOfServices?: number
      /** Other allowable expenses (box 12) - whole pounds */
      otherAllowable?: number
    }

    /** Total allowable expenses (box 13) - whole pounds */
    totalAllowableExpenses?: number
  }

  /** Net profit or loss (box 14) - whole pounds */
  netProfitOrLoss: number

  /** Tax adjustments */
  taxAdjustments?: {
    /** Private use adjustment (box 15) - whole pounds */
    privateUseAdjustment?: number
    /** Balancing charges (box 16) - whole pounds */
    balancingCharges?: number
    /** Capital allowances (box 17) - whole pounds */
    capitalAllowances?: number
    /** Residential finance costs (box 18) - whole pounds */
    residentialFinanceCosts?: number
  }

  /** Losses */
  losses?: {
    /** Losses brought forward (box 20) - whole pounds */
    lossesBroughtForward?: number
    /** Loss to carry forward (box 21) - whole pounds */
    lossToCarryForward?: number
  }

  /** Total taxable profit (box 22) - whole pounds */
  totalTaxableProfit?: number

  /** Rent-a-room section */
  rentARoom?: {
    /** Using rent-a-room indicator */
    usingRentARoomIndicator?: YesIndicator
    /** Total receipts - whole pounds */
    totalReceipts?: number
  }

  /** Furnished Holiday Lettings (FHL) section */
  furnishedHolidayLettings?: {
    /** UK FHL indicator */
    ukFHLIndicator?: YesIndicator
    /** EEA FHL indicator */
    eeaFHLIndicator?: YesIndicator
    /** FHL income - whole pounds */
    income?: number
    /** FHL expenses - whole pounds */
    expenses?: number
    /** FHL profit/loss - whole pounds */
    profitOrLoss?: number
  }
}

// =============================================================================
// SA106 Foreign Income Schedule
// =============================================================================

/**
 * SA106 Foreign schedule
 * Maps to /MTR/SA100/SA106
 */
export interface SA106Foreign {
  /** Foreign earnings section */
  foreignEarnings?: {
    /** Foreign earnings before tax - whole pounds */
    amountBeforeTax?: number
    /** Tax taken off - whole pounds */
    taxTakenOff?: number
    /** Foreign tax for which tax credit claimed - whole pounds */
    foreignTaxCreditClaimed?: number
  }

  /** Foreign dividends section */
  foreignDividends?: {
    /** Total dividend income - whole pounds */
    totalDividends?: number
    /** Foreign tax for which credit claimed - whole pounds */
    foreignTaxCreditClaimed?: number
  }

  /** Foreign property section */
  foreignProperty?: {
    /** Total income from overseas property - whole pounds */
    income?: number
    /** Allowable expenses - whole pounds */
    expenses?: number
    /** Net profit - whole pounds */
    netProfit?: number
    /** Foreign tax paid - whole pounds */
    foreignTaxPaid?: number
  }

  /** Foreign pensions section */
  foreignPensions?: {
    /** Total pension income - whole pounds */
    totalPensions?: number
    /** Tax taken off - whole pounds */
    taxTakenOff?: number
    /** Foreign tax for which credit claimed - whole pounds */
    foreignTaxCreditClaimed?: number
  }

  /** Foreign savings section */
  foreignSavings?: {
    /** Interest and other savings - whole pounds */
    interestAndSavings?: number
    /** Foreign tax paid - whole pounds */
    foreignTaxPaid?: number
  }

  /** Foreign tax credit relief section */
  foreignTaxCreditRelief?: {
    /** Relief claimed - whole pounds */
    reliefClaimed?: number
  }

  /** Remittance basis section */
  remittanceBasis?: {
    /** Using remittance basis indicator */
    usingRemittanceBasisIndicator?: YesIndicator
    /** Remittance basis charge due - whole pounds */
    remittanceBasisCharge?: number
  }
}

// =============================================================================
// SA108 Capital Gains Schedule
// =============================================================================

/**
 * SA108 Capital Gains schedule
 * Maps to /MTR/SA100/SA108
 */
export interface SA108CapitalGains {
  /** Summary section */
  summary?: {
    /** Number of disposals in year */
    numberOfDisposals?: number
    /** Total disposal proceeds - whole pounds */
    totalDisposalProceeds?: number
  }

  /** Listed shares and securities section */
  listedSharesAndSecurities?: {
    /** Number of disposals in this section (CGT24) */
    numberOfDisposals?: number
    /** Disposal proceeds (box 3) - whole pounds */
    disposalProceeds?: number
    /** Allowable costs (box 4) - whole pounds */
    allowableCosts?: number
    /** Gains in year (box 5) - whole pounds */
    gainsInYear?: number
    /** Losses in year (box 6) - whole pounds */
    lossesInYear?: number
  }

  /** Unlisted shares section */
  unlistedShares?: {
    /** Number of disposals in this section (CGT30) */
    numberOfDisposals?: number
    /** Disposal proceeds - whole pounds */
    disposalProceeds?: number
    /** Allowable costs - whole pounds */
    allowableCosts?: number
    /** Gains in year - whole pounds */
    gainsInYear?: number
    /** Losses in year - whole pounds */
    lossesInYear?: number
  }

  /** Other property, assets and gains section */
  otherPropertyAndAssets?: {
    /** Number of disposals in this section (CGT14) */
    numberOfDisposals?: number
    /** Disposal proceeds - whole pounds */
    disposalProceeds?: number
    /** Allowable costs - whole pounds */
    allowableCosts?: number
    /** Gains in year - whole pounds */
    gainsInYear?: number
    /** Losses in year - whole pounds */
    lossesInYear?: number
    /** Other disposals where BADR is being claimed (CGT17.4) - whole pounds
     *  This indicates the portion of gainsInYear that qualifies for BADR */
    badrDisposals?: number
  }

  /** UK residential property section */
  ukResidentialProperty?: {
    /** Number of properties */
    numberOfProperties?: number
    /** Total gains - whole pounds */
    totalGains?: number
    /** Total losses - whole pounds */
    totalLosses?: number
    /** CGT already paid - whole pounds */
    cgtAlreadyPaid?: number
    /** Details for each property disposal */
    properties?: Array<{
      address: string
      disposalDate: string
      disposalProceeds: number
      allowableCosts: number
      privateResidenceRelief?: number
      lettingsRelief?: number
      gain?: number
    }>
  }

  /** Losses section */
  losses?: {
    /** Losses brought forward and used in the return year (CGT45) - whole pounds */
    lossesBroughtForward?: number
    /** Income losses of the return year set against gains (CGT46) - whole pounds */
    incomeLossesUsedAgainstGains?: number
    /** Losses to be carried forward (CGT47) - whole pounds */
    lossesCarryForward?: number
    /** Losses used this year (box 16) - whole pounds */
    lossesUsedThisYear?: number
  }

  /** Annual exempt amount section */
  annualExemptAmount?: {
    /** Amount claimed - whole pounds (£3,000 for 2024-25) */
    amountClaimed?: number
  }

  /** Business Asset Disposal Relief (formerly Entrepreneurs' Relief) */
  businessAssetDisposalRelief?: {
    /** Gains qualifying for relief - whole pounds */
    qualifyingGains?: number
    /** Relief claimed - whole pounds */
    reliefClaimed?: number
    /** Lifetime limit used before - whole pounds */
    lifetimeLimitUsed?: number
  }

  /** Investors' Relief */
  investorsRelief?: {
    /** Gains qualifying - whole pounds */
    qualifyingGains?: number
    /** Relief claimed - whole pounds */
    reliefClaimed?: number
  }

  /** Total gains and losses */
  totals?: {
    /** Total gains after losses and reliefs (box 25) - whole pounds */
    totalGains?: number
    /** Taxable gains at 10% rate - whole pounds */
    gainsAt10Percent?: number
    /** Taxable gains at 18% rate - whole pounds */
    gainsAt18Percent?: number
    /** Taxable gains at 20% rate - whole pounds */
    gainsAt20Percent?: number
    /** Taxable gains at 24% rate (residential property) - whole pounds */
    gainsAt24Percent?: number
    /** Total tax due - whole pounds */
    totalTaxDue?: number
  }
}

// =============================================================================
// SA100 Tax Reliefs Section
// =============================================================================

/**
 * Maps to /MTR/SA100/Reliefs
 * Tax reliefs and deductions
 */
export interface SA100Reliefs {
  /** Pension contributions section */
  pensionContributions?: {
    /** Personal pension payments (box 1) - whole pounds */
    personalPensions?: number
    /** Retirement annuity contract payments (box 2) - whole pounds */
    retirementAnnuity?: number
    /** Payments to employer's scheme (box 3) - whole pounds */
    employerScheme?: number
  }

  /** Gift Aid section */
  giftAid?: {
    /** Gift Aid payments this year (box 5) - whole pounds */
    paymentsThisYear?: number
    /** One-off payments in box 5 (box 6) - whole pounds */
    oneOffPayments?: number
    /** Payments treated as previous year (box 7) - whole pounds */
    treatAsPreviousYear?: number
    /** Payments brought forward (box 8) - whole pounds */
    broughtForward?: number
    /** Value of shares/securities given (box 9) - whole pounds */
    sharesSecuritiesGiven?: number
    /** Value of land/property given (box 10) - whole pounds */
    landPropertyGiven?: number
  }

  /** Enterprise Investment Scheme section */
  eis?: {
    /** Amount invested for relief (box 11) - whole pounds */
    amountInvested?: number
  }

  /** Seed Enterprise Investment Scheme section */
  seis?: {
    /** Amount invested for relief (box 12) - whole pounds */
    amountInvested?: number
  }

  /** Venture Capital Trust section */
  vct?: {
    /** Amount invested (box 13) - whole pounds */
    amountInvested?: number
  }

  /** Social Investment Tax Relief section */
  sitr?: {
    /** Amount invested (box 14) - whole pounds */
    amountInvested?: number
  }

  /** Community Investment Tax Relief section */
  citr?: {
    /** Relief claimed (box 15) - whole pounds */
    reliefClaimed?: number
  }

  /** Maintenance payments section */
  maintenancePayments?: {
    /** Payments made (box 16) - whole pounds */
    paymentsMade?: number
    /** Recipient's date of birth */
    recipientDateOfBirth?: string
  }

  /** Qualifying loan interest section */
  qualifyingLoanInterest?: {
    /** Interest paid (box 17) - whole pounds */
    interestPaid?: number
  }

  /** Post-cessation trade relief section */
  postCessationRelief?: {
    /** Relief claimed (box 18) - whole pounds */
    reliefClaimed?: number
  }
}

// =============================================================================
// SA110 Tax Calculation Summary
// =============================================================================

/**
 * SA110 Tax Calculation Summary
 * Maps to /MTR/SA110
 * MANDATORY section - auto-generated if not provided
 */
export interface SA110TaxCalculation {
  /** Total tax etc due (mandatory) - whole pounds */
  totalTaxEtcDue?: number
  /** Student loan repayment due */
  studentLoanRepaymentDue?: number
  /** Postgraduate loan repayment due */
  postgraduateLoanRepaymentDue?: number
  /** Class 4 NICs due */
  class4NICsDue?: number
  /** Class 2 NICs due */
  class2NICsDue?: number
  /** Capital gains tax due */
  capitalGainsTaxDue?: number
  /** Pension charges due */
  pensionChargesDue?: number
}

// =============================================================================
// Transaction Engine Response Types
// =============================================================================

export interface SubmissionResponse {
  /** Correlation ID for tracking */
  correlationId: string

  /** Transaction ID */
  transactionId?: string

  /** Submission status */
  status: 'pending' | 'processing' | 'accepted' | 'rejected' | 'error'

  /** Timestamp */
  timestamp: string

  /** Poll URL for async checking */
  pollUrl?: string

  /** Errors if rejected */
  errors?: SubmissionError[]

  /** Success details if accepted */
  successResponse?: {
    irMarkReceipt?: string
    submissionId?: string
    message?: string
  }
}

export interface SubmissionError {
  code: string
  message: string
  location?: string
  severity: 'error' | 'warning'
}

export interface PollResponse {
  status: 'pending' | 'processing' | 'accepted' | 'rejected' | 'error'
  correlationId: string
  percentComplete?: number
  errors?: SubmissionError[]
  successResponse?: {
    irMarkReceipt: string
    submissionId: string
    acceptedTimestamp: string
  }
}
