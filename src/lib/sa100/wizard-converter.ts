/**
 * Wizard Data to SA100 Converter
 *
 * Transforms wizard/declaration data into SA100 types for HMRC submission.
 *
 * Usage:
 *   import { convertWizardToSA100, validateForSubmission } from '@/lib/sa100/wizard-converter'
 *
 *   const sa100 = convertWizardToSA100(wizardData, taxpayer)
 *   const validation = validateForSubmission(sa100)
 *
 *   if (validation.isValid) {
 *     // Ready to build XML and submit
 *   }
 */

import type { WizardData } from '@/types/wizard'
import type {
  TaxpayerIdentification,
  SA102Employment,
  SA105UKProperty,
  SA108CapitalGains,
  SA101AdditionalInfo,
  SA100Reliefs,
} from './types'

// Wizard converter output format - intermediate structure before XML generation
// Uses SA100 types from ./types for schedule data
export interface WizardSA100Output {
  taxYear: string
  personalDetails: ReturnType<typeof convertPersonalDetails>
  declaration: {
    declarantType: 'taxpayer' | 'agent'
    name: string
    date: string
  }
  employments?: SA102Employment[]
  selfEmployments?: WizardSelfEmployment[]
  ukProperty?: SA105UKProperty
  foreignIncome?: WizardForeignIncome
  capitalGains?: SA108CapitalGains
  additionalInfo?: SA101AdditionalInfo
  reliefs?: SA100Reliefs
}


// Local interfaces for wizard data conversion (intermediate format before XML generation)
interface WizardSelfEmployment {
  businessName: string
  businessDescription: string
  businessAddress?: {
    line1: string
    postcode: string
  }
  accountingPeriod: {
    start: string
    end: string
  }
  accountingBasis: string
  income: {
    turnover: number
    otherIncome?: number
  }
  expenses: WizardExpenses
  capitalAllowances?: {
    annualInvestmentAllowance?: number
    otherCapitalAllowances?: number
  }
  losses?: {
    broughtForward?: number
    carriedForward?: number
  }
}

interface WizardExpenses {
  useConsolidated?: boolean
  consolidatedExpenses?: number
  costOfGoodsSold?: number
  carVanTravel?: number
  wages?: number
  rent?: number
  repairs?: number
  generalAdmin?: number
  advertising?: number
  interest?: number
  phone?: number
  otherExpenses?: number
}

interface WizardForeignIncome {
  foreignDividends?: Array<{
    countryCode: string
    amountBeforeTax: number
    taxPaid: number
  }>
  foreignInterest?: Array<{
    countryCode: string
    amountBeforeTax: number
    taxPaid: number
  }>
  foreignPensions?: Array<{
    countryCode: string
    amount: number
    taxPaid?: number
  }>
}

// =============================================================================
// Main Converter
// =============================================================================

export interface ConvertOptions {
  /** Declaration date (defaults to now) */
  declarationDate?: string
  /** Name of person making declaration */
  declarantName?: string
  /** Whether filing as agent */
  isAgent?: boolean
}

/**
 * Convert wizard data to SA100 return format
 */
