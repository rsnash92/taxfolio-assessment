/**
 * SA100 XML Builder
 *
 * Converts wizard data into the GovTalk XML format required by HMRC.
 *
 * Structure:
 * - GovTalk envelope (authentication, routing)
 *   - IR envelope (taxpayer info, IRmark)
 *     - SA100 return data
 *       - Supplementary pages (SA102, SA103, SA105, etc.)
 *
 * NOTE: This is a stub implementation. Full XML generation will require
 * the official HMRC schemas from the technical pack.
 */

import {
  GatewayCredentials,
  TaxpayerIdentification,
  SA100Return,
  GovTalkEnvelope,
  IREnvelope,
} from './types'
import { getChannelRoutingInfo } from './transaction-engine'

// =============================================================================
// Main Builder Function
// =============================================================================

export interface BuildXMLOptions {
  credentials: GatewayCredentials
  taxpayer: TaxpayerIdentification
  returnData: SA100Return
  /** If true, validates but doesn't submit */
  dryRun?: boolean
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
  const { credentials, taxpayer, returnData } = options

  // Validate the data first
  const validationErrors = validateReturnData(returnData)

  // Build the SA100 content
  const sa100Xml = buildSA100Content(returnData)

  // Build the IR envelope
  const irEnvelopeXml = buildIREnvelope(taxpayer, returnData, sa100Xml)

  // Calculate IRmark hash
  const irMark = calculateIRMark(irEnvelopeXml)

  // Insert IRmark into envelope
  const irEnvelopeWithMark = insertIRMark(irEnvelopeXml, irMark)

  // Build the complete GovTalk envelope
  const govTalkXml = buildGovTalkEnvelope(credentials, taxpayer, irEnvelopeWithMark)

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
  irEnvelopeContent: string
): string {
  const channelInfo = getChannelRoutingInfo()

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-SA-SA100</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
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
    <ChannelRouting>
      <Channel>
        <URI>${channelInfo.vendorId}</URI>
        <Product>${escapeXml(channelInfo.product)}</Product>
        <Version>${channelInfo.version}</Version>
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
  sa100Content: string
): string {
  return `<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/SA/SA100">
  <IRheader>
    <Keys>
      <Key Type="UTR">${escapeXml(taxpayer.utr)}</Key>
      <Key Type="NINO">${escapeXml(taxpayer.nino)}</Key>
    </Keys>
    <Period>
      <StartDate>${getTaxYearStart(returnData.taxYear)}</StartDate>
      <EndDate>${getTaxYearEnd(returnData.taxYear)}</EndDate>
    </Period>
    <Principal>
      <Contact>
        <Name>
          <Forename>${escapeXml(returnData.personalDetails.firstName)}</Forename>
          <Surname>${escapeXml(returnData.personalDetails.lastName)}</Surname>
        </Name>
      </Contact>
    </Principal>
    <IRmark Type="generic"/>
    <Sender>individual</Sender>
  </IRheader>
${indentXml(sa100Content, 2)}
</IRenvelope>`
}

// =============================================================================
// SA100 Content Builder
// =============================================================================

function buildSA100Content(returnData: SA100Return): string {
  const sections: string[] = []

  // Personal details
  sections.push(buildPersonalDetails(returnData.personalDetails))

  // Employment income (SA102)
  if (returnData.employments && returnData.employments.length > 0) {
    sections.push(buildEmploymentSection(returnData.employments))
  }

  // Self-employment income (SA103)
  if (returnData.selfEmployments && returnData.selfEmployments.length > 0) {
    sections.push(buildSelfEmploymentSection(returnData.selfEmployments))
  }

  // UK property (SA105)
  if (returnData.ukProperty) {
    sections.push(buildUKPropertySection(returnData.ukProperty))
  }

  // Foreign income (SA106)
  if (returnData.foreignIncome) {
    sections.push(buildForeignIncomeSection(returnData.foreignIncome))
  }

  // Capital gains (SA108)
  if (returnData.capitalGains) {
    sections.push(buildCapitalGainsSection(returnData.capitalGains))
  }

  // Additional information (SA101)
  if (returnData.additionalInfo) {
    sections.push(buildAdditionalInfoSection(returnData.additionalInfo))
  }

  // Reliefs
  if (returnData.reliefs) {
    sections.push(buildReliefsSection(returnData.reliefs))
  }

  // Declaration
  sections.push(buildDeclaration(returnData.declaration))

  return `<SA100>
  <TaxYear>${escapeXml(returnData.taxYear)}</TaxYear>
${sections.map(s => indentXml(s, 2)).join('\n')}
</SA100>`
}

// =============================================================================
// Section Builders (Stubs - will be expanded with actual schema)
// =============================================================================

