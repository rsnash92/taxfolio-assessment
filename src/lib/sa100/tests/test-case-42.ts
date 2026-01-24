/**
 * HMRC Test Case 42 - Tax Calculator Validation
 *
 * SE Loss Against Other Income + Marriage Allowance Transfer OUT + Voluntary Class 2
 *
 * Key test for crypto traders with a loss year - they can offset trading losses
 * against employment income.
 *
 * Components tested:
 * - Self-employment loss set against other income (SSE32/33/36)
 * - Marriage Allowance Transfer OUT (reducing own PA)
 * - Voluntary Class 2 NIC (protecting state pension despite loss)
 * - Savings Starting Rate (0% on savings when non-savings taxable = £0)
 * - Beneficial PA allocation (dividends vs savings)
 *
 * Test Case 42 Input Data:
 * - Employment gross: £11,570
 * - SE Turnover: £27,643, Expenses: £38,173, Loss: £10,530
 * - Loss claimed against other income: £10,450
 * - UK Interest: £3,678
 * - UK Dividends: £12,750
 * - Marriage Allowance Transfer OUT: Yes (to spouse)
 * - Voluntary Class 2: £157.50 (45.65 weeks)
 *
 * Expected HMRC Results:
 * - Total income received: £27,998
 * - Less loss relief: £10,450
 * - Net income: £17,548
 * - Personal Allowance: £12,570 - £1,260 MAT = £11,310
 * - Total income on which tax is due: £6,238
 * - Savings starting rate (0%): £3,678
 * - Dividend Allowance (0%): £500
 * - Dividends @ 8.75%: £2,060
 * - Total Income Tax: £180.25
 * - Class 2 NIC: £157.50
 * - Total Tax Due: £337.75
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from '../tax-calculator'

// =============================================================================
// Test Case 42 Input
// =============================================================================

const testCase42Input: TaxCalculationInput = {
  // UK resident, not Scottish (uses standard UK rates)
  status: 'U',

  // Employment income
  employmentIncome: 11570,
  employmentTaxDeducted: 0, // Below threshold, no PAYE

  // Self-employment - LOSS year
  // Turnover: £27,643, Total expenses: £38,173
  // Net loss: £10,530
  // Loss claimed against other income: £10,450
  // Note: selfEmploymentProfits should be 0 (or negative?) for a loss year
  // The loss offset is handled via lossReliefDeduction
  selfEmploymentProfits: 0, // Loss year - no profit

  // Loss relief deduction (REL17) - loss set against other income
  // This is the amount from SSE32/33 claimed to offset
  lossReliefDeduction: 10450,

  // Savings income
  taxedInterest: 3678,

  // Dividend income
  ukDividends: 12750,

  // Marriage Allowance Transfer OUT (giving allowance to spouse)
  // This REDUCES the taxpayer's own PA by £1,260
  marriageAllowanceTransferred: true,

  // Voluntary Class 2 NIC (despite loss, to protect state pension)
  // 45.65 weeks × £3.45 = £157.4925 ≈ £157.50
  class2Weeks: 45.65,
}

// =============================================================================
// Run Test
// =============================================================================

function runTestCase42(): void {
  console.log('='.repeat(80))
  console.log('HMRC Test Case 42 - SE Loss + MAT Transfer OUT + Voluntary Class 2')
  console.log('Tax Year: 2024-25')
  console.log('='.repeat(80))
  console.log('')

  // Run the calculator
  const result = calculateTax(testCase42Input)

  console.log('INPUT:')
  console.log('-'.repeat(40))
  console.log(`  Status: ${testCase42Input.status} (UK - not Scottish)`)
  console.log(`  Employment income: £${testCase42Input.employmentIncome?.toLocaleString()}`)
  console.log(`  Self-employment profit: £${testCase42Input.selfEmploymentProfits}`)
  console.log(`  Loss relief deduction: £${testCase42Input.lossReliefDeduction?.toLocaleString()}`)
  console.log(`  Taxed interest: £${testCase42Input.taxedInterest?.toLocaleString()}`)
  console.log(`  UK Dividends: £${testCase42Input.ukDividends?.toLocaleString()}`)
  console.log(`  Marriage Allowance Transfer OUT: ${testCase42Input.marriageAllowanceTransferred}`)
  console.log(`  Class 2 weeks: ${testCase42Input.class2Weeks}`)
  console.log('')

  console.log('CALCULATION BREAKDOWN:')
  console.log('-'.repeat(40))
  console.log('')

  // Income breakdown
  console.log('INCOME:')
  console.log(`  Non-savings income (before loss): £${(testCase42Input.employmentIncome || 0).toLocaleString()}`)
  console.log(`  Less: Loss relief: £${testCase42Input.lossReliefDeduction?.toLocaleString()}`)
  console.log(`  Non-savings income (after loss): £${result.totalNonSavingsIncome.toLocaleString()}`)
  console.log(`  Savings income: £${result.totalSavingsIncome.toLocaleString()}`)
  console.log(`  Dividend income: £${result.totalDividendIncome.toLocaleString()}`)
  console.log(`  Total income (after loss relief): £${result.totalIncome.toLocaleString()}`)
  console.log('')

  // Gross total income (before loss relief)
  const grossTotalIncome = (testCase42Input.employmentIncome || 0) +
                           (testCase42Input.taxedInterest || 0) +
                           (testCase42Input.ukDividends || 0)
  console.log(`  Gross total income (before loss): £${grossTotalIncome.toLocaleString()}`)
  console.log('')

  // Allowances
  console.log('ALLOWANCES:')
  console.log(`  Standard Personal Allowance: £${TAX_PARAMETERS_2024_25.allowances.P_A.toLocaleString()}`)
  console.log(`  Less: Marriage Allowance transfer OUT: £${TAX_PARAMETERS_2024_25.allowances.T_P_A.toLocaleString()}`)
  console.log(`  Effective PA: £${result.effectivePersonalAllowance.toLocaleString()}`)
  console.log('')

  // Show PA allocation
  console.log('PA ALLOCATION (Calculator):')
  console.log(`  Non-savings income: £${result.totalNonSavingsIncome.toLocaleString()}`)
  console.log(`  PA used on non-savings: £${Math.min(result.effectivePersonalAllowance, result.totalNonSavingsIncome).toLocaleString()}`)
  const paRemainingAfterNonSavings = Math.max(0, result.effectivePersonalAllowance - result.totalNonSavingsIncome)
  console.log(`  PA remaining: £${paRemainingAfterNonSavings.toLocaleString()}`)
  console.log('')
  console.log(`  Savings income: £${result.totalSavingsIncome.toLocaleString()}`)
  const paUsedOnSavings = Math.min(paRemainingAfterNonSavings, result.totalSavingsIncome)
  console.log(`  PA used on savings: £${paUsedOnSavings.toLocaleString()}`)
  const paRemainingAfterSavings = Math.max(0, paRemainingAfterNonSavings - result.totalSavingsIncome)
  console.log(`  PA remaining: £${paRemainingAfterSavings.toLocaleString()}`)
  console.log('')
  console.log(`  Dividend income: £${result.totalDividendIncome.toLocaleString()}`)
  const paUsedOnDividends = Math.min(paRemainingAfterSavings, result.totalDividendIncome)
  console.log(`  PA used on dividends: £${paUsedOnDividends.toLocaleString()}`)
  console.log('')

  // HMRC's BENEFICIAL PA allocation (different from calculator)
  console.log('PA ALLOCATION (HMRC Beneficial - Expected):')
  console.log('  HMRC allocates PA to DIVIDENDS first (not savings)')
  console.log('  Why? Because savings qualify for 0% starting rate.')
  console.log('')
  console.log('  Non-savings (after loss): £1,120')
  console.log('    PA used: £1,120 → Taxable non-savings: £0')
  console.log('')
  console.log('  PA remaining: £11,310 - £1,120 = £10,190')
  console.log('')
  console.log('  HMRC allocates remaining PA to DIVIDENDS (not savings):')
  console.log('    Dividends: £12,750')
  console.log('    PA used on dividends: £10,190')
  console.log('    Taxable dividends: £12,750 - £10,190 = £2,560')
  console.log('')
  console.log('  Savings: £3,678')
  console.log('    PA used on savings: £0 (allocated to dividends instead)')
  console.log('    BUT: Savings starting rate applies!')
  console.log('    Starting rate available: £5,000 (since non-savings taxable = £0)')
  console.log('    All £3,678 taxed at 0%')
  console.log('')

  // Taxable income
  console.log('TAXABLE INCOME (Calculator):')
  console.log(`  Taxable non-savings: £${result.taxableNonSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable savings: £${result.taxableSavingsIncome.toLocaleString()}`)
  console.log(`  Taxable dividends: £${result.taxableDividendIncome.toLocaleString()}`)
  console.log(`  Total taxable: £${result.totalTaxableIncome.toLocaleString()}`)
  console.log('')

  // Income tax breakdown
  console.log('INCOME TAX (Calculator):')
  console.log(`  Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
  console.log(`  Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
  console.log(`  Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
  console.log(`  Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
  console.log('')

  // Expected HMRC calculation
  console.log('INCOME TAX (HMRC Expected):')
  console.log('  Tax on non-savings: £0 (£0 taxable)')
  console.log('  Tax on savings: £0 (£3,678 at 0% starting rate)')
  console.log('  Tax on dividends:')
  console.log('    DA: £500 at 0% = £0')
  console.log('    Basic: £2,060 at 8.75% = £180.25')
  console.log('  Total income tax: £180.25')
  console.log('')

  // National Insurance
  console.log('NATIONAL INSURANCE:')
  console.log(`  Class 4 NIC: £${result.class4NIC.toFixed(2)} (expected: £0 - loss year)`)
  console.log(`  Class 2 NIC: £${result.class2NIC.toFixed(2)} (expected: £157.50)`)
  console.log(`  Total NIC: £${result.totalNIC.toFixed(2)}`)
  console.log('')

  // Tax deducted
  console.log('TAX DEDUCTED:')
  console.log(`  Tax deducted at source: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log('')

  // Final totals
  console.log('FINAL POSITION:')
  console.log(`  Income tax: £${result.totalIncomeTax.toFixed(2)}`)
  console.log(`  Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
  console.log(`  Less tax deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
  console.log(`  Total tax due: £${result.taxDueOrRefund.toFixed(2)}`)
  console.log('')

  // SA110 values
  console.log('SA110 VALUES:')
  console.log(`  Total tax etc due (CAL1): £${result.sa110.totalTaxEtcDue}`)
  if (result.sa110.class2NICsDue) {
    console.log(`  Class 2 NIC due: £${result.sa110.class2NICsDue}`)
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
    note?: string
  }> = [
    // Gross income
    {
      key: 'grossTotalIncome',
      actual: grossTotalIncome,
      expected: 27998,
      description: 'Total income received (before loss)',
    },

    // Net income after loss
    {
      key: 'totalIncome',
      actual: result.totalIncome,
      expected: 17548,
      description: 'Net income (after loss relief)',
    },

    // Personal Allowance (after MAT transfer OUT)
    {
      key: 'effectivePA',
      actual: result.effectivePersonalAllowance,
      expected: 11310, // £12,570 - £1,260 MAT
      description: 'Effective PA (after MAT transfer)',
    },

    // Total taxable income
    // HMRC: £6,238 (taxable dividends £2,560 + taxable savings £3,678 at 0%)
    // Wait - HMRC says "Total income on which tax is due: £6,238"
    // This should be taxable dividends only since savings are at 0%
    // £2,560 taxable dividends + £3,678 taxable savings = £6,238
    {
      key: 'totalTaxableIncome',
      actual: result.totalTaxableIncome,
      expected: 6238,
      description: 'Total taxable income',
      note: 'May differ due to PA allocation order',
    },

    // Class 4 NIC (should be £0 - loss year)
    {
      key: 'class4NIC',
      actual: result.class4NIC,
      expected: 0,
      description: 'Class 4 NIC (loss year = £0)',
    },

    // Class 2 NIC (voluntary)
    {
      key: 'class2NIC',
      actual: result.class2NIC,
      expected: 157.5, // 45.65 weeks × £3.45
      description: 'Class 2 NIC (voluntary)',
      tolerance: 0.5,
    },

    // Income tax
    // This is the KEY comparison - will fail if PA allocation differs
    {
      key: 'totalIncomeTax',
      actual: result.totalIncomeTax,
      expected: 180.25,
      description: 'Total Income Tax',
      tolerance: 0.5,
      note: 'CRITICAL: Depends on beneficial PA allocation',
    },

    // Total tax due
    {
      key: 'totalTaxDue',
      actual: result.sa110.totalTaxEtcDue,
      expected: 338, // £180.25 + £157.50 = £337.75 → rounded to £338
      description: 'Total Tax Due',
      tolerance: 1,
    },
  ]

  for (const { actual, expected, description, tolerance = 0.5, note } of comparisons) {
    const diff = Math.abs(actual - expected)
    const pass = diff <= tolerance

    if (pass) {
      console.log(`  ✅ PASS: ${description}`)
      console.log(`          Expected: £${expected.toLocaleString()} | Actual: £${actual.toFixed(2)}`)
      passCount++
    } else {
      console.log(`  ❌ FAIL: ${description}`)
      console.log(`          Expected: £${expected.toLocaleString()} | Actual: £${actual.toFixed(2)} | Diff: £${diff.toFixed(2)}`)
      if (note) {
        console.log(`          Note: ${note}`)
      }
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

  // Gap analysis
  if (failCount > 0) {
    console.log('')
    console.log('GAP ANALYSIS:')
    console.log('-'.repeat(40))
    console.log('')

    console.log('ISSUE: BENEFICIAL PA ALLOCATION')
    console.log('')
    console.log('Current Calculator Behavior:')
    console.log('  PA is allocated in order: Non-savings → Savings → Dividends')
    console.log('')
    console.log('  Result:')
    console.log(`    Non-savings taxable: £${result.taxableNonSavingsIncome}`)
    console.log(`    Savings taxable: £${result.taxableSavingsIncome}`)
    console.log(`    Dividends taxable: £${result.taxableDividendIncome}`)
    console.log('')

    console.log('HMRC Beneficial Allocation:')
    console.log('  When savings qualify for 0% starting rate, HMRC allocates PA')
    console.log('  to DIVIDENDS first to minimize tax.')
    console.log('')
    console.log('  Expected:')
    console.log('    Non-savings taxable: £0 (£1,120 covered by PA)')
    console.log('    Savings taxable: £3,678 (all at 0% starting rate)')
    console.log('    Dividends taxable: £2,560 (£12,750 - £10,190 PA)')
    console.log('')

    console.log('TAX DIFFERENCE:')
    console.log('')
    console.log('  Calculator tax on savings:')
    console.log(`    £${result.taxOnSavings.toFixed(2)}`)
    console.log('')
    console.log('  HMRC tax on savings:')
    console.log('    £0 (all £3,678 at 0% starting rate)')
    console.log('')
    console.log('  Calculator tax on dividends:')
    console.log(`    £${result.taxOnDividends.toFixed(2)}`)
    console.log('')
    console.log('  HMRC tax on dividends:')
    console.log('    DA: £500 at 0% = £0')
    console.log('    Basic rate: £2,060 at 8.75% = £180.25')
    console.log('    Total: £180.25')
    console.log('')

    console.log('RECOMMENDED FIX:')
    console.log('')
    console.log('Add beneficial PA allocation logic to tax-calculator.ts:')
    console.log('')
    console.log('1. Calculate savings starting rate available:')
    console.log('   startingRateAvailable = max(0, £5,000 - (non-savings income - PA))')
    console.log('')
    console.log('2. If savings <= startingRateAvailable AND dividends > 0:')
    console.log('   - Allocate PA to non-savings first (as normal)')
    console.log('   - Allocate REMAINING PA to dividends (skip savings)')
    console.log('   - Savings will be taxed at 0% starting rate')
    console.log('')
    console.log('3. Otherwise:')
    console.log('   - Use standard allocation order')
    console.log('')
  }
}

// Run the test
runTestCase42()