export function convertWizardToSA100(
  wizardData: WizardData,
  taxpayer: TaxpayerIdentification,
  options: ConvertOptions = {}
): WizardSA100Output {
  const { declarationDate, declarantName, isAgent = false } = options

  // Extract first and last name from full name
  const nameParts = (wizardData.personalInfo?.fullName || '').trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || nameParts[0] || ''

  // Build the return
  const sa100: WizardSA100Output = {
    taxYear: formatTaxYear(wizardData.taxYear),

    personalDetails: convertPersonalDetails(wizardData, taxpayer, firstName, lastName),

    declaration: {
      declarantType: isAgent ? 'agent' : 'taxpayer',
      name: declarantName || wizardData.personalInfo?.fullName || '',
      date: declarationDate || new Date().toISOString().split('T')[0],
    },
  }

  // Add employment income (SA102)
  const employments = convertEmployments(wizardData)
  if (employments.length > 0) {
    sa100.employments = employments
  }

  // Add self-employment income (SA103)
  const selfEmployments = convertSelfEmployments(wizardData)
  if (selfEmployments.length > 0) {
    sa100.selfEmployments = selfEmployments
  }

  // Add UK property income (SA105)
  const ukProperty = convertUKProperty(wizardData)
  if (ukProperty) {
    sa100.ukProperty = ukProperty
  }

  // Add foreign income (SA106)
  const foreignIncome = convertForeignIncome(wizardData)
  if (foreignIncome) {
    sa100.foreignIncome = foreignIncome
  }

  // Add capital gains (SA108)
  const capitalGains = convertCapitalGains(wizardData)
  if (capitalGains) {
    sa100.capitalGains = capitalGains
  }

  // Add additional information (SA101)
  const additionalInfo = convertAdditionalInfo(wizardData)
  if (additionalInfo) {
    sa100.additionalInfo = additionalInfo
  }

  // Add tax reliefs
  const reliefs = convertReliefs(wizardData)
  if (reliefs) {
    sa100.reliefs = reliefs
  }

  return sa100
}

// =============================================================================
// Personal Details (SA100 Main Form)
// =============================================================================

function convertPersonalDetails(
  wizardData: WizardData,
  taxpayer: TaxpayerIdentification,
  firstName: string,
  lastName: string
) {
  const personalInfo = wizardData.personalInfo || {}

  // Parse address into lines
  const addressLines = parseAddress(personalInfo.address || '')

  return {
    firstName,
    lastName,
    nino: taxpayer.nino,
    utr: taxpayer.utr,
    dateOfBirth: '', // Not collected in wizard - user must provide separately
    address: {
      line1: addressLines[0] || '',
      line2: addressLines[1],
      line3: addressLines[2],
      line4: addressLines[3],
      postcode: personalInfo.postcode || '',
    },
    addressChanged: personalInfo.addressChanged ?? false,

    // Blind person's allowance from general section
    claimingBlindPersonsAllowance: wizardData.general?.blindAllowance?.registeredBlind,
    blindFromDate: wizardData.general?.blindAllowance?.registrationDate,
  }
}

// =============================================================================
// Employment Income (SA102)
// =============================================================================

function convertEmployments(wizardData: WizardData): SA102Employment[] {
  const employments: SA102Employment[] = []

  for (const [, empData] of Object.entries(wizardData.employmentData || {})) {
    if (!empData || !empData.employerName) continue

    const employment: SA102Employment = {
      employerDetails: {
        employerName: empData.employerName,
        payeReference: empData.employerPAYERef,
      },
      payFromEmployment: toWholePounds(empData.payReceived || 0),
      ukTaxDeducted: toWholePounds(empData.taxDeducted || 0),
      tipsAndOtherPayments: empData.tipsReceived ? toWholePounds(empData.tipsReceived) : undefined,
    }

    // Benefits in Kind (P11D)
    if (empData.hasP11D) {
      employment.benefitsAndExpenses = {
        companyCarsAndVans: empData.companyCarBenefit ? toWholePounds(empData.companyCarBenefit) : undefined,
        fuelForCompanyCarsAndVans: empData.fuelBenefit ? toWholePounds(empData.fuelBenefit) : undefined,
        privateMedicalInsurance: empData.medicalInsuranceBenefit
          ? toWholePounds(empData.medicalInsuranceBenefit)
          : undefined,
        otherBenefits: empData.otherBenefits ? toWholePounds(empData.otherBenefits) : undefined,
      }
    }

    // Expenses
    if (empData.claimingExpenses) {
      employment.employmentExpenses = {
        businessTravel: empData.travelExpenses
          ? toWholePounds(empData.travelExpenses)
          : undefined,
        professionalFees: empData.professionalFees
          ? toWholePounds(empData.professionalFees)
          : undefined,
        otherExpenses:
          (empData.workingFromHome || 0) + (empData.otherExpenses || 0) > 0
            ? toWholePounds((empData.workingFromHome || 0) + (empData.otherExpenses || 0))
            : undefined,
      }
    }

    employments.push(employment)
  }

  return employments
}

