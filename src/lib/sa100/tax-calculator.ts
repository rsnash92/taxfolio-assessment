/**
 * HMRC SA100 Tax Calculator
 *
 * Implements the tax calculation logic from HMRC's "Calculate Tax and NIC MTR" document
 * for the 2024-25 tax year.
 *
 * This follows the 12-stage calculation process defined by HMRC:
 * - Stage 1-3: Collect income (non-savings, savings, dividends)
 * - Stage 4: Calculate reliefs and allowances
 * - Stage 5: Subtract deductions from income
 * - Stage 6: Allocate income to tax bands
 * - Stage 8: Calculate income tax due
 * - Stage 11: Accumulate tax already paid
 * - Stage 12: Calculate final tax due/overpaid
 * - Stage 16: Calculate Class 4 NIC (if self-employed)
 *
 * Reference: https://www.gov.uk/government/publications/self-assessment-technical-specifications-2025-for-individual-returns
 */

// =============================================================================
// Tax Year 2024-25 Parameters (from HMRC Calculate Tax and NIC MTR v2.4.0)
// =============================================================================

export const TAX_PARAMETERS_2024_25 = {
  // Tax rates
  rates: {
    // Income tax rates (England & NI)
    BR_rate: 0.20, // Basic rate
    HR_rate: 0.40, // Higher rate
    AHR_rate: 0.45, // Additional rate

    // Scottish rates
    SSR_rate: 0.19, // Starter rate
    SBR_rate: 0.20, // Basic rate
    SIR_rate: 0.21, // Intermediate rate
    SHR_rate: 0.42, // Higher rate
    SAR_rate: 0.45, // Advanced rate
    SAHR_rate: 0.48, // Additional rate

    // Welsh rates (same as England & NI for 2024-25)
    WBR_rate: 0.20,
    WHR_rate: 0.40,
    WAHR_rate: 0.45,

    // Savings rates
    SR_rate: 0.0, // Starting rate for savings
    SAVBR_rate: 0.20,
    SAVHR_rate: 0.40,
    SAVAHR_rate: 0.45,

    // Dividend rates
    DivNil_rate: 0.0, // Dividend allowance rate
    DivBR_rate: 0.0875, // Basic rate
    DivHR_rate: 0.3375, // Higher rate
    DivAR_rate: 0.3935, // Additional rate

    // NIC rates
    NIC_rate: 0.06, // Class 4 between LPL and UPL
    NIC_supp_rate: 0.02, // Class 4 above UPL

    // Student loan rates
    Sloan_rate: 0.09,
    PGL_rate: 0.06,
  },

  // Rate bands
  bands: {
    // England & NI bands
    BR_band: 37700, // Basic rate band (£12,571 to £50,270)
    HR_band: 87440, // Higher rate band (up to £125,140)
    AHR_band: 125140, // Additional rate threshold

    // Scottish bands
    SSR_band: 2306, // Starter rate band
    SBR_band: 11685, // Basic rate band
    SIR_band: 17101, // Intermediate rate band
    SHR_band: 31338, // Higher rate band
    SAR_band: 62710, // Advanced rate band
    SAHR_band: 125140, // Additional rate threshold

    // Savings
    SR_band: 5000, // Starting rate band for savings

    // NIC bands
    NIC_LEL: 12570, // Lower earnings/profits limit
    NIC_UEL: 50270, // Upper earnings/profits limit
    NIC_Band: 37700, // Band width

    // Student loan thresholds
    SL_limit1: 24990, // Plan 1
    SL_limit2: 27295, // Plan 2
    SL_limit4: 31395, // Plan 4
    PGL_limit: 21000, // Postgraduate
  },

  // Allowances
  allowances: {
    P_A: 12570, // Personal Allowance
    PA_taper_limit: 100000, // PA taper starts
    AA_excess: 0.5, // PA reduces by £1 for every £2 over limit

    PSA_BR: 1000, // Personal Savings Allowance (basic rate taxpayer)
    PSA_HR: 500, // Personal Savings Allowance (higher rate taxpayer)
    PSA_AHR: 0, // Personal Savings Allowance (additional rate taxpayer)

    DA: 500, // Dividend Allowance

    T_P_A: 1260, // Transferable personal allowance (Marriage Allowance)

    BPA: 3070, // Blind Person's Allowance

    MCA: 4280, // Minimum Married Couple's Allowance
    H_MCA: 11080, // Maximum Married Couple's Allowance
  },

  // Class 2 NIC
  class2: {
    weeklyAmount: 3.45,
    annualLimit: 182.85, // 53 weeks at £3.45
    smallProfitsThreshold: 6725,
    lowerProfitsThreshold: 12570,
  },
}

