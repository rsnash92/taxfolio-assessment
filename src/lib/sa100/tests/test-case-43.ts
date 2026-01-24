/**
 * HMRC Test Case 43 - Tax Calculator Validation
 *
 * Complex test case covering:
 * - Personal Allowance taper (income >£100k)
 * - Blind Person's Allowance (BPA) - not subject to taper
 * - No Personal Savings Allowance (additional rate taxpayer)
 * - Dividend Allowance at higher/additional rate
 * - CGT with BADR at 10% and other gains at 20%
 *
 * Test Case 43 Input Data:
 * - Employment income: £101,000 + £13,000 benefits - £175 expenses = £113,825
 * - Savings (taxed interest): £3,678
 * - Dividends: £12,750
 * - BPA: £3,070
 * - BADR gains: £20,000
 * - Other CGT gains: £30,000 gross (£27,000 after AEA)
 * - PAYE deducted: £23,084
 *
 * Expected HMRC Results:
 * - Total income: £130,253
 * - Personal Allowance: £0 (fully tapered)
 * - BPA: £3,070
 * - Taxable income: £127,183
 * - Income Tax: £42,481.98
 * - Tax deducted: £23,084.00
 * - Income Tax due: £19,397.98
 * - CGT: £7,400.00
 * - Total Tax Due: £26,797.98
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from '../tax-calculator'

// =============================================================================
// Test Case 43 Input
// =============================================================================

const testCase43Input: TaxCalculationInput = {
  // UK resident, not Scottish (uses standard UK rates)
  status: 'U',

  // Employment income
  // Gross pay £101,000 + benefits £13,000 - expenses £175 = £113,825
  employmentIncome: 113825,
  employmentTaxDeducted: 23084,

  // Savings income (taxed UK interest)
  taxedInterest: 3678,

  // Dividend income
  ukDividends: 12750,

  // Blind Person's Allowance
  blindPersonsAllowance: true,

  // Capital Gains
  // BADR gains: £20,000
  badrQualifyingGains: 20000,
  // Other gains: £27,000 taxable (after AEA), so gross = £30,000
  // Total non-residential = BADR + other = £20,000 + £30,000 = £50,000
  capitalGainsNonResidential: 50000,

  // Marriage Allowance transfer OUT is blocked due to high income
  // (income > basic rate limit means you can't transfer)
  // marriageAllowanceTransferred: false, // Not set - blocked

  // No Class 4 NIC as this is employment income only
}

// =============================================================================
// Run Test
// =============================================================================

function runTestCase43(): void {
  console.log('='.repeat(80))
  console.log('HMRC Test Case 43 - High Earner with PA Taper, BPA, Savings, Dividends, CGT')
  console.log('Tax Year: 2024-25')
  console.log('='.repeat(80))
  console.log('')

  // Run the calculator
  const result = calculateTax(testCase43Input)

  console.log('INPUT:')
  console.log('-'.repeat(40))
  console.log(`  Status: ${testCase43Input.status} (UK - not Scottish)`)
  console.log(`  Employment income: £${testCase43Input.employmentIncome?.toLocaleString()}`)
  console.log(`  Tax deducted (PAYE): £${testCase43Input.employmentTaxDeducted?.toLocaleString()}`)
  console.log(`  Taxed interest: £${testCase43Input.taxedInterest?.toLocaleString()}`)
  console.log(`  UK Dividends: £${testCase43Input.ukDividends?.toLocaleString()}`)
  console.log(`  Blind Person's Allowance: ${testCase43Input.blindPersonsAllowance}`)
  console.log(`  BADR gains: £${testCase43Input.badrQualifyingGains?.toLocaleString()}`)
  console.log(`  Total non-residential gains: £${testCase43Input.capitalGainsNonResidential?.toLocaleString()}`)
  console.log('')

  console.log('CALCULATION BREAKDOWN:')
  console.log('-'.repeat(40))
  console.log('')

  // Income breakdown
  console.log('INCOME:')
  console.log(`  Non-savings income: £${result.totalNonSavingsIncome.toLocaleString()}`)
  console.log(`  Savings income: £${result.totalSavingsIncome.toLocaleString()}`)
  console.log(`  Dividend income: £${result.totalDividendIncome.toLocaleString()}`)
  console.log(`  Total income: £${result.totalIncome.toLocaleString()}`)
  console.log('')

  // Allowances
  console.log('ALLOWANCES:')
  console.log(`  Standard PA before taper: £${TAX_PARAMETERS_2024_25.allowances.P_A.toLocaleString()}`)
  console.log(`  BPA: £${TAX_PARAMETERS_2024_25.allowances.BPA.toLocaleString()}`)
  console.log(`  Total PA (including BPA): £${result.personalAllowance.toLocaleString()}`)
  console.log(`  PA reduction (taper): £${result.personalAllowanceReduction.toLocaleString()}`)
  console.log(`  Effective PA: £${result.effectivePersonalAllowance.toLocaleString()}`)
  console.log('')

  // Adjusted Net Income calculation
  console.log('ADJUSTED NET INCOME (for PA taper):')
  console.log(`  Total income: £${result.totalIncome.toLocaleString()}`)
  console.log(`  ANI: £${result.adjustedNetIncome.toLocaleString()}`)
  console.log(`  Excess over £100,000: £${Math.max(0, result.adjustedNetIncome - 100000).toLocaleString()}`)
  console.log(`  PA reduction (excess / 2): £${result.personalAllowanceReduction.toLocaleString()}`)
  console.log('')

  // Taxable income
  console.log('TAXABLE INCOME:')
  console.log(`  Taxable non-savings: £${result.taxableNonSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable savings: £${result.taxableSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable dividends: £${result.taxableDividendIncome.toLocaleString()}`)
  console.log(`  Total taxable: £${result.totalTaxableIncome.toLocaleString()}`)
  console.log('')

  // Income tax breakdown
  console.log('INCOME TAX:')
  console.log(`  Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
  console.log(`  Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
  console.log(`  Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
  console.log(`  Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
  console.log('')

  // Tax deducted
  console.log('TAX DEDUCTED:')
  console.log(`  Tax deducted at source (PAYE): £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log('')

  // Capital Gains
  console.log('CAPITAL GAINS:')
  console.log(`  Total gains: £${result.totalCapitalGains.toLocaleString()}`)
  console.log(`  Losses used: £${result.capitalLossesUsed.toLocaleString()}`)
  console.log(`  Taxable gains (after AEA): £${result.taxableCapitalGains.toLocaleString()}`)
  console.log(`  CGT at basic rate (10%): £${result.cgtAtBasicRate.toFixed(2)} (on £${result.cgtBasicRateAmount.toLocaleString()})`)
  console.log(`  CGT at higher rate (20%): £${result.cgtAtHigherRate.toFixed(2)} (on £${result.cgtHigherRateAmount.toLocaleString()})`)
  console.log(`  Total CGT: £${result.totalCGT.toFixed(2)}`)
  console.log('')

  // Final totals
  console.log('FINAL POSITION:')
  console.log(`  Total tax & NIC due: £${result.totalTaxAndNICDue.toFixed(2)}`)
  console.log(`  Total tax paid: £${result.totalTaxPaid.toFixed(2)}`)
  console.log(`  Tax due/refund: £${result.taxDueOrRefund.toFixed(2)}`)
  console.log('')

  // SA110 values
  console.log('SA110 VALUES:')
  console.log(`  Total tax etc due (CAL1): £${result.sa110.totalTaxEtcDue}`)
  if (result.sa110.capitalGainsTaxDue) {
    console.log(`  CGT due: £${result.sa110.capitalGainsTaxDue}`)
  }
  console.log('')

  // ==========================================================================
  // Compare with HMRC expected values
  // ==========================================================================
  console.log('COMPARISON WITH HMRC EXPECTED VALUES:')
  console.log('='.repeat(80))
  console.log('')

  let passCount = 0
  let failCount = 0
  const failures: string[] = []

  const comparisons: Array<{
    key: string
    actual: number
    expected: number
    description: string
    tolerance?: number
  }> = [
    // Income
    { key: 'totalIncome', actual: result.totalIncome, expected: 130253, description: 'Total income' },

    // PA and BPA
    {
      key: 'personalAllowance',
      actual: result.personalAllowance,
      expected: 15640, // £12,570 PA + £3,070 BPA
      description: 'Total PA (including BPA)',
    },
    {
      key: 'paReduction',
      actual: result.personalAllowanceReduction,
      expected: 12570, // Full standard PA tapered away
      description: 'PA reduction (taper)',
    },
    {
      key: 'effectivePA',
      actual: result.effectivePersonalAllowance,
      expected: 3070, // Only BPA remains
      description: 'Effective PA (BPA only)',
    },

    // Taxable income
    {
      key: 'totalTaxableIncome',
      actual: result.totalTaxableIncome,
      expected: 127183, // £130,253 - £3,070 BPA
      description: 'Total taxable income',
    },

    // Tax on each type
    {
      key: 'taxOnNonSavings',
      actual: result.taxOnNonSavings,
      expected: 36762, // £7,540 BR + £29,222 HR = £36,762
      description: 'Tax on non-savings',
      tolerance: 1,
    },
    {
      key: 'taxOnSavings',
      actual: result.taxOnSavings,
      expected: 1471.2, // £3,678 × 40%
      description: 'Tax on savings (all HR, no PSA)',
      tolerance: 0.5,
    },
    {
      key: 'taxOnDividends',
      actual: result.taxOnDividends,
      expected: 4248.78, // £500 DA @0% + £10,207 @33.75% + £2,043 @39.35%
      description: 'Tax on dividends',
      tolerance: 1,
    },

    // Total income tax
    {
      key: 'totalIncomeTax',
      actual: result.totalIncomeTax,
      expected: 42481.98,
      description: 'Total income tax',
      tolerance: 2,
    },

    // Tax deducted
    { key: 'taxDeducted', actual: result.taxDeductedAtSource, expected: 23084, description: 'Tax deducted (PAYE)' },

    // CGT
    { key: 'totalCGT', actual: result.totalCGT, expected: 7400, description: 'Total CGT' },

    // Final tax due (income tax after deductions + CGT)
    {
      key: 'totalTaxDue',
      actual: result.sa110.totalTaxEtcDue,
      expected: 26798, // £42,481.98 - £23,084 + £7,400 = £26,797.98 ≈ £26,798
      description: 'Total Tax Due',
      tolerance: 1,
    },
  ]

  for (const { actual, expected, description, tolerance = 0.5 } of comparisons) {
    const diff = Math.abs(actual - expected)
    const pass = diff <= tolerance

    if (pass) {
      console.log(`  ✅ PASS: ${description}`)
      console.log(`          Expected: £${expected.toLocaleString()} | Actual: £${actual.toFixed(2)}`)
      passCount++
    } else {
      console.log(`  ❌ FAIL: ${description}`)
      console.log(`          Expected: £${expected.toLocaleString()} | Actual: £${actual.toFixed(2)} | Diff: £${diff.toFixed(2)}`)
      failures.push(`${description}: expected £${expected}, got £${actual.toFixed(2)} (diff: £${diff.toFixed(2)})`)
      failCount++
    }
    console.log('')
  }

  // Summary
  console.log('='.repeat(80))
  console.log('SUMMARY:')
  console.log(`  Passed: ${passCount}/${comparisons.length}`)
  console.log(`  Failed: ${failCount}/${comparisons.length}`)

  if (failures.length > 0) {
    console.log('')
    console.log('FAILURES:')
    for (const failure of failures) {
      console.log(`  - ${failure}`)
    }
  }

  console.log('')
  console.log('='.repeat(80))

  // Additional analysis for debugging
  if (failCount > 0) {
    console.log('')
    console.log('DETAILED ANALYSIS (for debugging):')
    console.log('-'.repeat(40))
    console.log('')

    // PA Taper analysis
    console.log('PA TAPER CALCULATION:')
    console.log(`  ANI: £${result.adjustedNetIncome.toLocaleString()}`)
    console.log(`  PA taper threshold: £100,000`)
    console.log(`  Excess: £${Math.max(0, result.adjustedNetIncome - 100000).toLocaleString()}`)
    console.log(`  Reduction (excess / 2): £${Math.floor(Math.max(0, result.adjustedNetIncome - 100000) / 2).toLocaleString()}`)
    console.log(`  Standard PA: £12,570`)
    console.log(`  Remaining standard PA: £${Math.max(0, 12570 - Math.floor(Math.max(0, result.adjustedNetIncome - 100000) / 2)).toLocaleString()}`)
    console.log(`  BPA (not tapered): £3,070`)
    console.log('')

    // Band allocation
    console.log('BAND ALLOCATION:')
    console.log(`  Basic rate band: £37,700`)
    console.log(`  Higher rate ceiling: £125,140`)
    console.log('')

    // Non-savings breakdown
    const taxableNonSavings = result.taxableNonSavingsIncome
    const basicRateNS = Math.min(taxableNonSavings, 37700)
    const higherRateNS = Math.max(0, taxableNonSavings - 37700)
    console.log('NON-SAVINGS TAX:')
    console.log(`  Taxable non-savings: £${taxableNonSavings.toLocaleString()}`)
    console.log(`  In basic rate band: £${basicRateNS.toLocaleString()} × 20% = £${(basicRateNS * 0.2).toFixed(2)}`)
    console.log(`  In higher rate band: £${higherRateNS.toLocaleString()} × 40% = £${(higherRateNS * 0.4).toFixed(2)}`)
    console.log(`  Expected: £7,540 (BR) + £29,222 (HR) = £36,762`)
    console.log('')

    // Savings analysis
    console.log('SAVINGS TAX:')
    console.log(`  Taxable savings: £${result.taxableSavingsIncome.toLocaleString()}`)
    console.log(`  PSA: £0 (additional rate taxpayer, total income > £125,140)`)
    console.log(`  All at 40% = £${(result.taxableSavingsIncome * 0.4).toFixed(2)}`)
    console.log('')

    // Dividend analysis
    console.log('DIVIDEND TAX:')
    console.log(`  Taxable dividends: £${result.taxableDividendIncome.toLocaleString()}`)
    console.log(`  Dividend Allowance: £500 @ 0%`)
    const incomeBeforeDividends = result.taxableNonSavingsIncome + result.taxableSavingsIncome
    console.log(`  Income before dividends: £${incomeBeforeDividends.toLocaleString()}`)
    const spaceInHigherBand = Math.max(0, 125140 - incomeBeforeDividends)
    console.log(`  Space in higher rate band (to £125,140): £${spaceInHigherBand.toLocaleString()}`)
    const divAfterDA = result.taxableDividendIncome - 500
    const divInHigher = Math.min(divAfterDA, Math.max(0, spaceInHigherBand - 500))
    const divInAdditional = Math.max(0, divAfterDA - divInHigher)
    console.log(`  Dividends after DA: £${divAfterDA.toLocaleString()}`)
    console.log(`  In higher rate: £${divInHigher.toLocaleString()} × 33.75% = £${(divInHigher * 0.3375).toFixed(2)}`)
    console.log(`  In additional rate: £${divInAdditional.toLocaleString()} × 39.35% = £${(divInAdditional * 0.3935).toFixed(2)}`)
    console.log('')

    // CGT analysis
    console.log('CGT CALCULATION:')
    console.log(`  BADR gains: £20,000 × 10% = £2,000`)
    console.log(`  Other gains (after AEA): £27,000`)
    console.log(`  Remaining basic rate band for CGT: £${Math.max(0, 37700 - result.totalTaxableIncome).toLocaleString()}`)
    console.log(`  Other gains at 20% (no BR remaining): £27,000 × 20% = £5,400`)
    console.log(`  Total CGT expected: £7,400`)
    console.log('')
  }
}

// Run the test
runTestCase43()