// =============================================================================
// Self-Employment Income (SA103)
// =============================================================================

function convertSelfEmployments(wizardData: WizardData): WizardSelfEmployment[] {
  const selfEmployments: WizardSelfEmployment[] = []

  for (const [, seData] of Object.entries(wizardData.selfEmploymentData || {})) {
    if (!seData || !seData.businessName) continue

    // Map wizard expense categories to SA103 categories
    const expenses = convertSelfEmploymentExpenses(seData.expenses)

    const selfEmployment: WizardSelfEmployment = {
      businessName: seData.businessName,
      businessDescription: seData.businessDescription || seData.industry || '',
      businessAddress: seData.businessPostcode
        ? {
            line1: '',
            postcode: seData.businessPostcode,
          }
        : undefined,

      accountingPeriod: {
        start: seData.startDate || `${wizardData.taxYear.split('-')[0]}-04-06`,
        end: seData.endDate || `20${wizardData.taxYear.split('-')[1]}-04-05`,
      },

      accountingBasis: seData.accountingMethod || 'cash',

      income: {
        turnover: toWholePounds(seData.income?.total || 0),
        otherIncome: undefined,
      },

      expenses,
    }

    // Capital allowances
    if (seData.capitalAllowances && seData.capitalAllowances.total > 0) {
      selfEmployment.capitalAllowances = {
        annualInvestmentAllowance: toWholePounds(
          (seData.capitalAllowances.equipment || 0) + (seData.capitalAllowances.vehicles || 0)
        ),
        otherCapitalAllowances: toWholePounds(seData.capitalAllowances.other || 0),
      }
    }

    // Losses
    if (seData.losses) {
      selfEmployment.losses = {
        broughtForward: toWholePounds(seData.losses.broughtForward || 0),
        carriedForward: toWholePounds(seData.losses.carriedForward || 0),
      }
    }

    selfEmployments.push(selfEmployment)
  }

  // Also handle CIS income as self-employment
  if (wizardData.cisData?.totalGross && wizardData.cisData.totalGross > 0) {
    const cisExpenses: WizardExpenses = {
      useConsolidated: true,
      consolidatedExpenses: toWholePounds(wizardData.cisData.expenses || 0),
    }

    selfEmployments.push({
      businessName: 'CIS Subcontractor',
      businessDescription: 'Construction Industry Scheme subcontractor',
      accountingPeriod: {
        start: `${wizardData.taxYear.split('-')[0]}-04-06`,
        end: `20${wizardData.taxYear.split('-')[1]}-04-05`,
      },
      accountingBasis: 'cash',
      income: {
        turnover: toWholePounds(wizardData.cisData.totalGross),
      },
      expenses: cisExpenses,
    })
  }

  return selfEmployments
}

