/**
 * Case 54 - Scottish RAS Pension Band Extension Analysis
 *
 * Run with: npx tsx src/lib/sa100/verify-case-54.ts
 *
 * This test case explicitly shows how RAS pension relief works.
 * The SA302 states: "Your pension payments of £2,000 have increased your basic rate limits."
 *
 * Key insight: RAS pension extends the basic rate band, shifting income from
 * higher rates to lower rates (saving tax).
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

const params = TAX_PARAMETERS_2024_25

// ============================================================================
// Case 54 Input Data
// ============================================================================

// Employment A
const empA = {
  grossPay: 25500,
  taxDeducted: 3181,
  expensesReceived: 2250,
  benefits: 650,
  tips: 75,
  allowableExpenses: 75,
}

// Employment B
const empB = {
  grossPay: 18504,
  taxDeducted: 1306.80,
  benefits: 600,
  expenses: 150,
  otherExpenses: 85,
}

// Calculate employment income
const empAIncome = empA.grossPay + empA.expensesReceived + empA.benefits + empA.tips - empA.allowableExpenses
const empBIncome = empB.grossPay + empB.benefits - empB.expenses - empB.otherExpenses

console.log('=== Case 54: Scottish RAS Pension Band Extension ===\n')

console.log('--- Employment Income ---')
console.log('Employment A:')
console.log(`  Gross pay: £${empA.grossPay}`)
console.log(`  + Expenses received: £${empA.expensesReceived}`)
console.log(`  + Benefits: £${empA.benefits}`)
console.log(`  + Tips: £${empA.tips}`)
console.log(`  - Allowable expenses: £${empA.allowableExpenses}`)
console.log(`  = Net: £${empAIncome}`)

console.log('\nEmployment B:')
console.log(`  Gross pay: £${empB.grossPay}`)
console.log(`  + Benefits: £${empB.benefits}`)
console.log(`  - Expenses: £${empB.expenses}`)
console.log(`  - Other expenses: £${empB.otherExpenses}`)
console.log(`  = Net: £${empBIncome}`)

// Total employment
// Per SA302: Pay £44,004 + Benefits/expenses £3,575 - Allowable £310 = £47,269
const payFromEmployments = empA.grossPay + empA.tips + empB.grossPay // 25500 + 75 + 18504 = 44079?
// Actually SA302 shows £44,004 so let me recalculate
// EMP1 = gross pay, tips go elsewhere
const totalGrossPay = empA.grossPay + empB.grossPay // 25500 + 18504 = 44004 ✓
const totalBenefits = empA.expensesReceived + empA.benefits + empA.tips + empB.benefits // 2250 + 650 + 75 + 600 = 3575 ✓
const totalExpenses = empA.allowableExpenses + empB.expenses + empB.otherExpenses // 75 + 150 + 85 = 310 ✓

console.log('\n--- Total Employment (per SA302) ---')
console.log(`Pay from employments: £${totalGrossPay}`)
console.log(`Benefits/expenses: £${totalBenefits}`)
console.log(`Allowable expenses: £${totalExpenses}`)
const totalEmploymentIncome = totalGrossPay + totalBenefits - totalExpenses
console.log(`Total from employments: £${totalEmploymentIncome}`)

// Interest and other income
const ukInterest = 11998

console.log(`\nInterest: £${ukInterest}`)

const totalIncome = totalEmploymentIncome + ukInterest
console.log(`\nTotal income received: £${totalIncome}`)

// ============================================================================
// Tax Calculation
// ============================================================================

// Personal Allowance
const personalAllowance = params.allowances.P_A // £12,570
console.log(`\nPersonal Allowance: £${personalAllowance}`)

const totalTaxable = totalIncome - personalAllowance
console.log(`Taxable income: £${totalTaxable}`)

// Split into non-savings and savings
const taxableNonSavings = totalEmploymentIncome - personalAllowance
const taxableSavings = ukInterest

console.log(`\nTaxable non-savings: £${taxableNonSavings}`)
console.log(`Taxable savings: £${taxableSavings}`)

// ============================================================================
// Scottish Tax Bands (2024-25)
// ============================================================================

console.log('\n=== Scottish Tax Bands (2024-25) ===')
console.log('Starter rate (19%): £0 - £2,306')
console.log('Basic rate (20%): £2,307 - £14,732 (width: £11,685 + £2,306 = £13,991)')
console.log('Intermediate rate (21%): £14,733 - £25,688 (width: £17,101 cumulative £31,092)')
console.log('Higher rate (42%): £25,689 - £43,662 (width: £31,338 cumulative £62,430)')
console.log('Advanced rate (45%): £43,663 - £75,000 (width: £62,710 cumulative £125,140)')
console.log('Top rate (48%): over £75,000')

// ============================================================================
// RAS Pension Extension
// ============================================================================

const pensionContribution = 2000

console.log('\n=== RAS Pension Band Extension ===')
console.log(`Pension contribution (RAS): £${pensionContribution}`)
console.log('"Your pension payments of £2,000 have increased your basic rate limits"')

// The pension extends the basic rate band
// For Scottish, this means the boundary between basic (20%) and intermediate (21%) moves up
// So more income is taxed at 20% instead of 21% (or higher rates)

// ============================================================================
// Calculate Tax WITHOUT Pension Extension
// ============================================================================

console.log('\n=== Tax WITHOUT Pension Extension ===')

// Scottish bands (cumulative thresholds)
const scottishBands = [
  { name: 'Starter', threshold: 2306, rate: 0.19 },
  { name: 'Basic', threshold: 13991, rate: 0.20 }, // 2306 + 11685
  { name: 'Intermediate', threshold: 31092, rate: 0.21 }, // + 17101
  { name: 'Higher', threshold: 62430, rate: 0.42 }, // + 31338
  { name: 'Advanced', threshold: 125140, rate: 0.45 }, // + 62710
  { name: 'Top', threshold: Infinity, rate: 0.48 },
]

function calculateScottishTaxWithBands(income: number, extension: number = 0): { tax: number, breakdown: string[] } {
  const breakdown: string[] = []
  let tax = 0
  let remaining = income
  let prevThreshold = 0

  // Apply extension to basic rate band
  const extendedBands = scottishBands.map((band, i) => {
    if (i >= 1) { // Extend from Basic onwards
      return { ...band, threshold: band.threshold + extension }
    }
    return band
  })

  for (const band of extendedBands) {
    if (remaining <= 0) break

    const bandWidth = band.threshold - prevThreshold
    const incomeInBand = Math.min(remaining, bandWidth)

    if (incomeInBand > 0) {
      const taxInBand = incomeInBand * band.rate
      tax += taxInBand
      breakdown.push(`${band.name}: £${incomeInBand.toFixed(0)} × ${(band.rate * 100).toFixed(0)}% = £${taxInBand.toFixed(2)}`)
    }

    remaining -= incomeInBand
    prevThreshold = band.threshold
  }

  return { tax, breakdown }
}

const noExtension = calculateScottishTaxWithBands(taxableNonSavings)
console.log('Non-savings tax (no extension):')
noExtension.breakdown.forEach(line => console.log(`  ${line}`))
console.log(`  Total: £${noExtension.tax.toFixed(2)}`)

// ============================================================================
// Calculate Tax WITH Pension Extension
// ============================================================================

console.log('\n=== Tax WITH £2,000 Pension Extension ===')

const withExtension = calculateScottishTaxWithBands(taxableNonSavings, pensionContribution)
console.log('Non-savings tax (with extension):')
withExtension.breakdown.forEach(line => console.log(`  ${line}`))
console.log(`  Total: £${withExtension.tax.toFixed(2)}`)

console.log(`\nTax saved by pension extension: £${(noExtension.tax - withExtension.tax).toFixed(2)}`)

// ============================================================================
// Compare with SA302 Expected Values
// ============================================================================

console.log('\n=== SA302 Expected Values ===')
console.log('Non-savings tax breakdown:')
console.log('  Starter: £2,306 × 19% = £438.14')
console.log('  Basic: £13,685 × 20% = £2,737.00')
console.log('  Intermediate: £17,101 × 21% = £3,591.21')
console.log('  Higher: £1,607 × 42% = £674.94')

const expectedNSStarter = 2306 * 0.19
const expectedNSBasic = 13685 * 0.20
const expectedNSIntermediate = 17101 * 0.21
const expectedNSHigher = 1607 * 0.42
const expectedNSTotal = expectedNSStarter + expectedNSBasic + expectedNSIntermediate + expectedNSHigher

console.log(`  Expected NS total: £${expectedNSTotal.toFixed(2)}`)

// Verify the bands
console.log('\n--- Verifying SA302 band amounts ---')
console.log(`Starter: £2,306 (standard)`)

// Basic should be extended by £2,000
// Standard basic width: £11,685
// Extended basic width: £11,685 + £2,000 = £13,685 ✓
console.log(`Basic: £13,685 (standard £11,685 + £2,000 pension extension = £13,685) ✓`)

// Intermediate stays same width
console.log(`Intermediate: £17,101 (standard width) ✓`)

// Higher is whatever's left
const expectedNonSavings = taxableNonSavings
const inStarter = 2306
const inBasic = 13685
const inIntermediate = 17101
const inHigher = expectedNonSavings - inStarter - inBasic - inIntermediate
console.log(`Higher: £${inHigher} (remainder of £${expectedNonSavings} - £2,306 - £13,685 - £17,101)`)

// ============================================================================
// Savings Tax Calculation
// ============================================================================

console.log('\n=== Savings Tax ===')

// After non-savings uses up bands, where does savings start?
// Non-savings uses: £2,306 + £13,685 + £17,101 + £1,607 = £34,699
// With extension, cumulative thresholds are:
// Starter: 0-2306
// Basic: 2307-15991 (extended by 2000)
// Intermediate: 15992-33093
// Higher: 33094-64430

const totalNonSavingsUsed = taxableNonSavings
const extendedBasicEnd = 13991 + pensionContribution // 15991
const extendedIntermediateEnd = 31092 + pensionContribution // 33092
const extendedHigherEnd = 62430 + pensionContribution // 64430

console.log(`\nNon-savings used: £${totalNonSavingsUsed}`)
console.log(`Extended band thresholds: Basic ends at £${extendedBasicEnd}, Intermediate at £${extendedIntermediateEnd}`)

// Savings starts after non-savings
// PSA for higher rate taxpayer = £500
const psa = 500
console.log(`\nPersonal Savings Allowance (higher rate): £${psa}`)

// Starting rate for savings - not available if non-savings > PA
console.log('Starting rate: £0 (non-savings income exceeds PA)')

// Calculate remaining bands for savings
const remainingBasicBand = Math.max(0, extendedBasicEnd - totalNonSavingsUsed)
const remainingIntermediateBand = Math.max(0, extendedIntermediateEnd - Math.max(totalNonSavingsUsed, extendedBasicEnd))

console.log(`\nRemaining basic band for savings: £${remainingBasicBand}`)

// Per SA302:
// Basic rate nil (PSA): £500 × 0% = £0
// Basic rate: £4,501 × 20% = £900.20
// Higher rate: £6,997 × 40% = £2,798.80

console.log('\nSA302 savings breakdown:')
console.log('  PSA: £500 × 0% = £0')
console.log('  Basic rate: £4,501 × 20% = £900.20')
console.log('  Higher rate: £6,997 × 40% = £2,798.80')

// Let's verify these amounts
// Total savings: £11,998
// PSA: £500 (taxed at 0%)
// Remaining: £11,998 - £500 = £11,498
// How much at basic? £4,501
// How much at higher? £6,997
// Total: £11,498 ✓

console.log('\n--- Verifying savings bands ---')
console.log(`Total savings: £${taxableSavings}`)
console.log(`PSA: £${psa}`)
console.log(`Remaining to tax: £${taxableSavings - psa}`)
console.log(`At basic (£4,501): £${4501}`)
console.log(`At higher (£6,997): £${6997}`)
console.log(`Check: £${psa + 4501 + 6997} = £${taxableSavings} ✓`)

const savingsTax = 4501 * 0.20 + 6997 * 0.40
console.log(`\nSavings tax: £${savingsTax.toFixed(2)}`)

// ============================================================================
// Total Income Tax
// ============================================================================

const expectedTotalIncomeTax = expectedNSTotal + savingsTax
console.log('\n=== Total Income Tax ===')
console.log(`Non-savings: £${expectedNSTotal.toFixed(2)}`)
console.log(`Savings: £${savingsTax.toFixed(2)}`)
console.log(`Total: £${expectedTotalIncomeTax.toFixed(2)}`)
console.log(`SA302 expected: £11,140.29`)

// ============================================================================
// Student Loans
// ============================================================================

console.log('\n=== Student Loans ===')
const studentLoanPlan1Due = 2591.00
const postgradLoanDue = 1727.00

console.log(`Student Loan Plan 1: £${studentLoanPlan1Due.toFixed(2)}`)
console.log(`Postgraduate Loan: £${postgradLoanDue.toFixed(2)}`)

// ============================================================================
// Final Calculation
// ============================================================================

const totalTaxCharged = expectedTotalIncomeTax + studentLoanPlan1Due + postgradLoanDue
const taxDeducted = empA.taxDeducted + empB.taxDeducted
const studentLoanDeducted = 45.90
const postgradDeducted = 270
const totalDeducted = taxDeducted

console.log('\n=== Final Tax Calculation ===')
console.log(`Income Tax charged: £${expectedTotalIncomeTax.toFixed(2)}`)
console.log(`+ Student Loan: £${studentLoanPlan1Due.toFixed(2)}`)
console.log(`+ Postgrad Loan: £${postgradLoanDue.toFixed(2)}`)
console.log(`= Total tax due: £${totalTaxCharged.toFixed(2)}`)
console.log(`- Tax deducted (PAYE): £${taxDeducted.toFixed(2)}`)
console.log(`= Tax to pay: £${(totalTaxCharged - taxDeducted).toFixed(2)}`)
console.log(`\nSA302 expected: £10,970.49`)

// ============================================================================
// Test with Calculator
// ============================================================================

console.log('\n=== Testing with Tax Calculator ===')

const taxInput: TaxCalculationInput = {
  status: 'S', // Scottish
  employmentIncome: totalEmploymentIncome,
  employmentTaxDeducted: taxDeducted,
  untaxedInterest: ukInterest,
  pensionContributions: pensionContribution, // RAS pension - should extend bands
  studentLoanPlan: 1,
  hasPostgraduateLoan: true,
  studentLoanDeductedThroughPAYE: studentLoanDeducted,
  postgraduateLoanDeductedThroughPAYE: postgradDeducted,
}

console.log('Calculator input:', JSON.stringify(taxInput, null, 2))

const result = calculateTax(taxInput)

console.log('\nCalculator output:')
console.log(`  Total income: £${result.totalIncome}`)
console.log(`  Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Student loan: £${result.studentLoanRepayment.toFixed(2)}`)
console.log(`  Postgrad loan: £${result.postgraduateLoanRepayment.toFixed(2)}`)
console.log(`  Tax due: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  SA110 totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)

console.log('\n=== Comparison ===')
console.log(`Expected tax due: £10,970.49`)
console.log(`Calculated tax due: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`Difference: £${(result.taxDueOrRefund - 10970.49).toFixed(2)}`)

// Break down the differences
console.log('\n=== Difference Breakdown ===')
console.log('Non-savings tax:')
console.log(`  Expected: £7,441.29`)
console.log(`  Calculator: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Difference: £${(result.taxOnNonSavings - 7441.29).toFixed(2)}`)

console.log('\nSavings tax:')
console.log(`  Expected: £3,699.00`)
console.log(`  Calculator: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Difference: £${(result.taxOnSavings - 3699.00).toFixed(2)}`)

console.log('\nStudent loan:')
console.log(`  Expected (after PAYE): £2,545.10 (£2,591 - £45.90)`)
console.log(`  Calculator: £${result.studentLoanRepayment.toFixed(2)}`)

console.log('\nPostgrad loan:')
console.log(`  Expected (after PAYE): £1,457.00 (£1,727 - £270)`)
console.log(`  Calculator: £${result.postgraduateLoanRepayment.toFixed(2)}`)