// =============================================================================
// Types
// =============================================================================

export type TaxpayerStatus = 'E' | 'S' | 'C' | 'U'
// E = England, S = Scotland, C = Wales, U = Northern Ireland (or default)

export interface TaxCalculationInput {
  /** Taxpayer's residency status for tax purposes */
  status: TaxpayerStatus

  /** Employment income (gross pay from all employments) */
  employmentIncome: number

  /** Tax already deducted from employment (PAYE) */
  employmentTaxDeducted: number

  /** Self-employment profits (net profit after expenses) */
  selfEmploymentProfits: number

  /** Pension income */
  pensionIncome?: number

  /** State pension */
  statePension?: number

  /** Taxed interest (from banks, building societies) */
  taxedInterest?: number

  /** Untaxed interest */
  untaxedInterest?: number

  /** UK dividends */
  ukDividends?: number

  /** Foreign dividends */
  foreignDividends?: number

  /** Property income (net profit) */
  propertyIncome?: number

  /** Other income */
  otherIncome?: number

  /** Gift Aid donations (gross amount, i.e., amount donated / 0.8) */
  giftAidDonations?: number

  /** Pension contributions (relief at source) */
  pensionContributions?: number

  /** Student loan plan type (1, 2, 4, or undefined if none) */
  studentLoanPlan?: 1 | 2 | 4

  /** Has postgraduate loan */
  hasPostgraduateLoan?: boolean

  /** Blind Person's Allowance claimed */
  blindPersonsAllowance?: boolean

  /** Marriage Allowance - receiving transfer */
  marriageAllowanceReceived?: boolean

  /** Marriage Allowance - transferring to spouse */
  marriageAllowanceTransferred?: boolean
}

export interface TaxCalculationResult {
  // Income totals
  totalNonSavingsIncome: number
  totalSavingsIncome: number
  totalDividendIncome: number
  totalIncome: number

  // Allowances
  personalAllowance: number
  personalAllowanceReduction: number
  effectivePersonalAllowance: number

  // Taxable income
  taxableNonSavingsIncome: number
  taxableSavingsIncome: number
  taxableDividendIncome: number
  totalTaxableIncome: number

  // Tax calculations by type
  taxOnNonSavings: number
  taxOnSavings: number
  taxOnDividends: number
  totalIncomeTax: number

  // Adjustments
  giftAidExtension: number
  marriageAllowanceAdjustment: number

  // Tax already paid
  taxDeductedAtSource: number

  // National Insurance
  class4NIC: number
  class2NIC: number
  totalNIC: number

  // Student/postgraduate loans
  studentLoanRepayment: number
  postgraduateLoanRepayment: number

  // Final position
  totalTaxAndNICDue: number
  totalTaxPaid: number
  taxDueOrRefund: number // Positive = tax due, negative = refund

  // For SA110
  sa110: {
    totalTaxEtcDue: number // CAL1/CAL2 - rounded to nearest pound
    class4NICsDue?: number // CAL4
    class2NICsDue?: number // CAL4.1
    studentLoanRepaymentDue?: number // CAL3
    postgraduateLoanRepaymentDue?: number // CAL3.1
  }
}

// =============================================================================
// Tax Calculator
// =============================================================================

