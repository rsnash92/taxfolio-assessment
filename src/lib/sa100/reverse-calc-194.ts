/**
 * Reverse engineer Case 194 HMRC expected result
 *
 * Run with: npx tsx src/lib/sa100/reverse-calc-194.ts
 */

// HMRC expected values
const hmrcExpected = 11849 // HMRC totalTaxEtcDue
const paye = 52819.20
const hicbc = 1197.00

// Work backwards
const totalTaxCharged = hmrcExpected + paye // Tax charged before PAYE deduction
console.log('Total tax + NIC charged (before PAYE):', totalTaxCharged.toFixed(2))

// Remove HICBC to get income tax
const incomeTax = totalTaxCharged - hicbc
console.log('Income tax (excluding HICBC):', incomeTax.toFixed(2))

// Now let's see what taxable income gives this tax
// For someone at additional rate:
// Tax = £37,700 × 20% + £87,440 × 40% + (X - £125,140) × 45%
// Tax = £7,540 + £34,976 + 0.45X - £56,313
// Tax = -£13,797 + 0.45X
// So X = (Tax + £13,797) / 0.45

console.log('\n=== If all income taxed at standard rates ===')
const taxableForAdditional = (incomeTax + 13797) / 0.45
console.log('Taxable income if no band extension:', taxableForAdditional.toFixed(0))

// With extended band of £69,700 (37,700 + 32,000):
// Tax = £69,700 × 20% + £55,440 × 40% + (X - £125,140) × 45%
// Tax = £13,940 + £22,176 + 0.45X - £56,313
// Tax = -£20,197 + 0.45X
// So X = (Tax + £20,197) / 0.45

console.log('\n=== If band extended by £32,000 ===')
const taxableForExtendedBand = (incomeTax + 20197) / 0.45
console.log('Taxable income if band extended:', taxableForExtendedBand.toFixed(0))

// Let's verify with actual case data
console.log('\n=== Case 194 actual data ===')
const employment = 187038
const interest = 3678
const dividends = 12750
const totalIncome = employment + interest + dividends
console.log('Total income:', totalIncome)

// Net Pay scenario: pension deducted from income
const pensionNetPay = 25600
const taxableNetPay = totalIncome - pensionNetPay
console.log('Taxable if Net Pay (income - pension):', taxableNetPay)

// RAS scenario: income not reduced but band extended
console.log('Taxable if RAS (income unchanged):', totalIncome)

// What if pension also deducted AND band extended?
console.log('\n=== What if both income reduced AND band extended (wrong but checking) ===')
const grossedUpPension = pensionNetPay * 1.25
console.log('Pension grossed up:', grossedUpPension)

// If both:
const taxableBoth = totalIncome - grossedUpPension
console.log('Taxable if pension grossed up deducted:', taxableBoth)

// Calculate tax on this
const extendedBand = 37700 + grossedUpPension
console.log('Extended band:', extendedBand)

// With taxable = 171,466 and extended band = 69,700:
// Non-savings = 187,038 - 32,000 = 155,038 (if pension deducted from non-savings)
// Actually no, pension affects ANI for PA, not taxable directly

// Let me try: what if the deduction from taxable income is DIFFERENT from band extension?
console.log('\n=== Different deduction vs extension amounts ===')
// Maybe deduction is NET (£25,600) but extension is GROSS (£32,000)?

// Taxable = £203,466 - £25,600 = £177,866
// Extended band = £37,700 + £32,000 = £69,700
// Non-savings taxable = £161,438 (£187,038 - £25,600)
// Savings taxable = £3,678
// Dividends taxable = £12,750
// Total taxable = £177,866

console.log('Taxable non-savings:', employment - pensionNetPay)
console.log('Taxable savings:', interest)
console.log('Taxable dividends:', dividends)
console.log('Total taxable:', employment - pensionNetPay + interest + dividends)

// Tax calculation with extended band
const taxableNS = employment - pensionNetPay // 161,438
const taxableS = interest // 3,678
const taxableD = dividends // 12,750

// Non-savings tax (using extended band)
const nsInBasic = Math.min(taxableNS, extendedBand) // min(161,438, 69,700) = 69,700
const nsInHigher = Math.min(Math.max(0, taxableNS - extendedBand), 125140 - extendedBand) // 55,440
const nsInAdditional = Math.max(0, taxableNS - 125140) // 36,298

console.log('\n=== Tax with extended band AND Net Pay deduction ===')
console.log('NS in basic (extended):', nsInBasic, '@ 20%')
console.log('NS in higher:', nsInHigher, '@ 40%')
console.log('NS in additional:', nsInAdditional, '@ 45%')

const taxNS = nsInBasic * 0.20 + nsInHigher * 0.40 + nsInAdditional * 0.45
console.log('Tax on non-savings:', taxNS.toFixed(2))

// Savings - all at additional rate after non-savings uses up bands
const remainingBasicForS = Math.max(0, extendedBand - taxableNS) // 0
const remainingHigherForS = Math.max(0, 125140 - Math.max(taxableNS, extendedBand)) // 0
console.log('Remaining basic for savings:', remainingBasicForS)
console.log('Remaining higher for savings:', remainingHigherForS)

// PSA = 0 for additional rate taxpayer
const taxS = taxableS * 0.45
console.log('Tax on savings (all @ 45%):', taxS.toFixed(2))

