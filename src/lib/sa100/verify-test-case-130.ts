/**
 * HMRC Test Case 130 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-130.ts
 *
 * Test Case 130: England/NI taxpayer with employment, self-employment,
 * and capital gains (CGT)
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 130 inputs from HMRC MTR-Tester
const input: TaxCalculationInput = {
  status: 'E', // England/NI (TR = 1)
  employmentIncome: 33254, // EMP1
  employmentTaxDeducted: 4136.80, // PAYE (EMP2)
  selfEmploymentProfits: 4000, // SSE net profit (£10,000 - £6,000)
  // Class 1 NIC paid: £20,684 (for Class 4 offset if applicable)
  primaryClass1NIC: 20684,
  // Capital Gains
  capitalGainsNonResidential: 90000, // Total gains (£99,000 - £9,000 costs)
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 130 Verification ===')
console.log('')
console.log('Input:')
console.log('  Employment gross pay (EMP1): £33,254.00')
console.log('  PAYE deducted (EMP2): £4,136.80')
console.log('  Self-employment net profit: £4,000.00')
console.log('  Capital gains (before AEA): £90,000.00')
console.log('')

console.log('=== Income Tax Calculation ===')
console.log('')
console.log(`Total income: £${result.totalIncome.toFixed(2)}`)
console.log(`  Expected: £37,254.00 (£33,254 + £4,000)`)
console.log(`  Match: ${result.totalIncome === 37254 ? '✓' : '✗'}`)
console.log('')

console.log(`Personal Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £12,570`)
console.log(`  Match: ${result.effectivePersonalAllowance === 12570 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable income: £${result.totalTaxableIncome.toFixed(2)}`)
console.log(`  Expected: £24,684 (£37,254 - £12,570)`)
console.log(`  Match: ${result.totalTaxableIncome === 24684 ? '✓' : '✗'}`)
console.log('')

console.log(`Income Tax @ 20%: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £4,936.80 (£24,684 × 20%)`)
console.log(`  Match: ${Math.abs(result.totalIncomeTax - 4936.80) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log(`Less PAYE deducted: £${result.taxDeductedAtSource.toFixed(2)}`)
console.log(`Income Tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
console.log(`  Expected: £800.00`)
console.log(`  Match: ${Math.abs(result.totalIncomeTax - result.taxDeductedAtSource - 800) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('=== Capital Gains Tax Calculation ===')
console.log('')
console.log(`Total gains: £${result.totalCapitalGains.toFixed(2)}`)
console.log(`  Expected: £90,000`)
console.log(`  Match: ${result.totalCapitalGains === 90000 ? '✓' : '✗'}`)
console.log('')

console.log(`Annual Exempt Amount (AEA): £${params.cgt.annualExemptAmount}`)
console.log(`Taxable gains: £${result.taxableCapitalGains.toFixed(2)}`)
console.log(`  Expected: £87,000 (£90,000 - £3,000)`)
console.log(`  Match: ${result.taxableCapitalGains === 87000 ? '✓' : '✗'}`)
console.log('')

const expectedBasicRateBandRemaining = params.bands.BR_band - result.taxableNonSavingsIncome
console.log(`Basic rate band remaining: £${expectedBasicRateBandRemaining.toFixed(2)}`)
console.log(`  (£37,700 - £${result.taxableNonSavingsIncome} taxable income)`)
console.log(`  Expected: £13,016`)
console.log(`  Match: ${expectedBasicRateBandRemaining === 13016 ? '✓' : '✗'}`)
console.log('')

console.log(`Gains at basic rate (10%): £${result.cgtBasicRateAmount.toFixed(2)}`)
console.log(`  Expected: £13,016`)
console.log(`  Match: ${result.cgtBasicRateAmount === 13016 ? '✓' : '✗'}`)
console.log('')

console.log(`Gains at higher rate (20%): £${result.cgtHigherRateAmount.toFixed(2)}`)
console.log(`  Expected: £73,984 (£87,000 - £13,016)`)
console.log(`  Match: ${result.cgtHigherRateAmount === 73984 ? '✓' : '✗'}`)
console.log('')

console.log(`CGT at basic rate: £${result.cgtAtBasicRate.toFixed(2)}`)
console.log(`  Expected: £1,301.60 (£13,016 × 10%)`)
console.log(`  Match: ${Math.abs(result.cgtAtBasicRate - 1301.60) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log(`CGT at higher rate: £${result.cgtAtHigherRate.toFixed(2)}`)
console.log(`  Expected: £14,796.80 (£73,984 × 20%)`)
console.log(`  Match: ${Math.abs(result.cgtAtHigherRate - 14796.80) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log(`Total CGT: £${result.totalCGT.toFixed(2)}`)
console.log(`  Expected: £16,098.40`)
console.log(`  Match: ${Math.abs(result.totalCGT - 16098.40) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('=== Total Tax Due ===')
console.log('')
console.log(`Income Tax due: £${(result.totalIncomeTax - result.taxDeductedAtSource).toFixed(2)}`)
console.log(`Plus CGT: £${result.netCGTDue.toFixed(2)}`)
console.log(`Total Tax Due: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  Expected: £16,898.40 (£800 + £16,098.40)`)
console.log(`  Match: ${Math.abs(result.taxDueOrRefund - 16898.40) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('=== NIC Calculation (for reference) ===')
console.log('')
console.log(`Self-employment profit: £${input.selfEmploymentProfits}`)
console.log(`Class 1 NIC paid on employment: £${input.primaryClass1NIC}`)
console.log(`Class 4 NIC: £${result.class4NIC.toFixed(2)}`)
console.log(`Class 2 NIC: £${result.class2NIC.toFixed(2)}`)
console.log('  (Note: Case 130 appears to be NIC-exempt based on description)')
console.log('')

console.log('=== Summary ===')
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 4936.80) < 0.01
const cgtMatch = Math.abs(result.totalCGT - 16098.40) < 0.01
const totalMatch = Math.abs(result.taxDueOrRefund - 16898.40) < 1 // Allow £1 rounding
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £4,936.80)`)
console.log(`CGT: ${cgtMatch ? '✓' : '✗'} (£${result.totalCGT.toFixed(2)} vs £16,098.40)`)
console.log(`Total Tax Due: ${totalMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £16,898.40)`)

// SA110 output
console.log('')
console.log('=== SA110 Output ===')
console.log(`totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log(`capitalGainsTaxDue: £${result.sa110.capitalGainsTaxDue || 0}`)