/**
 * Calculate tax for SA100 submission
 * Implements HMRC's calculation stages for 2024-25
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const params = TAX_PARAMETERS_2024_25

  // ==========================================================================
  // Stage 1-3: Collect Income
  // ==========================================================================

  // Non-savings income (Stage 1)
  const totalNonSavingsIncome =
    (input.employmentIncome || 0) +
    (input.selfEmploymentProfits || 0) +
    (input.pensionIncome || 0) +
    (input.statePension || 0) +
    (input.propertyIncome || 0) +
    (input.otherIncome || 0)

  // Savings income (Stage 2)
  const totalSavingsIncome = (input.taxedInterest || 0) + (input.untaxedInterest || 0)

  // Dividend income (Stage 3)
  const totalDividendIncome = (input.ukDividends || 0) + (input.foreignDividends || 0)

  // Total income
  const totalIncome = totalNonSavingsIncome + totalSavingsIncome + totalDividendIncome

  // ==========================================================================
  // Stage 4 & 14: Calculate Personal Allowance
  // ==========================================================================

  let personalAllowance = params.allowances.P_A
  let personalAllowanceReduction = 0

  // Adjust for Blind Person's Allowance
  if (input.blindPersonsAllowance) {
    personalAllowance += params.allowances.BPA
  }

  // Marriage Allowance received
  if (input.marriageAllowanceReceived) {
    personalAllowance += params.allowances.T_P_A
  }

  // Marriage Allowance transferred
  if (input.marriageAllowanceTransferred) {
    personalAllowance -= params.allowances.T_P_A
  }

  // Calculate adjusted net income for PA tapering
  // (simplified - full version includes more deductions)
  const giftAidGrossedUp = (input.giftAidDonations || 0) * 1.25
  const adjustedNetIncome = totalIncome - (input.pensionContributions || 0) - giftAidGrossedUp

  // Taper personal allowance if adjusted net income > £100,000
  if (adjustedNetIncome > params.allowances.PA_taper_limit) {
    const excess = adjustedNetIncome - params.allowances.PA_taper_limit
    personalAllowanceReduction = Math.min(Math.floor(excess / 2), personalAllowance)
  }

  const effectivePersonalAllowance = personalAllowance - personalAllowanceReduction

  // ==========================================================================
  // Stage 5: Subtract Allowances from Income
  // ==========================================================================

  // Personal allowance is applied against non-savings first, then savings, then dividends
  let remainingAllowance = effectivePersonalAllowance

  // Apply to non-savings income
  const nonSavingsAfterAllowance = Math.max(0, totalNonSavingsIncome - remainingAllowance)
  remainingAllowance = Math.max(0, remainingAllowance - totalNonSavingsIncome)

  // Apply to savings income
  const savingsAfterAllowance = Math.max(0, totalSavingsIncome - remainingAllowance)
  remainingAllowance = Math.max(0, remainingAllowance - totalSavingsIncome)

  // Apply to dividend income
  const dividendsAfterAllowance = Math.max(0, totalDividendIncome - remainingAllowance)

  const taxableNonSavingsIncome = nonSavingsAfterAllowance
  const taxableSavingsIncome = savingsAfterAllowance
  const taxableDividendIncome = dividendsAfterAllowance
  const totalTaxableIncome = taxableNonSavingsIncome + taxableSavingsIncome + taxableDividendIncome

  // ==========================================================================
  // Stage 6 & 8: Calculate Tax on Non-Savings Income
  // ==========================================================================

  // Gift Aid extends the basic rate band
  const giftAidExtension = giftAidGrossedUp
  const extendedBasicRateBand = params.bands.BR_band + giftAidExtension

  let taxOnNonSavings = 0
  let incomeAllocatedToBasicRate = 0
  let incomeAllocatedToHigherRate = 0
  let incomeAllocatedToAdditionalRate = 0

  if (input.status === 'S') {
    // Scottish rates
    taxOnNonSavings = calculateScottishTax(taxableNonSavingsIncome, extendedBasicRateBand, params)
  } else {
    // England, Wales, NI rates
    const rates = params.rates
    const basicRateBand = extendedBasicRateBand
    const higherRateBand = params.bands.HR_band

    if (taxableNonSavingsIncome > 0) {
      // Basic rate
      const basicRateAmount = Math.min(taxableNonSavingsIncome, basicRateBand)
      incomeAllocatedToBasicRate = basicRateAmount
      taxOnNonSavings += basicRateAmount * rates.BR_rate

      // Higher rate
      if (taxableNonSavingsIncome > basicRateBand) {
        const higherRateAmount = Math.min(
          taxableNonSavingsIncome - basicRateBand,
          higherRateBand - basicRateBand
        )
        incomeAllocatedToHigherRate = higherRateAmount
        taxOnNonSavings += higherRateAmount * rates.HR_rate
      }

      // Additional rate
      if (taxableNonSavingsIncome > higherRateBand) {
        const additionalRateAmount = taxableNonSavingsIncome - higherRateBand
        incomeAllocatedToAdditionalRate = additionalRateAmount
        taxOnNonSavings += additionalRateAmount * rates.AHR_rate
      }
    }
  }

  // ==========================================================================
  // Stage 8: Calculate Tax on Savings Income
  // ==========================================================================

  let taxOnSavings = 0
  const rates = params.rates

  if (taxableSavingsIncome > 0) {
    // Determine which rate band we're in based on non-savings income
    const nonSavingsUsedBand = taxableNonSavingsIncome
    const remainingBasicBand = Math.max(0, extendedBasicRateBand - nonSavingsUsedBand)
    const remainingHigherBand = Math.max(
      0,
      params.bands.HR_band - Math.max(nonSavingsUsedBand, extendedBasicRateBand)
    )

    // Determine Personal Savings Allowance based on marginal rate
    let personalSavingsAllowance = params.allowances.PSA_BR
    if (nonSavingsUsedBand > extendedBasicRateBand) {
      personalSavingsAllowance = params.allowances.PSA_HR
    }
    if (nonSavingsUsedBand > params.bands.HR_band) {
      personalSavingsAllowance = params.allowances.PSA_AHR
    }

    // Apply PSA to savings income (tax at 0%)
    let remainingSavings = taxableSavingsIncome
    const savingsAtNilRate = Math.min(remainingSavings, personalSavingsAllowance)
    remainingSavings -= savingsAtNilRate

    // Starting rate for savings (if non-savings income is below PA + SR_band)
    const startingRateAvailable = Math.max(
      0,
      params.bands.SR_band - Math.max(0, totalNonSavingsIncome - effectivePersonalAllowance)
    )
    if (startingRateAvailable > 0 && remainingSavings > 0) {
      const savingsAtStartingRate = Math.min(remainingSavings, startingRateAvailable)
      remainingSavings -= savingsAtStartingRate
      // Starting rate is 0%, so no tax added
    }

    // Basic rate savings
    if (remainingSavings > 0 && remainingBasicBand > 0) {
      const savingsAtBasicRate = Math.min(remainingSavings, remainingBasicBand)
      taxOnSavings += savingsAtBasicRate * rates.SAVBR_rate
      remainingSavings -= savingsAtBasicRate
    }

    // Higher rate savings
    if (remainingSavings > 0 && remainingHigherBand > 0) {
      const savingsAtHigherRate = Math.min(remainingSavings, remainingHigherBand)
      taxOnSavings += savingsAtHigherRate * rates.SAVHR_rate
      remainingSavings -= savingsAtHigherRate
    }

    // Additional rate savings
    if (remainingSavings > 0) {
      taxOnSavings += remainingSavings * rates.SAVAHR_rate
    }
  }

  // ==========================================================================
  // Stage 8: Calculate Tax on Dividends
  // ==========================================================================

  let taxOnDividends = 0

  if (taxableDividendIncome > 0) {
    // Determine which rate band we're in based on non-savings + savings income
    const incomeBeforeDividends = taxableNonSavingsIncome + taxableSavingsIncome
    const remainingBasicBand = Math.max(0, extendedBasicRateBand - incomeBeforeDividends)
    const remainingHigherBand = Math.max(
      0,
      params.bands.HR_band - Math.max(incomeBeforeDividends, extendedBasicRateBand)
    )

    let remainingDividends = taxableDividendIncome

    // Dividend allowance (tax at 0%)
    const dividendAllowance = params.allowances.DA
    const dividendsAtNilRate = Math.min(remainingDividends, dividendAllowance)
    remainingDividends -= dividendsAtNilRate

    // Basic rate dividends
    if (remainingDividends > 0 && remainingBasicBand > 0) {
      const dividendsAtBasicRate = Math.min(remainingDividends, remainingBasicBand)
      taxOnDividends += dividendsAtBasicRate * rates.DivBR_rate
      remainingDividends -= dividendsAtBasicRate
    }

    // Higher rate dividends
    if (remainingDividends > 0 && remainingHigherBand > 0) {
      const dividendsAtHigherRate = Math.min(remainingDividends, remainingHigherBand)
      taxOnDividends += dividendsAtHigherRate * rates.DivHR_rate
      remainingDividends -= dividendsAtHigherRate
    }

    // Additional rate dividends
    if (remainingDividends > 0) {
      taxOnDividends += remainingDividends * rates.DivAR_rate
    }
  }

  // ==========================================================================
  // Total Income Tax
  // ==========================================================================

  let totalIncomeTax = taxOnNonSavings + taxOnSavings + taxOnDividends

  // Marriage Allowance adjustment
  let marriageAllowanceAdjustment = 0
  if (input.marriageAllowanceReceived) {
    // Receiving 10% of transferred allowance as tax reduction
    marriageAllowanceAdjustment = params.allowances.T_P_A * 0.1 // £126
    totalIncomeTax = Math.max(0, totalIncomeTax - marriageAllowanceAdjustment)
  }

  // ==========================================================================
  // Stage 11: Tax Already Paid
  // ==========================================================================

  const taxDeductedAtSource = input.employmentTaxDeducted || 0

  // ==========================================================================
  // Stage 16: Class 4 NIC (Self-Employment)
  // ==========================================================================

  let class4NIC = 0

  if (input.selfEmploymentProfits > 0) {
    const profits = input.selfEmploymentProfits
    const lowerLimit = params.bands.NIC_LEL
    const upperLimit = params.bands.NIC_UEL

    if (profits > lowerLimit) {
      // NIC on profits between lower and upper limit
      const profitsInMainBand = Math.min(profits, upperLimit) - lowerLimit
      class4NIC += profitsInMainBand * params.rates.NIC_rate

      // NIC on profits above upper limit
      if (profits > upperLimit) {
        const profitsAboveUpper = profits - upperLimit
        class4NIC += profitsAboveUpper * params.rates.NIC_supp_rate
      }
    }
  }

  // ==========================================================================
  // Class 2 NIC
  // ==========================================================================

  let class2NIC = 0

  if (input.selfEmploymentProfits >= params.class2.lowerProfitsThreshold) {
    // Class 2 is mandatory if profits are at or above LPT
    class2NIC = params.class2.annualLimit
  }

  const totalNIC = class4NIC + class2NIC

  // ==========================================================================
  // Stage 27: Student Loan Repayment
  // ==========================================================================

  let studentLoanRepayment = 0

  if (input.studentLoanPlan) {
    let threshold = 0
    switch (input.studentLoanPlan) {
      case 1:
        threshold = params.bands.SL_limit1
        break
      case 2:
        threshold = params.bands.SL_limit2
        break
      case 4:
        threshold = params.bands.SL_limit4
        break
    }

    const relevantIncome = totalIncome
    if (relevantIncome > threshold) {
      studentLoanRepayment = (relevantIncome - threshold) * params.rates.Sloan_rate
    }
  }

  // Postgraduate Loan
  let postgraduateLoanRepayment = 0

  if (input.hasPostgraduateLoan) {
    const threshold = params.bands.PGL_limit
    const relevantIncome = totalIncome
    if (relevantIncome > threshold) {
      postgraduateLoanRepayment = (relevantIncome - threshold) * params.rates.PGL_rate
    }
  }

  // ==========================================================================
  // Stage 12: Calculate Tax Due/Refund
  // ==========================================================================

  const totalTaxAndNICDue = totalIncomeTax + totalNIC + studentLoanRepayment + postgraduateLoanRepayment
  const totalTaxPaid = taxDeductedAtSource
  const taxDueOrRefund = totalTaxAndNICDue - totalTaxPaid

  // ==========================================================================
  // Prepare SA110 values (rounded to nearest pound as per HMRC spec)
  // ==========================================================================

  const sa110: TaxCalculationResult['sa110'] = {
    totalTaxEtcDue: Math.round(taxDueOrRefund),
  }

  // Only include Class 4 NIC if > 0
  if (class4NIC > 0) {
    sa110.class4NICsDue = Math.round(class4NIC)
  }

  // Only include Class 2 NIC if > 0
  if (class2NIC > 0) {
    sa110.class2NICsDue = Math.round(class2NIC)
  }

  // Only include student loan if > 0
  if (studentLoanRepayment > 0) {
    sa110.studentLoanRepaymentDue = Math.round(studentLoanRepayment)
  }

  // Only include postgraduate loan if > 0
  if (postgraduateLoanRepayment > 0) {
    sa110.postgraduateLoanRepaymentDue = Math.round(postgraduateLoanRepayment)
  }

  return {
    // Income totals
    totalNonSavingsIncome,
    totalSavingsIncome,
    totalDividendIncome,
    totalIncome,

    // Allowances
    personalAllowance,
    personalAllowanceReduction,
    effectivePersonalAllowance,

    // Taxable income
    taxableNonSavingsIncome,
    taxableSavingsIncome,
    taxableDividendIncome,
    totalTaxableIncome,

    // Tax calculations
    taxOnNonSavings,
    taxOnSavings,
    taxOnDividends,
    totalIncomeTax,

    // Adjustments
    giftAidExtension,
    marriageAllowanceAdjustment,

    // Tax paid
    taxDeductedAtSource,

    // NIC
    class4NIC,
    class2NIC,
    totalNIC,

    // Student loans
    studentLoanRepayment,
    postgraduateLoanRepayment,

    // Final position
    totalTaxAndNICDue,
    totalTaxPaid,
    taxDueOrRefund,

    // SA110 values
    sa110,
  }
}

/**
 * Calculate Scottish income tax
 */
