/**
 * HMRC Test Case 15 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-15.ts
 *
 * Test Case 15: England/NI taxpayer with Student Loan Plan 1,
 * foreign self-employment, and Class 4 NIC
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 15 inputs from HMRC MTR-Tester
const input: TaxCalculationInput = {
  status: 'E', // England/NI (TR = 1)
  employmentIncome: 0, // No employment
  employmentTaxDeducted: 0, // No PAYE
  selfEmploymentProfits: 17560, // FSE64
  untaxedInterest: 31920, // INC2
  ukDividends: 2670, // INC5 (Other dividends)
  studentLoanPlan: 1, // Plan 1
  class2NICRegistered: true, // Treated as paid
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 15 Verification ===')
console.log('')
console.log('Input:')
console.log('  Foreign self-employment (FSE64): £17,560.00')
console.log('  Untaxed UK interest (INC2): £31,920.00')
console.log('  Other dividends (INC5): £2,670.00')
console.log('  Student Loan: Plan 1')
console.log('  Class 2 NIC registered: Yes')
console.log('')

console.log('=== Income Calculation ===')
const expectedTotalIncome = 17560 + 31920 + 2670 // 52,150
console.log(`Total income: £${result.totalIncome}`)
console.log(`  Expected: £52,150 (£17,560 + £31,920 + £2,670)`)
console.log(`  Match: ${result.totalIncome === 52150 ? '✓' : '✗'}`)
console.log('')

console.log(`Personal Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £12,570`)
console.log(`  Match: ${result.effectivePersonalAllowance === 12570 ? '✓' : '✗'}`)
console.log('')

console.log(`Total taxable income: £${result.totalTaxableIncome}`)
console.log(`  Expected: £39,580 (£52,150 - £12,570)`)
console.log(`  Match: ${result.totalTaxableIncome === 39580 ? '✓' : '✗'}`)
console.log('')

console.log('=== Taxable Income Breakdown ===')
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Expected: £4,990 (£17,560 - £12,570) or £5,780 with beneficial ordering`)
console.log('')

console.log(`Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Expected: £31,920`)
console.log(`  Match: ${result.taxableSavingsIncome === 31920 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`  Expected: £2,670`)
console.log(`  Match: ${result.taxableDividendIncome === 2670 ? '✓' : '✗'}`)
console.log('')

console.log('=== HMRC Tax Calculation Breakdown ===')
console.log('')
console.log('HMRC expected breakdown:')
console.log('  Non-savings at basic rate: £5,780 × 20% = £1,156.00')
console.log('    (This suggests beneficial ordering applies)')
console.log('')
console.log('  Savings (£31,920):')
console.log('    Starting rate: £0 × 0% = £0.00')
console.log('    Basic rate nil band (PSA): £500 × 0% = £0.00')
console.log('    Basic rate: £31,420 × 20% = £6,284.00')
console.log('')
console.log('  Dividends (£2,670):')
console.log('    Higher rate nil band (DA): £500 × 0% = £0.00')
console.log('    Higher rate: £1,380 × 33.75% = £465.75')
console.log('    (Note: £790 dividends in basic rate at 20%)')
console.log('')
console.log('  Income Tax charged: £7,905.75')
console.log('')

console.log('=== Our Calculation Results ===')
console.log('')
console.log(`Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Expected: £1,156.00 (£5,780 × 20%)`)
console.log(`  Or if no beneficial ordering: £998.00 (£4,990 × 20%)`)
console.log('')

console.log(`Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Expected: ~£6,284.00`)
console.log('')

console.log(`Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
console.log(`  Expected: varies based on band allocation`)
console.log('')

console.log(`Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £7,905.75`)
console.log(`  Difference: £${(result.totalIncomeTax - 7905.75).toFixed(2)}`)
console.log('')

console.log('=== Student Loan Plan 1 Calculation ===')
console.log('')
console.log('Key question: Does Plan 1 use TOTAL income or just EARNED income?')
console.log('')
console.log('If using earned income only (£17,560):')
console.log(`  Threshold: £${params.bands.SL_limit1}`)
console.log(`  Income over threshold: £${17560 - params.bands.SL_limit1}`)
console.log(`  Repayment at 9%: £${((17560 - params.bands.SL_limit1) * 0.09).toFixed(2)}`)
console.log('  But £17,560 < £24,990 threshold, so would be £0')
console.log('')
console.log('If using total income (£52,150):')
console.log(`  Threshold: £${params.bands.SL_limit1}`)
console.log(`  Income over threshold: £${52150 - params.bands.SL_limit1}`)
console.log(`  Repayment at 9%: £${((52150 - params.bands.SL_limit1) * 0.09).toFixed(2)}`)
console.log('  HMRC expects: £2,444.00')
console.log('')
console.log(`Our Student Loan: £${result.studentLoanRepayment.toFixed(2)}`)
console.log(`  HMRC expected: £2,444.00`)
console.log(`  SA110 value: £${result.sa110.studentLoanRepaymentDue}`)
console.log('')

console.log('=== NIC Calculations ===')
console.log('')
console.log('Class 4 NIC:')
console.log(`  Self-employment profit: £17,560`)
console.log(`  Lower limit: £${params.bands.NIC_LEL}`)
console.log(`  Profits above threshold: £${17560 - params.bands.NIC_LEL}`)
console.log(`  Expected at 6%: £${((17560 - params.bands.NIC_LEL) * 0.06).toFixed(2)}`)
console.log(`  Our Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  HMRC expected: £299.40`)
console.log(`  Match: ${Math.abs(result.class4NIC - 299.40) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log(`Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Expected: £0.00 (registered, treated as paid)`)
console.log(`  Match: ${result.class2NIC === 0 ? '✓' : '✗'}`)
console.log('')

console.log('=== Final Tax Due Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log('  Income Tax charged: £7,905.75')
console.log('  Plus Student Loan: £2,444.00')
console.log('  Plus Class 4 NIC: £299.40')
console.log('  Plus Class 2 NIC: £0.00')
console.log('  Total: £10,649.15')
console.log('  Minus tax deducted: £0.00')
console.log('  Final tax due: £10,649.15')
console.log('')

const ourTotal = result.totalIncomeTax + result.studentLoanRepayment + result.class4NIC + result.class2NIC
console.log('Our calculation:')
console.log(`  Income Tax charged: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Plus Student Loan: £${result.studentLoanRepayment.toFixed(2)}`)
console.log(`  Plus Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  Plus Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Total: £${ourTotal.toFixed(2)}`)
console.log(`  Minus tax deducted: £${result.taxDeductedAtSource}`)
console.log(`  Tax due/refund: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  SA110 totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log('')
console.log(`  Expected: £10,649.15`)
console.log(`  Difference: £${(result.taxDueOrRefund - 10649.15).toFixed(2)}`)
console.log('')

console.log('=== Summary ===')
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 7905.75) < 1
const studentLoanMatch = Math.abs(result.studentLoanRepayment - 2444) < 1
const class4Match = Math.abs(result.class4NIC - 299.40) < 0.01
const class2Match = result.class2NIC === 0
const finalMatch = Math.abs(result.taxDueOrRefund - 10649.15) < 1
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £7,905.75)`)
console.log(`Student Loan: ${studentLoanMatch ? '✓' : '✗'} (£${result.studentLoanRepayment.toFixed(2)} vs £2,444.00)`)
console.log(`Class 4 NIC: ${class4Match ? '✓' : '✗'} (£${result.class4NIC.toFixed(2)} vs £299.40)`)
console.log(`Class 2 NIC: ${class2Match ? '✓' : '✗'} (£${result.class2NIC.toFixed(2)} vs £0.00)`)
console.log(`Final tax due: ${finalMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £10,649.15)`)
