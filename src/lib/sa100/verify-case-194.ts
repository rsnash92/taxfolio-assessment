/**
 * Case 194 Tax Calculation Verification
 *
 * Run with: npx tsx src/lib/sa100/verify-case-194.ts
 *
 * This script verifies our tax calculation against HMRC's expected values for Case 194.
 *
 * Case 194: High earner with Employment, Interest, Dividends, Pension (RAS), and HICBC
 *
 * HMRC Expected:
 * - Total Tax Due: £11,848.57 (before HICBC) or ~£13,045.57 (with HICBC)
 * - Our calculation: £13,703.37 (with Net Pay pension)
 * - Difference: £1,854.80
 *
 * The £1,854 difference is because RAS pension extends the basic rate band for
 * savings/dividends, reducing tax on those income types.
 */

import { calculateTax, TaxCalculationInput, TAX_PARAMETERS_2024_25 } from './tax-calculator'

const params = TAX_PARAMETERS_2024_25

// Case 194 test data
// Employment: £165,978 gross + £22,360 benefits - £1,300 expenses = £187,038 net
// Interest: £3,678 untaxed
// Dividends: £12,750
// Pension: £25,600 (RAS - Relief at Source)
// Child Benefit: £1,197

console.log('=== Case 194 Analysis ===\n')

// First, let's test with Net Pay arrangement (current implementation)
console.log('--- Test 1: Net Pay Arrangement Pension (current) ---')
const inputNetPay: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 187038,
  employmentTaxDeducted: 52819.20,
  untaxedInterest: 3678,
  ukDividends: 12750,
  pensionContributionsNetPay: 25600, // Net Pay - reduces income, doesn't extend band
  childBenefitReceived: 1197.00,
}

const resultNetPay = calculateTax(inputNetPay)
console.log('Total Income:', resultNetPay.totalIncome)
console.log('Adjusted Net Income:', resultNetPay.adjustedNetIncome)
console.log('Taxable Non-Savings:', resultNetPay.taxableNonSavingsIncome)
console.log('Taxable Savings:', resultNetPay.taxableSavingsIncome)
console.log('Taxable Dividends:', resultNetPay.taxableDividendIncome)
console.log('Total Taxable:', resultNetPay.totalTaxableIncome)
console.log('Tax on Non-Savings: £' + resultNetPay.taxOnNonSavings.toFixed(2))
console.log('Tax on Savings: £' + resultNetPay.taxOnSavings.toFixed(2))
console.log('Tax on Dividends: £' + resultNetPay.taxOnDividends.toFixed(2))
console.log('Total Income Tax: £' + resultNetPay.totalIncomeTax.toFixed(2))
console.log('HICBC: £' + resultNetPay.hicbcCharge.toFixed(2))
console.log('Tax Due: £' + resultNetPay.taxDueOrRefund.toFixed(2))
console.log('SA110 totalTaxEtcDue: £' + resultNetPay.sa110.totalTaxEtcDue)

// Now test with RAS pension (should extend basic rate band)
console.log('\n--- Test 2: RAS Pension (should extend band) ---')
const inputRAS: TaxCalculationInput = {
  status: 'U',
  employmentIncome: 187038,
  employmentTaxDeducted: 52819.20,
  untaxedInterest: 3678,
  ukDividends: 12750,
  pensionContributions: 25600, // RAS - extends basic rate band (grossed up)
  childBenefitReceived: 1197.00,
}

const resultRAS = calculateTax(inputRAS)
console.log('Total Income:', resultRAS.totalIncome)
console.log('Adjusted Net Income:', resultRAS.adjustedNetIncome)
console.log('Taxable Non-Savings:', resultRAS.taxableNonSavingsIncome)
console.log('Taxable Savings:', resultRAS.taxableSavingsIncome)
console.log('Taxable Dividends:', resultRAS.taxableDividendIncome)
console.log('Total Taxable:', resultRAS.totalTaxableIncome)
console.log('Tax on Non-Savings: £' + resultRAS.taxOnNonSavings.toFixed(2))
console.log('Tax on Savings: £' + resultRAS.taxOnSavings.toFixed(2))
console.log('Tax on Dividends: £' + resultRAS.taxOnDividends.toFixed(2))
console.log('Total Income Tax: £' + resultRAS.totalIncomeTax.toFixed(2))
console.log('HICBC: £' + resultRAS.hicbcCharge.toFixed(2))
console.log('Tax Due: £' + resultRAS.taxDueOrRefund.toFixed(2))
console.log('SA110 totalTaxEtcDue: £' + resultRAS.sa110.totalTaxEtcDue)