function convertSelfEmploymentExpenses(
  expenses: { byCategory?: Record<string, number>; total?: number } | undefined
): WizardExpenses {
  if (!expenses) {
    return { useConsolidated: true, consolidatedExpenses: 0 }
  }

  const byCategory = expenses.byCategory || {}

  // If we have itemized categories, use them
  const hasItemizedExpenses = Object.keys(byCategory).length > 0

  if (!hasItemizedExpenses) {
    return {
      useConsolidated: true,
      consolidatedExpenses: toWholePounds(expenses.total || 0),
    }
  }

  // Map wizard categories to SA103 expense fields
  return {
    useConsolidated: false,
    costOfGoodsSold: toWholePoundsOrUndefined(byCategory['cost_of_goods'] || byCategory['materials']),
    carVanTravel: toWholePoundsOrUndefined(
      byCategory['travel'] || byCategory['vehicle'] || byCategory['mileage']
    ),
    wages: toWholePoundsOrUndefined(byCategory['wages'] || byCategory['staff_costs']),
    rent: toWholePoundsOrUndefined(byCategory['rent'] || byCategory['premises']),
    repairs: toWholePoundsOrUndefined(byCategory['repairs'] || byCategory['maintenance']),
    generalAdmin: toWholePoundsOrUndefined(
      byCategory['admin'] || byCategory['office'] || byCategory['general_admin']
    ),
    advertising: toWholePoundsOrUndefined(byCategory['advertising'] || byCategory['marketing']),
    interest: toWholePoundsOrUndefined(byCategory['interest'] || byCategory['bank_charges']),
    phone: toWholePoundsOrUndefined(byCategory['phone'] || byCategory['accountancy'] || byCategory['professional']),
    otherExpenses: toWholePoundsOrUndefined(byCategory['other'] || byCategory['miscellaneous']),
  }
}

// =============================================================================
// UK Property Income (SA105)
// =============================================================================

function convertUKProperty(wizardData: WizardData): SA105UKProperty | undefined {
  const properties = Object.values(wizardData.rentalData || {})
  const validProperties = properties.filter((p) => p && (p.income?.total || 0) > 0)

  if (validProperties.length === 0) return undefined

  // Aggregate all properties
  let totalRentIncome = 0
  let totalExpenses = 0
  let totalFinanceCosts = 0
  let hasItemizedExpenses = false

  const expensesByCategory: Record<string, number> = {}

  for (const prop of validProperties) {
    totalRentIncome += prop.income?.total || 0
    totalExpenses += prop.expenses?.total || 0
    totalFinanceCosts += (prop.mortgageInterest || 0) + (prop.otherFinanceCosts || 0)

    // Aggregate expense categories
    if (prop.expenses?.byCategory) {
      hasItemizedExpenses = true
      for (const [cat, amount] of Object.entries(prop.expenses.byCategory)) {
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amount
      }
    }
  }

  const netProfitOrLoss = totalRentIncome - totalExpenses

  const result: SA105UKProperty = {
    propertyIncome: {
      totalRentsAndOtherIncome: toWholePounds(totalRentIncome),
    },

    propertyExpenses: hasItemizedExpenses
      ? {
          itemizedExpenses: {
            rentsRatesInsurance: toWholePoundsOrUndefined(
              expensesByCategory['insurance'] ||
                expensesByCategory['rates'] ||
                expensesByCategory['council_tax']
            ),
            propertyRepairs: toWholePoundsOrUndefined(
              expensesByCategory['repairs'] || expensesByCategory['maintenance']
            ),
            legalProfessional: toWholePoundsOrUndefined(
              expensesByCategory['legal'] ||
                expensesByCategory['management_fees'] ||
                expensesByCategory['letting_fees']
            ),
            otherAllowable: toWholePoundsOrUndefined(expensesByCategory['other']),
          },
          totalAllowableExpenses: toWholePounds(totalExpenses),
        }
      : {
          consolidatedExpenses: toWholePounds(totalExpenses),
        },

    netProfitOrLoss: toWholePounds(netProfitOrLoss),
  }

  // Section 24 - Finance costs now a tax credit, not expense
  if (totalFinanceCosts > 0) {
    result.taxAdjustments = {
      residentialFinanceCosts: toWholePounds(totalFinanceCosts),
    }
  }

  return result
}

// =============================================================================
// Foreign Income (SA106)
// =============================================================================

