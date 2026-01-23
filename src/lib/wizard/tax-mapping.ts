/**
 * Maps wizard state to HMRC-compliant TaxCalculatorInput
 *
 * This module bridges the wizard's data structure with the HMRC-compliant
 * tax calculator, ensuring users see accurate tax estimates during the wizard
 * that match the final submission calculations.
 */

import { WizardData, TaxCalculation } from '@/types/wizard'
import {
  TaxCalculationInput,
  TaxCalculationResult,
  TaxpayerStatus,
  calculateTax,
} from '@/lib/sa100/tax-calculator'

/**
 * Convert wizard personalInfo taxpayer status to TaxCalculatorInput status
 */
function mapTaxpayerStatus(status?: string): TaxpayerStatus {
  switch (status?.toUpperCase()) {
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

/**
 * Map wizard data to TaxCalculatorInput
 *
 * Note: Wizard stores monetary values in pounds (not pence).
 * The HMRC calculator also expects values in pounds.
 */
export function mapWizardToTaxInput(data: WizardData): TaxCalculationInput {
  // ==========================================================================
  // Employment Income
  // ==========================================================================
  let totalEmploymentIncome = 0
  let totalEmploymentTaxDeducted = 0
  let primaryClass1NIC = 0 // For NIC offset calculation
  let studentLoanPlan: 1 | 2 | 4 | undefined
  let hasPostgraduateLoan = false
  let studentLoanDeductedThroughPAYE = 0
  let postgraduateLoanDeductedThroughPAYE = 0

  const employmentSources = data.incomeSources.filter((s) => s.type === 'employment')
  for (const employer of employmentSources) {
    const employerData = data.employmentData[employer.id]
    if (employerData) {
      // Base pay
      totalEmploymentIncome += employerData.payReceived || 0

      // Benefits in Kind (P11D)
      totalEmploymentIncome += employerData.companyCarBenefit || 0
      totalEmploymentIncome += employerData.fuelBenefit || 0
      totalEmploymentIncome += employerData.medicalInsuranceBenefit || 0
      totalEmploymentIncome += employerData.otherBenefits || 0
      totalEmploymentIncome += employerData.tipsReceived || 0

      // Employment expenses (reduce taxable income)
      if (employerData.claimingExpenses) {
        totalEmploymentIncome -= employerData.travelExpenses || 0
        totalEmploymentIncome -= employerData.professionalFees || 0
        totalEmploymentIncome -= employerData.workingFromHome || 0
        totalEmploymentIncome -= employerData.otherExpenses || 0
      }

      // Tax already paid
      totalEmploymentTaxDeducted += employerData.taxDeducted || 0

      // Student loans
      if (employerData.hasStudentLoan && employerData.studentLoanPlanType) {
        if (employerData.studentLoanPlanType === '1') studentLoanPlan = 1
        else if (employerData.studentLoanPlanType === '2') studentLoanPlan = 2
        else if (employerData.studentLoanPlanType === '4') studentLoanPlan = 4
        else if (employerData.studentLoanPlanType === 'postgrad') hasPostgraduateLoan = true

        studentLoanDeductedThroughPAYE += employerData.studentLoanDeducted || 0
      }
    }
  }

  // ==========================================================================
  // Self-Employment Income
  // ==========================================================================
  let totalSelfEmploymentProfits = 0

  const selfEmploymentSources = data.incomeSources.filter((s) => s.type === 'self-employment')
  for (const business of selfEmploymentSources) {
    const businessData = data.selfEmploymentData[business.id]
    if (businessData) {
      const income = businessData.income?.total || 0
      const expenses = businessData.expenses?.total || 0
      const capitalAllowances = businessData.capitalAllowances?.total || 0

      // Trading allowance: if income <= £1,000 and no expenses claimed, it's tax-free
      // If income > £1,000, can use £1,000 flat deduction instead of actual expenses
      let netProfit = income - expenses - capitalAllowances

      // Apply trading allowance if beneficial and no expenses claimed
      if (income > 0 && expenses === 0 && capitalAllowances === 0) {
        const tradingAllowance = Math.min(income, 1000)
        netProfit = Math.max(0, income - tradingAllowance)
      }

      totalSelfEmploymentProfits += Math.max(0, netProfit)
    }
  }

  // ==========================================================================
  // CIS Income (treated as self-employment for tax purposes)
  // ==========================================================================
  let cisTaxDeducted = 0

  if (data.cisData) {
    const cisIncome = data.cisData.totalGross || data.cisData.totalGrossPayments || 0
    const cisExpenses = data.cisData.expenses || 0
    totalSelfEmploymentProfits += Math.max(0, cisIncome - cisExpenses)
    cisTaxDeducted = data.cisData.totalDeductions || data.cisData.totalCISDeductions || 0
  }

  // ==========================================================================
  // Rental Income (UK Property)
  // ==========================================================================
  let totalPropertyIncome = 0
  let totalFinanceCosts = 0

  const rentalSources = data.incomeSources.filter((s) => s.type === 'rental')
  for (const property of rentalSources) {
    const propertyData = data.rentalData[property.id]
    if (propertyData) {
      const ownershipShare = (propertyData.ownershipShare || 100) / 100
      const income = (propertyData.income?.total || 0) * ownershipShare
      const expenses = (propertyData.expenses?.total || 0) * ownershipShare

      // Finance costs for Section 24 LLIR (20% tax credit, not deductible)
      const financeCosts =
        ((propertyData.mortgageInterest || 0) + (propertyData.otherFinanceCosts || 0)) * ownershipShare
      totalFinanceCosts += financeCosts

      totalPropertyIncome += Math.max(0, income - expenses)
    }
  }

  // ==========================================================================
  // Savings Income (Interest)
  // ==========================================================================
  let untaxedInterest = 0
  let taxedInterest = 0
  let taxedInterestTaxDeducted = 0

  if (data.interestData) {
    untaxedInterest =
      (data.interestData.untaxedUKInterest || 0) +
      (data.interestData.untaxedForeignInterest || 0) +
      (data.interestData.giltsInterest || 0)

    taxedInterest = data.interestData.taxedUKInterest || 0
    taxedInterestTaxDeducted = data.interestData.taxDeducted || data.interestData.taxDeductedFromInterest || 0
  } else if (data.otherIncome?.interest) {
    // Legacy fallback
    untaxedInterest = data.otherIncome.interest
  }

  // ==========================================================================
  // Dividend Income
  // ==========================================================================
  let ukDividends = 0

  if (data.dividendsData) {
    ukDividends =
      (data.dividendsData.ukDividends || 0) +
      (data.dividendsData.ukDividendsFromUnitTrusts || 0) +
      (data.dividendsData.foreignDividends || 0) +
      (data.dividendsData.stockDividends || 0)
  } else if (data.otherIncome?.dividends) {
    // Legacy fallback
    ukDividends = data.otherIncome.dividends
  }

  // ==========================================================================
  // Pension Income
  // ==========================================================================
  let pensionIncome = 0
  let pensionTaxDeducted = 0

  if (data.pensionIncomeData) {
    pensionIncome += data.pensionIncomeData.statePension || 0
    pensionIncome += data.pensionIncomeData.statePensionLumpSum || 0

    if (data.pensionIncomeData.privatePensions) {
      for (const pension of data.pensionIncomeData.privatePensions) {
        pensionIncome += pension.pensionAmount || 0
        pensionTaxDeducted += pension.taxDeducted || 0
      }
    }

    pensionTaxDeducted += data.pensionIncomeData.totalTaxDeducted || 0
  } else if (data.otherIncome?.pension) {
    // Legacy fallback
    pensionIncome = data.otherIncome.pension
  }

  // ==========================================================================
  // State Benefits
  // ==========================================================================
  let stateBenefitsIncome = 0
  let childBenefitReceived = 0

  if (data.stateBenefitsData) {
    stateBenefitsIncome +=
      (data.stateBenefitsData.jobseekersAllowance || 0) +
      (data.stateBenefitsData.employmentSupportAllowance || 0) +
      (data.stateBenefitsData.carersAllowance || 0) +
      (data.stateBenefitsData.bereavementAllowance || 0) +
      (data.stateBenefitsData.incapacityBenefit || 0) +
      (data.stateBenefitsData.statePension || 0) +
      (data.stateBenefitsData.otherTaxableBenefits || 0)

    // High Income Child Benefit Charge
    if (data.stateBenefitsData.hasHighIncomeChildBenefit) {
      childBenefitReceived = data.stateBenefitsData.childBenefitReceived || 0
    }
  } else if (data.otherIncome?.stateBenefits) {
    // Legacy fallback
    stateBenefitsIncome = data.otherIncome.stateBenefits
  }

  // ==========================================================================
  // Other Income
  // ==========================================================================
  const otherIncome = data.otherIncome?.other || 0

  // ==========================================================================
  // Capital Gains
  // ==========================================================================
  let capitalGainsNonResidential = 0
  let capitalGainsResidential = 0
  let capitalLossesInYear = 0

  if (data.capitalGainsData) {
    for (const disposal of data.capitalGainsData.disposals || []) {
      const gain = disposal.gain || 0
      const loss = disposal.loss || 0

      if (
        disposal.assetType === 'property' ||
        disposal.assetType === 'residential-property'
      ) {
        if (gain > 0) capitalGainsResidential += gain
        if (loss > 0) capitalLossesInYear += loss
      } else {
        if (gain > 0) capitalGainsNonResidential += gain
        if (loss > 0) capitalLossesInYear += loss
      }
    }

    // Add losses from previous years if declared
    capitalLossesInYear += data.capitalGainsData.lossesThisYear || 0
  }

  // ==========================================================================
  // Tax Reliefs & Allowances
  // ==========================================================================

  // Pension contributions (relief at source - extends basic rate band)
  const pensionContributions = data.general?.pension?.personalContributions || 0

  // Gift Aid donations
  const giftAidDonations = data.general?.charitable?.giftAidDonations || 0

  // Marriage Allowance
  const marriageAllowanceType = data.general?.marriageAllowance?.type || data.general?.marriageAllowance?.transferType
  // If transferring allowance OUT to spouse, you lose £1,260 from your PA
  // If receiving allowance IN, you get £1,260 added (handled as tax reducer, not here)
  const marriageAllowanceTransferred = marriageAllowanceType === 'transfer'
  const marriageAllowanceReceived = marriageAllowanceType === 'receive'

  // Blind Person's Allowance
  const blindPersonsAllowance = data.general?.blindAllowance?.registeredBlind || false

  // Finance costs for Landlord Loan Interest Relief (Section 24)
  const financeCostsForLLIR = totalFinanceCosts

  // ==========================================================================
  // Build the TaxCalculatorInput
  // ==========================================================================

  const input: TaxCalculationInput = {
    // Taxpayer status (England/Scotland/Wales/NI)
    // Note: taxpayerStatus may be stored directly on personalInfo in some cases
    status: mapTaxpayerStatus((data.personalInfo as { taxpayerStatus?: string })?.taxpayerStatus),

    // Employment income
    employmentIncome: Math.max(0, totalEmploymentIncome),
    employmentTaxDeducted: totalEmploymentTaxDeducted,

    // Self-employment income
    selfEmploymentProfits: totalSelfEmploymentProfits,

    // Primary Class 1 NIC (for overlapping relief calculation)
    // This would typically come from P60, approximating based on employment income
    primaryClass1NIC: primaryClass1NIC,

    // Property income
    propertyIncome: totalPropertyIncome,

    // Other income (state benefits, other misc income, pension income)
    otherIncome: stateBenefitsIncome + otherIncome + pensionIncome,

    // Savings income
    untaxedInterest,
    taxedInterest,
    taxedInterestTaxDeducted,

    // Dividend income
    ukDividends,

    // Pension contributions (extends basic rate band for RAS contributions)
    pensionContributions,

    // Gift Aid donations (extends basic rate band)
    giftAidDonations,

    // Allowances
    blindPersonsAllowance,
    marriageAllowanceTransferred,
    marriageAllowanceReceived,

    // Student loans
    studentLoanPlan,
    hasPostgraduateLoan,
    studentLoanDeductedThroughPAYE,
    postgraduateLoanDeductedThroughPAYE,

    // Capital gains
    capitalGainsNonResidential,
    capitalGainsResidential,
    capitalLossesInYear,

    // HICBC
    childBenefitReceived,

    // Landlord Loan Interest Relief
    financeCostsForLLIR,
  }

  // Add CIS tax deducted to employment tax deducted (both are at-source deductions)
  if (cisTaxDeducted > 0) {
    input.employmentTaxDeducted = (input.employmentTaxDeducted || 0) + cisTaxDeducted
  }

  // Add pension tax deducted
  if (pensionTaxDeducted > 0) {
    input.employmentTaxDeducted = (input.employmentTaxDeducted || 0) + pensionTaxDeducted
  }

  return input
}

/**
 * Convert HMRC TaxCalculationResult to wizard's TaxCalculation interface
 *
 * The wizard UI expects values in pence (for formatCurrency display).
 * The HMRC calculator returns values in pounds.
 */
function convertResultToWizardFormat(
  result: TaxCalculationResult,
  data: WizardData
): TaxCalculation {
  // Helper to convert pounds to pence
  const toPence = (pounds: number): number => Math.round(pounds * 100)

  // Calculate income breakdowns from wizard data (already in pounds)
  let selfEmploymentIncome = 0
  let employmentIncome = 0
  let rentalIncome = 0
  let cisIncome = 0
  let dividendsIncome = 0
  let interestIncome = 0
  let pensionIncome = 0
  let stateBenefitsIncome = 0
  let capitalGainsIncome = 0
  let totalExpenses = 0
  let capitalAllowances = 0
  let tradingAllowanceUsed = 0

  // Self-employment
  const selfEmploymentSources = data.incomeSources.filter((s) => s.type === 'self-employment')
  for (const business of selfEmploymentSources) {
    const businessData = data.selfEmploymentData[business.id]
    if (businessData) {
      selfEmploymentIncome += businessData.income?.total || 0
      totalExpenses += businessData.expenses?.total || 0
      capitalAllowances += businessData.capitalAllowances?.total || 0
      // Trading allowance applied if no expenses
      const incomeTotal = businessData.income?.total || 0
      if (incomeTotal > 0 && !businessData.expenses?.total && !businessData.capitalAllowances?.total) {
        tradingAllowanceUsed = Math.min(incomeTotal, 1000)
      }
    }
  }

  // Employment
  const employmentSources = data.incomeSources.filter((s) => s.type === 'employment')
  for (const employer of employmentSources) {
    const employerData = data.employmentData[employer.id]
    if (employerData) {
      employmentIncome += employerData.payReceived || 0
      employmentIncome += employerData.companyCarBenefit || 0
      employmentIncome += employerData.fuelBenefit || 0
      employmentIncome += employerData.medicalInsuranceBenefit || 0
      employmentIncome += employerData.otherBenefits || 0
      employmentIncome += employerData.tipsReceived || 0
      if (employerData.claimingExpenses) {
        totalExpenses += employerData.travelExpenses || 0
        totalExpenses += employerData.professionalFees || 0
        totalExpenses += employerData.workingFromHome || 0
        totalExpenses += employerData.otherExpenses || 0
      }
    }
  }

  // Rental
  const rentalSources = data.incomeSources.filter((s) => s.type === 'rental')
  for (const property of rentalSources) {
    const propertyData = data.rentalData[property.id]
    if (propertyData) {
      const ownershipShare = (propertyData.ownershipShare || 100) / 100
      rentalIncome += (propertyData.income?.total || 0) * ownershipShare
      totalExpenses += (propertyData.expenses?.total || 0) * ownershipShare
    }
  }

  // CIS
  if (data.cisData) {
    cisIncome = data.cisData.totalGross || data.cisData.totalGrossPayments || 0
    totalExpenses += data.cisData.expenses || 0
  }

  // Dividends
  if (data.dividendsData) {
    dividendsIncome =
      (data.dividendsData.ukDividends || 0) +
      (data.dividendsData.foreignDividends || 0) +
      (data.dividendsData.stockDividends || 0)
  } else if (data.otherIncome?.dividends) {
    dividendsIncome = data.otherIncome.dividends
  }

  // Interest
  if (data.interestData) {
    interestIncome =
      (data.interestData.untaxedUKInterest || 0) +
      (data.interestData.untaxedForeignInterest || 0) +
      (data.interestData.taxedUKInterest || 0) +
      (data.interestData.giltsInterest || 0)
  } else if (data.otherIncome?.interest) {
    interestIncome = data.otherIncome.interest
  }

  // Pension
  if (data.pensionIncomeData) {
    pensionIncome =
      (data.pensionIncomeData.statePension || 0) +
      (data.pensionIncomeData.statePensionLumpSum || 0) +
      (data.pensionIncomeData.privatePensions?.reduce((sum, p) => sum + (p.pensionAmount || 0), 0) || 0)
  } else if (data.otherIncome?.pension) {
    pensionIncome = data.otherIncome.pension
  }

  // State benefits
  if (data.stateBenefitsData) {
    stateBenefitsIncome =
      (data.stateBenefitsData.jobseekersAllowance || 0) +
      (data.stateBenefitsData.employmentSupportAllowance || 0) +
      (data.stateBenefitsData.carersAllowance || 0) +
      (data.stateBenefitsData.bereavementAllowance || 0) +
      (data.stateBenefitsData.incapacityBenefit || 0) +
      (data.stateBenefitsData.statePension || 0) +
      (data.stateBenefitsData.otherTaxableBenefits || 0)
  } else if (data.otherIncome?.stateBenefits) {
    stateBenefitsIncome = data.otherIncome.stateBenefits
  }

  // Capital gains
  capitalGainsIncome = result.totalCapitalGains

  // Tax already paid
  const payeTaxDeducted = result.taxDeductedAtSource
  const cisDeductions = data.cisData?.totalDeductions || data.cisData?.totalCISDeductions || 0

  // Marriage allowance (£252 tax reduction when receiving)
  const marriageAllowanceType = data.general?.marriageAllowance?.type || data.general?.marriageAllowance?.transferType
  const marriageAllowanceRelief = marriageAllowanceType === 'receive' ? 252 : 0

  // Pension relief (already factored into tax calculation via band extension)
  // For display, we approximate the additional relief beyond basic rate
  const pensionContributions = data.general?.pension?.personalContributions || 0
  const pensionRelief = pensionContributions > 0 ? pensionContributions * 0.2 : 0

  // Gift Aid relief (already in giftAidExtension)
  const giftAidRelief = result.giftAidExtension * 0.2

  // Venture capital relief
  const ventureCapitalRelief =
    (data.general?.ventureCapital?.eisInvestments || 0) * 0.3 +
    (data.general?.ventureCapital?.seisInvestments || 0) * 0.5 +
    (data.general?.ventureCapital?.vctInvestments || 0) * 0.3

  // Calculate total income
  const totalIncome = result.totalIncome

  // Blind Person's Allowance
  const blindAllowance = data.general?.blindAllowance?.registeredBlind ? 3070 : 0

  // Personal Savings Allowance (already handled in HMRC calc, get effective amount)
  const personalSavingsAllowance =
    result.totalTaxableIncome <= 37700 ? 1000 : result.totalTaxableIncome <= 125140 ? 500 : 0

  // Student loan info
  let studentLoanPlanType: '1' | '2' | '4' | 'postgrad' | undefined
  let studentLoanDeducted = 0
  for (const employer of employmentSources) {
    const employerData = data.employmentData[employer.id]
    if (employerData?.hasStudentLoan && employerData.studentLoanPlanType) {
      studentLoanPlanType = employerData.studentLoanPlanType
      studentLoanDeducted += employerData.studentLoanDeducted || 0
    }
  }

  // Calculate totals
  const totalTaxDue = result.totalIncomeTax + result.landlordLoanInterestRelief // Add back LLIR for display
  const totalNICDue = result.totalNIC
  const totalCGTDue = result.totalCGT
  const studentLoanDue = result.studentLoanRepayment + result.postgraduateLoanRepayment
  const studentLoanToPay = studentLoanDue // Already net of PAYE deductions in calculator

  // Net tax due or refund
  const netTaxDue = result.taxDueOrRefund
  const totalDue = Math.max(0, netTaxDue)
  const refundDue = netTaxDue < 0 ? Math.abs(netTaxDue) : undefined

  // Combine "other income" for display (state benefits + other misc)
  const otherIncomeTotal =
    dividendsIncome +
    interestIncome +
    pensionIncome +
    stateBenefitsIncome +
    (data.otherIncome?.other || 0)

  return {
    // Income (all converted to pence)
    totalIncome: toPence(totalIncome),
    selfEmploymentIncome: toPence(selfEmploymentIncome),
    employmentIncome: toPence(employmentIncome),
    rentalIncome: toPence(rentalIncome),
    otherIncome: toPence(otherIncomeTotal),

    // Detailed income breakdowns
    cisIncome: toPence(cisIncome),
    dividendsIncome: toPence(dividendsIncome),
    interestIncome: toPence(interestIncome),
    pensionIncome: toPence(pensionIncome),
    stateBenefitsIncome: toPence(stateBenefitsIncome),
    capitalGainsIncome: toPence(capitalGainsIncome),

    // Expenses & Deductions
    totalExpenses: toPence(totalExpenses),
    allowableExpenses: toPence(totalExpenses),
    capitalAllowances: toPence(capitalAllowances),
    tradingAllowance: toPence(tradingAllowanceUsed),

    // Reliefs & Allowances
    pensionRelief: toPence(pensionRelief),
    giftAidRelief: toPence(giftAidRelief),
    ventureCapitalRelief: toPence(ventureCapitalRelief),
    marriageAllowance: toPence(marriageAllowanceRelief),
    blindAllowance: toPence(blindAllowance),
    personalSavingsAllowance: toPence(personalSavingsAllowance),
    section24Relief: toPence(result.landlordLoanInterestRelief),

    // Tax Calculation
    taxableIncome: toPence(result.totalTaxableIncome + result.effectivePersonalAllowance),
    personalAllowance: toPence(result.effectivePersonalAllowance),
    taxableAfterAllowance: toPence(result.totalTaxableIncome),

    // Tax Bands
    basicRateTax: toPence(result.taxOnNonSavings * 0.5), // Approximate split
    higherRateTax: toPence(result.taxOnNonSavings * 0.5), // Approximate split
    additionalRateTax: toPence(0), // Would need detailed breakdown
    savingsInterestTax: toPence(result.taxOnSavings),
    dividendTax: toPence(result.taxOnDividends),

    // National Insurance
    class2NIC: toPence(result.class2NIC),
    class4NIC: toPence(result.class4NIC),

    // Capital Gains Tax
    cgtBasicRateTax: toPence(result.cgtAtBasicRate),
    cgtHigherRateTax: toPence(result.cgtAtHigherRate),
    totalCGTDue: toPence(totalCGTDue),

    // Student Loan
    studentLoanDue: toPence(studentLoanDue),
    studentLoanDeducted: toPence(studentLoanDeducted),
    studentLoanToPay: toPence(studentLoanToPay),
    studentLoanPlanType,

    // Tax Already Paid
    payeTaxDeducted: toPence(payeTaxDeducted),
    cisDeductions: toPence(cisDeductions),
    taxAlreadyPaid: toPence(result.taxDeductedAtSource),

    // Final Totals
    totalTaxDue: toPence(result.totalIncomeTax),
    totalNICDue: toPence(totalNICDue),
    totalDue: toPence(totalDue),
    refundDue: refundDue !== undefined ? toPence(refundDue) : undefined,

    // Additional HMRC calculator fields
    hicbcCharge: result.hicbcCharge > 0 ? toPence(result.hicbcCharge) : undefined,
    adjustedNetIncome: toPence(result.adjustedNetIncome),
  }
}

/**
 * Calculate tax using the HMRC-compliant calculator
 *
 * This is the main function to be used by the wizard.
 * It maps wizard data to HMRC input, runs the calculation,
 * and converts the result back to the wizard's expected format.
 */
export function calculateTaxForWizard(data: WizardData): TaxCalculation {
  // Map wizard data to HMRC calculator input
  const input = mapWizardToTaxInput(data)

  // Run the HMRC-compliant calculation
  const result = calculateTax(input)

  // Convert result to wizard format
  return convertResultToWizardFormat(result, data)
}
