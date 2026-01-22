/**
 * HMRC Test Case 194 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-194.ts
 *
 * Test Case 194: England/NI taxpayer with high income, pension contributions,
 * and High Income Child Benefit Charge (HICBC)
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 194 inputs from HMRC MTR-Tester
// Employment calculation:
// - Pay: £165,978
// - Plus benefits/expenses: £5,360 + £200 + £16,800 = £22,360
// - Minus allowable: £450 + £250 + £600 = £1,300
// - Total employment: £187,038
const input: TaxCalculationInput = {
  status: 'E', // England/NI (TR = 1)
  employmentIncome: 187038, // Net employment income after expenses
  employmentTaxDeducted: 52819.20, // PAYE (EMP3)
  selfEmploymentProfits: 0,
  untaxedInterest: 3678, // INC2 - UK bank interest
  ukDividends: 12750, // INC5 - UK dividends
  // Pension contributions - deducted from total income
  // Using net pay arrangement (does NOT extend basic rate band)
  // Based on HMRC expected output which shows standard £37,700 basic rate band
  pensionContributionsNetPay: 25600,
  // Child Benefit for HICBC
  childBenefitReceived: 1197.00, // CBC1
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 194 Verification ===')
console.log('')
console.log('Input:')
console.log('  Employment income: £187,038.00')
console.log('  PAYE deducted: £52,819.20')
console.log('  UK bank interest: £3,678.00')
console.log('  UK dividends: £12,750.00')
console.log('  Pension contributions (relief): £25,600.00')
console.log('  Child benefit received: £1,197.00')
console.log('')

console.log('=== Income Calculation ===')
console.log('')
const expectedTotalIncome = 187038 + 3678 + 12750
console.log(`Total income: £${result.totalIncome.toFixed(2)}`)
console.log(`  Expected: £${expectedTotalIncome} (£187,038 + £3,678 + £12,750)`)
console.log(`  Match: ${result.totalIncome === expectedTotalIncome ? '✓' : '✗'}`)
console.log('')

console.log('=== Adjusted Net Income (ANI) ===')
console.log('')
console.log('ANI = Total income - Pension contributions')
const expectedANI = expectedTotalIncome - 25600 // 177,866
console.log(`ANI: £${result.adjustedNetIncome.toFixed(2)}`)
console.log(`  Expected: £${expectedANI} (£${expectedTotalIncome} - £25,600)`)
console.log(`  Match: ${result.adjustedNetIncome === expectedANI ? '✓' : '✗'}`)
console.log('')

console.log('=== Personal Allowance Taper ===')
console.log('')
console.log('Since ANI (£177,866) > £125,140:')
console.log('  PA is fully tapered to £0')
console.log(`Our effective PA: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £0`)
console.log(`  Match: ${result.effectivePersonalAllowance === 0 ? '✓' : '✗'}`)
console.log('')

console.log('=== Taxable Income ===')
console.log('')
// Taxable income = Total income - Pension contributions - PA
// But PA = 0, so taxable = Total - Pension = ANI
const expectedTaxableIncome = expectedANI // 177,866
console.log(`Total taxable income: £${result.totalTaxableIncome}`)
console.log(`  Expected: £${expectedTaxableIncome}`)
console.log(`  Match: ${result.totalTaxableIncome === expectedTaxableIncome ? '✓' : '✗'}`)
console.log('')

console.log('Taxable breakdown:')
// Non-savings = Employment - PA - Pension relief
// Employment: 187,038
// Less pension: 25,600 (already deducted from ANI)
// Taxable employment: 187,038 - 25,600 = 161,438
const expectedTaxableNonSavings = 187038 - 25600 // 161,438
console.log(`  Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`    Expected: £${expectedTaxableNonSavings} (£187,038 - £25,600)`)
console.log(`    Match: ${result.taxableNonSavingsIncome === expectedTaxableNonSavings ? '✓' : '✗'}`)
console.log('')
console.log(`  Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`    Expected: £3,678`)
console.log(`    Match: ${result.taxableSavingsIncome === 3678 ? '✓' : '✗'}`)
console.log('')
console.log(`  Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`    Expected: £12,750`)
console.log(`    Match: ${result.taxableDividendIncome === 12750 ? '✓' : '✗'}`)
console.log('')

console.log('=== Income Tax Calculation ===')
console.log('')
console.log('Non-savings tax (£161,438):')
console.log('  Basic rate: £37,700 × 20% = £7,540.00')
console.log('  Higher rate: £87,440 × 40% = £34,976.00')
console.log('  Additional rate: £36,298 × 45% = £16,334.10')
const expectedNonSavingsTax = 37700 * 0.20 + 87440 * 0.40 + 36298 * 0.45
console.log(`  Our calculation: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  Expected: £${expectedNonSavingsTax.toFixed(2)}`)
console.log(`  Match: ${Math.abs(result.taxOnNonSavings - expectedNonSavingsTax) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('Savings tax (£3,678 - all additional rate, no PSA):')
console.log('  Additional rate: £3,678 × 45% = £1,655.10')
const expectedSavingsTax = 3678 * 0.45
console.log(`  Our calculation: £${result.taxOnSavings.toFixed(2)}`)
console.log(`  Expected: £${expectedSavingsTax.toFixed(2)}`)
console.log(`  Match: ${Math.abs(result.taxOnSavings - expectedSavingsTax) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('Dividend tax (£12,750):')
console.log('  DA at 0%: £500')
console.log('  Additional rate: £12,250 × 39.35% = £4,820.37')
const expectedDividendTax = 12250 * 0.3935
console.log(`  Our calculation: £${result.taxOnDividends.toFixed(2)}`)
console.log(`  Expected: £${expectedDividendTax.toFixed(2)}`)
console.log(`  Match: ${Math.abs(result.taxOnDividends - expectedDividendTax) < 1 ? '✓' : '✗'}`)
console.log('')

const expectedTotalIncomeTax = expectedNonSavingsTax + expectedSavingsTax + expectedDividendTax
console.log(`Total Income Tax charged: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Expected: £${expectedTotalIncomeTax.toFixed(2)}`)
console.log(`  Match: ${Math.abs(result.totalIncomeTax - expectedTotalIncomeTax) < 1 ? '✓' : '✗'}`)
console.log('')

console.log('=== High Income Child Benefit Charge (HICBC) ===')
console.log('')
console.log('HICBC Thresholds:')
console.log('  Lower threshold: £60,000')
console.log('  Upper threshold: £80,000')
console.log('')
console.log(`ANI: £${result.adjustedNetIncome}`)
console.log('Since ANI (£177,866) >= £80,000:')
console.log('  HICBC = 100% of child benefit')
console.log('')
console.log(`Child benefit received: £${input.childBenefitReceived}`)
console.log(`HICBC charge: £${result.hicbcCharge.toFixed(2)}`)
console.log(`  Expected: £1,197.00`)
console.log(`  Match: ${Math.abs(result.hicbcCharge - 1197) < 0.01 ? '✓' : '✗'}`)
console.log('')

console.log('=== Final Tax Calculation ===')
console.log('')
console.log('HMRC calculation:')
console.log(`  Income Tax charged: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Plus HICBC: £${result.hicbcCharge.toFixed(2)}`)
const totalTaxBeforePAYE = result.totalIncomeTax + result.hicbcCharge
console.log(`  Total tax due: £${totalTaxBeforePAYE.toFixed(2)}`)
console.log(`  Less PAYE: £${result.taxDeductedAtSource.toFixed(2)}`)
console.log('')

const expectedTaxDue = totalTaxBeforePAYE - 52819.20
console.log(`  Tax due: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  Expected: £13,703.37`)
console.log(`  Match: ${Math.abs(result.taxDueOrRefund - 13703.37) < 1 ? '✓' : '✗'}`)
console.log('')

console.log('=== SA110 Output ===')
console.log('')
console.log(`  totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log(`  Expected: £13,703`)
console.log(`  hicbcChargeDue: £${result.sa110.hicbcChargeDue ?? 'N/A'}`)
console.log('')

console.log('=== Summary ===')
const totalIncomeMatch = result.totalIncome === expectedTotalIncome
const aniMatch = result.adjustedNetIncome === expectedANI
const paMatch = result.effectivePersonalAllowance === 0
const taxableMatch = result.totalTaxableIncome === expectedTaxableIncome
const incomeTaxMatch = Math.abs(result.totalIncomeTax - 65325.57) < 1
const hicbcMatch = Math.abs(result.hicbcCharge - 1197) < 0.01
const totalTaxMatch = Math.abs(result.taxDueOrRefund - 13703.37) < 1

console.log(`Total income: ${totalIncomeMatch ? '✓' : '✗'} (£${result.totalIncome} vs £${expectedTotalIncome})`)
console.log(`Adjusted Net Income: ${aniMatch ? '✓' : '✗'} (£${result.adjustedNetIncome} vs £${expectedANI})`)
console.log(`Personal Allowance: ${paMatch ? '✓' : '✗'} (£${result.effectivePersonalAllowance} vs £0)`)
console.log(`Taxable income: ${taxableMatch ? '✓' : '✗'} (£${result.totalTaxableIncome} vs £${expectedTaxableIncome})`)
console.log(`Income Tax: ${incomeTaxMatch ? '✓' : '✗'} (£${result.totalIncomeTax.toFixed(2)} vs £65,325.57)`)
console.log(`HICBC: ${hicbcMatch ? '✓' : '✗'} (£${result.hicbcCharge.toFixed(2)} vs £1,197.00)`)
console.log(`Total Tax Due: ${totalTaxMatch ? '✓' : '✗'} (£${result.taxDueOrRefund.toFixed(2)} vs £13,703.37)`)