function convertForeignIncome(wizardData: WizardData): WizardForeignIncome | undefined {
  const hasForeignDividends =
    (wizardData.dividendsData?.foreignDividends || 0) > 0 ||
    (wizardData.dividendsData?.foreignDividendsByCountry?.length || 0) > 0

  const hasForeignInterest =
    (wizardData.interestData?.foreignInterest || 0) > 0 ||
    (wizardData.interestData?.foreignInterestByCountry?.length || 0) > 0

  const hasForeignPensions = (wizardData.pensionIncomeData?.foreignPensions?.length || 0) > 0

  if (!hasForeignDividends && !hasForeignInterest && !hasForeignPensions) {
    return undefined
  }

  const foreignIncome: WizardForeignIncome = {}

  // Foreign dividends
  if (hasForeignDividends) {
    if (wizardData.dividendsData?.foreignDividendsByCountry?.length) {
      foreignIncome.foreignDividends = wizardData.dividendsData.foreignDividendsByCountry.map(
        (d) => ({
          countryCode: d.countryCode,
          amountBeforeTax: toWholePounds(d.amount),
          taxPaid: toWholePounds(d.taxPaid || 0),
        })
      )
    } else if (wizardData.dividendsData?.foreignDividends) {
      foreignIncome.foreignDividends = [
        {
          countryCode: wizardData.dividendsData.foreignDividendsCountry || 'XX',
          amountBeforeTax: toWholePounds(wizardData.dividendsData.foreignDividends),
          taxPaid: toWholePounds(wizardData.dividendsData.foreignTaxPaid || 0),
        },
      ]
    }
  }

  // Foreign interest
  if (hasForeignInterest) {
    if (wizardData.interestData?.foreignInterestByCountry?.length) {
      foreignIncome.foreignInterest = wizardData.interestData.foreignInterestByCountry.map((i) => ({
        countryCode: i.countryCode,
        amountBeforeTax: toWholePounds(i.amount),
        taxPaid: toWholePounds(i.taxPaid || 0),
      }))
    } else if (wizardData.interestData?.foreignInterest) {
      foreignIncome.foreignInterest = [
        {
          countryCode: wizardData.interestData.foreignInterestCountry || 'XX',
          amountBeforeTax: toWholePounds(wizardData.interestData.foreignInterest),
          taxPaid: toWholePounds(wizardData.interestData.foreignTaxPaidOnInterest || 0),
        },
      ]
    }
  }

  // Foreign pensions
  if (hasForeignPensions) {
    foreignIncome.foreignPensions = wizardData.pensionIncomeData!.foreignPensions!.map((p) => ({
      countryCode: p.countryCode,
      amount: toWholePounds(p.pensionAmount),
      taxPaid: p.taxPaid ? toWholePounds(p.taxPaid) : undefined,
    }))
  }

  return foreignIncome
}

// =============================================================================
// Capital Gains (SA108)
// =============================================================================