// Dividends - check if any remaining band
const remainingBasicForD = Math.max(0, extendedBand - taxableNS - taxableS) // 0
const remainingHigherForD = Math.max(0, 125140 - Math.max(taxableNS + taxableS, extendedBand)) // 0
console.log('Remaining basic for dividends:', remainingBasicForD)
console.log('Remaining higher for dividends:', remainingHigherForD)

// DA = £500
const divsAfterDA = taxableD - 500 // 12,250
const taxD = divsAfterDA * 0.3935
console.log('Tax on dividends (all @ 39.35%):', taxD.toFixed(2))

const totalIncomeTax = taxNS + taxS + taxD
console.log('\nTotal income tax:', totalIncomeTax.toFixed(2))
console.log('Expected income tax:', incomeTax.toFixed(2))
console.log('Difference:', (totalIncomeTax - incomeTax).toFixed(2))

console.log('\nFinal calculation:')
console.log('Income tax:', totalIncomeTax.toFixed(2))
console.log('HICBC:', hicbc.toFixed(2))
console.log('Total tax charged:', (totalIncomeTax + hicbc).toFixed(2))
console.log('Less PAYE:', paye.toFixed(2))
console.log('Tax due:', (totalIncomeTax + hicbc - paye).toFixed(2))
console.log('HMRC expected:', hmrcExpected)

// Now try NO band extension (pure Net Pay)
console.log('\n=== Pure Net Pay (NO band extension) ===')
const standardBand = 37700
const nsInBasicStd = Math.min(taxableNS, standardBand) // min(161,438, 37,700) = 37,700
const nsInHigherStd = Math.min(Math.max(0, taxableNS - standardBand), 125140 - standardBand) // 87,440
const nsInAdditionalStd = Math.max(0, taxableNS - 125140) // 36,298

console.log('NS in basic (standard):', nsInBasicStd, '@ 20%')
console.log('NS in higher:', nsInHigherStd, '@ 40%')
console.log('NS in additional:', nsInAdditionalStd, '@ 45%')

const taxNSStd = nsInBasicStd * 0.20 + nsInHigherStd * 0.40 + nsInAdditionalStd * 0.45
console.log('Tax on non-savings:', taxNSStd.toFixed(2))

// Savings at additional rate
const taxSStd = taxableS * 0.45
console.log('Tax on savings (all @ 45%):', taxSStd.toFixed(2))

// Dividends at additional rate
const taxDStd = divsAfterDA * 0.3935
console.log('Tax on dividends (all @ 39.35%):', taxDStd.toFixed(2))

const totalIncomeTaxStd = taxNSStd + taxSStd + taxDStd
console.log('\nTotal income tax (no extension):', totalIncomeTaxStd.toFixed(2))
console.log('Expected income tax:', incomeTax.toFixed(2))
console.log('Difference:', (totalIncomeTaxStd - incomeTax).toFixed(2))

console.log('\nFinal calculation (no extension):')
console.log('Income tax:', totalIncomeTaxStd.toFixed(2))
console.log('HICBC:', hicbc.toFixed(2))
console.log('Total tax charged:', (totalIncomeTaxStd + hicbc).toFixed(2))
console.log('Less PAYE:', paye.toFixed(2))
console.log('Tax due:', (totalIncomeTaxStd + hicbc - paye).toFixed(2))
console.log('HMRC expected:', hmrcExpected)

// Find the band extension that matches HMRC
console.log('\n=== Finding exact band extension ===')
// Tax difference to account for: £65,325.57 - £63,471.20 = £1,854.37
// Band extension saves 40% - 20% = 20% on income moved from higher to basic
// Extension needed = £1,854.37 / 0.20 = £9,272
const taxDiff = totalIncomeTaxStd - incomeTax
console.log('Tax to reduce:', taxDiff.toFixed(2))
const extensionNeeded = taxDiff / 0.20
console.log('Band extension needed:', extensionNeeded.toFixed(0))

// Verify
const extBandTest = 37700 + extensionNeeded
const nsInBasicTest = Math.min(taxableNS, extBandTest)
const nsInHigherTest = Math.min(Math.max(0, taxableNS - extBandTest), 125140 - extBandTest)
const nsInAdditionalTest = Math.max(0, taxableNS - 125140)

console.log('\nWith extension of £' + Math.round(extensionNeeded) + ':')
console.log('Extended band:', extBandTest.toFixed(0))
console.log('NS in basic:', nsInBasicTest.toFixed(0), '@ 20%')
console.log('NS in higher:', nsInHigherTest.toFixed(0), '@ 40%')
console.log('NS in additional:', nsInAdditionalTest.toFixed(0), '@ 45%')

const taxNSTest = nsInBasicTest * 0.20 + nsInHigherTest * 0.40 + nsInAdditionalTest * 0.45
console.log('Tax on non-savings:', taxNSTest.toFixed(2))

const totalTaxTest = taxNSTest + taxSStd + taxDStd
console.log('Total income tax:', totalTaxTest.toFixed(2))
console.log('Expected:', incomeTax.toFixed(2))

// What pension amount gives this extension?
console.log('\n=== What pension amount gives this extension? ===')
// If grossed up: pension * 1.25 = extension
const pensionNetFromGross = extensionNeeded / 1.25
console.log('Pension (net) if grossed up:', pensionNetFromGross.toFixed(2))
// If not grossed up: pension = extension
console.log('Pension (net) if not grossed up:', extensionNeeded.toFixed(2))
console.log('Actual pension in test:', pensionNetPay)
