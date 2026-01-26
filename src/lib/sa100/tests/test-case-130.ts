/**
 * HMRC Test Case 130 - Tax Calculator Validation
 *
 * Scenario: Employment, Self-Employment, and Capital Gains Tax
 * Tests CGT basic rate band allocation when income partially uses the band.
 *
 * Key features tested:
 * - Basic income tax calculation (employment + SE)
 * - CGT with basic rate band partially used by income
 * - CGT split between 10% (basic) and 20% (higher) rates
 * - Class 4 NIC exemption (state pension age)
 * - No Class 2 NIC
 *
 * Test Case 130 Input Data:
 * - Employment income: £33,254
 * - Employment tax deducted: £4,136.80
 * - Self-employment profit: £4,000
 * - Capital gains (non-residential): £90,000 (before AEA)
 * - Class 4 exempt: Yes (state pension age)
 *
 * Expected HMRC Results:
 * - Total income: £37,254
 * - Personal Allowance: £12,570
 * - Taxable income: £24,684
 * - Income Tax charged: £4,936.80
 * - Tax deducted: £4,136.80
 * - Income Tax due: £800.00
 * - CGT at basic rate: £13,016 × 10% = £1,301.60
 * - CGT at higher rate: £73,984 × 20% = £14,796.80
 * - Total CGT: £16,098.40
 * - Total due: £16,898.40
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from '../tax-calculator'

// =============================================================================
// Test Case 130 Input
// =============================================================================

const testCase130Input: TaxCalculationInput = {
  // England (not Scottish)
  status: 'E',

  // Employment income (SA102)
  employmentIncome: 33254,
  employmentTaxDeducted: 4136.80,

  // Self-employment profit (SA103S Box 31)
  selfEmploymentProfits: 4000,

  // Capital Gains (SA108)
  // Proceeds: £99,000, Costs: £9,000, Gain: £90,000
  capitalGainsNonResidential: 90000,

  // NIC - Class 4 exempt (state pension age)
  class4Exempt: true,
  class2NICRegistered: true, // Treated as paid/exempt

  // Everything else zero
  untaxedInterest: 0,
  taxedInterest: 0,
  ukDividends: 0,
  pensionIncome: 0,
  statePension: 0,
  propertyIncome: 0,
  otherIncome: 0,
  giftAidDonations: 0,
  pensionContributions: 0,
  capitalGainsResidential: 0,
  capitalLossesInYear: 0,
  capitalLossesBroughtForward: 0,
}

// =============================================================================
// Run Test
// =============================================================================

function runTestCase130(): void {
  console.log('='.repeat(80))
  console.log('HMRC Test Case 130 - Employment, Self-Employment, and Capital Gains')
  console.log('Tax Year: 2024-25')
  console.log('='.repeat(80))
  console.log('')

  // Run the calculator
  const result = calculateTax(testCase130Input)

  console.log('INPUT:')
  console.log('-'.repeat(40))
  console.log(`  Status: ${testCase130Input.status} (England)`)
  console.log(`  Employment income: £${testCase130Input.employmentIncome?.toLocaleString()}`)
  console.log(`  Employment tax deducted: £${testCase130Input.employmentTaxDeducted?.toLocaleString()}`)
  console.log(`  Self-employment profit: £${testCase130Input.selfEmploymentProfits?.toLocaleString()}`)
  console.log(`  Capital gains (non-residential): £${testCase130Input.capitalGainsNonResidential?.toLocaleString()}`)
  console.log(`  Class 4 exempt: ${testCase130Input.class4Exempt}`)
  console.log('')

  console.log('CALCULATION BREAKDOWN:')
  console.log('-'.repeat(40))
  console.log('')

  // Income breakdown
  console.log('INCOME:')
  console.log(`  Employment: £${testCase130Input.employmentIncome?.toLocaleString()}`)
  console.log(`  Self-employment: £${testCase130Input.selfEmploymentProfits?.toLocaleString()}`)
  console.log(`  Total income: £${result.totalIncome.toLocaleString()}`)
  console.log('')

  // Personal Allowance
  console.log('PERSONAL ALLOWANCE:')
  console.log(`  Standard PA: £${result.personalAllowance.toLocaleString()}`)
  console.log(`  Effective PA: £${result.effectivePersonalAllowance.toLocaleString()}`)
  console.log('')

  // Taxable income
  console.log('TAXABLE INCOME:')
  console.log(`  Total taxable: £${result.totalTaxableIncome.toLocaleString()}`)
  console.log('')

  // Tax breakdown
  console.log('INCOME TAX CALCULATION:')
  console.log(`  Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
  console.log(`  Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
  console.log('')

  // Tax deducted
  console.log('TAX DEDUCTED:')
  console.log(`  Employment tax: £${testCase130Input.employmentTaxDeducted?.toLocaleString()}`)
  console.log(`  Total tax deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log('')

  // Income Tax due
  console.log('INCOME TAX DUE:')
  console.log(`  Income tax charged: £${result.totalIncomeTax.toFixed(2)}`)
  console.log(`  Less tax deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log(`  Income tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
  console.log('')

  // Capital Gains Tax breakdown
  console.log('CAPITAL GAINS TAX:')
  console.log(`  Total gains: £${result.totalCapitalGains.toLocaleString()}`)
  console.log(`  AEA: £${TAX_PARAMETERS_2024_25.cgt.annualExemptAmount.toLocaleString()}`)
  console.log(`  Taxable gains: £${result.taxableCapitalGains.toLocaleString()}`)
  console.log('')
  console.log('  Basic rate band allocation:')
  const basicRateBand = TAX_PARAMETERS_2024_25.bands.BR_band
  const usedByIncome = result.totalTaxableIncome
  const remainingForCGT = Math.max(0, basicRateBand - usedByIncome)
  console.log(`    Total basic rate band: £${basicRateBand.toLocaleString()}`)
  console.log(`    Used by income: £${usedByIncome.toLocaleString()}`)
  console.log(`    Remaining for CGT: £${remainingForCGT.toLocaleString()}`)
  console.log('')
  console.log(`  CGT at basic rate (10%): £${result.cgtBasicRateAmount.toLocaleString()} → £${result.cgtAtBasicRate.toFixed(2)}`)
  console.log(`  CGT at higher rate (20%): £${result.cgtHigherRateAmount.toLocaleString()} → £${result.cgtAtHigherRate.toFixed(2)}`)
  console.log(`  Total CGT: £${result.totalCGT.toFixed(2)}`)
  console.log('')

  // NIC
  console.log('NATIONAL INSURANCE:')
  console.log(`  Class 4 NIC: £${result.class4NIC.toFixed(2)} (exempt)`)
  console.log(`  Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
  console.log('')

  // Final totals
  console.log('FINAL POSITION:')
  console.log(`  Income tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
  console.log(`  CGT due: £${result.netCGTDue.toFixed(2)}`)
  console.log(`  Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
  console.log(`  Total due: £${(result.totalIncomeTax - result.taxDeductedAtSource + result.netCGTDue + result.class4NIC).toFixed(2)}`)
  console.log('')

  // SA110 values
  console.log('SA110 VALUES:')
  console.log(`  Total tax etc due (CAL1): £${result.sa110.totalTaxEtcDue}`)
  if (result.sa110.capitalGainsTaxDue) {
    console.log(`  Capital Gains Tax due: £${result.sa110.capitalGainsTaxDue}`)
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
    { key: 'totalIncome', actual: result.totalIncome, expected: 37254, description: 'Total income' },

    // Personal Allowance
    {
      key: 'personalAllowance',
      actual: result.effectivePersonalAllowance,
      expected: 12570,
      description: 'Personal Allowance',
    },

    // Taxable income
    {
      key: 'totalTaxableIncome',
      actual: result.totalTaxableIncome,
      expected: 24684,
      description: 'Total taxable income',
    },

    // Income Tax charged
    {
      key: 'incomeTaxCharged',
      actual: result.totalIncomeTax,
      expected: 4936.80,
      description: 'Income Tax charged',
      tolerance: 0.5,
    },

    // Tax deducted
    {
      key: 'taxDeducted',
      actual: result.taxDeductedAtSource,
      expected: 4136.80,
      description: 'Tax deducted',
      tolerance: 0.01,
    },

    // Income Tax due
    {
      key: 'incomeTaxDue',
      actual: result.totalIncomeTax - result.taxDeductedAtSource,
      expected: 800.00,
      description: 'Income Tax due',
      tolerance: 0.5,
    },

    // CGT basic rate portion
    {
      key: 'cgtBasicRateAmount',
      actual: result.cgtBasicRateAmount,
      expected: 13016,
      description: 'CGT at basic rate (amount)',
      tolerance: 1,
    },

    // CGT at basic rate (tax)
    {
      key: 'cgtAtBasicRate',
      actual: result.cgtAtBasicRate,
      expected: 1301.60,
      description: 'CGT at basic rate (10%)',
      tolerance: 0.5,
    },

    // CGT higher rate portion
    {
      key: 'cgtHigherRateAmount',
      actual: result.cgtHigherRateAmount,
      expected: 73984,
      description: 'CGT at higher rate (amount)',
      tolerance: 1,
    },

    // CGT at higher rate (tax)
    {
      key: 'cgtAtHigherRate',
      actual: result.cgtAtHigherRate,
      expected: 14796.80,
      description: 'CGT at higher rate (20%)',
      tolerance: 0.5,
    },

    // Total CGT
    {
      key: 'totalCGT',
      actual: result.totalCGT,
      expected: 16098.40,
      description: 'Total Capital Gains Tax',
      tolerance: 1,
    },

    // Class 4 NIC (should be £0 - exempt)
    {
      key: 'class4NIC',
      actual: result.class4NIC,
      expected: 0,
      description: 'Class 4 NIC (exempt)',
    },

    // Total due
    {
      key: 'totalDue',
      actual: result.totalIncomeTax - result.taxDeductedAtSource + result.netCGTDue + result.class4NIC,
      expected: 16898.40,
      description: 'Total tax due',
      tolerance: 2,
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

    // Basic rate band analysis
    console.log('BASIC RATE BAND ALLOCATION:')
    console.log(`  Total basic rate band: £${basicRateBand}`)
    console.log(`  Taxable income: £${result.totalTaxableIncome}`)
    console.log(`  Band used by income: £${Math.min(result.totalTaxableIncome, basicRateBand)}`)
    console.log(`  Band remaining for CGT: £${Math.max(0, basicRateBand - result.totalTaxableIncome)}`)
    console.log('')

    // CGT calculation detail
    console.log('CGT CALCULATION DETAIL:')
    const grossGains = testCase130Input.capitalGainsNonResidential || 0
    const aea = TAX_PARAMETERS_2024_25.cgt.annualExemptAmount
    const taxableGains = grossGains - aea
    const gainsAtBasic = Math.min(taxableGains, remainingForCGT)
    const gainsAtHigher = Math.max(0, taxableGains - remainingForCGT)
    console.log(`  Gross gains: £${grossGains}`)
    console.log(`  AEA: £${aea}`)
    console.log(`  Taxable gains: £${taxableGains}`)
    console.log(`  Remaining BR band: £${remainingForCGT}`)
    console.log(`  Gains at 10%: £${gainsAtBasic} → £${(gainsAtBasic * 0.10).toFixed(2)}`)
    console.log(`  Gains at 20%: £${gainsAtHigher} → £${(gainsAtHigher * 0.20).toFixed(2)}`)
    console.log(`  Expected total CGT: £${(gainsAtBasic * 0.10 + gainsAtHigher * 0.20).toFixed(2)}`)
    console.log('')
  }
}

// Run the test
runTestCase130()