function convertCapitalGains(wizardData: WizardData): SA108CapitalGains | undefined {
  const cgData = wizardData.capitalGainsData
  const disposals = cgData?.disposals || []
  if (!cgData || disposals.length === 0) return undefined

  const capitalGains: SA108CapitalGains = {
    summary: {
      numberOfDisposals: disposals.length,
    },
  }

  // Group disposals by type
  const listedShares = disposals.filter(
    (d) => d.assetType === 'listed-shares' || d.assetType === 'shares'
  )
  const unlistedSharesDisposals = disposals.filter((d) => d.assetType === 'unlisted-shares')
  const residentialProperty = disposals.filter(
    (d) => d.assetType === 'residential-property' || d.assetType === 'property'
  )
  const other = disposals.filter(
    (d) =>
      d.assetType === 'crypto' ||
      d.assetType === 'other' ||
      d.assetType === 'other-property'
  )

  // Listed shares
  if (listedShares.length > 0) {
    const proceeds = listedShares.reduce((sum, d) => sum + d.proceedsAmount, 0)
    const costs = listedShares.reduce(
      (sum, d) => sum + d.acquisitionCost + (d.allowableCosts || 0),
      0
    )
    const gain = Math.max(0, proceeds - costs)
    const loss = Math.max(0, costs - proceeds)

    capitalGains.listedSharesAndSecurities = {
      disposalProceeds: toWholePounds(proceeds),
      allowableCosts: toWholePounds(costs),
      gainsInYear: gain > 0 ? toWholePounds(gain) : undefined,
      lossesInYear: loss > 0 ? toWholePounds(loss) : undefined,
    }
  }

  // Unlisted shares
  if (unlistedSharesDisposals.length > 0) {
    const proceeds = unlistedSharesDisposals.reduce((sum, d) => sum + d.proceedsAmount, 0)
    const costs = unlistedSharesDisposals.reduce(
      (sum, d) => sum + d.acquisitionCost + (d.allowableCosts || 0),
      0
    )
    const gain = Math.max(0, proceeds - costs)
    const loss = Math.max(0, costs - proceeds)

    capitalGains.unlistedShares = {
      disposalProceeds: toWholePounds(proceeds),
      allowableCosts: toWholePounds(costs),
      gainsInYear: gain > 0 ? toWholePounds(gain) : undefined,
      lossesInYear: loss > 0 ? toWholePounds(loss) : undefined,
    }
  }

  // Residential property
  if (residentialProperty.length > 0) {
    const totalGains = residentialProperty.reduce((sum, d) => sum + Math.max(0, d.gain || 0), 0)
    const totalLosses = residentialProperty.reduce((sum, d) => sum + Math.max(0, -(d.gain || 0)), 0)

    capitalGains.ukResidentialProperty = {
      numberOfProperties: residentialProperty.length,
      totalGains: totalGains > 0 ? toWholePounds(totalGains) : undefined,
      totalLosses: totalLosses > 0 ? toWholePounds(totalLosses) : undefined,
      properties: residentialProperty.map((d) => ({
        address: d.assetDescription,
        disposalDate: d.dateSold,
        disposalProceeds: toWholePounds(d.proceedsAmount),
        allowableCosts: toWholePounds(d.acquisitionCost + (d.allowableCosts || 0)),
        privateResidenceRelief: d.privateResidenceRelief
          ? toWholePounds(d.privateResidenceRelief)
          : undefined,
        gain: d.gain > 0 ? toWholePounds(d.gain) : undefined,
      })),
    }
  }

  // Other gains (crypto, etc.)
  if (other.length > 0) {
    const proceeds = other.reduce((sum, d) => sum + d.proceedsAmount, 0)
    const costs = other.reduce((sum, d) => sum + d.acquisitionCost + (d.allowableCosts || 0), 0)
    const gain = Math.max(0, proceeds - costs)
    const loss = Math.max(0, costs - proceeds)

    capitalGains.otherPropertyAndAssets = {
      disposalProceeds: toWholePounds(proceeds),
      allowableCosts: toWholePounds(costs),
      gainsInYear: gain > 0 ? toWholePounds(gain) : undefined,
      lossesInYear: loss > 0 ? toWholePounds(loss) : undefined,
    }
  }

  // Losses
  if (cgData.lossesFromPreviousYears || cgData.totalLosses) {
    capitalGains.losses = {
      lossesBroughtForward: cgData.lossesFromPreviousYears
        ? toWholePounds(cgData.lossesFromPreviousYears)
        : undefined,
      lossesUsedThisYear: cgData.totalLosses
        ? toWholePounds(Math.min(cgData.totalLosses, cgData.totalGains || 0))
        : undefined,
    }
  }

  capitalGains.annualExemptAmount = {
    amountClaimed: toWholePounds(cgData.annualExemptAmount || 3000),
  }

  return capitalGains
}

// =============================================================================
// Additional Information (SA101)
// =============================================================================

function convertAdditionalInfo(_wizardData: WizardData): SA101AdditionalInfo | undefined {
  // SA101 Additional Information is for special cases like:
  // - Other UK income not included elsewhere
  // - Share schemes
  // - Disguised remuneration
  // - Employment lump sums and compensation
  // - Life insurance gains
  // - Pension savings tax charges
  //
  // The wizard currently doesn't collect data for these specific SA101 fields.
  // Returns undefined to indicate no SA101 schedule is needed.
  return undefined
}

