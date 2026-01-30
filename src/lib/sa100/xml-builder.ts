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
  SA100Attachment,
} from './types'
import { NAMESPACES, SCHEMA_VERSION, MESSAGE_CLASS, MESSAGE_CLASS_ATT, getPeriodEndDate } from './schema-reference'
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
  /** PDF attachments - if present, uses HMRC-SA-SA100-ATT message class */
  attachments?: SA100Attachment[]
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
  const { credentials, taxpayer, returnData, senderType = 'Individual', isTestSubmission = false, attachments } = options

  console.log('[XML Builder] Building XML with:', {
    senderId: credentials.userId,
    utr: taxpayer.utr,
    nino: taxpayer.nino,
    taxYear: returnData.taxYear,
    senderType,
    isTestSubmission,
    attachmentCount: attachments?.length ?? 0,
  })

  // Validate the data first
  const validationErrors = validateReturnData(returnData)
  console.log('[XML Builder] Validation errors:', validationErrors.length > 0 ? validationErrors : 'none')

  // Build the MTR content (contains SA100)
  const mtrXml = buildMTRContent(returnData)

  // Build the IR envelope with a placeholder IRmark
  const irEnvelopeXml = buildIREnvelope(taxpayer, returnData, senderType, mtrXml)

  // Build the complete GovTalk envelope first (with placeholder IRmark)
  const govTalkXmlWithPlaceholder = buildGovTalkEnvelope(credentials, taxpayer, irEnvelopeXml, isTestSubmission, attachments)

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
  isTestSubmission: boolean = false,
  attachments?: SA100Attachment[]
): string {
  const channelInfo = getChannelRoutingInfo()

  // Use ATT message class when attachments are present
  const messageClass = attachments && attachments.length > 0 ? MESSAGE_CLASS_ATT : MESSAGE_CLASS

  // GatewayTest element: Per HMRC ETS documentation, set to 1 for test submissions
  // This routes the submission through TPVS (Third Party Validation Service) for testing
  const gatewayTestElement = isTestSubmission ? '\n      <GatewayTest>1</GatewayTest>' : ''

  // Build attachment elements if present
  const attachmentElements = attachments && attachments.length > 0
    ? attachments.map((att, index) => buildAttachmentElement(att, index + 1)).join('\n')
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="${NAMESPACES.GOVTALK}">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>${messageClass}</Class>
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
  </Body>${attachmentElements ? '\n' + attachmentElements : ''}
</GovTalkMessage>`
}

/**
 * Build an attachment element for the GovTalk envelope
 * Per HMRC spec: Attachments go after </Body> as siblings within <GovTalkMessage>
 */
function buildAttachmentElement(attachment: SA100Attachment, sequence: number): string {
  return `  <Attachment sequence="${sequence}">
    <Filename>${escapeXml(attachment.filename)}</Filename>
    <MIMEType>${attachment.mimeType}</MIMEType>
    <Content>${attachment.content}</Content>
  </Attachment>`
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

  // SA110 Tax Calculation Summary
  // Only include if we have explicit tax calculation data from the wizard.
  // If not provided, HMRC will calculate the tax themselves.
  // Including incorrect values causes CAL2 validation errors.
  if (returnData.sa110?.totalTaxEtcDue !== undefined) {
    sections.push(buildSA110(returnData))
  }

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
  // Also includes OtherUKIncome (boxes 17-21) and StateBenefits
  if (returnData.ukInterestEtc || returnData.ukDividends || returnData.otherTaxableIncome || returnData.stateBenefits || returnData.ukPensionsAnnuities) {
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

  // High Income Child Benefit Charge (HICBC)
  if (returnData.highIncomeChildBenefitCharge) {
    sections.push(buildHighIncomeChildBenefitCharge(returnData.highIncomeChildBenefitCharge))
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

/**
 * Build StudentLoanRepayments section
 * Schema element order (xsd:sequence):
 * 1. IncomeContingentStudentLoanNotification (optional)
 * 2. StudentLoanRepaymentDeductedAmount (optional)
 * 3. PostgraduateLoanRepaymentDeductedAmount (optional)
 * 4. PlanType (optional) - "01", "02", or "04"
 * 5. PostgraduateLoanPlanType (optional) - "03"
 */
function buildStudentLoanRepayments(data: NonNullable<SA100Return['studentLoanRepayments']>): string {
  const elements: string[] = []

  // 1. IncomeContingentStudentLoanNotification - indicates student loan exists
  if (data.incomeContingentStudentLoanNotification) {
    elements.push('<IncomeContingentStudentLoanNotification>yes</IncomeContingentStudentLoanNotification>')
  }

  // 2. StudentLoanRepaymentDeductedAmount - PAYE deducted amount
  if (data.studentLoanRepaymentDeductedAmount !== undefined) {
    elements.push(`<StudentLoanRepaymentDeductedAmount>${formatMoney(data.studentLoanRepaymentDeductedAmount)}</StudentLoanRepaymentDeductedAmount>`)
  }

  // 3. PostgraduateLoanRepaymentDeductedAmount - PAYE deducted amount
  if (data.postgraduateLoanRepaymentDeductedAmount !== undefined) {
    elements.push(`<PostgraduateLoanRepaymentDeductedAmount>${formatMoney(data.postgraduateLoanRepaymentDeductedAmount)}</PostgraduateLoanRepaymentDeductedAmount>`)
  }

  // 4. PlanType - Student loan plan type (01=Plan 1, 02=Plan 2, 04=Plan 4)
  if (data.planType) {
    elements.push(`<PlanType>${data.planType}</PlanType>`)
  }

  // 5. PostgraduateLoanPlanType - Postgrad loan indicator (03)
  if (data.postgraduateLoanPlanType) {
    elements.push(`<PostgraduateLoanPlanType>${data.postgraduateLoanPlanType}</PostgraduateLoanPlanType>`)
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

  // OtherUKIncome subsection (boxes 17-21)
  if (returnData.otherTaxableIncome) {
    const otherIncomeElements: string[] = []

    // OtherTaxableIncomeDetails - contains box 17 and 19
    if (returnData.otherTaxableIncome.grossIncomeAmount) {
      const detailElements: string[] = []
      detailElements.push(`<OtherTaxableIncome>${formatMoney(returnData.otherTaxableIncome.grossIncomeAmount)}</OtherTaxableIncome>`)
      if (returnData.otherTaxableIncome.taxTakenOffAmount !== undefined && returnData.otherTaxableIncome.taxTakenOffAmount > 0) {
        detailElements.push(`<TaxTakenOffOtherTaxableIncome>${formatMoney(returnData.otherTaxableIncome.taxTakenOffAmount)}</TaxTakenOffOtherTaxableIncome>`)
      }
      otherIncomeElements.push(`<OtherTaxableIncomeDetails>
${detailElements.map((e) => '  ' + e).join('\n')}
</OtherTaxableIncomeDetails>`)
    }

    // AllowableExpenses (box 18)
    if (returnData.otherTaxableIncome.allowableExpensesAmount !== undefined && returnData.otherTaxableIncome.allowableExpensesAmount > 0) {
      otherIncomeElements.push(`<AllowableExpenses>${formatMoney(returnData.otherTaxableIncome.allowableExpensesAmount)}</AllowableExpenses>`)
    }

    // DeemedIncomeOrBenefits (box 20) - pre-owned assets benefit
    if (returnData.otherTaxableIncome.preOwnedAssetsBenefitAmount !== undefined && returnData.otherTaxableIncome.preOwnedAssetsBenefitAmount > 0) {
      otherIncomeElements.push(`<DeemedIncomeOrBenefits>${formatMoney(returnData.otherTaxableIncome.preOwnedAssetsBenefitAmount)}</DeemedIncomeOrBenefits>`)
    }

    // DescriptionOfOtherIncome (box 21) - required if box 17 or 20 present
    if (returnData.otherTaxableIncome.incomeDescription) {
      otherIncomeElements.push(`<DescriptionOfOtherIncome>${escapeXml(returnData.otherTaxableIncome.incomeDescription)}</DescriptionOfOtherIncome>`)
    }

    if (otherIncomeElements.length > 0) {
      elements.push(`<OtherUKIncome>
${otherIncomeElements.map((e) => '  ' + e).join('\n')}
</OtherUKIncome>`)
    }
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
 * Build MarriageAllowance section and TransferredIn/TransferredOut indicators
 *
 * XSD structure:
 * - /MTR/SA100/MarriageAllowance (contains SpouseFirstName, SpouseLastName, SpouseNINO, SpouseDateOfBirth, DateOfMarriageOrCivilPartnership)
 * - /MTR/SA100/MarriageAllowanceTransferredIn
 * - /MTR/SA100/MarriageAllowanceTransferredOut
 *
 * When transferring OUT, the MarriageAllowance element with spouse details is required.
 * When receiving IN, only the MarriageAllowanceTransferredIn indicator is needed.
 */
function buildMarriageAllowance(data: NonNullable<SA100Return['marriage']>): string {
  const sections: string[] = []

  // If transferring out, we need the full MarriageAllowance element with spouse details
  if (data.transferToSpouseIndicator === 'yes') {
    const elements: string[] = []

    // Split full name into first/last if not already split
    let firstName = data.spouseFirstName
    let lastName = data.spouseLastName
    if (!firstName && data.spouseName) {
      const parts = data.spouseName.trim().split(/\s+/)
      firstName = parts[0] || ''
      lastName = parts.slice(1).join(' ') || parts[0] || ''
    }

    if (firstName) {
      elements.push(`<SpouseFirstName>${escapeXml(firstName)}</SpouseFirstName>`)
    }
    if (lastName) {
      elements.push(`<SpouseLastName>${escapeXml(lastName)}</SpouseLastName>`)
    }
    if (data.spouseNINO) {
      elements.push(`<SpouseNINO>${escapeXml(data.spouseNINO)}</SpouseNINO>`)
    }
    if (data.spouseDateOfBirth) {
      elements.push(`<SpouseDateOfBirth>${data.spouseDateOfBirth}</SpouseDateOfBirth>`)
    }
    if (data.dateOfMarriage) {
      elements.push(`<DateOfMarriageOrCivilPartnership>${data.dateOfMarriage}</DateOfMarriageOrCivilPartnership>`)
    }

    if (elements.length > 0) {
      sections.push(`<MarriageAllowance>
${elements.map((e) => '  ' + e).join('\n')}
</MarriageAllowance>`)
    }

    // Add the TransferredOut indicator
    sections.push('<MarriageAllowanceTransferredOut>yes</MarriageAllowanceTransferredOut>')
  }

  // If receiving transfer in, just add the indicator
  if (data.receiveFromSpouseIndicator === 'yes') {
    sections.push('<MarriageAllowanceTransferredIn>yes</MarriageAllowanceTransferredIn>')
  }

  return sections.join('\n')
}

/**
 * Build HighIncomeChildBenefitCharge section (HICBC)
 * Schema element: /MTR/SA100/HighIncomeChildBenefitCharge
 * Required fields: AmountReceived (CBC1), NumberOfChildren (CBC2)
 */
function buildHighIncomeChildBenefitCharge(data: NonNullable<SA100Return['highIncomeChildBenefitCharge']>): string {
  const elements: string[] = []

  // AmountReceived (CBC1) - required
  elements.push(`<AmountReceived>${formatMoney(data.amountReceived)}</AmountReceived>`)

  // NumberOfChildren (CBC2) - required if AmountReceived > 0
  if (data.numberOfChildren !== undefined && data.numberOfChildren > 0) {
    elements.push(`<NumberOfChildren>${data.numberOfChildren}</NumberOfChildren>`)
  }

  // DateStoppedReceivingAllChildBenefitPayments (CBC3) - optional
  if (data.dateStoppedReceiving) {
    elements.push(`<DateStoppedReceivingAllChildBenefitPayments>${data.dateStoppedReceiving}</DateStoppedReceivingAllChildBenefitPayments>`)
  }

  return `<HighIncomeChildBenefitCharge>
${elements.map((e) => '  ' + e).join('\n')}
</HighIncomeChildBenefitCharge>`
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

  // AllowableBusinessExpenses - can be itemized or just total
  const expenseElements: string[] = []
  if (data.allowableExpenses) {
    const exp = data.allowableExpenses
    // Individual expense categories (SSE11-SSE19)
    if (exp.costOfGoods !== undefined && exp.costOfGoods > 0) {
      expenseElements.push(`<CostOfGoods>${formatMoney(exp.costOfGoods)}</CostOfGoods>`)
    }
    if (exp.carVanAndTravelExpenses !== undefined && exp.carVanAndTravelExpenses > 0) {
      expenseElements.push(`<CarVanAndTravelExpenses>${formatMoney(exp.carVanAndTravelExpenses)}</CarVanAndTravelExpenses>`)
    }
    if (exp.wagesSalariesAndStaffCosts !== undefined && exp.wagesSalariesAndStaffCosts > 0) {
      expenseElements.push(`<WagesSalariesAndStaffCosts>${formatMoney(exp.wagesSalariesAndStaffCosts)}</WagesSalariesAndStaffCosts>`)
    }
    if (exp.rentAndOtherPropertyCosts !== undefined && exp.rentAndOtherPropertyCosts > 0) {
      expenseElements.push(`<RentAndOtherPropertyCosts>${formatMoney(exp.rentAndOtherPropertyCosts)}</RentAndOtherPropertyCosts>`)
    }
    if (exp.repairsAndMaintenanceCosts !== undefined && exp.repairsAndMaintenanceCosts > 0) {
      expenseElements.push(`<RepairsAndMaintenanceCosts>${formatMoney(exp.repairsAndMaintenanceCosts)}</RepairsAndMaintenanceCosts>`)
    }
    if (exp.accountancyAndLegalFees !== undefined && exp.accountancyAndLegalFees > 0) {
      expenseElements.push(`<AccountancyAndLegalFees>${formatMoney(exp.accountancyAndLegalFees)}</AccountancyAndLegalFees>`)
    }
    if (exp.interestAndFinanceCharges !== undefined && exp.interestAndFinanceCharges > 0) {
      expenseElements.push(`<InterestAndFinanceCharges>${formatMoney(exp.interestAndFinanceCharges)}</InterestAndFinanceCharges>`)
    }
    if (exp.phoneAndOtherOfficeCosts !== undefined && exp.phoneAndOtherOfficeCosts > 0) {
      expenseElements.push(`<PhoneAndOtherOfficeCosts>${formatMoney(exp.phoneAndOtherOfficeCosts)}</PhoneAndOtherOfficeCosts>`)
    }
    if (exp.otherAllowableBusinessExpenses !== undefined && exp.otherAllowableBusinessExpenses > 0) {
      expenseElements.push(`<OtherAllowableBusinessExpenses>${formatMoney(exp.otherAllowableBusinessExpenses)}</OtherAllowableBusinessExpenses>`)
    }
    // TotalAllowableExpenses (SSE20) - sum of all above
    if (exp.totalAllowableExpenses !== undefined && exp.totalAllowableExpenses > 0) {
      expenseElements.push(`<TotalAllowableExpenses>${formatMoney(exp.totalAllowableExpenses)}</TotalAllowableExpenses>`)
    }
  } else if (data.totalAllowableExpenses !== undefined && data.totalAllowableExpenses > 0) {
    // Legacy: just the total
    expenseElements.push(`<TotalAllowableExpenses>${formatMoney(data.totalAllowableExpenses)}</TotalAllowableExpenses>`)
  }

  if (expenseElements.length > 0) {
    elements.push(`<AllowableBusinessExpenses>
${expenseElements.map((e) => '  ' + e).join('\n')}
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

  // ProfitsLossesNICsAndCIS section
  // Contains: TotalTaxableBusinessProfits (SSE31), PayClass2NICvoluntarily (SSE36), Class4NICexempt (SSE37)
  const nicElements: string[] = []

  // TotalTaxableBusinessProfits (SSE31) = SSE28 + SSE30 - SSE29
  if (data.totalTaxableProfits !== undefined && data.totalTaxableProfits > 0) {
    nicElements.push(`<TotalTaxableBusinessProfits>${formatMoney(data.totalTaxableProfits)}</TotalTaxableBusinessProfits>`)
  }

  // PayClass2NICvoluntarily (SSE36) - voluntary Class 2 NIC
  if (data.class2NICVoluntary === 'yes') {
    nicElements.push('<PayClass2NICvoluntarily>yes</PayClass2NICvoluntarily>')
  }

  // Class2NICamount (SSECL2) - Class 2 NIC amount, required when SSE36 is 'yes'
  if (data.class2NICAmount !== undefined && data.class2NICAmount > 0) {
    nicElements.push(`<Class2NICamount>${formatMoney(data.class2NICAmount)}</Class2NICamount>`)
  }

  // Class4NICexempt (SSE37) - Class 4 NIC exemption flag
  if (data.class4NIC?.exemptIndicator === 'yes') {
    nicElements.push('<Class4NICexempt>yes</Class4NICexempt>')
  }

  if (nicElements.length > 0) {
    elements.push(`<ProfitsLossesNICsAndCIS>
${nicElements.map((e) => '  ' + e).join('\n')}
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

  // SA108 sections must be in XSD order:
  // 1. ResidentialPropertyAndCarriedInterest (not implemented yet)
  // 2. Cryptoassets
  // 3. OtherPropertyAssetsAndGains
  // 4. ListedSharesAndSecurities
  // 5. UnlistedSharesAndSecurities
  // 6. LossesAndAdjustments
  // 7. NRCGTonUKpropertyOrLandAndIndirectDisposals (not implemented yet)
  // 8. EISandQAHC (not implemented yet)
  // 9. EstimateOrValuation (not implemented yet)
  // 10. AnyOtherInformationSpace

  // Cryptoassets section (NEW for 2024-25)
  // XPath: /MTR/SA108/Cryptoassets
  if (data.cryptoassets) {
    const cryptoElements: string[] = []
    // CGT13.1 - Number of disposals
    if (data.cryptoassets.numberOfDisposals !== undefined) {
      cryptoElements.push(`<NumberOfDisposals>${data.cryptoassets.numberOfDisposals}</NumberOfDisposals>`)
    }
    // CGT13.2 - Disposal proceeds
    if (data.cryptoassets.disposalProceeds !== undefined) {
      cryptoElements.push(`<DisposalProceeds>${formatMoney(data.cryptoassets.disposalProceeds)}</DisposalProceeds>`)
    }
    // CGT13.3 - Allowable costs
    if (data.cryptoassets.allowableCosts !== undefined) {
      cryptoElements.push(`<AllowableCosts>${formatMoney(data.cryptoassets.allowableCosts)}</AllowableCosts>`)
    }
    // CGT13.4 - Gains in the year
    if (data.cryptoassets.gainsInTheYear !== undefined) {
      cryptoElements.push(`<GainsInTheYear>${formatMoney(data.cryptoassets.gainsInTheYear)}</GainsInTheYear>`)
    }
    // CGT13.5 - Losses in the year
    if (data.cryptoassets.lossesInTheYear !== undefined) {
      cryptoElements.push(`<LossesInTheYear>${formatMoney(data.cryptoassets.lossesInTheYear)}</LossesInTheYear>`)
    }
    // CGT13.6 - Claim or election made
    if (data.cryptoassets.claimOrElectionMade) {
      cryptoElements.push(`<ClaimOrElectionMade>yes</ClaimOrElectionMade>`)
    }
    // CGT13.7 - Gain from RTT return
    if (data.cryptoassets.gainFromRTTReturn !== undefined && data.cryptoassets.gainFromRTTReturn > 0) {
      cryptoElements.push(`<GainFromRTTreturn>${formatMoney(data.cryptoassets.gainFromRTTReturn)}</GainFromRTTreturn>`)
    }
    // CGT13.8 - RTT tax already charged
    if (data.cryptoassets.rttTaxAlreadyCharged !== undefined && data.cryptoassets.rttTaxAlreadyCharged > 0) {
      cryptoElements.push(`<RTTtaxAlreadyCharged>${formatMoney(data.cryptoassets.rttTaxAlreadyCharged)}</RTTtaxAlreadyCharged>`)
    }
    if (cryptoElements.length > 0) {
      sections.push(`<Cryptoassets>
${cryptoElements.map((e) => '  ' + e).join('\n')}
</Cryptoassets>`)
    }
  }

  // OtherPropertyAssetsAndGains section (for general assets, etc.)
  // HMRC requires CGT14 (NumberOfDisposals) when CGT15 (DisposalProceeds) or CGT17 (GainsInYear) are present
  if (data.otherPropertyAndAssets) {
    const otherElements: string[] = []
    // NumberOfDisposals (CGT14) - use section-specific count, fallback to summary
    const otherDisposals = data.otherPropertyAndAssets.numberOfDisposals ?? data.summary?.numberOfDisposals
    if (otherDisposals !== undefined) {
      otherElements.push(`<NumberOfDisposals>${otherDisposals}</NumberOfDisposals>`)
    }
    if (data.otherPropertyAndAssets.disposalProceeds !== undefined) {
      otherElements.push(`<DisposalProceeds>${formatMoney(data.otherPropertyAndAssets.disposalProceeds)}</DisposalProceeds>`)
    }
    if (data.otherPropertyAndAssets.allowableCosts !== undefined) {
      otherElements.push(`<AllowableCosts>${formatMoney(data.otherPropertyAndAssets.allowableCosts)}</AllowableCosts>`)
    }
    if (data.otherPropertyAndAssets.gainsInYear !== undefined) {
      otherElements.push(`<GainsInTheYear>${formatMoney(data.otherPropertyAndAssets.gainsInYear)}</GainsInTheYear>`)
    }
    // CGT17.4 - Other disposals where BADR is being claimed (portion of GainsInTheYear qualifying for BADR)
    if (data.otherPropertyAndAssets.badrDisposals !== undefined && data.otherPropertyAndAssets.badrDisposals > 0) {
      otherElements.push(`<OtherDisposalsWhereBADRisBeingClaimed>${formatMoney(data.otherPropertyAndAssets.badrDisposals)}</OtherDisposalsWhereBADRisBeingClaimed>`)
    }
    if (data.otherPropertyAndAssets.lossesInYear !== undefined) {
      otherElements.push(`<LossesInTheYear>${formatMoney(data.otherPropertyAndAssets.lossesInYear)}</LossesInTheYear>`)
    }
    if (otherElements.length > 0) {
      sections.push(`<OtherPropertyAssetsAndGains>
${otherElements.map((e) => '  ' + e).join('\n')}
</OtherPropertyAssetsAndGains>`)
    }
  }

  // ListedSharesAndSecurities section
  if (data.listedSharesAndSecurities) {
    const shareElements: string[] = []
    // NumberOfDisposals (CGT24) - use section-specific count, fallback to summary
    const listedDisposals = data.listedSharesAndSecurities.numberOfDisposals ?? data.summary?.numberOfDisposals
    if (listedDisposals !== undefined) {
      shareElements.push(`<NumberOfDisposals>${listedDisposals}</NumberOfDisposals>`)
    }
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
    // NumberOfDisposals (CGT30) - use section-specific count, fallback to summary
    const unlistedDisposals = data.unlistedShares.numberOfDisposals ?? data.summary?.numberOfDisposals
    if (unlistedDisposals !== undefined) {
      shareElements.push(`<NumberOfDisposals>${unlistedDisposals}</NumberOfDisposals>`)
    }
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
  // Contains: LossesBroughtForwardAndUsedInTheReturnYear (CGT45), IncomeLossesOfTheReturnYearSetAgainstGains (CGT46),
  // LossesToBeCarriedForward (CGT47), GainsQualifyingForBusinessAssetDisposalRelief (CGT50),
  // BADRandERclaimedToDate (CGT50.1)
  if (data.losses || data.annualExemptAmount || data.businessAssetDisposalRelief) {
    const lossElements: string[] = []

    // CGT45 - Losses brought forward and used in the return year
    if (data.losses?.lossesBroughtForward !== undefined && data.losses.lossesBroughtForward > 0) {
      lossElements.push(`<LossesBroughtForwardAndUsedInTheReturnYear>${formatMoney(data.losses.lossesBroughtForward)}</LossesBroughtForwardAndUsedInTheReturnYear>`)
    }

    // CGT46 - Income losses of the return year set against gains
    if (data.losses?.incomeLossesUsedAgainstGains !== undefined && data.losses.incomeLossesUsedAgainstGains > 0) {
      lossElements.push(`<IncomeLossesOfTheReturnYearSetAgainstGains>${formatMoney(data.losses.incomeLossesUsedAgainstGains)}</IncomeLossesOfTheReturnYearSetAgainstGains>`)
    }

    // CGT47 - Losses to be carried forward
    if (data.losses?.lossesCarryForward !== undefined && data.losses.lossesCarryForward > 0) {
      lossElements.push(`<LossesToBeCarriedForward>${formatMoney(data.losses.lossesCarryForward)}</LossesToBeCarriedForward>`)
    }

    // CGT50 - Gains qualifying for Business Asset Disposal Relief (BADR)
    if (data.businessAssetDisposalRelief?.qualifyingGains !== undefined && data.businessAssetDisposalRelief.qualifyingGains > 0) {
      lossElements.push(`<GainsQualifyingForBusinessAssetDisposalRelief>${formatMoney(data.businessAssetDisposalRelief.qualifyingGains)}</GainsQualifyingForBusinessAssetDisposalRelief>`)
    }

    // CGT50.1 - BADR and ER claimed to date (lifetime limit used)
    if (data.businessAssetDisposalRelief?.lifetimeLimitUsed !== undefined && data.businessAssetDisposalRelief.lifetimeLimitUsed > 0) {
      lossElements.push(`<BADRandERclaimedToDate>${formatMoney(data.businessAssetDisposalRelief.lifetimeLimitUsed)}</BADRandERclaimedToDate>`)
    }

    // CGT51 - Adjustment to CGT (for 2024-25 due to rate change on 30 Oct 2024)
    if (data.losses?.cgtAdjustment !== undefined && data.losses.cgtAdjustment !== 0) {
      lossElements.push(`<AdjustmentToCGT>${formatMoney(data.losses.cgtAdjustment)}</AdjustmentToCGT>`)
    }

    if (lossElements.length > 0) {
      sections.push(`<LossesAndAdjustments>
${lossElements.map((e) => '  ' + e).join('\n')}
</LossesAndAdjustments>`)
    }
  }

  // EstimateOrValuation (Box 53) - if computations include estimates
  if (data.anyOtherInfo?.includesEstimates) {
    sections.push(`<EstimateOrValuation>yes</EstimateOrValuation>`)
  }

  // AnyOtherInformationSpace (Box 54) - Required when SA108 is present (error 6020)
  // HMRC requires either an attachment OR the whitespace element to be present
  // Pattern allowed: [A-Za-z0-9 &'\(\)\*,\-\./@£]* - no colons, semi-colons, newlines
  // Build content from user input or auto-generate summary
  const numDisposals = data.summary?.numberOfDisposals || 1
  let additionalInfoText = data.anyOtherInfo?.additionalInfo || ''

  // Sanitize the text - remove disallowed characters
  additionalInfoText = additionalInfoText
    .replace(/[^A-Za-z0-9 &'()*,\-./@£\n]/g, '')
    .replace(/\n/g, ' ')
    .trim()

  // If no user input, provide default
  if (!additionalInfoText) {
    additionalInfoText = `CGT computation - ${numDisposals} disposal(s)`
  }

  // Truncate to 2000 chars (HMRC limit)
  if (additionalInfoText.length > 2000) {
    additionalInfoText = additionalInfoText.substring(0, 1997) + '...'
  }

  sections.push(`<AnyOtherInformationSpace>${escapeXml(additionalInfoText)}</AnyOtherInformationSpace>`)

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
