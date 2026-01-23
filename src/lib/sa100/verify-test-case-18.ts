/**
 * HMRC Test Case 18 Verification Script
 *
 * Run with: npx tsx src/lib/sa100/verify-test-case-18.ts
 *
 * Test Case 18: Welsh taxpayer with employment, interest, dividends, and underpaid tax adjustments
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

// Test Case 18 inputs from HMRC MTR-Tester
// Note: Employment income is NET of allowable expenses (£48,452 - £450 = £48,002)
const input: TaxCalculationInput = {
  status: 'C', // Welsh (TR = 3)
  employmentIncome: 48002, // Net employment income (EMP1 - EMP18 = £48,452 - £450)
  employmentTaxDeducted: 7680.80, // PAYE (EMP2)
  selfEmploymentProfits: 0,
  untaxedInterest: 1946, // INC2
  ukDividends: 11789, // INC4
  underpaidTaxFromEarlierYears: 245, // CAL7
  underpaidTaxCodedForNextYear: 400, // CAL8
}

const result = calculateTax(input)
const params = TAX_PARAMETERS_2024_25

console.log('\n=== HMRC Test Case 18 Verification ===')
console.log('')
console.log('Input:')
console.log('  Gross employment pay (EMP1): £48,452.00')
console.log('  Allowable expenses (EMP18): £450.00')
console.log('  Net employment income: £48,002.00')
console.log('  PAYE deducted (EMP2): £7,680.80')
console.log('  Untaxed UK interest (INC2): £1,946.00')
console.log('  UK dividends (INC4): £11,789.00')
console.log('  Underpaid tax from earlier years (CAL7): £245.00')
console.log('  Underpaid tax coded for 2025-26 (CAL8): £400.00')
console.log('')

console.log('=== Income Calculation ===')
console.log(`Total income: £${result.totalIncome}`)
console.log(`  Expected: £61,737 (£48,002 + £1,946 + £11,789)`)
console.log(`  Match: ${result.totalIncome === 61737 ? '✓' : '✗'}`)
console.log('')

console.log(`Personal Allowance: £${result.effectivePersonalAllowance}`)
console.log(`  Expected: £12,570`)
console.log(`  Match: ${result.effectivePersonalAllowance === 12570 ? '✓' : '✗'}`)
console.log('')

console.log(`Total taxable income: £${result.totalTaxableIncome}`)
console.log(`  Expected: £49,167 (£61,737 - £12,570)`)
console.log(`  Match: ${result.totalTaxableIncome === 49167 ? '✓' : '✗'}`)
console.log('')

console.log('=== Taxable Income Breakdown ===')
console.log(`Taxable non-savings: £${result.taxableNonSavingsIncome}`)
console.log(`  Expected: £35,432 (£48,002 - £12,570)`)
console.log(`  Match: ${result.taxableNonSavingsIncome === 35432 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable savings: £${result.taxableSavingsIncome}`)
console.log(`  Expected: £1,946`)
console.log(`  Match: ${result.taxableSavingsIncome === 1946 ? '✓' : '✗'}`)
console.log('')

console.log(`Taxable dividends: £${result.taxableDividendIncome}`)
console.log(`  Expected: £11,789`)
console.log(`  Match: ${result.taxableDividendIncome === 11789 ? '✓' : '✗'}`)
console.log('')

console.log('=== HMRC Tax Calculation Breakdown ===')
console.log('')
console.log('Band allocation (HMRC):')
console.log('  Non-savings: £35,432 (all in basic rate band)')
console.log('  Remaining basic rate band: £37,700 - £35,432 = £2,268')
console.log('  Savings (£1,946) fills: £1,946 in basic rate')
console.log('  Remaining basic rate: £2,268 - £1,946 = £322')
console.log('  Dividends (£11,789) fills: £322 in basic rate, £11,467 in higher rate')
console.log('')

console.log('HMRC expected tax calculation:')
console.log('  Non-savings at basic rate: £35,432 × 20% = £7,086.40')
console.log('  Savings at basic rate: £1,446 × 20% = £289.20 (after £500 PSA)')
console.log('  BUT HMRC shows: "Savings at higher rate band nil rate (PSA): £500 × 0%"')
console.log('  This means savings are ALL in higher rate band in HMRC calc!')
console.log('')
console.log('  HMRC shows:')
console.log('    Non-savings at basic rate: £37,700 × 20% = £7,540.00')
console.log('    Savings at higher rate band nil rate (PSA): £500 × 0% = £0.00')
console.log('    Dividends at basic rate: £0 × 8.75% = £0.00')
console.log('    Dividends at higher rate nil rate: £500 × 0% = £0.00')
console.log('    Dividends at higher rate: £10,467 × 33.75% = £3,532.61')
console.log('    Income Tax charged: £11,072.61')
console.log('')

// Let's trace through what HMRC seems to be doing
console.log('=== Reconciliation with HMRC ===')
console.log('')
console.log('HMRC appears to calculate differently:')
console.log('  1. Non-savings fills FULL basic rate band: £37,700')
console.log('     But taxable non-savings is only £35,432...')
console.log('     So £2,268 of something else fills the band')
console.log('')
console.log('  2. Looking at their dividend calc:')
console.log('     £10,467 at higher rate + £500 DA + £822 = £11,789')
console.log('     So £822 dividends at basic rate (£0 tax shown)')
console.log('')
console.log('  Wait - let me recalculate:')
console.log('    Basic rate band: £37,700')
console.log('    Non-savings taxable: £35,432')
console.log('    Remaining: £2,268')
console.log('    Savings: £1,946 (all fits in remaining basic)')
console.log('    Remaining: £322')
console.log('    Dividends in basic: £322')
console.log('    Dividends in higher: £11,789 - £322 = £11,467')
console.log('    After £500 DA: £10,967 at 33.75% = £3,701.36')
console.log('')
console.log('  But HMRC expects £3,532.61 = £10,467 × 33.75%')
console.log('  Difference: £11,467 - £10,467 = £1,000 extra not taxed')
console.log('')

console.log('=== Our Calculation Results ===')
console.log('')
console.log(`Tax on non-savings: £${result.taxOnNonSavings.toFixed(2)}`)
console.log(`  £35,432 × 20% = £7,086.40`)
console.log('')

console.log(`Tax on savings: £${result.taxOnSavings.toFixed(2)}`)
console.log('')

console.log(`Tax on dividends: £${result.taxOnDividends.toFixed(2)}`)
console.log('')

console.log(`Total income tax: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  HMRC expects: £11,072.61`)
console.log(`  Difference: £${(result.totalIncomeTax - 11072.61).toFixed(2)}`)
console.log('')

// Calculate what HMRC expects for final result
console.log('=== Final Tax Due Calculation ===')
console.log('')
const underpaidTaxCAL7 = 245 // Added to tax due
const underpaidTaxCAL8 = 400 // Deducted (coded for next year)

console.log('HMRC calculation:')
console.log(`  Income Tax charged: £11,072.61`)
console.log(`  Plus underpaid tax (CAL7): £${underpaidTaxCAL7}`)
console.log(`  Income Tax due: £${(11072.61 + underpaidTaxCAL7).toFixed(2)}`)
console.log(`  Minus PAYE deducted: £${input.employmentTaxDeducted || 0}`)
console.log(`  Minus underpaid tax coded for 2025-26 (CAL8): £${underpaidTaxCAL8}`)
console.log(`  Total tax deducted: £${((input.employmentTaxDeducted || 0) + underpaidTaxCAL8).toFixed(2)}`)
console.log('')
console.log(`  Final: £${(11072.61 + underpaidTaxCAL7).toFixed(2)} - £${((input.employmentTaxDeducted || 0) + underpaidTaxCAL8).toFixed(2)} = £${(11072.61 + underpaidTaxCAL7 - (input.employmentTaxDeducted || 0) - underpaidTaxCAL8).toFixed(2)}`)
console.log(`  HMRC expects: £3,236.81`)
console.log('')

console.log('Our calculation (without CAL7/CAL8):')
console.log(`  Income Tax charged: £${result.totalIncomeTax.toFixed(2)}`)
console.log(`  Minus PAYE deducted: £${result.taxDeductedAtSource}`)
console.log(`  Tax due/refund: £${result.taxDueOrRefund.toFixed(2)}`)
console.log(`  SA110 totalTaxEtcDue: £${result.sa110.totalTaxEtcDue}`)
console.log('')

// Check if we need CAL7/CAL8 support
console.log('=== Missing Features ===')
console.log('')
console.log('Our calculator needs to support:')
console.log('  1. CAL7 - Underpaid tax from earlier years (added to tax due)')
console.log('  2. CAL8 - Underpaid tax coded for next year (deducted from tax due)')
console.log('')
console.log('With CAL7/CAL8, our final calculation would be:')
const adjustedTaxDue = result.totalIncomeTax + underpaidTaxCAL7 - result.taxDeductedAtSource - underpaidTaxCAL8
console.log(`  £${result.totalIncomeTax.toFixed(2)} + £${underpaidTaxCAL7} - £${result.taxDeductedAtSource} - £${underpaidTaxCAL8} = £${adjustedTaxDue.toFixed(2)}`)

console.log('')
console.log('=== HMRC Methodology Analysis ===')
console.log('')
console.log('HMRC appears to use this methodology:')
console.log('  1. Fill basic rate band (£37,700) with ALL income types')
console.log('  2. Tax entire basic rate band at 20% = £7,540')
console.log('  3. Investment income above basic rate gets:')
console.log('     - PSA (£500) at 0%')
console.log('     - DA (£500) at 0%')
console.log('     - Combined: £1,000 at nil rate')
console.log('  4. Remaining investment income at applicable rates')
console.log('')

// Calculate HMRC-style
const basicRateBand = 37700
const totalTaxable = result.totalTaxableIncome
const basicRateTax = basicRateBand * 0.20
const investmentAboveBasic = totalTaxable - basicRateBand
const psaAndDa = 500 + 500 // PSA for higher rate + DA
const taxableAtHigherRate = investmentAboveBasic - psaAndDa
const higherRateTax = taxableAtHigherRate * 0.3375

console.log('HMRC-style calculation:')
console.log(`  Total taxable: £${totalTaxable}`)
console.log(`  Basic rate band: £${basicRateBand} × 20% = £${basicRateTax.toFixed(2)}`)
console.log(`  Investment above basic: £${investmentAboveBasic}`)
console.log(`  PSA + DA: £${psaAndDa}`)
console.log(`  Taxable at higher rate: £${taxableAtHigherRate}`)
console.log(`  Tax at 33.75%: £${higherRateTax.toFixed(2)}`)
console.log(`  Total: £${(basicRateTax + higherRateTax).toFixed(2)}`)
console.log(`  HMRC expects: £11,072.61`)
console.log(`  Match: ${Math.abs(basicRateTax + higherRateTax - 11072.61) < 0.01 ? '✓' : '✗'}`)