// =============================================================================
// Tax Reliefs
// =============================================================================

function convertReliefs(wizardData: WizardData): SA100Reliefs | undefined {
  const general = wizardData.general
  if (!general) return undefined

  const reliefs: SA100Reliefs = {}
  let hasData = false

  // Pension contributions
  if (general.pension && general.pension.personalContributions > 0) {
    reliefs.pensionContributions = {
      personalPensions: toWholePounds(general.pension.personalContributions),
      employerScheme: general.pension.employerContributions
        ? toWholePounds(general.pension.employerContributions)
        : undefined,
    }
    hasData = true
  }

  // Gift Aid
  if (general.charitable && general.charitable.giftAidDonations > 0) {
    reliefs.giftAid = {
      paymentsThisYear: toWholePounds(general.charitable.giftAidDonations),
      treatAsPreviousYear: general.charitable.giftAidTreatedAsPreviousYear
        ? toWholePounds(general.charitable.giftAidTreatedAsPreviousYear)
        : undefined,
      broughtForward: general.charitable.giftAidBroughtForward
        ? toWholePounds(general.charitable.giftAidBroughtForward)
        : undefined,
    }
    hasData = true
  }

  // EIS
  if (general.ventureCapital?.eisInvestments && general.ventureCapital.eisInvestments > 0) {
    reliefs.eis = {
      amountInvested: toWholePounds(general.ventureCapital.eisInvestments),
    }
    hasData = true
  }

  // SEIS
  if (general.ventureCapital?.seisInvestments && general.ventureCapital.seisInvestments > 0) {
    reliefs.seis = {
      amountInvested: toWholePounds(general.ventureCapital.seisInvestments),
    }
    hasData = true
  }

  // VCT
  if (general.ventureCapital?.vctInvestments && general.ventureCapital.vctInvestments > 0) {
    reliefs.vct = {
      amountInvested: toWholePounds(general.ventureCapital.vctInvestments),
    }
    hasData = true
  }

  return hasData ? reliefs : undefined
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  section: string
}

/**
 * Validate SA100 data for submission
 */
