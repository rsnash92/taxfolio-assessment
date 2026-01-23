/**
 * Residential Property CGT Test Script
 *
 * Tests the 18%/24% residential property CGT rates
 * - 18% for gains within basic rate band
 * - 24% for gains above basic rate band
 */

import { calculateTax, TaxCalculationInput } from './tax-calculator'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

console.log('='.repeat(70))
console.log('RESIDENTIAL PROPERTY CGT RATE TEST')
console.log('='.repeat(70))

// Test Case 1: Basic rate taxpayer with residential property gain
// Taxpayer has £30,000 income (within basic rate band of £37,700)
// Remaining basic rate band: £37,700 - £30,000 + £12,570 (PA) = £20,270
// Wait, that's wrong. Let me recalculate:
// Taxable income = £30,000 - £12,570 PA = £17,430
// Remaining basic rate band for CGT = £37,700 - £17,430 = £20,270

console.log('\n--- Test 1: Basic rate taxpayer with residential property gain ---')
const test1: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 30000,
  taxDeductedFromEmployment: 3486, // Approximate PAYE
  capitalGainsResidential: 15000, // Sold buy-to-let
}

const result1 = calculateTax(test1)
console.log('Input:')
console.log(`  Employment income: ${formatCurrency(30000)}`)
console.log(`  Residential property gain: ${formatCurrency(15000)}`)
console.log(`  Taxable income: ${formatCurrency(result1.totalTaxableIncome)}`)
console.log(`  Remaining BRB for CGT: ${formatCurrency(37700 - result1.totalTaxableIncome)}`)

console.log('\nExpected CGT calculation:')
console.log(`  Gains: £15,000`)
console.log(`  Less AEA: £3,000`)
console.log(`  Taxable gains: £12,000`)
console.log(`  All within remaining BRB, so 18% rate applies`)
console.log(`  CGT: £12,000 × 18% = £2,160`)

console.log('\nCalculated:')
console.log(`  Total capital gains: ${formatCurrency(result1.totalCapitalGains)}`)
console.log(`  Taxable capital gains: ${formatCurrency(result1.taxableCapitalGains)}`)
console.log(`  CGT at basic rate (18%): ${formatCurrency(result1.cgtAtBasicRate)}`)
console.log(`  CGT at higher rate (24%): ${formatCurrency(result1.cgtAtHigherRate)}`)
console.log(`  Total CGT: ${formatCurrency(result1.totalCGT)}`)

const expected1 = 12000 * 0.18
console.log(`\nExpected: ${formatCurrency(expected1)}`)
console.log(`Calculated: ${formatCurrency(result1.totalCGT)}`)
console.log(`Match: ${Math.abs(result1.totalCGT - expected1) < 1 ? '✓ PASS' : '✗ FAIL'}`)

// Test Case 2: Higher rate taxpayer with residential property gain
// Taxpayer has £60,000 income (exceeds basic rate band)
// All gains will be at 24%

console.log('\n--- Test 2: Higher rate taxpayer with residential property gain ---')
const test2: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 60000,
  taxDeductedFromEmployment: 11500, // Approximate PAYE
  capitalGainsResidential: 50000, // Sold second home
}

const result2 = calculateTax(test2)
console.log('Input:')
console.log(`  Employment income: ${formatCurrency(60000)}`)
console.log(`  Residential property gain: ${formatCurrency(50000)}`)
console.log(`  Taxable income: ${formatCurrency(result2.totalTaxableIncome)}`)

console.log('\nExpected CGT calculation:')
console.log(`  Gains: £50,000`)
console.log(`  Less AEA: £3,000`)
console.log(`  Taxable gains: £47,000`)
console.log(`  All above BRB, so 24% rate applies`)
console.log(`  CGT: £47,000 × 24% = £11,280`)

