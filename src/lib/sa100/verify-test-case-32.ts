/**
 * HMRC Test Case 32 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-32.ts
 *
 * Test Case 32: England/NI taxpayer with Student Loan Plan 4 (Scottish),
 * Gift Aid extending basic rate, and retirement annuity deduction
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 32 inputs from HMRC MTR-Tester
const input: TaxCalculationInput = {
  status: 'E', // England/NI (TR = 1)
  employmentIncome: 36450, // EMP1 (£33,750) + benefits (£2,700)
  employmentTaxDeducted: 4776, // PAYE (EMP2)
  selfEmploymentProfits: 3400, // Foreign self-employment (FSE)
  untaxedInterest: 22175, // INC2
  ukDividends: 7560, // INC4
  retirementAnnuityDeduction: 2500, // REL2 - deduction from total income
  giftAidDonations: 978, // REL5 - extends basic rate band by £1,223 gross
  studentLoanPlan: 4, // Plan 4 (Scottish)
  class2NICRegistered: true, // Treated as paid
  primaryClass1NIC: 21180, // Reduces Class 4 liability
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 32 Verification ===')
console.log('')
console.log('Input:')
console.log('  Employment gross pay (EMP1): £33,750.00')
console.log('  Benefits received (EMP11+14): £2,700.00')
console.log('  Total employment income: £36,450.00')
console.log('  PAYE deducted (EMP2): £4,776.00')
console.log('  Foreign self-employment (FSE): £3,400.00')
console.log('  Untaxed UK interest (INC2): £22,175.00')
console.log('  UK dividends (INC4): £7,560.00')
console.log('  Retirement annuity (REL2): £2,500.00')
console.log('  Gift Aid payments (REL5): £978.00')
console.log('  Student Loan: Plan 4')
console.log('  Class 2 NIC registered: Yes')
console.log('  Class 1 NIC contributions: £21,180.00')
console.log('')

console.log('=== Income Calculation ===')
const expectedTotalIncome = 36450 + 3400 + 22175 + 7560 // 69,585
console.log(`Total income: £${result.totalIncome}`)
console.log(`  Expected: £69,585 (£36,450 + £3,400 + £22,175 + £7,560)`)
console.log(`  Match: ${result.totalIncome === 69585 ? '✓' : '✗'}`)
console.log('')

console.log('=== Deductions ===')
console.log('Retirement annuity: £2,500')
console.log('Personal Allowance: £12,570')
console.log('Total deductions from income: £15,070')
console.log('')

console.log('=== Gift Aid Extension ===')
const giftAidGross = 978 * 1.25
console.log(`Gift Aid net: £978`)
console.log(`Gift Aid gross (× 1.25): £${giftAidGross.toFixed(2)}`)
console.log(`Extended basic rate band: £37,700 + £${Math.round(giftAidGross)} = £${37700 + Math.round(giftAidGross)}`)
console.log('')

console.log(`Personal Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £12,570`)
console.log(`  Match: ${result.effectivePersonalAllowance === 12570 ? '✓' : '✗'}`)
console.log('')

console.log(`Total taxable income: £${result.totalTaxableIncome}`)
console.log(`  Expected: £54,515 (after retirement annuity and PA)`)
// Actually need to verify this calculation
console.log('')

console.log('=== Taxable Income Breakdown ===')
const expectedNonSavings = 36450 + 3400 - 2500 // 37,350 before PA
console.log(`Non-savings income (before PA): £${expectedNonSavings}`)
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Expected: £24,780 (£37,350 - £12,570)`)
// But HMRC shows £38,923 at basic rate - need to investigate
console.log('')

console.log(`Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Expected: £22,175`)
console.log(`  Match: ${result.taxableSavingsIncome === 22175 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`  Expected: £7,560`)
console.log(`  Match: ${result.taxableDividendIncome === 7560 ? '✓' : '✗'}`)
console.log('')

console.log('=== HMRC Tax Calculation ===')
console.log('')
console.log('HMRC breakdown:')
console.log('  Non-savings at basic rate: £38,923 × 20% = £7,784.60')
console.log('  (This includes the Gift Aid extended band)')
console.log('')
console.log('  Savings (£22,175):')
console.log('    Starting rate: £0 × 0% = £0.00')
console.log('    Basic rate: £0 × 20% = £0.00')
console.log('    Higher rate PSA: £500 × 0% = £0.00')
console.log('    Higher rate: £7,532 × 40% = £3,012.80')
console.log('')
console.log('  Dividends (£7,560):')
console.log('    Higher rate DA: £500 × 0% = £0.00')
console.log('    Higher rate: £7,060 × 33.75% = £2,382.75')
console.log('')
console.log('  Income Tax charged: £13,180.15')
console.log('')

console.log('=== Our Calculation Results ===')
console.log('')
console.log(`Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Expected: £7,784.60 (or different based on our band allocation)`)
console.log('')

console.log(`Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Expected: £3,012.80`)
console.log('')

console.log(`Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
console.log(`  Expected: £2,382.75`)
console.log('')

console.log(`Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £13,180.15`)
console.log(`  Difference: £${(result.totalIncomeTax - 13180.15).toFixed(2)}`)
console.log('')

console.log('=== Student Loan Plan 4 Calculation ===')
console.log('')
const earnedIncome = 36450 + 3400 // Employment + self-employment
console.log(`Earned income for loan: £${earnedIncome}`)
console.log(`Plan 4 threshold: £${params.bands.SL_limit4}`)
console.log(`Income over threshold: £${earnedIncome - params.bands.SL_limit4}`)
console.log(`Repayment at 9%: £${((earnedIncome - params.bands.SL_limit4) * 0.09).toFixed(2)}`)
console.log('')
console.log(`Our Student Loan: £${result.studentLoanRepayment.toFixed(2)}`)
console.log(`  HMRC expected: £2,757.00`)
console.log(`  SA110 value: £${result.sa110.studentLoanRepaymentDue}`)
console.log('')

// Check what income would give £2,757
const expectedLoanIncome = (2757 / 0.09) + params.bands.SL_limit4
console.log(`To get £2,757.00:`)
console.log(`  Income needed: £${expectedLoanIncome.toFixed(2)}`)
console.log(`  Difference from our earned income: £${(expectedLoanIncome - earnedIncome).toFixed(2)}`)
console.log('')

console.log('=== NIC Calculations ===')
console.log(`Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  Expected: £0.00`)
console.log(`  Match: ${result.class4NIC === 0 ? '✓' : '✗'}`)
console.log('')

console.log(`Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Expected: £0.00 (registered, treated as paid)`)
console.log(`  Match: ${result.class2NIC === 0 ? '✓' : '✗'}`)
console.log('')

console.log('=== Final Tax Due Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log('  Income Tax charged: £13,180.15')
console.log('  Plus Student Loan: £2,757.00')
console.log('  Total: £15,937.15')
console.log('  Minus tax deducted: £4,776.00')
console.log('  Final tax due: £11,161.15')
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
console.log(`  Expected: £11,161.15`)
console.log(`  Difference: £${(result.taxDueOrRefund - 11161.15).toFixed(2)}`)
console.log('')

console.log('=== Summary ===')
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 13180.15) < 1
const studentLoanMatch = Math.abs(result.studentLoanRepayment - 2757) < 1
const finalMatch = Math.abs(result.taxDueOrRefund - 11161.15) < 1
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £13,180.15)`)
console.log(`Student Loan: ${studentLoanMatch ? '✓' : '✗'} (£${result.studentLoanRepayment.toFixed(2)} vs £2,757.00)`)
console.log(`Final tax due: ${finalMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £11,161.15)`)
