/**
 * Tests for the unified tax calculator mapping
 *
 * Run with: npx vitest run src/lib/wizard/tax-mapping.test.ts
 * Or: npx tsx src/lib/wizard/tax-mapping.test.ts
 */

import { mapWizardToTaxInput, calculateTaxForWizard } from './tax-mapping'
import { WizardData } from '@/types/wizard'

// Create a minimal WizardData structure for testing
function createEmptyWizardData(): WizardData {
  return {
    sessionId: null,
    taxYear: '2024-25',
    isUKResident: true,
    incomeSources: [],
    connectionMethod: null,
    bankConnected: false,
    bankAccounts: [],
    selectedAccountIds: [],
    bankName: null,
    bankImportData: null,
    transactions: [],
    transactionsReviewed: false,
    selfEmploymentData: {},
    rentalData: {},
    employmentData: {},
    cisData: {},
    dividendsData: {},
    interestData: {},
    capitalGainsData: {},
    pensionIncomeData: {},
    stateBenefitsData: {},
    general: { selectedReliefs: [] },
    otherIncome: {
      interest: 0,
      dividends: 0,
      pension: 0,
      stateBenefits: 0,
      other: 0,
    },
    deductions: {
      mileage: { miles: 0, rate: 0.45, total: 0 },
      homeOffice: { amount: 0, method: 'simplified' },
      pensionContributions: 0,
      giftAid: 0,
    },
    personalInfo: {
      fullName: '',
      utr: '',
      nino: '',
      address: '',
      postcode: '',
      addressChanged: null,
    },
    taxCalculation: null,
    payment: null,
    submission: null,
  }
}

// Test 1: Empty wizard data should return zero tax
console.log('Test 1: Empty wizard data')
const emptyData = createEmptyWizardData()
const emptyResult = calculateTaxForWizard(emptyData)
console.log(`  Total income: £${emptyResult.totalIncome / 100}`)
console.log(`  Total due: £${emptyResult.totalDue / 100}`)
console.log(`  Pass: ${emptyResult.totalIncome === 0 && emptyResult.totalDue === 0 ? '✓' : '✗'}`)
console.log('')

// Test 2: Simple employment income
console.log('Test 2: Simple employment income £50,000')
const employmentData = createEmptyWizardData()
employmentData.incomeSources = [{ id: 'emp1', type: 'employment', label: 'ACME Corp', data: {} }]
employmentData.employmentData = {
  emp1: {
    id: 'emp1',
    employerName: 'ACME Corp',
    payReceived: 50000,
    taxDeducted: 7486, // Standard PAYE for £50k
    hasP11D: false,
    claimingExpenses: false,
    isComplete: true,
  },
}
const empResult = calculateTaxForWizard(employmentData)
console.log(`  Total income: £${empResult.totalIncome / 100}`)
console.log(`  Personal allowance: £${empResult.personalAllowance / 100}`)
console.log(`  Taxable income: £${empResult.taxableAfterAllowance / 100}`)
console.log(`  Total tax due: £${empResult.totalTaxDue / 100}`)
console.log(`  PAYE deducted: £${empResult.payeTaxDeducted / 100}`)
console.log(`  Net to pay: £${empResult.totalDue / 100}`)
console.log(`  Refund due: ${empResult.refundDue ? `£${empResult.refundDue / 100}` : 'None'}`)
console.log('')

// Test 3: Self-employment with trading allowance
console.log('Test 3: Self-employment income £800 (should use trading allowance)')
const seData = createEmptyWizardData()
seData.incomeSources = [{ id: 'se1', type: 'self-employment', label: 'Freelance', data: {} }]
seData.selfEmploymentData = {
  se1: {
    businessName: 'Freelance',
    businessDescription: 'Consulting',
    businessPostcode: 'SW1A 1AA',
    detailsChanged: false,
    industry: 'consulting',
    accountingMethod: 'cash',
    startDate: '2024-04-06',
    endDate: '2025-04-05',
    income: { fromTransactions: 0, manual: [], total: 800 },
    expenses: { byCategory: {}, fromTransactions: 0, manual: [], total: 0 },
    capitalAllowances: { equipment: 0, vehicles: 0, other: 0, total: 0 },
    losses: { broughtForward: 0, carriedForward: 0 },
    profit: 800,
    isComplete: true,
  },
}
const seResult = calculateTaxForWizard(seData)
console.log(`  Total income: £${seResult.totalIncome / 100}`)
console.log(`  Trading allowance used: £${seResult.tradingAllowance / 100}`)
console.log(`  Total due: £${seResult.totalDue / 100}`)
console.log(`  Pass: ${seResult.totalDue === 0 ? '✓' : '✗'} (should be £0 due to trading allowance)`)
console.log('')

// Test 4: High income with PA taper
console.log('Test 4: High income £130,000 (PA should be tapered)')
const highIncomeData = createEmptyWizardData()
highIncomeData.incomeSources = [{ id: 'emp1', type: 'employment', label: 'BigCorp', data: {} }]
highIncomeData.employmentData = {
  emp1: {
    id: 'emp1',
    employerName: 'BigCorp',
    payReceived: 130000,
    taxDeducted: 42000, // Approximate PAYE
    hasP11D: false,
    claimingExpenses: false,
    isComplete: true,
  },
}
const highResult = calculateTaxForWizard(highIncomeData)
console.log(`  Total income: £${highResult.totalIncome / 100}`)
console.log(`  Personal allowance: £${highResult.personalAllowance / 100}`)
console.log(`  Expected PA: £0 (income > £125,140)`)
console.log(`  PA tapered correctly: ${highResult.personalAllowance === 0 ? '✓' : '✗'}`)
console.log(`  Taxable income: £${highResult.taxableAfterAllowance / 100}`)
console.log('')

// Test 5: Dividends with dividend allowance
console.log('Test 5: Dividends £10,000')
const divData = createEmptyWizardData()
divData.incomeSources = [{ id: 'div1', type: 'dividends', label: 'Dividends', data: {} }]
divData.dividendsData = {
  ukDividends: 10000,
  totalDividends: 10000,
  taxableDividends: 9500, // After £500 allowance
}
const divResult = calculateTaxForWizard(divData)
console.log(`  Total income: £${divResult.totalIncome / 100}`)
console.log(`  Dividends income: £${divResult.dividendsIncome / 100}`)
console.log(`  Dividend tax: £${divResult.dividendTax / 100}`)
console.log(`  Total due: £${divResult.totalDue / 100}`)
console.log('')

// Test 6: HICBC scenario
console.log('Test 6: HICBC - £70,000 income with child benefit')
const hicbcData = createEmptyWizardData()
hicbcData.incomeSources = [{ id: 'emp1', type: 'employment', label: 'Corp', data: {} }]
hicbcData.employmentData = {
  emp1: {
    id: 'emp1',
    employerName: 'Corp',
    payReceived: 70000,
    taxDeducted: 14000,
    hasP11D: false,
    claimingExpenses: false,
    isComplete: true,
  },
}
hicbcData.stateBenefitsData = {
  hasHighIncomeChildBenefit: true,
  childBenefitReceived: 1200,
  totalTaxableBenefits: 0,
}
const hicbcResult = calculateTaxForWizard(hicbcData)
console.log(`  Total income: £${hicbcResult.totalIncome / 100}`)
console.log(`  ANI: £${(hicbcResult.adjustedNetIncome || 0) / 100}`)
console.log(`  HICBC: £${(hicbcResult.hicbcCharge || 0) / 100}`)
console.log(`  Expected HICBC: ~£600 (50% of £1,200 for £70k income)`)
console.log('')

console.log('=== All tests complete ===')
