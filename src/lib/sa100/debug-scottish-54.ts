/**
 * Debug Scottish tax calculation for Case 54
 */

const params = {
  rates: {
    SSR_rate: 0.19,
    SBR_rate: 0.20,
    SIR_rate: 0.21,
    SHR_rate: 0.42,
    SAR_rate: 0.45,
    SAHR_rate: 0.48,
  },
  bands: {
    BR_band: 37700,
    SSR_band: 2306,
    SBR_band: 11685,
    SIR_band: 17101,
    SHR_band: 31338,
    SAR_band: 62710,
    SAHR_band: 125140,
  }
}

// From tax-calculator.ts calculateScottishTax function
function calculateScottishTax(
  taxableIncome: number,
  extendedBasicRateBand: number
): number {
  const rates = params.rates
  const bands = params.bands

  let tax = 0
  let remaining = taxableIncome

  // The extension is added to the SBR_band which pushes all subsequent bands up
  const basicRateExtension = extendedBasicRateBand - params.bands.BR_band
  console.log(`Basic rate extension: ${basicRateExtension}`)

  // Scottish bands - calculate cumulatively
  const scottishBands = [
    { name: 'Starter', limit: bands.SSR_band, rate: rates.SSR_rate }, // 2306
    { name: 'Basic', limit: bands.SBR_band + basicRateExtension, rate: rates.SBR_rate }, // 11685 + 2000 = 13685
    { name: 'Intermediate', limit: bands.SSR_band + bands.SBR_band + bands.SIR_band + basicRateExtension, rate: rates.SIR_rate }, // 2306 + 11685 + 17101 + 2000 = 33092
    { name: 'Higher', limit: bands.SSR_band + bands.SBR_band + bands.SIR_band + bands.SHR_band + basicRateExtension, rate: rates.SHR_rate }, // + 31338 = 64430
    { name: 'Advanced', limit: bands.SSR_band + bands.SBR_band + bands.SIR_band + bands.SHR_band + bands.SAR_band + basicRateExtension, rate: rates.SAR_rate }, // + 62710
    { name: 'Top', limit: Infinity, rate: rates.SAHR_rate },
  ]

  console.log('\nScottish bands (with extension):')
  scottishBands.forEach((b, i) => {
    console.log(`  ${b.name}: limit ${b.limit}, rate ${b.rate}`)
  })

  let previousLimit = 0

  console.log('\nTax calculation:')
  for (const band of scottishBands) {
    if (remaining <= 0) break

    const bandWidth = band.limit - previousLimit
    const incomeInBand = Math.min(remaining, bandWidth)

    const taxInBand = incomeInBand * band.rate
    tax += taxInBand
    console.log(`  ${band.name}: £${incomeInBand} × ${band.rate} = £${taxInBand.toFixed(2)}`)

    remaining -= incomeInBand
    previousLimit = band.limit
  }

  return tax
}

// Case 54 values
const taxableNonSavings = 34699
const extendedBasicRateBand = 37700 + 2000 // BR_band + pension

console.log('=== Case 54 Scottish Tax Debug ===\n')
console.log(`Taxable non-savings: £${taxableNonSavings}`)
console.log(`Extended basic rate band (E&W): £${extendedBasicRateBand}`)

const tax = calculateScottishTax(taxableNonSavings, extendedBasicRateBand)
console.log(`\nTotal tax: £${tax.toFixed(2)}`)

console.log('\n=== Expected (SA302) ===')
console.log('Starter: £2,306 × 19% = £438.14')
console.log('Basic: £13,685 × 20% = £2,737.00')
console.log('Intermediate: £17,101 × 21% = £3,591.21')
console.log('Higher: £1,607 × 42% = £674.94')
console.log('Total: £7,441.29')

// Wait - the band structure is wrong!
// SA302 shows Basic = £13,685 which is £11,685 + £2,000
// But the intermediate band should NOT be extended in width, just shifted up

console.log('\n=== Analysis ===')
console.log('SA302 breakdown:')
console.log('  Starter: £2,306 (cumulative: £2,306)')
console.log('  Basic: £13,685 (cumulative: £15,991)')
console.log('  Intermediate: £17,101 (cumulative: £33,092)')
console.log('  Higher: £1,607 (cumulative: £34,699)')

console.log('\nCalculator breakdown:')
console.log('  Starter limit: £2,306')
console.log('  Basic limit: £' + (11685 + 2000) + ' = £13,685')
console.log('  Intermediate limit: £' + (2306 + 11685 + 17101 + 2000))
console.log('  Higher limit: £' + (2306 + 11685 + 17101 + 31338 + 2000))

// The issue is clear now!
// The calculator uses CUMULATIVE limits, so:
// - Basic limit = SBR_band + extension = 11685 + 2000 = 13685
// - But this should be CUMULATIVE from 0, not from after starter!

console.log('\n=== The Bug ===')
console.log('Calculator Basic band limit is:', 11685 + 2000, '= £13,685')
console.log('But this means Basic band goes from £0 to £13,685')
console.log('Starter band is £0 to £2,306')
console.log('So Basic band width is £13,685 - £2,306 = £11,379, NOT £13,685!')

// Correct calculation:
console.log('\n=== Correct Cumulative Limits ===')
const starterLimit = 2306
const basicLimit = starterLimit + 11685 + 2000 // £2,306 + £11,685 + £2,000 = £15,991
const intermediateLimit = basicLimit + 17101 // £15,991 + £17,101 = £33,092
const higherLimit = intermediateLimit + 31338 // £33,092 + £31,338 = £64,430

console.log('Starter: £0 - £' + starterLimit)
console.log('Basic: £' + starterLimit + ' - £' + basicLimit + ' (width: ' + (basicLimit - starterLimit) + ')')
console.log('Intermediate: £' + basicLimit + ' - £' + intermediateLimit + ' (width: ' + (intermediateLimit - basicLimit) + ')')
console.log('Higher: £' + intermediateLimit + ' - £' + higherLimit)

console.log('\nWith taxable income £34,699:')
const inStarter = Math.min(34699, starterLimit)
const inBasic = Math.min(34699 - inStarter, basicLimit - starterLimit)
const inIntermediate = Math.min(34699 - inStarter - inBasic, intermediateLimit - basicLimit)
const inHigher = 34699 - inStarter - inBasic - inIntermediate

console.log('In Starter:', inStarter)
console.log('In Basic:', inBasic)
console.log('In Intermediate:', inIntermediate)
console.log('In Higher:', inHigher)

const correctTax = inStarter * 0.19 + inBasic * 0.20 + inIntermediate * 0.21 + inHigher * 0.42
console.log('\nCorrect tax: £' + correctTax.toFixed(2))