console.log('\nCalculated:')
console.log(`  Total capital gains: ${formatCurrency(result2.totalCapitalGains)}`)
console.log(`  Taxable capital gains: ${formatCurrency(result2.taxableCapitalGains)}`)
console.log(`  CGT at basic rate (18%): ${formatCurrency(result2.cgtAtBasicRate)}`)
console.log(`  CGT at higher rate (24%): ${formatCurrency(result2.cgtAtHigherRate)}`)
console.log(`  Total CGT: ${formatCurrency(result2.totalCGT)}`)

const expected2 = 47000 * 0.24
console.log(`\nExpected: ${formatCurrency(expected2)}`)
console.log(`Calculated: ${formatCurrency(result2.totalCGT)}`)
console.log(`Match: ${Math.abs(result2.totalCGT - expected2) < 1 ? '✓ PASS' : '✗ FAIL'}`)

// Test Case 3: Split between basic and higher rate
// Taxpayer has £40,000 income
// Taxable income = £40,000 - £12,570 = £27,430
// Remaining BRB = £37,700 - £27,430 = £10,270
// Gain of £20,000 - £3,000 AEA = £17,000 taxable
// £10,270 at 18%, £6,730 at 24%

console.log('\n--- Test 3: Gain split between basic and higher rate ---')
const test3: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 40000,
  taxDeductedFromEmployment: 5486, // Approximate PAYE
  capitalGainsResidential: 20000,
}

const result3 = calculateTax(test3)
const taxableIncome3 = 40000 - 12570
const remainingBRB3 = 37700 - taxableIncome3
const taxableGains3 = 20000 - 3000
const atBasic3 = Math.min(taxableGains3, remainingBRB3)
const atHigher3 = Math.max(0, taxableGains3 - remainingBRB3)
const expectedCGT3 = atBasic3 * 0.18 + atHigher3 * 0.24

console.log('Input:')
console.log(`  Employment income: ${formatCurrency(40000)}`)
console.log(`  Residential property gain: ${formatCurrency(20000)}`)
console.log(`  Taxable income: ${formatCurrency(result3.totalTaxableIncome)}`)
console.log(`  Remaining BRB for CGT: ${formatCurrency(remainingBRB3)}`)

console.log('\nExpected CGT calculation:')
console.log(`  Gains: £20,000`)
console.log(`  Less AEA: £3,000`)
console.log(`  Taxable gains: £${taxableGains3}`)
console.log(`  At basic rate (18%): £${atBasic3} → ${formatCurrency(atBasic3 * 0.18)}`)
console.log(`  At higher rate (24%): £${atHigher3} → ${formatCurrency(atHigher3 * 0.24)}`)
console.log(`  Total CGT: ${formatCurrency(expectedCGT3)}`)

console.log('\nCalculated:')
console.log(`  Total capital gains: ${formatCurrency(result3.totalCapitalGains)}`)
console.log(`  Taxable capital gains: ${formatCurrency(result3.taxableCapitalGains)}`)
console.log(`  CGT at basic rate (18%): ${formatCurrency(result3.cgtAtBasicRate)}`)
console.log(`  CGT at higher rate (24%): ${formatCurrency(result3.cgtAtHigherRate)}`)
console.log(`  Total CGT: ${formatCurrency(result3.totalCGT)}`)

console.log(`\nExpected: ${formatCurrency(expectedCGT3)}`)
console.log(`Calculated: ${formatCurrency(result3.totalCGT)}`)
console.log(`Match: ${Math.abs(result3.totalCGT - expectedCGT3) < 1 ? '✓ PASS' : '✗ FAIL'}`)

// Test Case 4: Mixed residential and non-residential gains
// Non-residential uses remaining BRB first, then residential

console.log('\n--- Test 4: Mixed residential and non-residential gains ---')
const test4: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 40000,
  taxDeductedFromEmployment: 5486,
  capitalGainsNonResidential: 10000, // Shares
  capitalGainsResidential: 15000, // Buy-to-let
}

const result4 = calculateTax(test4)
const taxableIncome4 = 40000 - 12570
const remainingBRB4 = 37700 - taxableIncome4
const totalGains4 = 10000 + 15000
const taxableGains4 = totalGains4 - 3000 // 22,000

