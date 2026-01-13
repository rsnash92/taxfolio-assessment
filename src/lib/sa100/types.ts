/**
 * SA100 XML API Types
 *
 * These types represent the data structures for HMRC Self Assessment
 * submission via the Transaction Engine XML API.
 *
 * Key difference from MTD ITSA:
 * - MTD ITSA = REST/JSON APIs with OAuth (for quarterly submissions from 2026)
 * - SA100 = XML API with Government Gateway auth (for annual tax returns)
 */

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
  /** National Insurance Number */
  nino: string
}

// =============================================================================
// GovTalk Envelope
// =============================================================================

export interface GovTalkHeader {
  messageClass: 'HMRC-SA-SA100'
  qualifier: 'request' | 'acknowledgement' | 'response' | 'error'
  function: 'submit' | 'delete' | 'list'
  transactionId?: string
  correlationId?: string
  responseEndpoint?: string
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
  keys: {
    key: Array<{ type: string; value: string }>
  }
  period?: {
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
  }
  principal: {
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
  irMark?: {
    type: 'generic'
    value: string // Base64 encoded hash
  }
  sender: {
    type: 'individual' | 'agent'
  }
}

// =============================================================================
// SA100 Main Return
// =============================================================================

export interface SA100Return {
  /** Tax year in format 2024-25 */
  taxYear: string

  /** Personal details */
  personalDetails: SA100PersonalDetails

  /** Employment income (SA102) */
  employments?: SA102Employment[]

  /** Self-employment income (SA103S - short, SA103F - full) */
  selfEmployments?: SA103SelfEmployment[]

  /** UK property income (SA105) */
  ukProperty?: SA105UKProperty

  /** Foreign income (SA106) */
  foreignIncome?: SA106ForeignIncome

  /** Capital gains (SA108) */
  capitalGains?: SA108CapitalGains

  /** Additional information (SA101) */
  additionalInfo?: SA101AdditionalInfo

  /** Tax reliefs and claims */
  reliefs?: SA100Reliefs

  /** Declaration */
  declaration: SA100Declaration
}

// =============================================================================
// SA100 Personal Details
// =============================================================================

export interface SA100PersonalDetails {
  title?: string
  firstName: string
  lastName: string
  nino: string
  utr: string
  dateOfBirth: string // YYYY-MM-DD
  address: {
    line1: string
    line2?: string
    line3?: string
    line4?: string
    postcode: string
    country?: string
  }
  telephone?: string
  email?: string

  /** Has address changed since last return? */
  addressChanged?: boolean

  /** Marital status */
  maritalStatus?: 'single' | 'married' | 'civil_partnership' | 'divorced' | 'widowed'

  /** Date of marriage/civil partnership if relevant */
  dateOfMarriage?: string

  /** Blind person's allowance */
  claimingBlindPersonsAllowance?: boolean
  blindFromDate?: string
}

// =============================================================================
// SA101 Additional Information
// =============================================================================

export interface SA101AdditionalInfo {
  /** Student loan repayments */
  studentLoan?: {
    planType: 'plan1' | 'plan2' | 'plan4' | 'postgraduate'
    amountRepaid?: number
  }

  /** State pension */
  statePension?: {
    amount: number
    taxDeducted?: number
  }

  /** Other pension income */
  otherPensions?: Array<{
    payerName: string
    amount: number
    taxDeducted: number
  }>

  /** Benefits received */
  stateBenefits?: {
    jobseekersAllowance?: number
    incapacityBenefit?: number
    employmentSupportAllowance?: number
    carersAllowance?: number
    bereavement?: number
    other?: number
  }

  /** Interest received (untaxed) */
  untaxedInterest?: number

  /** Interest received (taxed) */
  taxedInterest?: {
    gross: number
    taxDeducted: number
  }

  /** UK dividends */
  ukDividends?: number

  /** Foreign dividends */
  foreignDividends?: number
}

// =============================================================================
// SA102 Employment Income
// =============================================================================

export interface SA102Employment {
  employerName: string
  employerPAYERef?: string
  startDate?: string
  endDate?: string

  /** Pay and tax from P60/P45 */
  payFromEmployment: number
  taxDeducted: number

  /** Tips and other payments not on P60 */
  tipsAndOtherPayments?: number

  /** Expenses */
  expenses?: {
    travelAndSubsistence?: number
    fixedDeductions?: number
    professionalFees?: number
    other?: number
  }

  /** Benefits in kind */
  benefitsInKind?: {
    companyCar?: number
    fuelForCompanyCar?: number
    privateMedical?: number
    other?: number
  }

  /** Lump sums */
  lumpSums?: {
    taxableAmount?: number
    taxDeducted?: number
  }
}

// =============================================================================
// SA103 Self-Employment Income
// =============================================================================

export interface SA103SelfEmployment {
  /** Business name */
  businessName: string

  /** Business description */
  businessDescription: string

  /** Business address */
  businessAddress?: {
    line1: string
    line2?: string
    postcode: string
  }

  /** Accounting period */
  accountingPeriod: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
  }

  /** Basis of accounting */
  accountingBasis: 'cash' | 'accruals'

  /** Income */
  income: {
    turnover: number
    otherIncome?: number
  }

  /** Expenses (itemized or consolidated) */
  expenses: SA103Expenses

  /** Capital allowances */
  capitalAllowances?: {
    annualInvestmentAllowance?: number
    otherCapitalAllowances?: number
    balancingCharges?: number
  }

  /** Adjustments */
  adjustments?: {
    goodsForOwnUse?: number
    disallowableExpenses?: number
    otherAdjustments?: number
  }

  /** Losses */
  losses?: {
    broughtForward?: number
    carriedForward?: number
    usedThisYear?: number
  }

