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

  /** Gift Aid donations (NET amount paid - will be grossed up by 1.25) */
  giftAidDonations?: number

  /** Pension contributions (relief at source - NET amount) */
  pensionContributions?: number

  /** Retirement annuity contract payments (REL2 - deducted from total income) */
  retirementAnnuityDeduction?: number

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

  /** CAL7: Underpaid tax from earlier years included in tax code (added to tax due) */
  underpaidTaxFromEarlierYears?: number

  /** CAL8: Underpaid tax being coded out for next year (deducted from tax due) */
  underpaidTaxCodedForNextYear?: number

  /** Tax deducted from taxed interest (for tax already paid calculation) */
  taxedInterestTaxDeducted?: number

  /** Class 2 NIC registered (treated as paid, not included in tax due) */
  class2NICRegistered?: boolean

  /** Primary Class 1 NIC contributions paid (reduces Class 4 liability) */
  primaryClass1NIC?: number

  /** Student loan already deducted through PAYE (reduces amount due on SA) */
  studentLoanDeductedThroughPAYE?: number

  /** Postgraduate loan already deducted through PAYE (reduces amount due on SA) */
  postgraduateLoanDeductedThroughPAYE?: number

  /** Loss relief deduction (REL17) - deducted from total income */
  lossReliefDeduction?: number

  /** Finance costs for Landlord Loan Interest Relief (UK43) - 20% relief, capped at tax liability */
  financeCostsForLLIR?: number
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
  lossReliefDeduction: number
  landlordLoanInterestRelief: number

  // Tax already paid
  taxDeductedAtSource: number

  // National Insurance
  class4NIC: number
  class2NIC: number
  totalNIC: number

  // Student/postgraduate loans
  studentLoanRepayment: number
  postgraduateLoanRepayment: number

  // Tax adjustments
  underpaidTaxFromEarlierYears: number // CAL7: Added to tax due
  underpaidTaxCodedForNextYear: number // CAL8: Deducted from tax due

  // Final position
  totalTaxAndNICDue: number
  totalTaxPaid: number
  taxDueOrRefund: number // Positive = tax due, negative = refund

  // For SA110
  sa110: {
    totalTaxEtcDue: number // CAL1 - tax due (positive or 0), rounded to nearest pound
    taxOverpaid?: number // CAL2 - tax overpaid/refund (positive amount when refund due)
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

  // Total income (before loss relief)
  const grossTotalIncome = totalNonSavingsIncome + totalSavingsIncome + totalDividendIncome

  // Loss relief deduction (REL17) - deducted from total income
  // Applied against non-savings income first
  const lossReliefDeduction = input.lossReliefDeduction || 0
  const nonSavingsAfterLossRelief = Math.max(0, totalNonSavingsIncome - lossReliefDeduction)
  const totalIncome = nonSavingsAfterLossRelief + totalSavingsIncome + totalDividendIncome

  // ==========================================================================
  // Stage 4 & 14: Calculate Personal Allowance
  // ==========================================================================

  let personalAllowance = params.allowances.P_A
  let personalAllowanceReduction = 0

  // Adjust for Blind Person's Allowance
  if (input.blindPersonsAllowance) {
    personalAllowance += params.allowances.BPA
  }

  // Marriage Allowance - IMPORTANT: The receiver does NOT get extra PA.
  // Instead, they receive a TAX REDUCTION of 20% of £1,260 = £252.
  // This is applied AFTER calculating income tax (see Marriage Allowance adjustment below).
  // So we don't modify PA here for the receiver.

  // Marriage Allowance transferred (giving away allowance to spouse)
  // The transferor DOES lose £1,260 from their PA
  if (input.marriageAllowanceTransferred) {
    personalAllowance -= params.allowances.T_P_A
  }

  // Calculate adjusted net income for PA tapering
  // Deductions include: pension contributions, Gift Aid, retirement annuity
  const giftAidGrossedUp = (input.giftAidDonations || 0) * 1.25
  const retirementAnnuityDeduction = input.retirementAnnuityDeduction || 0
  const adjustedNetIncome =
    totalIncome - (input.pensionContributions || 0) - giftAidGrossedUp - retirementAnnuityDeduction

  // Taper personal allowance if adjusted net income > £100,000
  if (adjustedNetIncome > params.allowances.PA_taper_limit) {
    const excess = adjustedNetIncome - params.allowances.PA_taper_limit
    personalAllowanceReduction = Math.min(Math.floor(excess / 2), personalAllowance)
  }

  const effectivePersonalAllowance = personalAllowance - personalAllowanceReduction

  // ==========================================================================
  // Stage 5: Subtract Allowances and Deductions from Income
  // ==========================================================================

  // Retirement annuity is deducted from non-savings income (after loss relief)
  const nonSavingsAfterDeductions = Math.max(0, nonSavingsAfterLossRelief - retirementAnnuityDeduction)

  // Personal allowance is applied against non-savings first, then savings, then dividends
  // Standard allocation (no optimization)
  let remainingAllowance = effectivePersonalAllowance

  // Apply to non-savings income
  const paUsedOnNonSavings = Math.min(remainingAllowance, nonSavingsAfterDeductions)
  const taxableNonSavingsIncome = nonSavingsAfterDeductions - paUsedOnNonSavings
  remainingAllowance -= paUsedOnNonSavings

  // Track how much property income ends up in taxable income (for LLIR calculation)
  const propertyIncome = input.propertyIncome || 0
  const propertyAfterLossRelief = Math.max(0, propertyIncome - lossReliefDeduction)
  const paAllocatedToProperty = nonSavingsAfterDeductions > 0
    ? Math.min(propertyAfterLossRelief, paUsedOnNonSavings * (propertyAfterLossRelief / nonSavingsAfterDeductions))
    : 0
  const taxablePropertyIncome = Math.max(0, propertyAfterLossRelief - paAllocatedToProperty)

  // Apply to savings income
  const paUsedOnSavings = Math.min(remainingAllowance, totalSavingsIncome)
  const taxableSavingsIncome = totalSavingsIncome - paUsedOnSavings
  remainingAllowance -= paUsedOnSavings

  // Apply to dividend income
  const paUsedOnDividends = Math.min(remainingAllowance, totalDividendIncome)
  const taxableDividendIncome = totalDividendIncome - paUsedOnDividends

  const totalTaxableIncome = taxableNonSavingsIncome + taxableSavingsIncome + taxableDividendIncome

  // ==========================================================================
  // Stage 6 & 8: Calculate Tax on Non-Savings Income
  // ==========================================================================

  // Gift Aid and Pension Contributions (Relief at Source) extend the basic rate band
  // Gift Aid is grossed up (× 1.25), pension contributions use the NET amount for band extension
  const giftAidExtension = giftAidGrossedUp
  const pensionExtension = input.pensionContributions || 0 // NET contribution extends bands
  const extendedBasicRateBand = params.bands.BR_band + giftAidExtension + pensionExtension

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
    // HR_band is the WIDTH of the higher rate band (£87,440), not a threshold
    // Higher rate runs from basicRateBand to basicRateBand + HR_band
    // AHR_band (£125,140) is the threshold where additional rate starts
    const higherRateBandWidth = params.bands.HR_band
    const additionalRateThreshold = params.bands.AHR_band

    if (taxableNonSavingsIncome > 0) {
      // Basic rate
      const basicRateAmount = Math.min(taxableNonSavingsIncome, basicRateBand)
      incomeAllocatedToBasicRate = basicRateAmount
      taxOnNonSavings += basicRateAmount * rates.BR_rate

      // Higher rate (income from basicRateBand to additionalRateThreshold)
      if (taxableNonSavingsIncome > basicRateBand) {
        const higherRateAmount = Math.min(
          taxableNonSavingsIncome - basicRateBand,
          higherRateBandWidth // Max £87,440 in higher rate band
        )
        incomeAllocatedToHigherRate = higherRateAmount
        taxOnNonSavings += higherRateAmount * rates.HR_rate
      }

      // Additional rate (income above £125,140)
      if (taxableNonSavingsIncome > additionalRateThreshold) {
        const additionalRateAmount = taxableNonSavingsIncome - additionalRateThreshold
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
  // The receiver gets a TAX REDUCTION of 20% of the transferred amount (£1,260)
  // This equals £252 for 2024-25
  let marriageAllowanceAdjustment = 0
  if (input.marriageAllowanceReceived) {
    // Receiving 20% of transferred allowance as tax reduction (basic rate)
    marriageAllowanceAdjustment = params.allowances.T_P_A * params.rates.BR_rate // £1,260 × 20% = £252
    totalIncomeTax = Math.max(0, totalIncomeTax - marriageAllowanceAdjustment)
  }

  // Landlord Loan Interest Relief (LLIR)
  // For residential property landlords, finance costs (e.g., mortgage interest) are not
  // deductible from rental income. Instead, a tax reduction of 20% of finance costs is given.
  // LLIR is restricted to the LOWER of:
  // 1. 20% of finance costs
  // 2. The tax ATTRIBUTABLE to property income
  let landlordLoanInterestRelief = 0
  if (input.financeCostsForLLIR && input.financeCostsForLLIR > 0 && taxablePropertyIncome > 0) {
    const financeCostsRelief = input.financeCostsForLLIR * params.rates.BR_rate // 20%

    // Calculate tax attributable to property income
    let taxOnProperty = 0
    if (input.status === 'S') {
      taxOnProperty = calculateScottishTax(taxablePropertyIncome, extendedBasicRateBand, params)
    } else {
      const propertyInBasicBand = Math.min(taxablePropertyIncome, extendedBasicRateBand)
      const propertyInHigherBand = Math.max(0, taxablePropertyIncome - extendedBasicRateBand)
      taxOnProperty = propertyInBasicBand * params.rates.BR_rate +
                      propertyInHigherBand * params.rates.HR_rate
    }

    landlordLoanInterestRelief = Math.min(financeCostsRelief, taxOnProperty, totalIncomeTax)
    totalIncomeTax = totalIncomeTax - landlordLoanInterestRelief
  }

  // ==========================================================================
  // Stage 11: Tax Already Paid
  // ==========================================================================

  // Include PAYE from employment plus any tax already deducted from taxed interest
  const taxDeductedAtSource =
    (input.employmentTaxDeducted || 0) + (input.taxedInterestTaxDeducted || 0)

  // ==========================================================================
  // Stage 16: Class 4 NIC (Self-Employment)
  // ==========================================================================
  //
  // When a taxpayer has BOTH employment (paying Class 1 NIC) AND self-employment
  // (paying Class 4 NIC), the Class 4 NIC is reduced because they've already paid
  // NIC on some of their income through Class 1.
  //
  // The rule is: If Class 1 NIC has been paid on earnings above the threshold,
  // the Class 4 rate is reduced from 6% to 2% on the overlapping income.
  //
  // Example (Test Case 22):
  // - Self-employment profit: £21,875
  // - Class 1 NIC earnings: £37,700 (well above the £12,570 threshold)
  // - Since ALL the self-employment profit falls within income already covered by Class 1:
  // - Class 4 = (£21,875 - £12,570) × 2% = £186.10

  let class4NIC = 0

  if (input.selfEmploymentProfits > 0) {
    const profits = input.selfEmploymentProfits
    const lowerLimit = params.bands.NIC_LEL // £12,570
    const upperLimit = params.bands.NIC_UEL // £50,270

    // Class 1 NIC earnings that have already been subject to NIC
    const class1NICEarnings = input.primaryClass1NIC || 0
    const class1AboveThreshold = Math.max(0, class1NICEarnings - lowerLimit)

    if (profits > lowerLimit) {
      // Calculate profits in the main band (between lower and upper limits)
      const profitsAboveThreshold = Math.min(profits, upperLimit) - lowerLimit

      if (class1AboveThreshold >= profitsAboveThreshold) {
        // All self-employment profit is within range already covered by Class 1
        // Charge at reduced rate (2% instead of 6%)
        class4NIC = profitsAboveThreshold * params.rates.NIC_supp_rate
      } else if (class1AboveThreshold > 0) {
        // Partial overlap - charge 2% on overlap, 6% on remainder
        const overlapAmount = class1AboveThreshold
        const nonOverlapAmount = profitsAboveThreshold - class1AboveThreshold
        class4NIC = (overlapAmount * params.rates.NIC_supp_rate) + (nonOverlapAmount * params.rates.NIC_rate)
      } else {
        // No Class 1 paid - standard 6% rate
        class4NIC = profitsAboveThreshold * params.rates.NIC_rate
      }

      // NIC on profits above upper limit (always at 2% supplementary rate)
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

  // Class 2 NIC is paid if registered and profits are at or above the threshold
  // If class2NICRegistered is true, treat as already paid (£0 due on SA)
  if (input.selfEmploymentProfits >= params.class2.lowerProfitsThreshold) {
    if (input.class2NICRegistered) {
      // Already registered and treated as paid - not included in SA tax due
      class2NIC = 0
    } else {
      // Class 2 is mandatory if profits are at or above LPT
      class2NIC = params.class2.annualLimit
    }
  }

  const totalNIC = class4NIC + class2NIC

  // ==========================================================================
  // Stage 27: Student Loan Repayment
  // ==========================================================================
  // Student loan calculation logic:
  // - If employer deducted loan via PAYE: use earned income (to match employer calc)
  // - If no PAYE deduction AND has employment income: exclude dividends from total
  // - If no PAYE deduction AND no employment (self-emp only): use full total income

  let studentLoanRepayment = 0
  const employmentIncome = input.employmentIncome || 0
  const selfEmploymentProfits = input.selfEmploymentProfits || 0
  const earnedIncome = employmentIncome + selfEmploymentProfits

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

    const alreadyDeducted = input.studentLoanDeductedThroughPAYE || 0
    let relevantIncome: number

    if (alreadyDeducted > 0) {
      // PAYE already deducted loan - use earned income to match employer calculation
      relevantIncome = earnedIncome
    } else if (employmentIncome > 0) {
      // Has employment but no PAYE SL deduction - exclude dividends
      relevantIncome = totalIncome - totalDividendIncome
    } else {
      // Self-employment only - use full total income including dividends
      relevantIncome = totalIncome
    }

    if (relevantIncome > threshold) {
      const totalLoanDue = (relevantIncome - threshold) * params.rates.Sloan_rate
      studentLoanRepayment = Math.max(0, totalLoanDue - alreadyDeducted)
    }
  }

  // Postgraduate Loan - same logic as student loan
  let postgraduateLoanRepayment = 0

  if (input.hasPostgraduateLoan) {
    const threshold = params.bands.PGL_limit
    const alreadyDeducted = input.postgraduateLoanDeductedThroughPAYE || 0
    let relevantIncome: number

    if (alreadyDeducted > 0) {
      relevantIncome = earnedIncome
    } else if (employmentIncome > 0) {
      relevantIncome = totalIncome - totalDividendIncome
    } else {
      relevantIncome = totalIncome
    }

    if (relevantIncome > threshold) {
      const totalLoanDue = (relevantIncome - threshold) * params.rates.PGL_rate
      postgraduateLoanRepayment = Math.max(0, totalLoanDue - alreadyDeducted)
    }
  }

  // ==========================================================================
  // Tax Adjustments (CAL7/CAL8)
  // ==========================================================================
  //
  // CAL7 (underpaidTaxFromEarlierYears):
  //   This is underpaid tax from earlier years that HMRC collected through your
  //   tax code. It gets ADDED to your current year tax liability.
  //
  // CAL8 (underpaidTaxCodedForNextYear):
  //   This is underpaid tax for the current year that will be collected through
  //   next year's tax code. It gets ADDED to deductions (reduces what you pay now).
  //
  // Example (Test Case 18):
  //   Income Tax charged: £11,072.61
  //   Plus CAL7 (underpaid tax): £245.00
  //   Total tax due: £11,317.61
  //   Minus PAYE deducted: £7,680.80
  //   Minus CAL8 (coded for next year): £400.00
  //   Total deductions: £8,080.80
  //   Final tax due: £11,317.61 - £8,080.80 = £3,236.81

  const underpaidTaxFromEarlierYears = input.underpaidTaxFromEarlierYears || 0
  const underpaidTaxCodedForNextYear = input.underpaidTaxCodedForNextYear || 0

  // ==========================================================================
  // Stage 12: Calculate Tax Due/Refund
  // ==========================================================================

  // Total tax/NIC/loans due (before CAL7/CAL8 adjustments)
  const totalTaxAndNICDueBeforeAdjustments = totalIncomeTax + totalNIC + studentLoanRepayment + postgraduateLoanRepayment

  // Add CAL7 - underpaid tax from earlier years
  const totalTaxAndNICDue = totalTaxAndNICDueBeforeAdjustments + underpaidTaxFromEarlierYears

  // Total deductions: tax already paid + CAL8 (to be coded out next year)
  const totalTaxPaid = taxDeductedAtSource + underpaidTaxCodedForNextYear

  // Final tax due or refund
  const taxDueOrRefund = totalTaxAndNICDue - totalTaxPaid

  // ==========================================================================
  // Prepare SA110 values (rounded to nearest pound as per HMRC spec)
  // ==========================================================================

  const sa110: TaxCalculationResult['sa110'] = {
    // CAL1: Total tax due (positive) or CAL2: Tax overpaid (negative shows as refund)
    totalTaxEtcDue: taxDueOrRefund >= 0 ? Math.round(taxDueOrRefund) : 0,
    taxOverpaid: taxDueOrRefund < 0 ? Math.round(-taxDueOrRefund) : undefined,
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
    lossReliefDeduction,
    landlordLoanInterestRelief,

    // Tax paid
    taxDeductedAtSource,

    // NIC
    class4NIC,
    class2NIC,
    totalNIC,

    // Student loans
    studentLoanRepayment,
    postgraduateLoanRepayment,

    // Tax adjustments
    underpaidTaxFromEarlierYears,
    underpaidTaxCodedForNextYear,

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

  // For Scottish tax, pension contributions and Gift Aid extend the basic rate band.
  // This means more income is taxed at the lower rates (19%, 20%, 21%) instead of
  // the higher rates (42%, 45%, 48%).
  //
  // The extension is added to the SBR_band (basic rate band) which pushes all
  // subsequent bands up by the same amount.
  const basicRateExtension = extendedBasicRateBand - params.bands.BR_band

  // Scottish has more bands - calculate cumulatively
  // The basic rate band is extended, which shifts higher bands up
  const scottishBands = [
    { limit: bands.SSR_band, rate: rates.SSR_rate }, // 19% - £2,306
    { limit: bands.SBR_band + basicRateExtension, rate: rates.SBR_rate }, // 20% - extended
    { limit: bands.SSR_band + bands.SBR_band + bands.SIR_band + basicRateExtension, rate: rates.SIR_rate }, // 21%
    { limit: bands.SSR_band + bands.SBR_band + bands.SIR_band + bands.SHR_band + basicRateExtension, rate: rates.SHR_rate }, // 42%
    { limit: bands.SSR_band + bands.SBR_band + bands.SIR_band + bands.SHR_band + bands.SAR_band + basicRateExtension, rate: rates.SAR_rate }, // 45%
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