// Non-residential first, then residential
const nonResAtBasic4 = Math.min(10000 - 3000, remainingBRB4) // 7,000 at 10%
const usedBRB4 = nonResAtBasic4
const remainingBRB4AfterNonRes = Math.max(0, remainingBRB4 - 10000 + 3000)
const resAtBasic4 = Math.min(15000, remainingBRB4AfterNonRes) // Remaining at 18%
const resAtHigher4 = Math.max(0, 15000 - remainingBRB4AfterNonRes) // Rest at 24%

console.log('Input:')
console.log(`  Employment income: ${formatCurrency(40000)}`)
console.log(`  Non-residential gain (shares): ${formatCurrency(10000)}`)
console.log(`  Residential gain (property): ${formatCurrency(15000)}`)
console.log(`  Remaining BRB for CGT: ${formatCurrency(remainingBRB4)}`)

console.log('\nExpected CGT calculation (AEA to non-residential first):')
console.log(`  Non-res gains: £10,000 - £3,000 AEA = £7,000`)
console.log(`  Residential gains: £15,000 (no AEA remaining)`)
console.log(`  BRB used by non-res: £7,000`)
console.log(`  Remaining BRB for residential: £${remainingBRB4} - £7,000 = £${remainingBRB4 - 7000}`)
console.log(`  Residential at 18%: £${Math.min(15000, remainingBRB4 - 7000)}`)
console.log(`  Residential at 24%: £${Math.max(0, 15000 - (remainingBRB4 - 7000))}`)

console.log('\nCalculated:')
console.log(`  Total capital gains: ${formatCurrency(result4.totalCapitalGains)}`)
console.log(`  Taxable capital gains: ${formatCurrency(result4.taxableCapitalGains)}`)
console.log(`  CGT at basic rate: ${formatCurrency(result4.cgtAtBasicRate)}`)
console.log(`  CGT at higher rate: ${formatCurrency(result4.cgtAtHigherRate)}`)
console.log(`  Total CGT: ${formatCurrency(result4.totalCGT)}`)

// Test Case 5: Compare rates between residential and non-residential
console.log('\n--- Test 5: Rate comparison - same gain, different asset types ---')

const testNonRes: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 60000,
  taxDeductedFromEmployment: 11500,
  capitalGainsNonResidential: 30000, // Shares/crypto
}

const testRes: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 60000,
  taxDeductedFromEmployment: 11500,
  capitalGainsResidential: 30000, // Property
}

const resultNonRes = calculateTax(testNonRes)
const resultRes = calculateTax(testRes)

console.log('Both taxpayers have £60,000 income and £30,000 capital gain')
console.log('(All gains above basic rate band)')
console.log('')
console.log('Non-residential (shares):')
console.log(`  Taxable gain: £27,000 (after £3,000 AEA)`)
console.log(`  CGT at 20%: ${formatCurrency(27000 * 0.20)} expected`)
console.log(`  Calculated: ${formatCurrency(resultNonRes.totalCGT)}`)

console.log('')
console.log('Residential (property):')
console.log(`  Taxable gain: £27,000 (after £3,000 AEA)`)
console.log(`  CGT at 24%: ${formatCurrency(27000 * 0.24)} expected`)
console.log(`  Calculated: ${formatCurrency(resultRes.totalCGT)}`)

console.log('')
console.log(`Rate difference: ${formatCurrency(resultRes.totalCGT - resultNonRes.totalCGT)} more tax on residential`)
console.log(`Expected difference: ${formatCurrency(27000 * 0.04)} (4% rate difference)`)

console.log('\n' + '='.repeat(70))
console.log('SUMMARY')
console.log('='.repeat(70))
console.log('')
console.log('Residential property CGT rates (2024-25):')
console.log('  - Basic rate (within BRB): 18%')
console.log('  - Higher rate (above BRB): 24%')
console.log('')
console.log('Non-residential CGT rates (2024-25):')
console.log('  - Basic rate (within BRB): 10%')
console.log('  - Higher rate (above BRB): 20%')
console.log('')
console.log('The difference is 8% at basic rate and 4% at higher rate')
