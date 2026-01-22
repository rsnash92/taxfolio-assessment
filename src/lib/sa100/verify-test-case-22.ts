/**
 * HMRC Test Case 22 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-22.ts
 *
 * Test Case 22: England/NI taxpayer with employment, self-employment,
 * Class 2/4 NIC, and additional rate tax
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 22 inputs from HMRC MTR-Tester
// Note: HMRC uses £81 gross interest (not £81.25) to get total interest of £136 exactly
// But tax deducted is £16.25 as per HMRC, giving total tax deducted of £30,059.45
const input: TaxCalculationInput = {
  status: 'E', // England/NI (TR = 1)
  employmentIncome: 103656, // Net employment income (£104,239 - £583 expenses)
  employmentTaxDeducted: 30043.20, // PAYE (EMP2)
  selfEmploymentProfits: 21875, // SSE28/31
  taxedInterest: 81, // INC1 gross (rounded to match HMRC total of £136)
  taxedInterestTaxDeducted: 16.25, // Tax deducted from interest per HMRC
  untaxedInterest: 55, // INC2
  ukDividends: 3513, // INC4
  class2NICRegistered: true, // Treated as paid
  primaryClass1NIC: 37700, // Reduces Class 4 liability
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 22 Verification ===')
console.log('')
console.log('Input:')
console.log('  Gross employment pay (EMP1): £104,239.00')
console.log('  Allowable expenses (EMP19): £583.00')
console.log('  Net employment income: £103,656.00')
console.log('  PAYE deducted (EMP2): £30,043.20')
console.log('  Self-employment profit (SSE28/31): £21,875.00')
console.log('  Taxed UK interest gross (INC1): £81.25 (tax: £16.25)')
console.log('  Untaxed UK interest (INC2): £55.00')
console.log('  UK dividends (INC4): £3,513.00')
console.log('  Class 2 NIC registered: Yes')
console.log('  Primary Class 1 NIC contributions: £37,700.00')
console.log('')

console.log('=== Income Calculation ===')
const expectedTotalIncome = 103656 + 21875 + 136 + 3513 // 129,180
console.log(`Total income: £${result.totalIncome}`)
console.log(`  Expected: £129,180 (£103,656 + £21,875 + £136 + £3,513)`)
console.log(`  Match: ${result.totalIncome === 129180 ? '✓' : '✗'}`)
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
console.log(`  Expected: £129,180`)
console.log(`  Match: ${result.totalTaxableIncome === 129180 ? '✓' : '✗'}`)
console.log('')

console.log('=== Taxable Income Breakdown ===')
const expectedNonSavings = 103656 + 21875 // 125,531
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Expected: £125,531 (£103,656 + £21,875)`)
console.log(`  Match: ${result.taxableNonSavingsIncome === 125531 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Expected: £136`)
console.log(`  Match: ${result.taxableSavingsIncome === 136 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`  Expected: £3,513`)
console.log(`  Match: ${result.taxableDividendIncome === 3513 ? '✓' : '✗'}`)
console.log('')

console.log('=== HMRC Tax Calculation Breakdown ===')
console.log('')
console.log('Tax on non-savings (£125,531):')
console.log('  Basic rate band: £37,700 × 20% = £7,540.00')
console.log('  Higher rate band: £87,440 × 40% = £34,976.00')
console.log('  Additional rate: £391 × 45% = £175.95')
console.log('  Total non-savings tax: £42,691.95')
console.log('')
console.log('Tax on savings (£136) - all at additional rate:')
console.log('  PSA at additional rate: £0 (no PSA)')
console.log('  £136 × 45% = £61.20')
console.log('')
console.log('Tax on dividends (£3,513):')
console.log('  DA at 0%: £500')
console.log('  £3,013 × 39.35% = £1,185.61')
console.log('')
console.log('Income Tax charged: £43,938.76')
console.log('')

console.log('=== Our Calculation Results ===')
console.log('')
console.log(`Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Expected: £42,691.95`)
console.log(`  Difference: £${(result.taxOnNonSavings - 42691.95).toFixed(2)}`)
console.log('')

console.log(`Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Expected: £61.20`)
console.log(`  Difference: £${(result.taxOnSavings - 61.20).toFixed(2)}`)
console.log('')

console.log(`Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
console.log(`  Expected: £1,185.61`)
console.log(`  Difference: £${(result.taxOnDividends - 1185.61).toFixed(2)}`)
console.log('')

console.log(`Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £43,938.76`)
console.log(`  Difference: £${(result.totalIncomeTax - 43938.76).toFixed(2)}`)
console.log('')

console.log('=== Class 4 NIC Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log('  Self-employment profit: £21,875')
console.log('  Lower profits limit (LPL): £12,570')
console.log('  Upper profits limit (UPL): £50,270')
console.log('  Profits in main band: £21,875 - £12,570 = £9,305')
console.log('  Class 4 at 6%: £9,305 × 6% = £558.30')
console.log('')
console.log('  Class 1 NIC adjustment:')
console.log('    Primary Class 1 paid: £37,700')
console.log('    Class 1 threshold: £12,570')
console.log('    Excess: £37,700 - £12,570 = £25,130')
console.log('    Adjustment at 12%: £25,130 × 12% = £3,015.60')
console.log('    BUT this exceeds £558.30, so only credit up to that amount')
console.log('')
console.log('  Class 2 adjustment: £179.40 (if registered)')
console.log('')
console.log('  Final Class 4: £558.30 - £372.20 = £186.10')
console.log('    (Or some other calculation method...)')
console.log('')

console.log(`Our Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  Expected: £186.10`)
console.log(`  Difference: £${(result.class4NIC - 186.10).toFixed(2)}`)
console.log('')

console.log('=== Class 2 NIC ===')
console.log(`Our Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Expected: £0.00 (registered, treated as paid)`)
console.log(`  Match: ${result.class2NIC === 0 ? '✓' : '✗'}`)
console.log('')

console.log('=== Tax Deducted at Source ===')
const expectedTaxDeducted = 30043.20 + 16.25 // 30,059.45
console.log(`Tax deducted: £${result.taxDeductedAtSource}`)
console.log(`  Expected: £30,059.45 (£30,043.20 PAYE + £16.25 interest tax)`)
console.log(`  Match: ${Math.abs(result.taxDeductedAtSource - 30059.45) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('=== Final Tax Due Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log('  Income Tax charged: £43,938.76')
console.log('  Plus Class 4 NIC: £186.10')
console.log('  Plus Class 2 NIC: £0.00')
console.log('  Total tax + NIC: £44,124.86')
console.log('  Minus tax deducted: £30,059.45')
console.log('  Final tax due: £14,065.41')
console.log('')

const ourTotalTaxAndNIC = result.totalIncomeTax + result.class4NIC + result.class2NIC
console.log('Our calculation:')
console.log(`  Income Tax charged: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Plus Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`  Plus Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log(`  Total tax + NIC: £${ourTotalTaxAndNIC.toFixed(2)}`)
console.log(`  Minus tax deducted: £${result.taxDeductedAtSource}`)
console.log(`  Tax due/refund: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  SA110 totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log('')
console.log(`  Expected: £14,065.41`)
console.log(`  Difference: £${(result.taxDueOrRefund - 14065.41).toFixed(2)}`)
console.log('')

console.log('=== Summary ===')
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 43938.76) < 0.01
const class4Match = Math.abs(result.class4NIC - 186.10) < 0.01
const class2Match = result.class2NIC === 0
const finalMatch = Math.abs(result.taxDueOrRefund - 14065.41) < 0.01
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £43,938.76)`)
console.log(`Class 4 NIC: ${class4Match ? '✓' : '✗'} (£${result.class4NIC.toFixed(2)} vs £186.10)`)
console.log(`Class 2 NIC: ${class2Match ? '✓' : '✗'} (£${result.class2NIC.toFixed(2)} vs £0.00)`)
console.log(`Final tax due: ${finalMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £14,065.41)`)