function buildPersonalDetails(details: SA100Return['personalDetails']): string {
  return `<PersonalDetails>
  <Title>${escapeXml(details.title || '')}</Title>
  <FirstName>${escapeXml(details.firstName)}</FirstName>
  <LastName>${escapeXml(details.lastName)}</LastName>
  <NINO>${escapeXml(details.nino)}</NINO>
  <UTR>${escapeXml(details.utr)}</UTR>
  <DateOfBirth>${details.dateOfBirth}</DateOfBirth>
  <Address>
    <Line1>${escapeXml(details.address.line1)}</Line1>
    ${details.address.line2 ? `<Line2>${escapeXml(details.address.line2)}</Line2>` : ''}
    <Postcode>${escapeXml(details.address.postcode)}</Postcode>
  </Address>
</PersonalDetails>`
}

function buildEmploymentSection(employments: NonNullable<SA100Return['employments']>): string {
  const employmentXml = employments.map(emp => `<Employment>
  <EmployerName>${escapeXml(emp.employerName)}</EmployerName>
  ${emp.employerPAYERef ? `<PAYERef>${escapeXml(emp.employerPAYERef)}</PAYERef>` : ''}
  <PayFromEmployment>${formatMoney(emp.payFromEmployment)}</PayFromEmployment>
  <TaxDeducted>${formatMoney(emp.taxDeducted)}</TaxDeducted>
</Employment>`).join('\n')

  return `<SA102Employments>
${indentXml(employmentXml, 2)}
</SA102Employments>`
}

function buildSelfEmploymentSection(businesses: NonNullable<SA100Return['selfEmployments']>): string {
  const businessXml = businesses.map(biz => `<SelfEmployment>
  <BusinessName>${escapeXml(biz.businessName)}</BusinessName>
  <BusinessDescription>${escapeXml(biz.businessDescription)}</BusinessDescription>
  <AccountingPeriod>
    <Start>${biz.accountingPeriod.start}</Start>
    <End>${biz.accountingPeriod.end}</End>
  </AccountingPeriod>
  <AccountingBasis>${biz.accountingBasis}</AccountingBasis>
  <Income>
    <Turnover>${formatMoney(biz.income.turnover)}</Turnover>
    ${biz.income.otherIncome ? `<OtherIncome>${formatMoney(biz.income.otherIncome)}</OtherIncome>` : ''}
  </Income>
  <Expenses>
    ${biz.expenses.useConsolidated
      ? `<ConsolidatedExpenses>${formatMoney(biz.expenses.consolidatedExpenses || 0)}</ConsolidatedExpenses>`
      : buildItemizedExpenses(biz.expenses)
    }
  </Expenses>
</SelfEmployment>`).join('\n')

  return `<SA103SelfEmployments>
${indentXml(businessXml, 2)}
</SA103SelfEmployments>`
}

function buildItemizedExpenses(expenses: NonNullable<SA100Return['selfEmployments']>[0]['expenses']): string {
  const items: string[] = []

  if (expenses.costOfGoods) items.push(`<CostOfGoods>${formatMoney(expenses.costOfGoods)}</CostOfGoods>`)
  if (expenses.carVanTravel) items.push(`<CarVanTravel>${formatMoney(expenses.carVanTravel)}</CarVanTravel>`)
  if (expenses.wages) items.push(`<Wages>${formatMoney(expenses.wages)}</Wages>`)
  if (expenses.rent) items.push(`<Rent>${formatMoney(expenses.rent)}</Rent>`)
  if (expenses.repairs) items.push(`<Repairs>${formatMoney(expenses.repairs)}</Repairs>`)
  if (expenses.generalAdmin) items.push(`<GeneralAdmin>${formatMoney(expenses.generalAdmin)}</GeneralAdmin>`)
  if (expenses.advertising) items.push(`<Advertising>${formatMoney(expenses.advertising)}</Advertising>`)
  if (expenses.legalProfessional) items.push(`<LegalProfessional>${formatMoney(expenses.legalProfessional)}</LegalProfessional>`)
  if (expenses.interest) items.push(`<Interest>${formatMoney(expenses.interest)}</Interest>`)
  if (expenses.badDebts) items.push(`<BadDebts>${formatMoney(expenses.badDebts)}</BadDebts>`)
  if (expenses.accountancy) items.push(`<Accountancy>${formatMoney(expenses.accountancy)}</Accountancy>`)
  if (expenses.other) items.push(`<Other>${formatMoney(expenses.other)}</Other>`)

  return items.join('\n    ')
}

function buildUKPropertySection(property: NonNullable<SA100Return['ukProperty']>): string {
  return `<SA105UKProperty>
  <NumberOfProperties>${property.numberOfProperties}</NumberOfProperties>
  <Income>
    <RentAndOtherIncome>${formatMoney(property.income.rentAndOtherIncome)}</RentAndOtherIncome>
  </Income>
  <Expenses>
    ${property.expenses.useConsolidated
      ? `<ConsolidatedExpenses>${formatMoney(property.expenses.consolidatedExpenses || 0)}</ConsolidatedExpenses>`
      : `<RentsRatesInsurance>${formatMoney(property.expenses.rentsRatesInsurance || 0)}</RentsRatesInsurance>`
    }
  </Expenses>
</SA105UKProperty>`
}

