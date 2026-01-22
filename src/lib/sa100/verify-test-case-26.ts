/**
 * HMRC Test Case 26 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-26.ts
 *
 * Test Case 26: Welsh taxpayer receiving Marriage Allowance Transfer,
 * with Gift Aid extending the basic rate band. Results in a TAX REFUND.
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 26 inputs from HMRC MTR-Tester
const input: TaxCalculationInput = {
  status: 'C', // Welsh (TR = 3)
  employmentIncome: 54415, // Net employment (£57,415 - £3,000 expenses)
  employmentTaxDeducted: 8969, // PAYE (EMP2)
  selfEmploymentProfits: 0,
  untaxedInterest: 45, // INC2
  ukDividends: 997, // INC4
  giftAidDonations: 4145, // REL5 - extends basic rate band
  marriageAllowanceReceived: true, // Receiving MA transfer
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 26 Verification ===')
console.log('')
console.log('Input:')
console.log('  Employment gross pay (EMP1): £57,415.00')
console.log('  Allowable expenses (EMP18/19/20): £3,000.00')
console.log('  Net employment income: £54,415.00')
console.log('  PAYE deducted (EMP2): £8,969.00')
console.log('  Untaxed UK interest (INC2): £45.00')
console.log('  UK dividends (INC4): £997.00')
console.log('  Gift Aid payments (REL5): £4,145.00')
console.log('  Marriage Allowance: RECEIVING')
console.log('')

console.log('=== Income Calculation ===')
const expectedTotalIncome = 54415 + 45 + 997 // 55,457
console.log(`Total income: £${result.totalIncome}`)
console.log(`  Expected: £55,457 (£54,415 + £45 + £997)`)
console.log(`  Match: ${result.totalIncome === 55457 ? '✓' : '✗'}`)
console.log('')

console.log(`Personal Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £12,570`)
console.log(`  Match: ${result.effectivePersonalAllowance === 12570 ? '✓' : '✗'}`)
console.log('')

console.log(`Total taxable income: £${result.totalTaxableIncome}`)
console.log(`  Expected: £42,887 (£55,457 - £12,570)`)
console.log(`  Match: ${result.totalTaxableIncome === 42887 ? '✓' : '✗'}`)
console.log('')

console.log('=== Gift Aid Extension ===')
const giftAidGross = 4145 * 1.25
console.log(`Gift Aid net: £4,145`)
console.log(`Gift Aid gross (× 1.25): £${giftAidGross.toFixed(2)}`)
const extendedBand = 37700 + Math.round(giftAidGross)
console.log(`Extended basic rate band: £37,700 + £${Math.round(giftAidGross)} = £${extendedBand}`)
console.log('')

console.log('=== Taxable Income Breakdown ===')
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Expected: £41,845 (£54,415 - £12,570)`)
console.log(`  Match: ${result.taxableNonSavingsIncome === 41845 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Expected: £45`)
console.log(`  Match: ${result.taxableSavingsIncome === 45 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`  Expected: £997`)
console.log(`  Match: ${result.taxableDividendIncome === 997 ? '✓' : '✗'}`)
console.log('')

console.log('=== HMRC Tax Calculation Breakdown ===')
console.log('')
console.log('Extended basic rate band: £42,882')
console.log('Taxable non-savings: £41,845')
console.log('Remaining basic rate: £42,882 - £41,845 = £1,037')
console.log('')
console.log('Tax on non-savings:')
console.log('  All in basic rate: £41,845 × 20% = £8,369.00')
console.log('  (Or HMRC shows £42,842 × 20% = £8,568.40 including dividends)')
console.log('')
console.log('Tax on savings (£45):')
console.log('  PSA at basic rate: £45 at 0% = £0')
console.log('  (Remaining basic band available, so PSA is £1,000)')
console.log('')
console.log('Tax on dividends (£997):')
console.log('  Dividend allowance: £500 at 0%')
console.log('  Remaining £497 in basic rate: £497 × 8.75% = £43.49')
console.log('  OR per HMRC methodology: £997 × 20% = £199.40')
console.log('')
console.log('Income Tax charged (before MA): ~£8,568.40')
console.log('')
console.log('Marriage Allowance reduction:')
console.log('  Transfer amount: £1,260')
console.log('  Tax reduction: £1,260 × 20% = £252.00')
console.log('')
console.log('Income Tax after MA: £8,568.40 - £252.00 = £8,316.40')
console.log('')

console.log('=== Our Calculation Results ===')
console.log('')
console.log(`Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log(`Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
console.log(`Marriage Allowance adjustment: £${result.marriageAllowanceAdjustment.toFixed(2)}`)
console.log(`Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected (after MA): £8,316.40`)
console.log(`  Difference: £${(result.totalIncomeTax - 8316.40).toFixed(2)}`)
console.log('')

console.log('=== Final Tax Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log('  Income Tax (after MA): £8,316.40')
console.log('  Plus Class 4 NIC: £0.00')
console.log('  Plus Class 2 NIC: £0.00')
console.log('  Total tax due: £8,316.40')
console.log('  Tax deducted (PAYE): £8,969.00')
console.log('  Tax OVERPAID (refund): £8,969.00 - £8,316.40 = £652.60')
console.log('')

console.log('Our calculation:')
console.log(`  Income Tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Plus Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  Plus Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Total tax and NIC due: £${result.totalTaxAndNICDue.toFixed(2)}`)
console.log(`  Tax deducted (PAYE): £${result.taxDeductedAtSource.toFixed(2)}`)
console.log(`  Tax due/refund: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`    (Negative = refund, Positive = due)`)
console.log('')
console.log(`  SA110 totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log('')
console.log(`  Expected refund: £652.60`)
console.log(`  Our refund: £${(-result.taxDueOrRefund).toFixed(2)}`)
console.log(`  Difference: £${(result.taxDueOrRefund + 652.60).toFixed(2)}`)
console.log('')

console.log('=== SA110 Output Check ===')
console.log('')
console.log('For a refund, SA110 should show:')
console.log('  CAL1 (totalTaxEtcDue): £0 or blank')
console.log('  CAL2 (taxOverpaid): £652.60 (or rounded)')
console.log('')
console.log('Our SA110 output:')
console.log(`  totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
// Check if we have a taxOverpaid field
const sa110Any = result.sa110 as Record<string, unknown>
console.log(`  taxOverpaid: £${sa110Any.taxOverpaid ?? 'NOT IMPLEMENTED'}`)
console.log('')

console.log('=== Summary ===')
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 8316.40) < 1
const refundMatch = Math.abs(-result.taxDueOrRefund - 652.60) < 1
const class4Match = result.class4NIC === 0
const class2Match = result.class2NIC === 0
console.log(`Income Tax (after MA): ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £8,316.40)`)
console.log(`Class 4 NIC: ${class4Match ? '✓' : '✗'} (£${result.class4NIC.toFixed(2)} vs £0.00)`)
console.log(`Class 2 NIC: ${class2Match ? '✓' : '✗'} (£${result.class2NIC.toFixed(2)} vs £0.00)`)
console.log(`Tax refund: ${refundMatch ? '✓' : '✗'} (£${(-result.taxDueOrRefund).toFixed(2)} vs £652.60)`)
