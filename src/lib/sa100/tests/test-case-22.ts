/**
 * HMRC Test Case 22 - Tax Calculator Validation
 *
 * Scenario: High Earner with Employment, Self-Employment, Savings, and Dividends
 * Tests full PA taper, additional rate taxation, and Class 4 NIC with Class 1 adjustment.
 *
 * Key features tested:
 * - Full Personal Allowance taper (income > £125,140, PA = £0)
 * - Basic, higher, and additional rate non-savings tax
 * - Savings at additional rate (45%) with £0 PSA
 * - Dividends at additional rate (39.35%) with £500 DA at 0%
 * - Class 4 NIC with Class 1 NIC adjustment
 * - Class 2 NIC (registered, treated as paid)
 *
 * Test Case 22 Input Data:
 * - Employment income: £103,656 (£104,239 - £583 expenses)
 * - Employment tax deducted: £30,043.20
 * - Class 1 NIC paid: £3,016.00
 * - Self-employment profit: £21,875
 * - Taxed interest: £81 (gross)
 * - Untaxed interest: £55
 * - Interest tax deducted: £16.25
 * - UK dividends: £3,513
 * - Class 2 NIC: Registered (treated as paid)
 *
 * Expected HMRC Results:
 * - Total income: £129,180
 * - Personal Allowance: £0 (fully tapered)
 * - Income Tax charged: £43,938.76
 * - Class 4 NIC: £186.10
 * - Tax deducted: £30,059.45
 * - Total due: £14,065.41
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from '../tax-calculator'

// =============================================================================
// Test Case 22 Input
// =============================================================================

const testCase22Input: TaxCalculationInput = {
  // England (not Scottish)
  status: 'E',

  // Employment income (SA102)
  // Gross pay £104,239, allowable expenses £583, net = £103,656
  employmentIncome: 103656,
  employmentTaxDeducted: 30043.20,

  // Primary Class 1 NIC paid (for Class 4 adjustment)
  primaryClass1NIC: 3016.00,

  // Self-employment profit (SA103S Box 31)
  selfEmploymentProfits: 21875,

  // Savings interest
  // Taxed interest: £81 gross (tax deducted £16.25)
  // Untaxed interest: £55
  // Total: £136
  taxedInterest: 81,
  untaxedInterest: 55,
  taxedInterestTaxDeducted: 16.25,

  // Dividends
  ukDividends: 3513,

  // Class 2 NIC - registered (treated as paid)
  class2NICRegistered: true,

  // Everything else zero
  pensionIncome: 0,
  statePension: 0,
  propertyIncome: 0,
  otherIncome: 0,
  giftAidDonations: 0,
  pensionContributions: 0,
  capitalGainsNonResidential: 0,
  capitalGainsResidential: 0,
  capitalLossesInYear: 0,
  capitalLossesBroughtForward: 0,
}

// =============================================================================
// Run Test
// =============================================================================

function runTestCase22(): void {
  console.log('='.repeat(80))
  console.log('HMRC Test Case 22 - High Earner with Employment, SE, Savings, Dividends')
  console.log('Tax Year: 2024-25')
  console.log('='.repeat(80))
  console.log('')

  // Run the calculator
  const result = calculateTax(testCase22Input)

  console.log('INPUT:')
  console.log('-'.repeat(40))
  console.log(`  Status: ${testCase22Input.status} (England)`)
  console.log(`  Employment income: £${testCase22Input.employmentIncome?.toLocaleString()}`)
  console.log(`  Employment tax deducted: £${testCase22Input.employmentTaxDeducted?.toLocaleString()}`)
  console.log(`  Primary Class 1 NIC: £${testCase22Input.primaryClass1NIC?.toLocaleString()}`)
  console.log(`  Self-employment profit: £${testCase22Input.selfEmploymentProfits?.toLocaleString()}`)
  console.log(`  Taxed interest (gross): £${testCase22Input.taxedInterest?.toLocaleString()}`)
  console.log(`  Untaxed interest: £${testCase22Input.untaxedInterest?.toLocaleString()}`)
  console.log(`  Interest tax deducted: £${testCase22Input.taxedInterestTaxDeducted?.toLocaleString()}`)
  console.log(`  UK dividends: £${testCase22Input.ukDividends?.toLocaleString()}`)
  console.log(`  Class 2 registered: ${testCase22Input.class2NICRegistered}`)
  console.log('')

  console.log('CALCULATION BREAKDOWN:')
  console.log('-'.repeat(40))
  console.log('')

  // Income breakdown
  console.log('INCOME:')
  console.log(`  Employment: £${testCase22Input.employmentIncome?.toLocaleString()}`)
  console.log(`  Self-employment: £${testCase22Input.selfEmploymentProfits?.toLocaleString()}`)
  console.log(`  Non-savings total: £${result.totalNonSavingsIncome.toLocaleString()}`)
  console.log(`  Savings: £${result.totalSavingsIncome.toLocaleString()}`)
  console.log(`  Dividends: £${result.totalDividendIncome.toLocaleString()}`)
  console.log(`  Total income: £${result.totalIncome.toLocaleString()}`)
  console.log('')

  // Personal Allowance
  console.log('PERSONAL ALLOWANCE:')
  console.log(`  Standard PA: £${result.personalAllowance.toLocaleString()}`)
  console.log(`  PA reduction (taper): £${result.personalAllowanceReduction.toLocaleString()}`)
  console.log(`  Effective PA: £${result.effectivePersonalAllowance.toLocaleString()}`)
  console.log('')

  // Taxable income
  console.log('TAXABLE INCOME:')
  console.log(`  Taxable non-savings: £${result.taxableNonSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable savings: £${result.taxableSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable dividends: £${result.taxableDividendIncome.toLocaleString()}`)
  console.log(`  Total taxable: £${result.totalTaxableIncome.toLocaleString()}`)
  console.log('')

  // Tax breakdown
  console.log('TAX CALCULATION:')
  console.log(`  Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
  console.log(`  Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
  console.log(`  Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
  console.log(`  Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
  console.log('')

  // NIC
  console.log('NATIONAL INSURANCE:')
  console.log(`  Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
  console.log(`  Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
  console.log(`  Total NIC: £${result.totalNIC.toFixed(2)}`)
  console.log('')

  // Tax deducted
  console.log('TAX DEDUCTED:')
  console.log(`  Employment tax: £${testCase22Input.employmentTaxDeducted?.toLocaleString()}`)
  console.log(`  Interest tax: £${testCase22Input.taxedInterestTaxDeducted?.toLocaleString()}`)
  console.log(`  Total tax deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log('')

  // Final totals
  console.log('FINAL POSITION:')
  console.log(`  Income tax charged: £${result.totalIncomeTax.toFixed(2)}`)
  console.log(`  Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
  console.log(`  Tax + Class 4: £${(result.totalIncomeTax + result.class4NIC).toFixed(2)}`)
  console.log(`  Less tax deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log(`  Amount due: £${(result.totalIncomeTax + result.class4NIC - result.taxDeductedAtSource).toFixed(2)}`)
  console.log('')

  // SA110 values
  console.log('SA110 VALUES:')
  console.log(`  Total tax etc due (CAL1): £${result.sa110.totalTaxEtcDue}`)
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
    { key: 'totalIncome', actual: result.totalIncome, expected: 129180, description: 'Total income' },

    // Personal Allowance
    {
      key: 'effectivePA',
      actual: result.effectivePersonalAllowance,
      expected: 0,
      description: 'Effective PA (fully tapered)',
    },

    // Taxable income
    {
      key: 'totalTaxableIncome',
      actual: result.totalTaxableIncome,
      expected: 129180,
      description: 'Total taxable income',
    },

    // Tax on non-savings
    // £37,700 × 20% = £7,540
    // £87,440 × 40% = £34,976
    // £391 × 45% = £175.95
    // Total: £42,691.95
    {
      key: 'taxOnNonSavings',
      actual: result.taxOnNonSavings,
      expected: 42691.95,
      description: 'Tax on non-savings (pay + SE profit)',
      tolerance: 1,
    },

    // Tax on savings (all at additional rate 45%)
    // £136 × 45% = £61.20
    {
      key: 'taxOnSavings',
      actual: result.taxOnSavings,
      expected: 61.20,
      description: 'Tax on savings (45% AR)',
      tolerance: 0.5,
    },

    // Tax on dividends
    // £500 DA at 0% = £0
    // £3,013 × 39.35% = £1,185.61 (rounded)
    {
      key: 'taxOnDividends',
      actual: result.taxOnDividends,
      expected: 1185.61,
      description: 'Tax on dividends (39.35% AR)',
      tolerance: 0.5,
    },

    // Total income tax
    {
      key: 'totalIncomeTax',
      actual: result.totalIncomeTax,
      expected: 43938.76,
      description: 'Total Income Tax charged',
      tolerance: 1,
    },

    // Class 4 NIC
    // Note: Complex calculation with Class 1 adjustment
    // Expected: £186.10
    {
      key: 'class4NIC',
      actual: result.class4NIC,
      expected: 186.10,
      description: 'Class 4 NIC (adjusted for Class 1)',
      tolerance: 1,
    },

    // Class 2 NIC (should be £0 as treated as paid)
    {
      key: 'class2NIC',
      actual: result.class2NIC,
      expected: 0,
      description: 'Class 2 NIC (registered, treated as paid)',
    },

    // Tax deducted
    {
      key: 'taxDeducted',
      actual: result.taxDeductedAtSource,
      expected: 30059.45,
      description: 'Total tax deducted',
      tolerance: 0.5,
    },

    // Total due
    {
      key: 'totalDue',
      actual: result.totalIncomeTax + result.class4NIC - result.taxDeductedAtSource,
      expected: 14065.41,
      description: 'Income Tax and Class 4 NIC due',
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

    // PA Taper Analysis
    console.log('PA TAPER ANALYSIS:')
    console.log(`  Total income: £${result.totalIncome}`)
    console.log(`  Threshold: £100,000`)
    console.log(`  Excess: £${Math.max(0, result.totalIncome - 100000)}`)
    console.log(`  PA reduction: £${Math.min(12570, Math.max(0, result.totalIncome - 100000) / 2)}`)
    console.log('')

    // Non-savings band allocation
    console.log('NON-SAVINGS BAND ALLOCATION:')
    const nonSavings = result.taxableNonSavingsIncome
    const basicBand = 37700
    const higherBandEnd = 125140
    const nonSavingsBasic = Math.min(nonSavings, basicBand)
    const nonSavingsHigher = Math.min(Math.max(0, nonSavings - basicBand), higherBandEnd - basicBand)
    const nonSavingsAdditional = Math.max(0, nonSavings - higherBandEnd)
    console.log(`  Taxable non-savings: £${nonSavings}`)
    console.log(`  At basic rate (20%): £${nonSavingsBasic} → £${(nonSavingsBasic * 0.2).toFixed(2)}`)
    console.log(`  At higher rate (40%): £${nonSavingsHigher} → £${(nonSavingsHigher * 0.4).toFixed(2)}`)
    console.log(`  At additional rate (45%): £${nonSavingsAdditional} → £${(nonSavingsAdditional * 0.45).toFixed(2)}`)
    console.log(`  Expected total: £${(nonSavingsBasic * 0.2 + nonSavingsHigher * 0.4 + nonSavingsAdditional * 0.45).toFixed(2)}`)
    console.log('')

    // Savings analysis
    console.log('SAVINGS ANALYSIS:')
    console.log(`  Taxable savings: £${result.taxableSavingsIncome}`)
    console.log(`  PSA (should be £0 at AR): £0`)
    console.log(`  All at additional rate (45%): £${(result.taxableSavingsIncome * 0.45).toFixed(2)}`)
    console.log('')

    // Dividend analysis
    console.log('DIVIDEND ANALYSIS:')
    console.log(`  Taxable dividends: £${result.taxableDividendIncome}`)
    console.log(`  Dividend allowance: £500 at 0%`)
    console.log(`  Remaining at AR (39.35%): £${result.taxableDividendIncome - 500} → £${((result.taxableDividendIncome - 500) * 0.3935).toFixed(2)}`)
    console.log('')

    // Class 4 NIC Analysis
    console.log('CLASS 4 NIC ANALYSIS:')
    const seProfit = testCase22Input.selfEmploymentProfits || 0
    const lowerLimit = TAX_PARAMETERS_2024_25.bands.NIC_LEL // £12,570
    const upperLimit = TAX_PARAMETERS_2024_25.bands.NIC_UEL // £50,270
    const mainRate = TAX_PARAMETERS_2024_25.rates.NIC_rate // 6%
    const reducedRate = TAX_PARAMETERS_2024_25.rates.NIC_supp_rate // 2%
    const employmentEarnings = testCase22Input.employmentIncome || 0
    const class1EarningsAboveThreshold = Math.max(0, Math.min(employmentEarnings, upperLimit) - lowerLimit)
    const profitsInMainBand = Math.min(seProfit, upperLimit) - lowerLimit
    console.log(`  SE profit: £${seProfit}`)
    console.log(`  Lower limit: £${lowerLimit}`)
    console.log(`  Upper limit: £${upperLimit}`)
    console.log(`  Profit in main band: £${profitsInMainBand}`)
    console.log(`  Employment earnings: £${employmentEarnings}`)
    console.log(`  Employment above threshold (capped at UEL): £${class1EarningsAboveThreshold}`)
    console.log('')
    console.log('  Class 4 NIC Calculation:')
    if (class1EarningsAboveThreshold >= profitsInMainBand) {
      console.log(`  All SE profit in main band covered by Class 1 → use reduced rate (2%)`)
      console.log(`  Class 4 = £${profitsInMainBand} × 2% = £${(profitsInMainBand * reducedRate).toFixed(2)}`)
    } else if (class1EarningsAboveThreshold > 0) {
      console.log(`  Partial overlap with Class 1`)
      console.log(`  Overlap amount: £${class1EarningsAboveThreshold} × 2% = £${(class1EarningsAboveThreshold * reducedRate).toFixed(2)}`)
      console.log(`  Non-overlap amount: £${profitsInMainBand - class1EarningsAboveThreshold} × 6% = £${((profitsInMainBand - class1EarningsAboveThreshold) * mainRate).toFixed(2)}`)
    } else {
      console.log(`  No Class 1 adjustment - standard 6% rate`)
      console.log(`  Class 4 = £${profitsInMainBand} × 6% = £${(profitsInMainBand * mainRate).toFixed(2)}`)
    }
    console.log('')
  }
}

// Run the test
runTestCase22()
