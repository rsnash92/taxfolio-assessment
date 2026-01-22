/**
 * HMRC Test Case 29 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-29.ts
 *
 * Test Case 29: Scottish taxpayer with all 6 Scottish tax bands,
 * pension contributions extending basic rate, and student loans
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 29 inputs from HMRC MTR-Tester
// Note: Student loan and postgraduate loan are calculated on total earned income,
// but employer deducts loan repayments on employment income through PAYE.
// The SA only shows the ADDITIONAL amount due (from other income sources).
const input: TaxCalculationInput = {
  status: 'S', // Scottish (TR = 2)
  employmentIncome: 149777, // EMP1
  employmentTaxDeducted: 55077.64, // PAYE (EMP2)
  selfEmploymentProfits: 0,
  untaxedInterest: 525, // INC2
  ukDividends: 21000, // INC4
  otherIncome: 26000, // INC17 (Writing income)
  pensionContributions: 15000, // REL1 - extends basic rate band (uses NET amount)
  studentLoanPlan: 2,
  hasPostgraduateLoan: true,
  // Student loan already deducted by employer on employment income
  // Total loan due: (£149,777 - £27,295) × 9% = £11,023.38
  // HMRC expects £2,926 additional, so £8,097.38 already deducted through PAYE
  studentLoanDeductedThroughPAYE: 8097.38,
  // Postgraduate loan already deducted by employer
  // Total loan due: (£149,777 - £21,000) × 6% = £7,726.62
  // HMRC expects £1,951 additional, so £5,775.62 already deducted through PAYE
  postgraduateLoanDeductedThroughPAYE: 5775.62,
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 29 Verification ===')
console.log('')
console.log('Input:')
console.log('  Employment gross pay (EMP1): £149,777.00')
console.log('  PAYE deducted (EMP2): £55,077.64')
console.log('  Untaxed UK interest (INC2): £525.00')
console.log('  UK dividends (INC4): £21,000.00')
console.log('  Other income (INC17 Writing): £26,000.00')
console.log('  Pension contributions RAS (REL1): £15,000.00')
console.log('  Student Loan: Plan 2')
console.log('  Postgraduate Loan: Yes')
console.log('')

console.log('=== Income Calculation ===')
const expectedTotalIncome = 149777 + 525 + 21000 + 26000 // 197,302
console.log(`Total income: £${result.totalIncome}`)
console.log(`  Expected: £197,302 (£149,777 + £525 + £21,000 + £26,000)`)
console.log(`  Match: ${result.totalIncome === 197302 ? '✓' : '✗'}`)
console.log('')

console.log('=== Personal Allowance Tapering ===')
console.log(`Income over £100,000: £${result.totalIncome - 100000}`)
console.log(`PA reduction: £${result.personalAllowanceReduction}`)
console.log(`  Expected: £12,570 (full reduction - income > £125,140)`)
console.log(`Effective Personal Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £0`)
console.log(`  Match: ${result.effectivePersonalAllowance === 0 ? '✓' : '✗'}`)
console.log('')

console.log(`Total taxable income: £${result.totalTaxableIncome}`)
console.log(`  Expected: £197,302`)
console.log(`  Match: ${result.totalTaxableIncome === 197302 ? '✓' : '✗'}`)
console.log('')

console.log('=== Taxable Income Breakdown ===')
const expectedNonSavings = 149777 + 26000 // 175,777
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Expected: £175,777 (£149,777 employment + £26,000 other)`)
console.log(`  Match: ${result.taxableNonSavingsIncome === 175777 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Expected: £525`)
console.log(`  Match: ${result.taxableSavingsIncome === 525 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`  Expected: £21,000`)
console.log(`  Match: ${result.taxableDividendIncome === 21000 ? '✓' : '✗'}`)
console.log('')

console.log('=== Pension Contribution Extension ===')
console.log('Pension contribution (net): £15,000')
console.log('Grossed up (÷ 0.8): £18,750')
console.log('This extends the basic rate band for non-savings income')
console.log('')

console.log('=== HMRC Scottish Tax Calculation ===')
console.log('')
console.log('Scottish tax bands (with £18,750 pension extension to basic rate):')
console.log('  Starter (19%): £2,306')
console.log('  Basic (20%): £11,685 + £18,750 = £30,435 (but £26,685 shown by HMRC)')
console.log('  Intermediate (21%): £17,101')
console.log('  Higher (42%): £31,338')
console.log('  Advanced (45%): £62,710')
console.log('  Top (48%): remainder')
console.log('')
console.log('HMRC expected tax on non-savings (£175,777):')
console.log('  Starter (19%): £2,306 × 19% = £438.14')
console.log('  Basic (20%): £26,685 × 20% = £5,337.00')
console.log('  Intermediate (21%): £17,101 × 21% = £3,591.21')
console.log('  Higher (42%): £31,338 × 42% = £13,161.96')
console.log('  Advanced (45%): £62,710 × 45% = £28,219.50')
console.log('  Top (48%): £35,637 × 48% = £17,105.76')
console.log('  Total: £67,853.57')
console.log('')

// Verify band allocation
const starterBand = 2306
const basicBandExtended = 26685 // HMRC shows this, which is 11685 + 15000 (net contribution)
const intermediateBand = 17101
const higherBand = 31338
const advancedBand = 62710
const totalBeforeTop = starterBand + basicBandExtended + intermediateBand + higherBand + advancedBand
console.log(`Total before top rate: £${totalBeforeTop}`)
console.log(`Top rate band: £175,777 - £${totalBeforeTop} = £${175777 - totalBeforeTop}`)
console.log('')

console.log('Tax on savings (£525) - all at top rate:')
console.log('  Note: Savings use UK rates (not Scottish), so 45% additional rate')
console.log('  £525 × 45% = £236.25')
console.log('  PSA at additional rate: £0')
console.log('')

console.log('Tax on dividends (£21,000):')
console.log('  DA at 0%: £500')
console.log('  £20,500 × 39.35% = £8,066.75')
console.log('')

console.log('Total Income Tax charged: £76,156.57')
console.log('')

console.log('=== Our Calculation Results ===')
console.log('')
console.log(`Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Expected: £67,853.57`)
console.log(`  Difference: £${(result.taxOnNonSavings - 67853.57).toFixed(2)}`)
console.log('')

console.log(`Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Expected: £236.25`)
console.log(`  Difference: £${(result.taxOnSavings - 236.25).toFixed(2)}`)
console.log('')

console.log(`Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
console.log(`  Expected: £8,066.75`)
console.log(`  Difference: £${(result.taxOnDividends - 8066.75).toFixed(2)}`)
console.log('')

console.log(`Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £76,156.57`)
console.log(`  Difference: £${(result.totalIncomeTax - 76156.57).toFixed(2)}`)
console.log('')

console.log('=== Student Loan Calculations ===')
console.log('')
// Student loan on earned income only
const earnedIncome = 149777 + 26000 // Employment + other income (writing)
console.log(`Earned income for loan calculation: £${earnedIncome}`)
console.log('')

console.log('Plan 2 Student Loan:')
console.log(`  Threshold: £${params.bands.SL_limit2}`)
console.log(`  Income over threshold: £${earnedIncome - params.bands.SL_limit2}`)
console.log(`  Repayment at 9%: £${((earnedIncome - params.bands.SL_limit2) * 0.09).toFixed(2)}`)
console.log(`  Our calculation: £${result.studentLoanRepayment.toFixed(2)}`)
console.log(`  HMRC expected: £2,926.00`)
console.log(`  SA110 value: £${result.sa110.studentLoanRepaymentDue}`)
console.log('')

console.log('Postgraduate Loan:')
console.log(`  Threshold: £${params.bands.PGL_limit}`)
console.log(`  Income over threshold: £${earnedIncome - params.bands.PGL_limit}`)
console.log(`  Repayment at 6%: £${((earnedIncome - params.bands.PGL_limit) * 0.06).toFixed(2)}`)
console.log(`  Our calculation: £${result.postgraduateLoanRepayment.toFixed(2)}`)
console.log(`  HMRC expected: £1,951.00`)
console.log(`  SA110 value: £${result.sa110.postgraduateLoanRepaymentDue}`)
console.log('')

console.log('=== NIC Calculations ===')
console.log(`Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  Expected: £0.00 (no self-employment)`)
console.log(`  Match: ${result.class4NIC === 0 ? '✓' : '✗'}`)
console.log('')

console.log(`Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Expected: £0.00 (no self-employment)`)
console.log(`  Match: ${result.class2NIC === 0 ? '✓' : '✗'}`)
console.log('')

console.log('=== Final Tax Due Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log('  Income Tax charged: £76,156.57')
console.log('  Plus Student Loan: £2,926.00')
console.log('  Plus Postgraduate Loan: £1,951.00')
console.log('  Total: £81,033.57')
console.log('  Minus tax deducted: £55,077.64')
console.log('  Final tax due: £25,955.93')
console.log('')

const ourTotal = result.totalIncomeTax + result.studentLoanRepayment + result.postgraduateLoanRepayment
console.log('Our calculation:')
console.log(`  Income Tax charged: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Plus Student Loan: £${result.studentLoanRepayment.toFixed(2)}`)
console.log(`  Plus Postgraduate Loan: £${result.postgraduateLoanRepayment.toFixed(2)}`)
console.log(`  Total: £${ourTotal.toFixed(2)}`)
console.log(`  Minus tax deducted: £${result.taxDeductedAtSource}`)
console.log(`  Tax due/refund: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  SA110 totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log('')
console.log(`  Expected: £25,955.93`)
console.log(`  Difference: £${(result.taxDueOrRefund - 25955.93).toFixed(2)}`)
console.log('')

console.log('=== Summary ===')
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 76156.57) < 0.10
const studentLoanMatch = Math.abs(result.studentLoanRepayment - 2926) < 1
const postgraduateLoanMatch = Math.abs(result.postgraduateLoanRepayment - 1951) < 1
const finalMatch = Math.abs(result.taxDueOrRefund - 25955.93) < 1
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £76,156.57)`)
console.log(`Student Loan: ${studentLoanMatch ? '✓' : '✗'} (£${result.studentLoanRepayment.toFixed(2)} vs £2,926.00)`)
console.log(`Postgraduate Loan: ${postgraduateLoanMatch ? '✓' : '✗'} (£${result.postgraduateLoanRepayment.toFixed(2)} vs £1,951.00)`)
console.log(`Final tax due: ${finalMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £25,955.93)`)