function calculateScottishTax(
  taxableIncome: number,
  extendedBasicRateBand: number,
  params: typeof TAX_PARAMETERS_2024_25
): number {
  const rates = params.rates
  const bands = params.bands

  let tax = 0
  let remaining = taxableIncome

  // Scottish has more bands - calculate cumulatively
  const scottishBands = [
    { limit: bands.SSR_band, rate: rates.SSR_rate }, // 19%
    { limit: bands.SBR_band, rate: rates.SBR_rate }, // 20%
    { limit: bands.SIR_band, rate: rates.SIR_rate }, // 21%
    { limit: bands.SHR_band, rate: rates.SHR_rate }, // 42%
    { limit: bands.SAR_band, rate: rates.SAR_rate }, // 45%
    { limit: Infinity, rate: rates.SAHR_rate }, // 48%
  ]

  let previousLimit = 0

  for (const band of scottishBands) {
    if (remaining <= 0) break

    const bandWidth = band.limit - previousLimit
    const incomeInBand = Math.min(remaining, bandWidth)

    tax += incomeInBand * band.rate
    remaining -= incomeInBand
    previousLimit = band.limit
  }

  return tax
}

// =============================================================================
// Helper function to get TaxpayerStatus from wizard data
// =============================================================================

export function getTaxpayerStatus(residencyStatus?: string): TaxpayerStatus {
  switch (residencyStatus?.toUpperCase()) {
    case 'S':
    case 'SCOTTISH':
    case 'SCOTLAND':
      return 'S'
    case 'C':
    case 'WELSH':
    case 'WALES':
      return 'C'
    case 'E':
    case 'ENGLISH':
    case 'ENGLAND':
      return 'E'
    default:
      return 'U' // UK/other - uses England & NI rates
  }
}