function buildForeignIncomeSection(foreignIncome: NonNullable<SA100Return['foreignIncome']>): string {
  return `<SA106ForeignIncome>
  <!-- Foreign income details to be completed with schema -->
</SA106ForeignIncome>`
}

function buildCapitalGainsSection(capitalGains: NonNullable<SA100Return['capitalGains']>): string {
  return `<SA108CapitalGains>
  <!-- Capital gains details to be completed with schema -->
</SA108CapitalGains>`
}

function buildAdditionalInfoSection(additionalInfo: NonNullable<SA100Return['additionalInfo']>): string {
  return `<SA101AdditionalInfo>
  <!-- Additional info to be completed with schema -->
</SA101AdditionalInfo>`
}

function buildReliefsSection(reliefs: NonNullable<SA100Return['reliefs']>): string {
  const items: string[] = []

  if (reliefs.pensionContributions?.personal) {
    items.push(`<PensionContributions>${formatMoney(reliefs.pensionContributions.personal)}</PensionContributions>`)
  }

  if (reliefs.giftAid?.paymentsThisYear) {
    items.push(`<GiftAid>${formatMoney(reliefs.giftAid.paymentsThisYear)}</GiftAid>`)
  }

  if (reliefs.marriageAllowance?.transferring) {
    items.push(`<MarriageAllowance><Transferring>true</Transferring></MarriageAllowance>`)
  }

  return `<Reliefs>
${items.map(i => '  ' + i).join('\n')}
</Reliefs>`
}

function buildDeclaration(declaration: SA100Return['declaration']): string {
  return `<Declaration>
  <DeclarantType>${declaration.declarantType}</DeclarantType>
  <Name>${escapeXml(declaration.name)}</Name>
  <Date>${declaration.date}</Date>
</Declaration>`
}

// =============================================================================
// IRmark Calculation
// =============================================================================

/**
 * Calculate the IRmark hash for the IR envelope content
 *
 * NOTE: This is a placeholder. The actual IRmark calculation requires:
 * 1. Canonicalizing the XML (specific subset of XML to hash)
 * 2. SHA-1 hash of the canonical form
 * 3. Base64 encoding
 *
 * We'll need the official documentation to implement this correctly.
 */
function calculateIRMark(irEnvelopeXml: string): string {
  // TODO: Implement proper IRmark calculation
  // This requires:
  // 1. Extract specific elements for hashing (excluding IRmark element itself)
  // 2. Canonical XML transformation
  // 3. SHA-1 hash
  // 4. Base64 encode

  // Placeholder - returns a dummy value
  console.warn('[XML Builder] IRmark calculation is a placeholder - needs actual implementation')
  return 'PLACEHOLDER_IRMARK_NEEDS_IMPLEMENTATION'
}

/**
 * Insert the calculated IRmark into the envelope
 */
function insertIRMark(irEnvelopeXml: string, irMark: string): string {
  return irEnvelopeXml.replace(
    '<IRmark Type="generic"/>',
    `<IRmark Type="generic">${irMark}</IRmark>`
  )
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

  if (!returnData.personalDetails?.firstName) {
    errors.push({ field: 'personalDetails.firstName', message: 'First name is required', severity: 'error' })
  }

  if (!returnData.personalDetails?.lastName) {
    errors.push({ field: 'personalDetails.lastName', message: 'Last name is required', severity: 'error' })
  }

  if (!returnData.personalDetails?.nino) {
    errors.push({ field: 'personalDetails.nino', message: 'National Insurance number is required', severity: 'error' })
  }

  if (!returnData.personalDetails?.utr) {
    errors.push({ field: 'personalDetails.utr', message: 'Unique Taxpayer Reference is required', severity: 'error' })
  }

  if (!returnData.declaration) {
    errors.push({ field: 'declaration', message: 'Declaration is required', severity: 'error' })
  }

  // NINO format validation
  if (returnData.personalDetails?.nino) {
    const ninoRegex = /^[A-CEGHJ-PR-TW-Z]{2}[0-9]{6}[A-D]$/
    if (!ninoRegex.test(returnData.personalDetails.nino.replace(/\s/g, '').toUpperCase())) {
      errors.push({ field: 'personalDetails.nino', message: 'Invalid National Insurance number format', severity: 'error' })
    }
  }

  // UTR format validation
  if (returnData.personalDetails?.utr) {
    const utrRegex = /^[0-9]{10}$/
    if (!utrRegex.test(returnData.personalDetails.utr.replace(/\s/g, ''))) {
      errors.push({ field: 'personalDetails.utr', message: 'UTR must be 10 digits', severity: 'error' })
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

function formatMoney(amount: number): string {
  return amount.toFixed(2)
}

function indentXml(xml: string, spaces: number): string {
  const indent = ' '.repeat(spaces)
  return xml.split('\n').map(line => indent + line).join('\n')
}

function getTaxYearStart(taxYear: string): string {
  const [startYear] = taxYear.split('-').map(Number)
  return `${startYear}-04-06`
}

function getTaxYearEnd(taxYear: string): string {
  const [startYear] = taxYear.split('-').map(Number)
  return `${startYear + 1}-04-05`
}
