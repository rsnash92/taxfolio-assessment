/**
 * HMRC Test Case 10 - Tax Calculator Validation
 *
 * Scenario: Savings, Dividends, Pension Income with Gift Aid
 * Tests beneficial PA allocation, savings starting rate, PSA, and dividend allowance.
 *
 * Key features tested:
 * - Savings starting rate (0% on up to £5,000)
 * - Personal Savings Allowance (£500 for higher rate taxpayer)
 * - Dividend allowance (£500 at 0%)
 * - Gift Aid extending basic rate band
 * - PSA determination based on TOTAL taxable income (not just non-savings)
 * - Dividend spillover to higher rate
 *
 * IMPORTANT PSA RULE VALIDATED:
 * PSA is based on your HIGHEST marginal rate from TOTAL taxable income.
 * In this case, total taxable income (£40,811) exceeds the extended basic
 * rate band (£40,700), so the taxpayer is a higher rate taxpayer and
 * gets £500 PSA (not £1,000).
 *
 * Test Case 10 Input Data:
 * - Untaxed interest: £24,342
 * - UK dividends: £16,000
 * - State pension: £8,239
 * - Private pension: £4,800
 * - Pension tax deducted: £960
 * - Gift Aid donations: £2,400 (net)
 *
 * Expected HMRC Results:
 * - Total income: £53,381
 * - Taxable income: £40,811
 * - Income Tax charged: £5,339.99
 * - Tax deducted: £960.00
 * - Income Tax due: £4,379.99
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from '../tax-calculator'

// =============================================================================
// Test Case 10 Input
// =============================================================================

const testCase10Input: TaxCalculationInput = {
  // England (not Scottish)
  status: 'E',

  // Savings income
  untaxedInterest: 24342,

  // Dividend income
  ukDividends: 16000,

  // Pension income
  statePension: 8239,
  pensionIncome: 4800,

  // Tax deducted from pensions (passed via employmentTaxDeducted as per tax-mapping pattern)
  employmentTaxDeducted: 960,

  // Gift Aid - £2,400 NET (will be grossed up to £3,000)
  // This extends the basic rate band by £3,000
  giftAidDonations: 2400,

  // Everything else zero
  employmentIncome: 0,
  selfEmploymentProfits: 0,
  propertyIncome: 0,
  capitalGainsNonResidential: 0,
  capitalGainsResidential: 0,
  capitalLossesInYear: 0,
  capitalLossesBroughtForward: 0,
}

// =============================================================================
// Run Test
// =============================================================================

function runTestCase10(): void {
  console.log('='.repeat(80))
  console.log('HMRC Test Case 10 - Savings, Dividends, Pension with Gift Aid')
  console.log('Tax Year: 2024-25')
  console.log('='.repeat(80))
  console.log('')

  // Run the calculator
  const result = calculateTax(testCase10Input)

  console.log('INPUT:')
  console.log('-'.repeat(40))
  console.log(`  Status: ${testCase10Input.status} (England)`)
  console.log(`  Untaxed interest: £${testCase10Input.untaxedInterest?.toLocaleString()}`)
  console.log(`  UK dividends: £${testCase10Input.ukDividends?.toLocaleString()}`)
  console.log(`  State pension: £${testCase10Input.statePension?.toLocaleString()}`)
  console.log(`  Private pension: £${testCase10Input.pensionIncome?.toLocaleString()}`)
  console.log(`  Tax deducted (pensions): £${testCase10Input.employmentTaxDeducted?.toLocaleString()}`)
  console.log(`  Gift Aid (net): £${testCase10Input.giftAidDonations?.toLocaleString()}`)
  console.log('')

  console.log('CALCULATION BREAKDOWN:')
  console.log('-'.repeat(40))
  console.log('')

  // Income breakdown
  console.log('INCOME:')
  const totalPensions = (testCase10Input.statePension || 0) + (testCase10Input.pensionIncome || 0)
  console.log(`  Pension income (state + private): £${totalPensions.toLocaleString()}`)
  console.log(`  Savings income: £${result.totalSavingsIncome.toLocaleString()}`)
  console.log(`  Dividend income: £${result.totalDividendIncome.toLocaleString()}`)
  console.log(`  Total income: £${result.totalIncome.toLocaleString()}`)
  console.log('')

  // Allowances
  console.log('ALLOWANCES:')
  console.log(`  Personal Allowance: £${result.personalAllowance.toLocaleString()}`)
  console.log(`  Gift Aid extends BR band by: £${((testCase10Input.giftAidDonations || 0) * 1.25).toLocaleString()}`)
  console.log(`  Extended basic rate band: £${(37700 + (testCase10Input.giftAidDonations || 0) * 1.25).toLocaleString()}`)
  console.log('')

  // Taxable income
  console.log('TAXABLE INCOME:')
  console.log(`  Taxable non-savings (pensions): £${result.taxableNonSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable savings: £${result.taxableSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable dividends: £${result.taxableDividendIncome.toLocaleString()}`)
  console.log(`  Total taxable: £${result.totalTaxableIncome.toLocaleString()}`)
  console.log('')

  // Tax breakdown
  console.log('TAX CALCULATION:')
  console.log(`  Tax on non-savings (pensions): £${result.taxOnNonSavings.toFixed(2)}`)
  console.log(`  Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
  console.log(`  Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
  console.log(`  Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
  console.log('')

  // Tax deducted
  console.log('TAX DEDUCTED:')
  console.log(`  Tax deducted at source: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log('')

  // Final totals
  console.log('FINAL POSITION:')
  console.log(`  Income tax charged: £${result.totalIncomeTax.toFixed(2)}`)
  console.log(`  Less tax deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log(`  Income tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
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
    { key: 'totalIncome', actual: result.totalIncome, expected: 53381, description: 'Total income' },

    // Taxable income
    {
      key: 'totalTaxableIncome',
      actual: result.totalTaxableIncome,
      expected: 40811,
      description: 'Total taxable income',
    },

    // Taxable non-savings (pensions after PA)
    // Total pensions = £13,039, PA = £12,570, Taxable = £469
    {
      key: 'taxableNonSavings',
      actual: result.taxableNonSavingsIncome,
      expected: 469,
      description: 'Taxable non-savings (pensions)',
    },

    // Taxable savings
    // Total savings = £24,342
    // Under beneficial ordering, PA goes to dividends, not savings
    // So taxable savings = £24,342
    {
      key: 'taxableSavings',
      actual: result.taxableSavingsIncome,
      expected: 24342,
      description: 'Taxable savings',
    },

    // Taxable dividends
    // Total dividends = £16,000
    // Under beneficial ordering, remaining PA (£12,570 - £469 = £12,101) could go to dividends
    // But wait - HMRC shows £16,000 - £500 DA = £15,500 taxable
    // Let me recalculate...
    // Actually HMRC shows taxable dividends as £15,500 (after £500 allowance)
    {
      key: 'taxableDividends',
      actual: result.taxableDividendIncome,
      expected: 16000, // Before dividend allowance is applied
      description: 'Taxable dividends (before DA)',
    },

    // Tax on pensions (£469 at 20% = £93.80)
    {
      key: 'taxOnPensions',
      actual: result.taxOnNonSavings,
      expected: 93.80,
      description: 'Tax on pensions (£469 at 20%)',
      tolerance: 0.01,
    },

    // Tax on savings
    // £4,531 at starting rate (0%) + £500 PSA (0%) + £19,311 at 20% = £3,862.20
    {
      key: 'taxOnSavings',
      actual: result.taxOnSavings,
      expected: 3862.20,
      description: 'Tax on savings',
      tolerance: 0.5,
    },

    // Tax on dividends
    // £500 allowance at 0% + £15,389 basic rate (8.75%) + £111 higher rate (33.75%)
    // = £0 + £1,346.53 + £37.46 = £1,383.99
    {
      key: 'taxOnDividends',
      actual: result.taxOnDividends,
      expected: 1383.99,
      description: 'Tax on dividends',
      tolerance: 0.5,
    },

    // Total income tax charged
    {
      key: 'totalIncomeTax',
      actual: result.totalIncomeTax,
      expected: 5339.99,
      description: 'Total Income Tax charged',
      tolerance: 1,
    },

    // Tax deducted
    {
      key: 'taxDeducted',
      actual: result.taxDeductedAtSource,
      expected: 960,
      description: 'Tax deducted from pensions',
    },

    // Income tax due (after deducting tax paid)
    {
      key: 'incomeTaxDue',
      actual: result.totalIncomeTax - result.taxDeductedAtSource,
      expected: 4379.99,
      description: 'Income Tax due',
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

    // PA Allocation Analysis
    console.log('PA ALLOCATION ANALYSIS:')
    console.log(`  Total income: £${result.totalIncome}`)
    console.log(`  Non-savings (pensions): £${totalPensions}`)
    console.log(`  Savings: £${result.totalSavingsIncome}`)
    console.log(`  Dividends: £${result.totalDividendIncome}`)
    console.log('')
    console.log(`  Personal Allowance: £${result.personalAllowance}`)
    console.log(`  Effective PA: £${result.effectivePersonalAllowance}`)
    console.log('')

    // Check if beneficial ordering was used
    const pensionAfterPA = Math.max(0, totalPensions - result.personalAllowance)
    const savingsStartingRateAvailable = Math.max(0, 5000 - pensionAfterPA)
    console.log('  Beneficial ordering check:')
    console.log(`    Pension after PA: £${pensionAfterPA}`)
    console.log(`    Savings starting rate available: £${savingsStartingRateAvailable}`)
    console.log(`    All savings covered by starting rate? ${result.totalSavingsIncome <= savingsStartingRateAvailable ? 'No' : 'No (savings > SR available)'}`)
    console.log('')

    // Band consumption
    console.log('BAND CONSUMPTION:')
    const extendedBRBand = 37700 + (testCase10Input.giftAidDonations || 0) * 1.25
    console.log(`  Extended basic rate band: £${extendedBRBand}`)
    console.log(`  Taxable pensions: £${result.taxableNonSavingsIncome}`)
    console.log(`  Taxable savings: £${result.taxableSavingsIncome}`)
    console.log(`  Band used by pensions + savings: £${result.taxableNonSavingsIncome + result.taxableSavingsIncome}`)
    console.log(`  Band remaining for dividends: £${Math.max(0, extendedBRBand - result.taxableNonSavingsIncome - result.taxableSavingsIncome)}`)
    console.log('')

    // Expected dividend split
    const bandForDividends = Math.max(0, extendedBRBand - result.taxableNonSavingsIncome - result.taxableSavingsIncome)
    const dividendsAfterAllowance = result.taxableDividendIncome - 500 // Dividend allowance
    const dividendsAtBasicRate = Math.min(dividendsAfterAllowance, bandForDividends)
    const dividendsAtHigherRate = Math.max(0, dividendsAfterAllowance - dividendsAtBasicRate)
    console.log('EXPECTED DIVIDEND SPLIT:')
    console.log(`  Dividend allowance: £500 at 0%`)
    console.log(`  Dividends at basic rate: £${dividendsAtBasicRate} at 8.75% = £${(dividendsAtBasicRate * 0.0875).toFixed(2)}`)
    console.log(`  Dividends at higher rate: £${dividendsAtHigherRate} at 33.75% = £${(dividendsAtHigherRate * 0.3375).toFixed(2)}`)
    console.log(`  Total dividend tax: £${(dividendsAtBasicRate * 0.0875 + dividendsAtHigherRate * 0.3375).toFixed(2)}`)
    console.log('')
  }
}

// Run the test
runTestCase10()
