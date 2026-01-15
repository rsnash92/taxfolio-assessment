/**
 * SA100 XML Builder
 *
 * Converts wizard data into the GovTalk XML format required by HMRC.
 *
 * Structure:
 * - GovTalk envelope (authentication, routing)
 *   - IR envelope (taxpayer info, IRmark)
 *     - MTR/SA100 return data
 *       - Supplementary pages (SA102, SA103, SA105, etc.)
 *
 * Based on HMRC RIM Artefacts 2025 v1.0 (MTR-v1-0.xsd)
 */

import type {
  GatewayCredentials,
  TaxpayerIdentification,
  SA100Return,
  SenderType,
} from './types'
import { NAMESPACES, SCHEMA_VERSION, MESSAGE_CLASS, getPeriodEndDate } from './schema-reference'
import { calculateIRmark, insertIRmark } from './irmark'
import { getChannelRoutingInfo } from './transaction-engine'

// =============================================================================
// Main Builder Function
// =============================================================================

export interface BuildXMLOptions {
  credentials: GatewayCredentials
  taxpayer: TaxpayerIdentification
  returnData: SA100Return
  /** Sender type - Individual, Agent, etc. */
  senderType?: SenderType
  /** If true, validates but doesn't submit */
  dryRun?: boolean
  /** If true, includes GatewayTest=1 for ETS testing */
  isTestSubmission?: boolean
}