  /** Class 4 NIC */
  class4NICExempt?: boolean
  class4NICExemptReason?: 'under16' | 'over-state-pension-age' | 'non-resident' | 'trustee'
}

export interface SA103Expenses {
  /** If true, only consolidatedExpenses is used */
  useConsolidated: boolean

  /** Consolidated expenses (if not itemizing) */
  consolidatedExpenses?: number

  /** Itemized expenses */
  costOfGoods?: number
  carVanTravel?: number
  wages?: number
  rent?: number
  repairs?: number
  generalAdmin?: number
  advertising?: number
  entertainment?: number
  legalProfessional?: number
  interest?: number
  badDebts?: number
  accountancy?: number
  depreciation?: number
  other?: number
}

// =============================================================================
// SA105 UK Property Income
// =============================================================================

export interface SA105UKProperty {
  /** Number of properties */
  numberOfProperties: number

  /** Property income */
  income: {
    rentAndOtherIncome: number
    premiumsForGrantingLease?: number
    reversePremiums?: number
  }

  /** Expenses (itemized or consolidated) */
  expenses: {
    useConsolidated: boolean
    consolidatedExpenses?: number

    rentsRatesInsurance?: number
    propertyRepairs?: number
    financeCharges?: number
    legalManagementFees?: number
    costsOfServices?: number
    otherAllowableExpenses?: number
  }

  /** Capital allowances and adjustments */
  capitalAllowances?: number
  residentialFinanceCosts?: number
  privateUseAdjustment?: number

  /** Rent-a-Room relief */
  rentARoomRelief?: {
    claimed: boolean
    totalReceipts?: number
  }

  /** Losses */
  losses?: {
    broughtForward?: number
    carriedForward?: number
  }

  /** Furnished Holiday Lettings */
  furnishedHolidayLettings?: {
    ukFHL?: boolean
    eaaFHL?: boolean
    income?: number
    expenses?: number
  }
}

// =============================================================================
// SA106 Foreign Income
// =============================================================================

export interface SA106ForeignIncome {
  /** Foreign dividends */
  foreignDividends?: Array<{
    countryCode: string
    amountBeforeTax: number
    taxPaid: number
  }>

  /** Foreign interest */
  foreignInterest?: Array<{
    countryCode: string
    amountBeforeTax: number
    taxPaid: number
  }>

  /** Foreign property */
  foreignProperty?: {
    income: number
    expenses: number
    countryCode: string
    taxPaid?: number
  }

  /** Foreign pensions */
  foreignPensions?: Array<{
    countryCode: string
    amount: number
    taxPaid?: number
  }>

  /** Foreign tax credit relief */
  foreignTaxCreditRelief?: number
}

// =============================================================================
// SA108 Capital Gains
// =============================================================================

export interface SA108CapitalGains {
  /** Listed shares and securities */
  listedSharesGains?: {
    disposalProceeds: number
    allowableCosts: number
    gain?: number
    loss?: number
  }

  /** Unlisted shares */
  unlistedSharesGains?: {
    disposalProceeds: number
    allowableCosts: number
    gain?: number
    loss?: number
  }

  /** Other property, assets and gains */
  otherGains?: {
    disposalProceeds: number
    allowableCosts: number
    gain?: number
    loss?: number
  }

  /** Residential property */
  residentialPropertyGains?: Array<{
    address: string
    disposalDate: string
    disposalProceeds: number
    allowableCosts: number
    privateResidenceRelief?: number
    lettingsRelief?: number
    gain?: number
  }>

  /** Carried forward losses */
  lossesCarriedForward?: number

  /** Losses used this year */
  lossesUsed?: number

  /** Annual exempt amount */
  annualExemptAmountUsed?: number

  /** Entrepreneurs' relief / Business Asset Disposal Relief */
  businessAssetDisposalRelief?: {
    gains: number
    reliefClaimed: number
  }
}

// =============================================================================
// SA100 Tax Reliefs
// =============================================================================

export interface SA100Reliefs {
  /** Pension contributions */
  pensionContributions?: {
    personal?: number // Basic rate relief at source
    retirementAnnuity?: number // Gross amount
    employerScheme?: number
  }

  /** Gift Aid donations */
  giftAid?: {
    paymentsThisYear: number
    treatAsPreviousYear?: number
    broughtForward?: number
  }

  /** Enterprise Investment Scheme */
  eis?: {
    amountInvested: number
    reliefClaimed: number
  }

  /** Seed Enterprise Investment Scheme */
  seis?: {
    amountInvested: number
    reliefClaimed: number
  }

  /** Venture Capital Trust */
  vct?: {
    amountInvested: number
    reliefClaimed: number
  }

  /** Marriage Allowance */
  marriageAllowance?: {
    transferring?: boolean // Transferring 10% of personal allowance to spouse
    receiving?: boolean // Receiving transfer from spouse
    spouseNINO?: string
  }

  /** Other reliefs */
  other?: {
    maintenancePayments?: number
    loanInterestRelief?: number
    postCessationTradeRelief?: number
    qualifyingLoanInterest?: number
  }
}

// =============================================================================
// SA100 Declaration
// =============================================================================

export interface SA100Declaration {
  /** Declarant type */
  declarantType: 'taxpayer' | 'agent' | 'nominee'

  /** Name of person signing */
  name: string

  /** Capacity (if agent) */
  capacity?: string

  /** Declaration date */
  date: string // YYYY-MM-DD

  /** Agent details (if applicable) */
  agentDetails?: {
    agentRef?: string
    businessName?: string
    address?: {
      line1: string
      line2?: string
      postcode: string
    }
    telephone?: string
  }

  /** Consent for HMRC to deal with agent */
  appointAgent?: boolean
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