export function validateForSubmission(data: WizardSA100Output): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Required fields
  if (!data.taxYear) {
    errors.push({ field: 'taxYear', message: 'Tax year is required', section: 'general' })
  }

  // Personal details
  if (!data.personalDetails.firstName) {
    errors.push({ field: 'firstName', message: 'First name is required', section: 'personalDetails' })
  }
  if (!data.personalDetails.lastName) {
    errors.push({ field: 'lastName', message: 'Last name is required', section: 'personalDetails' })
  }
  if (!data.personalDetails.nino) {
    errors.push({
      field: 'nino',
      message: 'National Insurance number is required',
      section: 'personalDetails',
    })
  } else if (!isValidNINO(data.personalDetails.nino)) {
    errors.push({
      field: 'nino',
      message: 'Invalid National Insurance number format',
      section: 'personalDetails',
    })
  }
  if (!data.personalDetails.utr) {
    errors.push({
      field: 'utr',
      message: 'Unique Taxpayer Reference is required',
      section: 'personalDetails',
    })
  } else if (!isValidUTR(data.personalDetails.utr)) {
    errors.push({
      field: 'utr',
      message: 'Invalid UTR format (should be 10 digits)',
      section: 'personalDetails',
    })
  }
  if (!data.personalDetails.dateOfBirth) {
    warnings.push({
      field: 'dateOfBirth',
      message: 'Date of birth is recommended',
      section: 'personalDetails',
    })
  }
  if (!data.personalDetails.address.line1) {
    errors.push({
      field: 'address.line1',
      message: 'Address line 1 is required',
      section: 'personalDetails',
    })
  }
  if (!data.personalDetails.address.postcode) {
    errors.push({
      field: 'address.postcode',
      message: 'Postcode is required',
      section: 'personalDetails',
    })
  }

  // Declaration
  if (!data.declaration.name) {
    errors.push({ field: 'declaration.name', message: 'Declarant name is required', section: 'declaration' })
  }
  if (!data.declaration.date) {
    errors.push({
      field: 'declaration.date',
      message: 'Declaration date is required',
      section: 'declaration',
    })
  }

  // Employment validation
  if (data.employments) {
    for (let i = 0; i < data.employments.length; i++) {
      const emp = data.employments[i]
      if (!emp.employerDetails?.employerName) {
        errors.push({
          field: `employments[${i}].employerDetails.employerName`,
          message: 'Employer name is required',
          section: 'employment',
        })
      }
      if (emp.payFromEmployment <= 0) {
        warnings.push({
          field: `employments[${i}].payFromEmployment`,
          message: 'Pay from employment seems unusually low',
          section: 'employment',
        })
      }
    }
  }

  // Self-employment validation
  if (data.selfEmployments) {
    for (let i = 0; i < data.selfEmployments.length; i++) {
      const se = data.selfEmployments[i]
      if (!se.businessName) {
        errors.push({
          field: `selfEmployments[${i}].businessName`,
          message: 'Business name is required',
          section: 'selfEmployment',
        })
      }
      if (!se.businessDescription) {
        warnings.push({
          field: `selfEmployments[${i}].businessDescription`,
          message: 'Business description is recommended',
          section: 'selfEmployment',
        })
      }
    }
  }

  // Capital gains validation
  if (data.capitalGains?.ukResidentialProperty?.properties) {
    for (let i = 0; i < data.capitalGains.ukResidentialProperty.properties.length; i++) {
      const prop = data.capitalGains.ukResidentialProperty.properties[i]
      if (!prop.address) {
        errors.push({
          field: `capitalGains.ukResidentialProperty.properties[${i}].address`,
          message: 'Property address is required',
          section: 'capitalGains',
        })
      }
      if (!prop.disposalDate) {
        errors.push({
          field: `capitalGains.ukResidentialProperty.properties[${i}].disposalDate`,
          message: 'Disposal date is required',
          section: 'capitalGains',
        })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format tax year from "2024-25" to "2024-25"
 */
function formatTaxYear(taxYear: string): string {
  // Already in correct format
  if (/^\d{4}-\d{2}$/.test(taxYear)) {
    return taxYear
  }
  // Convert "2024/25" to "2024-25"
  if (/^\d{4}\/\d{2}$/.test(taxYear)) {
    return taxYear.replace('/', '-')
  }
  // Assume it's a year like "2024"
  const year = parseInt(taxYear)
  if (!isNaN(year)) {
    return `${year}-${(year + 1).toString().slice(-2)}`
  }
  return taxYear
}

/**
 * Convert amount to whole pounds (rounding to nearest pound)
 */
function toWholePounds(amount: number): number {
  return Math.round(amount)
}

/**
 * Convert to whole pounds or undefined if zero/undefined
 */
function toWholePoundsOrUndefined(amount: number | undefined): number | undefined {
  if (amount === undefined || amount === 0) return undefined
  return Math.round(amount)
}

/**
 * Parse address string into lines
 */
function parseAddress(address: string): string[] {
  if (!address) return []
  // Split by commas or newlines
  return address
    .split(/[,\n]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Validate NINO format
 */
function isValidNINO(nino: string): boolean {
  // Format: 2 letters, 6 digits, 1 letter (e.g., AB123456C)
  const ninoRegex = /^[A-Z]{2}\d{6}[A-D]$/i
  return ninoRegex.test(nino.replace(/\s/g, ''))
}

/**
 * Validate UTR format
 */
function isValidUTR(utr: string): boolean {
  // 10 digits
  const utrClean = utr.replace(/\s/g, '')
  return /^\d{10}$/.test(utrClean)
}