export interface BuildXMLResult {
  xml: string
  irMark: string
  validationErrors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Build complete GovTalk XML from wizard data
 */
export function buildSubmissionXML(options: BuildXMLOptions): BuildXMLResult {
  const { credentials, taxpayer, returnData, senderType = 'Individual', isTestSubmission = false } = options

  console.log('[XML Builder] Building XML with:', {
    senderId: credentials.userId,
    utr: taxpayer.utr,
    nino: taxpayer.nino,
    taxYear: returnData.taxYear,
    senderType,
    isTestSubmission,
  })

  // Validate the data first
  const validationErrors = validateReturnData(returnData)
  console.log('[XML Builder] Validation errors:', validationErrors.length > 0 ? validationErrors : 'none')

  // Build the MTR content (contains SA100)
  const mtrXml = buildMTRContent(returnData)

  // Build the IR envelope with a placeholder IRmark
  const irEnvelopeXml = buildIREnvelope(taxpayer, returnData, senderType, mtrXml)

  // Build the complete GovTalk envelope first (with placeholder IRmark)
  const govTalkXmlWithPlaceholder = buildGovTalkEnvelope(credentials, taxpayer, irEnvelopeXml, isTestSubmission)

  // Now calculate IRmark on the MTR as it appears in the final structure
  // and insert it
  const govTalkXml = insertIRmark(govTalkXmlWithPlaceholder)

  // Extract the calculated IRmark for return
  const irMarkMatch = govTalkXml.match(/<IRmark[^>]*>([^<]+)<\/IRmark>/)
  const irMark = irMarkMatch ? irMarkMatch[1] : ''

  // Log the header portion of the XML (contains auth info, mask password)
  const headerEnd = govTalkXml.indexOf('</Header>')
  if (headerEnd > 0) {
    const headerXml = govTalkXml.substring(0, headerEnd + 9)
    // Mask password in log
    const maskedHeader = headerXml.replace(/<Value>([^<]+)<\/Value>/, '<Value>***MASKED***</Value>')
    console.log('[XML Builder] Generated XML header:\n', maskedHeader)
  }
  console.log('[XML Builder] IRmark:', irMark)
  console.log('[XML Builder] Total XML length:', govTalkXml.length)

  return {
    xml: govTalkXml,
    irMark,
    validationErrors,
  }
}

// =============================================================================
// GovTalk Envelope Builder
// =============================================================================

function buildGovTalkEnvelope(
  credentials: GatewayCredentials,
  taxpayer: TaxpayerIdentification,
  irEnvelopeContent: string,
  isTestSubmission: boolean = false
): string {
  const channelInfo = getChannelRoutingInfo()

  // GatewayTest element: Per HMRC ETS documentation, set to 1 for test submissions
  // This routes the submission through TPVS (Third Party Validation Service) for testing
  const gatewayTestElement = isTestSubmission ? '\n      <GatewayTest>1</GatewayTest>' : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="${NAMESPACES.GOVTALK}">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>${MESSAGE_CLASS}</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>${gatewayTestElement}
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(credentials.userId)}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${escapeXml(credentials.password)}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys>
      <Key Type="UTR">${escapeXml(taxpayer.utr)}</Key>
    </Keys>
    <TargetDetails>
      <Organisation>IR</Organisation>
    </TargetDetails>
    <ChannelRouting>
      <Channel>
        <URI>${escapeXml(channelInfo.uri)}</URI>
        <Product>${escapeXml(channelInfo.product)}</Product>
        <Version>${escapeXml(channelInfo.version)}</Version>
      </Channel>
    </ChannelRouting>
  </GovTalkDetails>
  <Body>
${indentXml(irEnvelopeContent, 4)}
  </Body>
</GovTalkMessage>`
}

// =============================================================================
// IR Envelope Builder
// =============================================================================

function buildIREnvelope(
  taxpayer: TaxpayerIdentification,
  returnData: SA100Return,
  senderType: SenderType,
  mtrContent: string
): string {
  const periodEnd = getPeriodEndDate(returnData.taxYear)

  return `<IRenvelope xmlns="${NAMESPACES.MTR}">
  <IRheader>
    <Keys>
      <Key Type="UTR">${escapeXml(taxpayer.utr)}</Key>
    </Keys>
    <PeriodEnd>${periodEnd}</PeriodEnd>
    <DefaultCurrency>GBP</DefaultCurrency>
    <Manifest>
      <Contains>
        <Reference>
          <Namespace>${NAMESPACES.MTR}</Namespace>
          <SchemaVersion>${SCHEMA_VERSION}</SchemaVersion>
          <TopElementName>MTR</TopElementName>
        </Reference>
      </Contains>
    </Manifest>
    <IRmark Type="generic"></IRmark>
    <Sender>${senderType}</Sender>
  </IRheader>
${indentXml(mtrContent, 2)}
</IRenvelope>`
}

// =============================================================================
// MTR (Main Tax Return) Content Builder
// =============================================================================

function buildMTRContent(returnData: SA100Return): string {
  const sections: string[] = []

  // SA100 is the main return - always first
  sections.push(buildSA100Content(returnData))

  // Supplementary schedules are siblings of SA100 inside MTR (per schema)

  // SA101 Additional Information (0-1)
  if (returnData.sa101) {
    sections.push(buildSA101(returnData.sa101))
  }

  // SA102 Employment (0-50)
  if (returnData.sa102 && returnData.sa102.length > 0) {
    for (const employment of returnData.sa102) {
      sections.push(buildSA102(employment))
    }
  }

  // SA103F Full Self-Employment (0-50)
  if (returnData.sa103F && returnData.sa103F.length > 0) {
    for (const business of returnData.sa103F) {
      sections.push(buildSA103F(business))
    }
  }

  // SA103S Short Self-Employment (0-50)
  if (returnData.sa103S && returnData.sa103S.length > 0) {
    for (const business of returnData.sa103S) {
      sections.push(buildSA103S(business))
    }
  }

  // SA105 UK Property (0-1)
  if (returnData.sa105) {
    sections.push(buildSA105(returnData.sa105))
  }

  // SA106 Foreign (0-1)
  if (returnData.sa106) {
    sections.push(buildSA106(returnData.sa106))
  }

  // SA108 Capital Gains (0-1)
  if (returnData.sa108) {
    sections.push(buildSA108(returnData.sa108))
  }

  // SA110 Tax Calculation Summary (MANDATORY - always include)
  sections.push(buildSA110(returnData))

  // Declaration (MANDATORY - always include)
  const declarationType = returnData.finishing.returnSigner === 'Agent' ? 'AgentDeclaration' : 'IndividualDeclaration'
  sections.push(`<Declaration>
  <${declarationType}>yes</${declarationType}>
</Declaration>`)

  return `<MTR>
${sections.map((s) => indentXml(s, 2)).join('\n')}
</MTR>`
}

// =============================================================================
// SA100 Content Builder
// =============================================================================

function buildSA100Content(returnData: SA100Return): string {
  const sections: string[] = []

  // Your Personal Details - MANDATORY
  sections.push(buildYourPersonalDetails(returnData))

  // Your Tax Return - indicates which schedules are included
  sections.push(buildYourTaxReturn(returnData))

  // Student Loan Repayments
  if (returnData.studentLoanRepayments) {
    sections.push(buildStudentLoanRepayments(returnData.studentLoanRepayments))
  }

  // UK Interest Etc (Income section in schema)
  if (returnData.ukInterestEtc || returnData.ukDividends) {
    sections.push(buildIncome(returnData))
  }

  // Tax Reliefs
  if (returnData.reliefs) {
    sections.push(buildTaxReliefs(returnData.reliefs))
  }

  // Marriage Allowance
  if (returnData.marriage) {
    sections.push(buildMarriageAllowance(returnData.marriage))
  }

  // FinishingYourTaxReturn - MANDATORY (note: not just "Finishing")
  sections.push(buildFinishingYourTaxReturn(returnData.finishing))

  return `<SA100>
${sections.map((s) => indentXml(s, 2)).join('\n')}
</SA100>`
}

// =============================================================================
// YourPersonalDetails Section
// =============================================================================

function buildYourPersonalDetails(returnData: SA100Return): string {
  const details = returnData.yourPersonalDetails
  const elements: string[] = []

  // Schema order: DateOfBirth, NewAddress, TelephoneNumber, NationalInsuranceNumber, TaxpayerStatus
  if (details.dateOfBirth) {
    elements.push(`<DateOfBirth>${details.dateOfBirth}</DateOfBirth>`)
  }

  if (details.newAddress) {
    const addrElements: string[] = []
    addrElements.push(`<AddressLine1>${escapeXml(details.newAddress.addressLine1)}</AddressLine1>`)
    addrElements.push(`<AddressLine2>${escapeXml(details.newAddress.addressLine2 || '')}</AddressLine2>`)
    if (details.newAddress.addressLine3) {
      addrElements.push(`<AddressLine3>${escapeXml(details.newAddress.addressLine3)}</AddressLine3>`)
    }
    if (details.newAddress.addressLine4) {
      addrElements.push(`<AddressLine4>${escapeXml(details.newAddress.addressLine4)}</AddressLine4>`)
    }
    if (details.newAddress.postcode) {
      addrElements.push(`<Postcode>${escapeXml(details.newAddress.postcode)}</Postcode>`)
    }
    addrElements.push(`<EffectiveFrom>${details.newAddress.effectiveFrom || new Date().toISOString().split('T')[0]}</EffectiveFrom>`)
    elements.push(`<NewAddress>\n${addrElements.map((e) => '  ' + e).join('\n')}\n</NewAddress>`)
  }

  if (details.telephoneNumber) {
    elements.push(`<TelephoneNumber>${escapeXml(details.telephoneNumber)}</TelephoneNumber>`)
  }

  if (details.nationalInsuranceNumber) {
    elements.push(`<NationalInsuranceNumber>${escapeXml(details.nationalInsuranceNumber)}</NationalInsuranceNumber>`)
  }

  elements.push(`<TaxpayerStatus>${details.taxpayerStatus}</TaxpayerStatus>`)

  return `<YourPersonalDetails>
${elements.map((e) => '  ' + e).join('\n')}
</YourPersonalDetails>`
}

// =============================================================================
// YourTaxReturn Section (Schedule Indicators)
// =============================================================================

function buildYourTaxReturn(returnData: SA100Return): string {
  const indicators: string[] = []

  // Employment
  if (returnData.sa102 && returnData.sa102.length > 0) {
    indicators.push('<EmploymentSchedule>yes</EmploymentSchedule>')
    indicators.push(`<NumberOfEmploymentSchedules>${returnData.sa102.length}</NumberOfEmploymentSchedules>`)
  }

  // Self-Employment Short
  if (returnData.sa103S && returnData.sa103S.length > 0) {
    indicators.push('<ShortSelfEmploymentSchedule>yes</ShortSelfEmploymentSchedule>')
    indicators.push(`<NumberOfShortSelfEmploymentSchedules>${returnData.sa103S.length}</NumberOfShortSelfEmploymentSchedules>`)
  }

  // Self-Employment Full
  if (returnData.sa103F && returnData.sa103F.length > 0) {
    indicators.push('<FullSelfEmploymentSchedule>yes</FullSelfEmploymentSchedule>')
    indicators.push(`<NumberOfFullSelfEmploymentSchedules>${returnData.sa103F.length}</NumberOfFullSelfEmploymentSchedules>`)
  }

  // UK Property
  if (returnData.sa105) {
    indicators.push('<UKPropertySchedule>yes</UKPropertySchedule>')
  }

  // Foreign
  if (returnData.sa106) {
    indicators.push('<ForeignSchedule>yes</ForeignSchedule>')
  }

  // Capital Gains
  if (returnData.sa108) {
    indicators.push('<CapitalGainsSchedule>yes</CapitalGainsSchedule>')
  }

  // Additional Information
  if (returnData.sa101) {
    indicators.push('<AdditionalInformationSchedule>yes</AdditionalInformationSchedule>')
  }

  return `<YourTaxReturn>
${indicators.map((i) => '  ' + i).join('\n')}
</YourTaxReturn>`
}

// =============================================================================
// Main SA100 Sections
// =============================================================================

function buildStudentLoanRepayments(data: NonNullable<SA100Return['studentLoanRepayments']>): string {
  const elements: string[] = []

  if (data.incomeContingentStudentLoanNotification) {
    elements.push('<IncomeContingentStudentLoanNotification>yes</IncomeContingentStudentLoanNotification>')
  }
  if (data.postgraduateLoanNotification) {
    elements.push('<PostgraduateLoanNotification>yes</PostgraduateLoanNotification>')
  }
  if (data.studentLoanRepaymentDeductedAmount !== undefined) {
    elements.push(`<StudentLoanRepaymentDeductedAmount>${formatMoney(data.studentLoanRepaymentDeductedAmount)}</StudentLoanRepaymentDeductedAmount>`)
  }
  if (data.postgraduateLoanRepaymentDeductedAmount !== undefined) {
    elements.push(`<PostgraduateLoanRepaymentDeductedAmount>${formatMoney(data.postgraduateLoanRepaymentDeductedAmount)}</PostgraduateLoanRepaymentDeductedAmount>`)
  }

  return `<StudentLoanRepayments>
${elements.map((e) => '  ' + e).join('\n')}
</StudentLoanRepayments>`
}

/**
 * Build Income section (schema element: Income)
 * Contains: UKInterestAndDividends, StateBenefits, OtherUKIncome
 */
function buildIncome(returnData: SA100Return): string {
  const elements: string[] = []

  // UKInterestAndDividends subsection
  const interestDividendElements: string[] = []

  if (returnData.ukInterestEtc?.taxedUKInterestAmount !== undefined) {
    interestDividendElements.push(`<TaxedBankBuildingSocietyEtcInterest>${formatMoney(returnData.ukInterestEtc.taxedUKInterestAmount)}</TaxedBankBuildingSocietyEtcInterest>`)
  }
  if (returnData.ukInterestEtc?.untaxedUKInterestAmount !== undefined) {
    interestDividendElements.push(`<UntaxedUKinterestEtc>${formatMoney(returnData.ukInterestEtc.untaxedUKInterestAmount)}</UntaxedUKinterestEtc>`)
  }
  if (returnData.ukInterestEtc?.untaxedForeignInterestAmount !== undefined) {
    interestDividendElements.push(`<UntaxedForeignInterest>${formatMoney(returnData.ukInterestEtc.untaxedForeignInterestAmount)}</UntaxedForeignInterest>`)
  }
  if (returnData.ukDividends?.ukDividendsAmount !== undefined) {
    interestDividendElements.push(`<CompanyDividends>${formatMoney(returnData.ukDividends.ukDividendsAmount)}</CompanyDividends>`)
  }
  if (returnData.ukDividends?.otherDividendsAmount !== undefined) {
    interestDividendElements.push(`<UnitTrustEtcDividends>${formatMoney(returnData.ukDividends.otherDividendsAmount)}</UnitTrustEtcDividends>`)
  }

  if (interestDividendElements.length > 0) {
    elements.push(`<UKInterestAndDividends>
${interestDividendElements.map((e) => '  ' + e).join('\n')}
</UKInterestAndDividends>`)
  }

  // StateBenefits subsection
  const benefitElements: string[] = []
  if (returnData.ukPensionsAnnuities?.statePensionAmount !== undefined) {
    benefitElements.push(`<AnnualStatePension>${formatMoney(returnData.ukPensionsAnnuities.statePensionAmount)}</AnnualStatePension>`)
  }
  if (returnData.ukPensionsAnnuities?.statePensionLumpSumAmount !== undefined) {
    benefitElements.push(`<StatePensionLumpSum>${formatMoney(returnData.ukPensionsAnnuities.statePensionLumpSumAmount)}</StatePensionLumpSum>`)
  }
  if (returnData.ukPensionsAnnuities?.taxTakenOffStatePensionLumpSum !== undefined) {
    benefitElements.push(`<TaxTakenOffPensionLumpSum>${formatMoney(returnData.ukPensionsAnnuities.taxTakenOffStatePensionLumpSum)}</TaxTakenOffPensionLumpSum>`)
  }
  if (returnData.ukPensionsAnnuities?.taxedPensionsAndRetirementAnnuitiesAmount !== undefined) {
    benefitElements.push(`<OtherPensionsAndRetirementAnnuities>${formatMoney(returnData.ukPensionsAnnuities.taxedPensionsAndRetirementAnnuitiesAmount)}</OtherPensionsAndRetirementAnnuities>`)
  }
  if (returnData.stateBenefits?.incapacityBenefitAmount !== undefined) {
    benefitElements.push(`<IncapacityBenefit>${formatMoney(returnData.stateBenefits.incapacityBenefitAmount)}</IncapacityBenefit>`)
  }
  if (returnData.stateBenefits?.jobseekersAllowanceAmount !== undefined) {
    benefitElements.push(`<JobseekersAllowance>${formatMoney(returnData.stateBenefits.jobseekersAllowanceAmount)}</JobseekersAllowance>`)
  }

  if (benefitElements.length > 0) {
    elements.push(`<StateBenefits>
${benefitElements.map((e) => '  ' + e).join('\n')}
</StateBenefits>`)
  }

  return `<Income>
${elements.map((e) => '  ' + e).join('\n')}
</Income>`
}

/**
 * Build TaxReliefs section (schema element: TaxReliefs)
 * Contains: Pensions, CharitableGiving
 */
function buildTaxReliefs(data: NonNullable<SA100Return['reliefs']>): string {
  const elements: string[] = []

  // Pensions subsection
  const pensionElements: string[] = []
  if (data.pensionContributions?.personalPensions !== undefined) {
    pensionElements.push(`<PaymentsToRegisteredPensionSchemes>${formatMoney(data.pensionContributions.personalPensions)}</PaymentsToRegisteredPensionSchemes>`)
  }
  if (data.pensionContributions?.retirementAnnuity !== undefined) {
    pensionElements.push(`<RetirementAnnuityContractPayments>${formatMoney(data.pensionContributions.retirementAnnuity)}</RetirementAnnuityContractPayments>`)
  }

  if (pensionElements.length > 0) {
    elements.push(`<Pensions>
${pensionElements.map((e) => '  ' + e).join('\n')}
</Pensions>`)
  }

  // CharitableGiving subsection
  const charityElements: string[] = []
  if (data.giftAid?.paymentsThisYear !== undefined) {
    charityElements.push(`<GiftAidPaymentsMadeInYear>${formatMoney(data.giftAid.paymentsThisYear)}</GiftAidPaymentsMadeInYear>`)
  }

  if (charityElements.length > 0) {
    elements.push(`<CharitableGiving>
${charityElements.map((e) => '  ' + e).join('\n')}
</CharitableGiving>`)
  }

  return `<TaxReliefs>
${elements.map((e) => '  ' + e).join('\n')}
</TaxReliefs>`
}

/**
 * Build MarriageAllowance section (schema element: MarriageAllowance)
 */
function buildMarriageAllowance(data: NonNullable<SA100Return['marriage']>): string {
  const elements: string[] = []

  if (data.spouseNINO) {
    elements.push(`<SpouseOrCivilPartnersNINO>${escapeXml(data.spouseNINO)}</SpouseOrCivilPartnersNINO>`)
  }
  if (data.spouseName) {
    elements.push(`<SpouseOrCivilPartnersName>${escapeXml(data.spouseName)}</SpouseOrCivilPartnersName>`)
  }
  if (data.spouseDateOfBirth) {
    elements.push(`<SpouseDateOfBirth>${data.spouseDateOfBirth}</SpouseDateOfBirth>`)
  }
  if (data.dateOfMarriage) {
    elements.push(`<DateOfMarriageOrCivilPartnership>${data.dateOfMarriage}</DateOfMarriageOrCivilPartnership>`)
  }

  return `<MarriageAllowance>
${elements.map((e) => '  ' + e).join('\n')}
</MarriageAllowance>`
}

/**
 * Build FinishingYourTaxReturn section (schema element name, not "Finishing")
 */
function buildFinishingYourTaxReturn(data: SA100Return['finishing']): string {
  // The schema allows various optional elements in FinishingYourTaxReturn
  // For minimal compliance, we can leave it empty or add specific elements
  const elements: string[] = []

  // Add any provisional figures or tax adviser info if needed
  if (data.signerCapacity || data.returnSigner !== 'Individual') {
    const signingElements: string[] = []
    if (data.signerCapacity) {
      signingElements.push(`<CapacityOfPersonSigning>${escapeXml(data.signerCapacity)}</CapacityOfPersonSigning>`)
    }
    if (signingElements.length > 0) {
      elements.push(`<SigningYourForm>
${signingElements.map((e) => '  ' + e).join('\n')}
</SigningYourForm>`)
    }
  }

  // Return empty element if no sub-elements (schema allows this)
  if (elements.length === 0) {
    return '<FinishingYourTaxReturn/>'
  }

  return `<FinishingYourTaxReturn>
${elements.map((e) => '  ' + e).join('\n')}
</FinishingYourTaxReturn>`
}

// =============================================================================
// SA102 Employment Schedule
// =============================================================================

function buildSA102(data: NonNullable<SA100Return['sa102']>[0]): string {
  // Schema structure: SA102 > Employment (required wrapper)
  const empElements: string[] = []

  // Pay and tax
  if (data.payFromEmployment !== undefined) {
    empElements.push(`<PayFromEmployment>${formatMoney(data.payFromEmployment)}</PayFromEmployment>`)
  }
  if (data.ukTaxDeducted !== undefined) {
    empElements.push(`<TaxTakenOffPay>${formatMoney(data.ukTaxDeducted)}</TaxTakenOffPay>`)
  }
  if (data.tipsAndOtherPayments !== undefined) {
    empElements.push(`<TipsAndOtherPayments>${formatMoney(data.tipsAndOtherPayments)}</TipsAndOtherPayments>`)
  }

  // PAYE reference (required)
  empElements.push(`<EmployerPAYEReference>${escapeXml(data.employerDetails.payeReference || '000/0000')}</EmployerPAYEReference>`)

  // Employer name
  if (data.employerDetails.employerName) {
    empElements.push(`<EmployersName>${escapeXml(data.employerDetails.employerName)}</EmployersName>`)
  }

  // CompanyDirector (required - yes/no)
  empElements.push('<CompanyDirector>no</CompanyDirector>')

  // Benefits section
  if (data.benefitsAndExpenses) {
    const benefitElements: string[] = []
    if (data.benefitsAndExpenses.companyCarsAndVans !== undefined) {
      benefitElements.push(`<CompanyCarsAndVansBenefit>${formatMoney(data.benefitsAndExpenses.companyCarsAndVans)}</CompanyCarsAndVansBenefit>`)
    }
    if (data.benefitsAndExpenses.fuelForCompanyCarsAndVans !== undefined) {
      benefitElements.push(`<FuelForCarsAndVans>${formatMoney(data.benefitsAndExpenses.fuelForCompanyCarsAndVans)}</FuelForCarsAndVans>`)
    }
    if (data.benefitsAndExpenses.privateMedicalInsurance !== undefined) {
      benefitElements.push(`<PrivateMedicalDentalInsurance>${formatMoney(data.benefitsAndExpenses.privateMedicalInsurance)}</PrivateMedicalDentalInsurance>`)
    }
    if (benefitElements.length > 0) {
      return `<SA102>
  <Employment>
${empElements.map((e) => '    ' + e).join('\n')}
  </Employment>
  <Benefits>
${benefitElements.map((e) => '    ' + e).join('\n')}
  </Benefits>
</SA102>`
    }
  }

  // Expenses section
  if (data.employmentExpenses) {
    const expenseElements: string[] = []
    if (data.employmentExpenses.businessTravel !== undefined) {
      expenseElements.push(`<BusinessTravelAndSubsistence>${formatMoney(data.employmentExpenses.businessTravel)}</BusinessTravelAndSubsistence>`)
    }
    if (data.employmentExpenses.professionalFees !== undefined) {
      expenseElements.push(`<ProfessionalFeesAndSubscriptions>${formatMoney(data.employmentExpenses.professionalFees)}</ProfessionalFeesAndSubscriptions>`)
    }
    if (expenseElements.length > 0) {
      return `<SA102>
  <Employment>
${empElements.map((e) => '    ' + e).join('\n')}
  </Employment>
  <Expenses>
${expenseElements.map((e) => '    ' + e).join('\n')}
  </Expenses>
</SA102>`
    }
  }

  return `<SA102>
  <Employment>
${empElements.map((e) => '    ' + e).join('\n')}
  </Employment>
</SA102>`
}

// =============================================================================
// SA103S Short Self-Employment Schedule
// =============================================================================

function buildSA103S(data: NonNullable<SA100Return['sa103S']>[0]): string {
  const elements: string[] = []

  // BusinessDetails - schema requires BusinessDescription (not BusinessName)
  const bizElements: string[] = []
  // Use descriptionOfBusiness for BusinessDescription (the main required field)
  bizElements.push(`<BusinessDescription>${escapeXml(data.businessDetails.descriptionOfBusiness)}</BusinessDescription>`)
  if (data.accountingPeriod?.startDate) {
    bizElements.push(`<DateBusinessStarted>${data.accountingPeriod.startDate}</DateBusinessStarted>`)
  }
  if (data.cashBasisIndicator !== 'yes') {
    bizElements.push('<ElectionToOptOutOfCashBasis>yes</ElectionToOptOutOfCashBasis>')
  }

  elements.push(`<BusinessDetails>
${bizElements.map((e) => '  ' + e).join('\n')}
</BusinessDetails>`)

  // BusinessIncome
  const incomeElements: string[] = []
  if (data.income.turnover !== undefined && data.income.turnover > 0) {
    incomeElements.push(`<Turnover>${formatMoney(data.income.turnover)}</Turnover>`)
  }
  // OtherBusinessIncome uses MTR_SAnonNegativeNonZeroMonetaryType - must be > 0, omit if zero
  if (data.income.otherBusinessIncome !== undefined && data.income.otherBusinessIncome > 0) {
    incomeElements.push(`<OtherBusinessIncome>${formatMoney(data.income.otherBusinessIncome)}</OtherBusinessIncome>`)
  }

  if (incomeElements.length > 0) {
    elements.push(`<BusinessIncome>
${incomeElements.map((e) => '  ' + e).join('\n')}
</BusinessIncome>`)
  }

  // AllowableBusinessExpenses
  if (data.totalAllowableExpenses !== undefined && data.totalAllowableExpenses > 0) {
    elements.push(`<AllowableBusinessExpenses>
  <TotalAllowableExpenses>${formatMoney(data.totalAllowableExpenses)}</TotalAllowableExpenses>
</AllowableBusinessExpenses>`)
  }

  // NetProfitOrLoss (SSE21/SSE22) - REQUIRED when (Turnover + OtherIncome - Expenses) != 0
  // This is the basic P&L calculation: Turnover - Expenses
  if (data.netProfitOrLoss !== undefined && data.netProfitOrLoss !== 0) {
    elements.push(`<NetProfitOrLoss>${formatMoney(data.netProfitOrLoss)}</NetProfitOrLoss>`)
  }

  // TaxableProfits section (contains NetBusinessProfitForTax = SSE28)
  // SSE28 = Net profit after adjustments (if positive)
  // Required when there's a taxable profit
  if (data.netProfitOrLoss !== undefined && data.netProfitOrLoss > 0) {
    const taxableProfitElements: string[] = []
    taxableProfitElements.push(`<NetBusinessProfitForTax>${formatMoney(data.netProfitOrLoss)}</NetBusinessProfitForTax>`)
    // LossBroughtForward (SSE29) - optional, only if > 0
    // AnyOtherBusinessIncome (SSE30) - optional, only if > 0
    elements.push(`<TaxableProfits>
${taxableProfitElements.map((e) => '  ' + e).join('\n')}
</TaxableProfits>`)
  }

  // ProfitsLossesNICsAndCIS (contains TotalTaxableBusinessProfits = SSE31)
  // SSE31 = SSE28 + SSE30 - SSE29
  if (data.totalTaxableProfits !== undefined && data.totalTaxableProfits > 0) {
    elements.push(`<ProfitsLossesNICsAndCIS>
  <TotalTaxableBusinessProfits>${formatMoney(data.totalTaxableProfits)}</TotalTaxableBusinessProfits>
</ProfitsLossesNICsAndCIS>`)
  }

  return `<SA103S>
${elements.map((e) => '  ' + e).join('\n')}
</SA103S>`
}

// =============================================================================
// SA103F Full Self-Employment Schedule
// =============================================================================

function buildSA103F(data: NonNullable<SA100Return['sa103F']>[0]): string {
  const elements: string[] = []

  // Business details
  elements.push(`<BusinessDetails>
  <BusinessName>${escapeXml(data.businessDetails.businessName)}</BusinessName>
  <DescriptionOfBusiness>${escapeXml(data.businessDetails.descriptionOfBusiness)}</DescriptionOfBusiness>
</BusinessDetails>`)

  // Accounting period
  elements.push(`<AccountingPeriod>
  <StartDate>${data.accountingPeriod.startDate}</StartDate>
  <EndDate>${data.accountingPeriod.endDate}</EndDate>
</AccountingPeriod>`)

  // Cash basis
  if (data.cashBasisIndicator) {
    elements.push('<CashBasisIndicator>yes</CashBasisIndicator>')
  }

  // Income
  elements.push(`<Turnover>${formatMoney(data.income.turnover)}</Turnover>`)
  if (data.income.otherBusinessIncome !== undefined) {
    elements.push(`<OtherBusinessIncome>${formatMoney(data.income.otherBusinessIncome)}</OtherBusinessIncome>`)
  }

  // Itemized expenses
  const expenseElements: string[] = []
  if (data.expenses.costOfGoods !== undefined) expenseElements.push(`<CostOfGoods>${formatMoney(data.expenses.costOfGoods)}</CostOfGoods>`)
  if (data.expenses.employeeCosts !== undefined) expenseElements.push(`<EmployeeCosts>${formatMoney(data.expenses.employeeCosts)}</EmployeeCosts>`)
  if (data.expenses.premisesCosts !== undefined) expenseElements.push(`<PremisesCosts>${formatMoney(data.expenses.premisesCosts)}</PremisesCosts>`)
  if (data.expenses.repairs !== undefined) expenseElements.push(`<Repairs>${formatMoney(data.expenses.repairs)}</Repairs>`)
  if (data.expenses.generalAdmin !== undefined) expenseElements.push(`<GeneralAdmin>${formatMoney(data.expenses.generalAdmin)}</GeneralAdmin>`)
  if (data.expenses.motorExpenses !== undefined) expenseElements.push(`<MotorExpenses>${formatMoney(data.expenses.motorExpenses)}</MotorExpenses>`)
  if (data.expenses.travelSubsistence !== undefined) expenseElements.push(`<TravelSubsistence>${formatMoney(data.expenses.travelSubsistence)}</TravelSubsistence>`)
  if (data.expenses.advertising !== undefined) expenseElements.push(`<Advertising>${formatMoney(data.expenses.advertising)}</Advertising>`)
  if (data.expenses.legalProfessional !== undefined) expenseElements.push(`<LegalProfessional>${formatMoney(data.expenses.legalProfessional)}</LegalProfessional>`)
  if (data.expenses.interest !== undefined) expenseElements.push(`<Interest>${formatMoney(data.expenses.interest)}</Interest>`)
  if (data.expenses.other !== undefined) expenseElements.push(`<Other>${formatMoney(data.expenses.other)}</Other>`)
  expenseElements.push(`<TotalExpenses>${formatMoney(data.expenses.totalExpenses)}</TotalExpenses>`)

  elements.push(`<Expenses>
${expenseElements.map((e) => '  ' + e).join('\n')}
</Expenses>`)

  // Net profit/loss
  elements.push(`<NetProfitOrLoss>${formatMoney(data.netProfitOrLoss)}</NetProfitOrLoss>`)

  // Total taxable profits
  elements.push(`<TotalTaxableProfits>${formatMoney(data.totalTaxableProfits)}</TotalTaxableProfits>`)

  return `<SA103F>
${elements.map((e) => '  ' + e).join('\n')}
</SA103F>`
}

// =============================================================================
// SA105 UK Property Schedule
// =============================================================================

function buildSA105(data: NonNullable<SA100Return['sa105']>): string {
  const sections: string[] = []

  // PropertyIncomeAndExpenses section (schema element name)
  const incomeExpElements: string[] = []

  // Total rents
  if (data.propertyIncome.totalRentsAndOtherIncome !== undefined) {
    incomeExpElements.push(`<TotalRentsAndOtherIncomeFromProperty>${formatMoney(data.propertyIncome.totalRentsAndOtherIncome)}</TotalRentsAndOtherIncomeFromProperty>`)
  }

  // Itemized expenses
  if (data.propertyExpenses.itemizedExpenses) {
    const exp = data.propertyExpenses.itemizedExpenses
    if (exp.rentsRatesInsurance !== undefined) {
      incomeExpElements.push(`<RentRatesInsuranceAndGroundRents>${formatMoney(exp.rentsRatesInsurance)}</RentRatesInsuranceAndGroundRents>`)
    }
    if (exp.propertyRepairs !== undefined) {
      incomeExpElements.push(`<RepairsAndMaintenance>${formatMoney(exp.propertyRepairs)}</RepairsAndMaintenance>`)
    }
    if (exp.financeCharges !== undefined) {
      incomeExpElements.push(`<AllowableInterestAndOtherFinancialCharges>${formatMoney(exp.financeCharges)}</AllowableInterestAndOtherFinancialCharges>`)
    }
    if (exp.legalProfessional !== undefined) {
      incomeExpElements.push(`<LegalManagementAndProfessionalFees>${formatMoney(exp.legalProfessional)}</LegalManagementAndProfessionalFees>`)
    }
  }

  if (incomeExpElements.length > 0) {
    sections.push(`<PropertyIncomeAndExpenses>
${incomeExpElements.map((e) => '  ' + e).join('\n')}
</PropertyIncomeAndExpenses>`)
  }

  // TaxableProfitOrLoss section
  const profitLossElements: string[] = []

  if (data.totalTaxableProfit !== undefined) {
    profitLossElements.push(`<TaxableProfitForTheYear>${formatMoney(data.totalTaxableProfit)}</TaxableProfitForTheYear>`)
  }

  if (data.taxAdjustments?.residentialFinanceCosts !== undefined) {
    profitLossElements.push(`<ResidentialFinanceCosts>${formatMoney(data.taxAdjustments.residentialFinanceCosts)}</ResidentialFinanceCosts>`)
  }

  if (profitLossElements.length > 0) {
    sections.push(`<TaxableProfitOrLoss>
${profitLossElements.map((e) => '  ' + e).join('\n')}
</TaxableProfitOrLoss>`)
  }

  return `<SA105>
${sections.map((s) => '  ' + s).join('\n')}
</SA105>`
}

// =============================================================================
// SA106 Foreign Schedule
// =============================================================================

function buildSA106(data: NonNullable<SA100Return['sa106']>): string {
  const elements: string[] = []

  if (data.foreignDividends) {
    elements.push(`<ForeignDividends>
  <TotalDividends>${formatMoney(data.foreignDividends.totalDividends || 0)}</TotalDividends>
</ForeignDividends>`)
  }

  if (data.foreignProperty) {
    elements.push(`<ForeignProperty>
  <Income>${formatMoney(data.foreignProperty.income || 0)}</Income>
  <Expenses>${formatMoney(data.foreignProperty.expenses || 0)}</Expenses>
</ForeignProperty>`)
  }

  if (data.foreignTaxCreditRelief?.reliefClaimed !== undefined) {
    elements.push(`<ForeignTaxCreditRelief>${formatMoney(data.foreignTaxCreditRelief.reliefClaimed)}</ForeignTaxCreditRelief>`)
  }

  return `<SA106>
${elements.map((e) => '  ' + e).join('\n')}
</SA106>`
}

// =============================================================================
// SA108 Capital Gains Schedule
// =============================================================================

function buildSA108(data: NonNullable<SA100Return['sa108']>): string {
  const sections: string[] = []

  // ListedSharesAndSecurities section
  if (data.listedSharesAndSecurities) {
    const shareElements: string[] = []
    if (data.listedSharesAndSecurities.disposalProceeds !== undefined) {
      shareElements.push(`<DisposalProceeds>${formatMoney(data.listedSharesAndSecurities.disposalProceeds)}</DisposalProceeds>`)
    }
    if (data.listedSharesAndSecurities.allowableCosts !== undefined) {
      shareElements.push(`<AllowableCosts>${formatMoney(data.listedSharesAndSecurities.allowableCosts)}</AllowableCosts>`)
    }
    if (data.listedSharesAndSecurities.gainsInYear !== undefined) {
      shareElements.push(`<GainsInTheYear>${formatMoney(data.listedSharesAndSecurities.gainsInYear)}</GainsInTheYear>`)
    }
    if (data.listedSharesAndSecurities.lossesInYear !== undefined) {
      shareElements.push(`<LossesInTheYear>${formatMoney(data.listedSharesAndSecurities.lossesInYear)}</LossesInTheYear>`)
    }
    sections.push(`<ListedSharesAndSecurities>
${shareElements.map((e) => '  ' + e).join('\n')}
</ListedSharesAndSecurities>`)
  }

  // UnlistedSharesAndSecurities section
  if (data.unlistedShares) {
    const shareElements: string[] = []
    if (data.unlistedShares.disposalProceeds !== undefined) {
      shareElements.push(`<DisposalProceeds>${formatMoney(data.unlistedShares.disposalProceeds)}</DisposalProceeds>`)
    }
    if (data.unlistedShares.allowableCosts !== undefined) {
      shareElements.push(`<AllowableCosts>${formatMoney(data.unlistedShares.allowableCosts)}</AllowableCosts>`)
    }
    if (data.unlistedShares.gainsInYear !== undefined) {
      shareElements.push(`<GainsInTheYear>${formatMoney(data.unlistedShares.gainsInYear)}</GainsInTheYear>`)
    }
    if (data.unlistedShares.lossesInYear !== undefined) {
      shareElements.push(`<LossesInTheYear>${formatMoney(data.unlistedShares.lossesInYear)}</LossesInTheYear>`)
    }
    sections.push(`<UnlistedSharesAndSecurities>
${shareElements.map((e) => '  ' + e).join('\n')}
</UnlistedSharesAndSecurities>`)
  }

  // LossesAndAdjustments section
  if (data.losses || data.annualExemptAmount) {
    const lossElements: string[] = []
    if (data.losses?.lossesBroughtForward !== undefined) {
      lossElements.push(`<LossesBroughtForwardAndUsedInTheReturnYear>${formatMoney(data.losses.lossesBroughtForward)}</LossesBroughtForwardAndUsedInTheReturnYear>`)
    }
    if (data.losses?.lossesCarryForward !== undefined) {
      lossElements.push(`<LossesToBeCarriedForward>${formatMoney(data.losses.lossesCarryForward)}</LossesToBeCarriedForward>`)
    }
    if (lossElements.length > 0) {
      sections.push(`<LossesAndAdjustments>
${lossElements.map((e) => '  ' + e).join('\n')}
</LossesAndAdjustments>`)
    }
  }

  return `<SA108>
${sections.map((s) => '  ' + s).join('\n')}
</SA108>`
}

// =============================================================================
// SA101 Additional Information Schedule
// =============================================================================

function buildSA101(data: NonNullable<SA100Return['sa101']>): string {
  const elements: string[] = []

  if (data.otherUKIncome) {
    if (data.otherUKIncome.amount !== undefined) {
      elements.push(`<OtherUKIncomeAmount>${formatMoney(data.otherUKIncome.amount)}</OtherUKIncomeAmount>`)
    }
    if (data.otherUKIncome.description) {
      elements.push(`<OtherUKIncomeDescription>${escapeXml(data.otherUKIncome.description)}</OtherUKIncomeDescription>`)
    }
  }

  if (data.pensionSavingsTaxCharges?.annualAllowanceCharge !== undefined) {
    elements.push(`<AnnualAllowanceCharge>${formatMoney(data.pensionSavingsTaxCharges.annualAllowanceCharge)}</AnnualAllowanceCharge>`)
  }

  return `<SA101>
${elements.map((e) => '  ' + e).join('\n')}
</SA101>`
}

// =============================================================================
// SA110 Tax Calculation Summary (MANDATORY)
// =============================================================================

function buildSA110(returnData: SA100Return): string {
  // SA110 is mandatory and contains the self-assessment tax calculation
  const sa110 = returnData.sa110 || {}
  const elements: string[] = []

  // TotalTaxEtcDue is required
  elements.push(`<TotalTaxEtcDue>${formatMoney(sa110.totalTaxEtcDue ?? 0)}</TotalTaxEtcDue>`)

  // Student loan repayments
  if (sa110.studentLoanRepaymentDue !== undefined && sa110.studentLoanRepaymentDue > 0) {
    elements.push(`<StudentLoanRepaymentDue>${formatMoney(sa110.studentLoanRepaymentDue)}</StudentLoanRepaymentDue>`)
  }
  if (sa110.postgraduateLoanRepaymentDue !== undefined && sa110.postgraduateLoanRepaymentDue > 0) {
    elements.push(`<PostgraduateLoanRepaymentDue>${formatMoney(sa110.postgraduateLoanRepaymentDue)}</PostgraduateLoanRepaymentDue>`)
  }

  // Class 4 NICs (CAL4)
  if (sa110.class4NICsDue !== undefined && sa110.class4NICsDue > 0) {
    elements.push(`<Class4NICsDue>${formatMoney(sa110.class4NICsDue)}</Class4NICsDue>`)
  }

  // Class 2 NICs (CAL4.1)
  if (sa110.class2NICsDue !== undefined && sa110.class2NICsDue > 0) {
    elements.push(`<Class2NICsDue>${formatMoney(sa110.class2NICsDue)}</Class2NICsDue>`)
  }

  // Capital Gains Tax
  if (sa110.capitalGainsTaxDue !== undefined && sa110.capitalGainsTaxDue > 0) {
    elements.push(`<CapitalGainsTaxDue>${formatMoney(sa110.capitalGainsTaxDue)}</CapitalGainsTaxDue>`)
  }

  return `<SA110>
  <SelfAssessment>
${elements.map((e) => '    ' + e).join('\n')}
  </SelfAssessment>
  <UnderpaidTax/>
</SA110>`
}

// =============================================================================
// Validation
// =============================================================================

function validateReturnData(returnData: SA100Return): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields
  if (!returnData.taxYear) {
    errors.push({ field: 'taxYear', message: 'Tax year is required', severity: 'error' })
  }

  if (!returnData.yourPersonalDetails?.nationalInsuranceNumber) {
    errors.push({
      field: 'yourPersonalDetails.nationalInsuranceNumber',
      message: 'National Insurance number is required',
      severity: 'error',
    })
  }

  if (!returnData.yourPersonalDetails?.taxpayerStatus) {
    errors.push({
      field: 'yourPersonalDetails.taxpayerStatus',
      message: 'Taxpayer status (C/S/U) is required',
      severity: 'error',
    })
  }

  if (!returnData.yourPersonalDetails?.dateOfBirth) {
    errors.push({
      field: 'yourPersonalDetails.dateOfBirth',
      message: 'Date of birth is required',
      severity: 'error',
    })
  }

  if (!returnData.finishing) {
    errors.push({ field: 'finishing', message: 'Declaration (Finishing) section is required', severity: 'error' })
  }

  // NINO format validation
  if (returnData.yourPersonalDetails?.nationalInsuranceNumber) {
    const ninoRegex = /^[A-CEGHJ-PR-TW-Z]{2}[0-9]{6}[A-D]$/
    const nino = returnData.yourPersonalDetails.nationalInsuranceNumber.replace(/\s/g, '').toUpperCase()
    if (!ninoRegex.test(nino)) {
      errors.push({
        field: 'yourPersonalDetails.nationalInsuranceNumber',
        message: 'Invalid National Insurance number format',
        severity: 'error',
      })
    }
  }

  // Tax year format validation
  if (returnData.taxYear) {
    const taxYearRegex = /^\d{4}-\d{2}$/
    if (!taxYearRegex.test(returnData.taxYear)) {
      errors.push({
        field: 'taxYear',
        message: 'Tax year must be in format YYYY-YY (e.g., 2024-25)',
        severity: 'error',
      })
    }
  }

  return errors
}

// =============================================================================
// Utility Functions
// =============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format money with 2 decimal places (HMRC schema pattern: -?(([1-9][0-9]*)|0)\.[0-9]{2})
 */
function formatMoney(amount: number): string {
  return amount.toFixed(2)
}

function indentXml(xml: string, spaces: number): string {
  const indent = ' '.repeat(spaces)
  return xml
    .split('\n')
    .map((line) => indent + line)
    .join('\n')
}