// Manual calculation for verification
console.log('\n--- Manual RAS Calculation (following HMRC spec) ---')

// Step 1: Total Income
const employment = 187038
const interest = 3678
const dividends = 12750
const totalIncome = employment + interest + dividends
console.log('Employment:', employment)
console.log('Interest:', interest)
console.log('Dividends:', dividends)
console.log('Total Income:', totalIncome) // £203,466

// Step 2: RAS Pension grossed up
const pensionNet = 25600
const pensionGrossedUp = pensionNet * 1.25
console.log('\nPension (net):', pensionNet)
console.log('Pension (grossed up):', pensionGrossedUp) // £32,000

// Step 3: Adjusted Net Income (for PA taper)
// RAS reduces ANI but doesn't reduce taxable income
const adjustedNetIncome = totalIncome - pensionNet
console.log('\nAdjusted Net Income:', adjustedNetIncome) // £177,866

// Step 4: Personal Allowance (tapered to £0)
const paReduction = Math.min(params.allowances.P_A, Math.floor((adjustedNetIncome - params.allowances.PA_taper_limit) / 2))
const effectivePA = params.allowances.P_A - paReduction
console.log('\nPA Reduction:', paReduction)
console.log('Effective PA:', effectivePA) // £0

// Step 5: Taxable Income
// For RAS, total income is NOT reduced - only the band is extended
const taxableNonSavings = employment - effectivePA
const taxableSavings = interest
const taxableDividends = dividends
const totalTaxable = taxableNonSavings + taxableSavings + taxableDividends
console.log('\nTaxable Non-Savings:', taxableNonSavings) // £187,038
console.log('Taxable Savings:', taxableSavings) // £3,678
console.log('Taxable Dividends:', taxableDividends) // £12,750
console.log('Total Taxable:', totalTaxable) // £203,466

// Step 6: Extended Basic Rate Band (c5.2a)
// c5.2a = BR_band + c4.59 (where c4.59 = Gift Aid + Pension grossed up)
const extendedBRBand = params.bands.BR_band + pensionGrossedUp
console.log('\nBasic Rate Band:', params.bands.BR_band)
console.log('Extended Basic Rate Band (c5.2a):', extendedBRBand) // £69,700

// Step 7: Tax on Non-Savings
// Non-savings uses extended band for tax calculation too
let taxOnNonSavings = 0
const nsInBasic = Math.min(taxableNonSavings, extendedBRBand)
const nsInHigher = Math.min(Math.max(0, taxableNonSavings - extendedBRBand), params.bands.HR_band)
const nsInAdditional = Math.max(0, taxableNonSavings - params.bands.AHR_band)

console.log('\n--- Tax on Non-Savings ---')
console.log('In Basic Rate Band (£' + extendedBRBand + '):', nsInBasic, '@ 20%')
console.log('In Higher Rate Band:', nsInHigher, '@ 40%')
console.log('In Additional Rate (above £125,140):', nsInAdditional, '@ 45%')

taxOnNonSavings = nsInBasic * 0.20 + nsInHigher * 0.40 + nsInAdditional * 0.45
console.log('Tax on Non-Savings: £' + taxOnNonSavings.toFixed(2))

// Step 8: Tax on Savings
// Savings income fills up the extended band after non-savings
// c5.14 = lower of (savings income) and (c5.2a minus non-savings)
const remainingExtendedBand = Math.max(0, extendedBRBand - taxableNonSavings)
console.log('\n--- Tax on Savings ---')
console.log('Extended band remaining after non-savings:', remainingExtendedBand)

