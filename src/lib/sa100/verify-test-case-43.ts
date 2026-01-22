/**
 * HMRC Test Case 43 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-43.ts
 *
 * Test Case 43: England/NI taxpayer with high income (PA tapered to £0),
 * Blind Person's Allowance, Marriage Allowance OUT, dividends in additional rate,
 * and CGT with BADR gains
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 43 inputs from HMRC MTR-Tester
const input: TaxCalculationInput = {
  status: 'E', // England/NI (TR = 1)
  // Employment: £101,000 + £13,000 benefits - £175 expenses = £113,825
  employmentIncome: 113825,
  employmentTaxDeducted: 23084, // PAYE
  selfEmploymentProfits: 0,
  // Savings
  untaxedInterest: 3678, // UK bank interest
  // Dividends
  ukDividends: 12750,
  // Allowances
  blindPersonsAllowance: true, // BPA = £3,070
  marriageAllowanceTransferred: true, // MAT-OUT (loses £1,260 from PA)
  // Capital Gains
  // Total gains: £50,000 (BADR £20,000 + Other £30,000)
  // Note: capitalGainsNonResidential includes BADR gains
  capitalGainsNonResidential: 50000, // Total non-residential gains
  badrQualifyingGains: 20000, // BADR gains (subset of non-residential)
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 43 Verification ===')
console.log('')
console.log('Input:')
console.log('  Employment income: £113,825.00')
console.log('  Untaxed interest: £3,678.00')
console.log('  UK dividends: £12,750.00')
console.log('  Blind Person\'s Allowance: Yes (£3,070)')
console.log('  Marriage Allowance OUT: Yes')
console.log('  Capital Gains (BADR): £20,000.00')
console.log('  Capital Gains (Other): £30,000.00')
console.log('')

console.log('=== Income Calculation ===')
console.log('')
console.log(`Total income: £${result.totalIncome.toFixed(2)}`)
console.log(`  Expected: £130,253 (£113,825 + £3,678 + £12,750)`)
console.log(`  Match: ${result.totalIncome === 130253 ? '✓' : '✗'}`)
console.log('')

console.log('=== Personal Allowance Taper ===')
console.log('')
console.log('Standard PA: £12,570')
console.log('Less MAT-OUT: £1,260')
console.log('Adjusted PA before taper: £11,310')
console.log('')
console.log(`Adjusted Net Income: £${result.totalIncome}`)
console.log('Excess over £100,000: £' + (result.totalIncome - 100000))
console.log('PA reduction: £' + Math.floor((result.totalIncome - 100000) / 2) + ' (capped at PA)')
console.log('')
console.log(`Effective Standard PA: £${result.effectivePersonalAllowance - (input.blindPersonsAllowance ? params.allowances.BPA : 0)}`)
console.log(`  Expected: £0 (fully tapered)`)
console.log('')
console.log(`Blind Person\'s Allowance: £${input.blindPersonsAllowance ? params.allowances.BPA : 0}`)
console.log(`  (Not subject to taper)`)
console.log('')
console.log(`Total Effective Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £3,070 (only BPA remains)`)
console.log(`  Match: ${result.effectivePersonalAllowance === 3070 ? '✓' : '✗'}`)
console.log('')

console.log('=== Taxable Income ===')
console.log('')
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome.toFixed(2)}`)
console.log(`  Expected: £110,755 (£113,825 - £3,070 BPA)`)
console.log(`  Match: ${result.taxableNonSavingsIncome === 110755 ? '✓' : '✗'}`)
console.log('')
console.log(`Taxable savings: £${result.taxableSavingsIncome.toFixed(2)}`)
console.log(`  Expected: £3,678`)
console.log(`  Match: ${result.taxableSavingsIncome === 3678 ? '✓' : '✗'}`)
console.log('')
console.log(`Taxable dividends: £${result.taxableDividendIncome.toFixed(2)}`)
console.log(`  Expected: £12,750`)
console.log(`  Match: ${result.taxableDividendIncome === 12750 ? '✓' : '✗'}`)
console.log('')
console.log(`Total taxable: £${result.totalTaxableIncome.toFixed(2)}`)
console.log(`  Expected: £127,183`)
console.log(`  Match: ${result.totalTaxableIncome === 127183 ? '✓' : '✗'}`)
console.log('')

console.log('=== Income Tax Calculation ===')
console.log('')
console.log('Non-savings tax:')
console.log(`  Basic rate: £37,700 × 20% = £7,540.00`)
console.log(`  Higher rate: £73,055 × 40% = £29,222.00`)
console.log(`  Our calculation: £${result.taxOnNonSavings.toFixed(2)}`)
const expectedNonSavingsTax = 37700 * 0.20 + 73055 * 0.40
console.log(`  Expected: £${expectedNonSavingsTax.toFixed(2)}`)
console.log(`  Match: ${Math.abs(result.taxOnNonSavings - expectedNonSavingsTax) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('Savings tax (all in higher rate band):')
console.log(`  Higher rate: £3,678 × 40% = £1,471.20`)
console.log(`  Our calculation: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Expected: £1,471.20`)
console.log(`  Match: ${Math.abs(result.taxOnSavings - 1471.20) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('Dividend tax:')
console.log('  Income before dividends: £' + (result.taxableNonSavingsIncome + result.taxableSavingsIncome))
console.log('  Additional rate threshold: £125,140')
console.log('')
console.log('  Dividend Allowance: £500 × 0% = £0')
console.log('  Higher rate (33.75%): £10,207 × 33.75% = £3,444.86')
console.log('  Additional rate (39.35%): £2,043 × 39.35% = £803.92')
console.log(`  Our calculation: £${result.taxOnDividends.toFixed(2)}`)
const expectedDividendTax = 10207 * 0.3375 + 2043 * 0.3935
console.log(`  Expected: £${expectedDividendTax.toFixed(2)}`)
console.log(`  Match: ${Math.abs(result.taxOnDividends - expectedDividendTax) < 1 ? '✓' : '✗'}`)
console.log('')

console.log(`Total Income Tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £42,481.98`)
console.log(`  Match: ${Math.abs(result.totalIncomeTax - 42481.98) < 1 ? '✓' : '✗'}`)
console.log('')

console.log(`Less PAYE: £${result.taxDeductedAtSource.toFixed(2)}`)
console.log(`Income Tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
console.log(`  Expected: £19,397.98`)
console.log(`  Match: ${Math.abs(result.totalIncomeTax - result.taxDeductedAtSource - 19397.98) < 1 ? '✓' : '✗'}`)
console.log('')

console.log('=== Capital Gains Tax ===')
console.log('')
console.log(`Total gains: £${result.totalCapitalGains.toFixed(2)}`)
console.log(`  Expected: £50,000`)
console.log(`  Match: ${result.totalCapitalGains === 50000 ? '✓' : '✗'}`)
console.log('')

console.log('AEA allocation (applied to non-BADR gains first):')
console.log('  Other gains: £30,000 - £3,000 AEA = £27,000')
console.log('  BADR gains: £20,000 (no AEA reduction)')
console.log('')

console.log(`Taxable gains: £${result.taxableCapitalGains.toFixed(2)}`)
console.log(`  Expected: £47,000 (£27,000 + £20,000)`)
console.log(`  Match: ${result.taxableCapitalGains === 47000 ? '✓' : '✗'}`)
console.log('')

console.log('CGT calculation:')
console.log('  BADR gains: £20,000 × 10% = £2,000.00')
console.log('  Other gains @ 20%: £27,000 × 20% = £5,400.00')
console.log('  (No basic rate band remaining - taxable income £127,183 > £37,700)')
console.log('')
console.log(`  CGT at basic/BADR rate: £${result.cgtAtBasicRate.toFixed(2)}`)
console.log(`  CGT at higher rate: £${result.cgtAtHigherRate.toFixed(2)}`)
console.log(`  Total CGT: £${result.totalCGT.toFixed(2)}`)
console.log(`  Expected: £7,400.00`)
console.log(`  Match: ${Math.abs(result.totalCGT - 7400) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('=== Total Tax Due ===')
console.log('')
console.log(`Income Tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
console.log(`Plus CGT: £${result.netCGTDue.toFixed(2)}`)
console.log(`Total Tax Due: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  Expected: £26,797.98 (£19,397.98 + £7,400)`)
console.log(`  Match: ${Math.abs(result.taxDueOrRefund - 26797.98) < 1 ? '✓' : '✗'}`)
console.log('')

console.log('=== Summary ===')
const paMatch = result.effectivePersonalAllowance === 3070
const taxableMatch = result.totalTaxableIncome === 127183
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 42481.98) < 1
const cgtMatch = Math.abs(result.totalCGT - 7400) < 0.01
const totalMatch = Math.abs(result.taxDueOrRefund - 26797.98) < 1
console.log(`Effective PA (BPA only): ${paMatch ? '✓' : '✗'} (£${result.effectivePersonalAllowance} vs £3,070)`)
console.log(`Taxable income: ${taxableMatch ? '✓' : '✗'} (£${result.totalTaxableIncome} vs £127,183)`)
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £42,481.98)`)
console.log(`CGT: ${cgtMatch ? '✓' : '✗'} (£${result.totalCGT.toFixed(2)} vs £7,400.00)`)
console.log(`Total Tax Due: ${totalMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £26,797.98)`)