// PSA for additional rate taxpayer is £0
const psa = 0 // £0 for additional rate (ANI > £125,140)
console.log('PSA (additional rate):', psa)

let taxOnSavings = 0
const savingsAfterPSA = Math.max(0, taxableSavings - psa)

// Check remaining bands
const additionalRateThreshold = params.bands.AHR_band
const savingsInExtendedBasic = Math.min(savingsAfterPSA, remainingExtendedBand)
const remainingHigherBand = Math.max(0, additionalRateThreshold - Math.max(taxableNonSavings, extendedBRBand))
const savingsInHigher = Math.min(Math.max(0, savingsAfterPSA - savingsInExtendedBasic), remainingHigherBand)
const savingsInAdditional = Math.max(0, savingsAfterPSA - savingsInExtendedBasic - savingsInHigher)

console.log('Savings in Extended Basic:', savingsInExtendedBasic, '@ 20%')
console.log('Savings in Higher:', savingsInHigher, '@ 40%')
console.log('Savings in Additional:', savingsInAdditional, '@ 45%')

taxOnSavings = savingsInExtendedBasic * 0.20 + savingsInHigher * 0.40 + savingsInAdditional * 0.45
console.log('Tax on Savings: £' + taxOnSavings.toFixed(2))

// Step 9: Tax on Dividends
// Dividends fill up remaining extended band after non-savings + savings
const bandUsedByNonSavingsAndSavings = taxableNonSavings + taxableSavings
const remainingExtendedBandForDividends = Math.max(0, extendedBRBand - bandUsedByNonSavingsAndSavings)
console.log('\n--- Tax on Dividends ---')
console.log('Extended band remaining after NS+S:', remainingExtendedBandForDividends)

// Dividend Allowance
const da = params.allowances.DA // £500
console.log('Dividend Allowance:', da)

let taxOnDividends = 0
const dividendsAfterDA = Math.max(0, taxableDividends - da)

const divsInExtendedBasic = Math.min(dividendsAfterDA, Math.max(0, remainingExtendedBandForDividends - da))
const remainingHigherForDivs = Math.max(0, additionalRateThreshold - Math.max(bandUsedByNonSavingsAndSavings, extendedBRBand))
const divsInHigher = Math.min(Math.max(0, dividendsAfterDA - divsInExtendedBasic), remainingHigherForDivs)
const divsInAdditional = Math.max(0, dividendsAfterDA - divsInExtendedBasic - divsInHigher)

console.log('Dividends in Extended Basic:', divsInExtendedBasic, '@ 8.75%')
console.log('Dividends in Higher:', divsInHigher, '@ 33.75%')
console.log('Dividends in Additional:', divsInAdditional, '@ 39.35%')

taxOnDividends = divsInExtendedBasic * 0.0875 + divsInHigher * 0.3375 + divsInAdditional * 0.3935
console.log('Tax on Dividends: £' + taxOnDividends.toFixed(2))

// Step 10: Total Income Tax
const totalIncomeTax = taxOnNonSavings + taxOnSavings + taxOnDividends
console.log('\n--- Total ---')
console.log('Total Income Tax: £' + totalIncomeTax.toFixed(2))

// Step 11: HICBC
const hicbc = 1197 // Full clawback at ANI £177,866 (> £80,000)
console.log('HICBC: £' + hicbc.toFixed(2))

// Step 12: Final Tax Due
const paye = 52819.20
const totalTaxDue = totalIncomeTax + hicbc - paye
console.log('\nTotal Tax + HICBC: £' + (totalIncomeTax + hicbc).toFixed(2))
console.log('PAYE Deducted: £' + paye.toFixed(2))
console.log('Tax Due: £' + totalTaxDue.toFixed(2))

console.log('\n=== Comparison ===')
console.log('HMRC Expected: £11,848.57')
console.log('Our Result (Net Pay):', resultNetPay.sa110.totalTaxEtcDue)
console.log('Our Result (RAS):', resultRAS.sa110.totalTaxEtcDue)
console.log('Manual Calculation: £' + Math.round(totalTaxDue))
