/**
 * HMRC External Test Service (ETS) Submission Test
 *
 * First real submission test to HMRC's External Test Service.
 * Uses the vendor credentials from HMRC registration.
 *
 * Run with: npx tsx scripts/test-ets-submission.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Manually load environment variables from .env.local
function loadEnvFile(filePath: string): void {
  try {
    const envPath = path.resolve(process.cwd(), filePath)
    if (!fs.existsSync(envPath)) {
      console.warn(`Warning: ${filePath} not found`)
      return
    }

    const content = fs.readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue

      const key = trimmed.substring(0, eqIndex).trim()
      let value = trimmed.substring(eqIndex + 1).trim()

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      // Only set if not already defined
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}:`, error)
  }
}

// Load environment variables from .env.local
loadEnvFile('.env.local')

import { buildSubmissionXML } from '../src/lib/sa100/xml-builder'
import { validateSA100Data, validateXML } from '../src/lib/sa100/validate'
import type {
  SA100Return,
  GatewayCredentials,
  TaxpayerIdentification,
} from '../src/lib/sa100/types'

// =============================================================================
// Configuration
// =============================================================================

const VENDOR_ID = process.env.HMRC_VENDOR_ID || ''
const SENDER_ID = process.env.HMRC_SENDER_ID || ''
const SENDER_PASSWORD = process.env.HMRC_SENDER_PASSWORD || ''
const ETS_URL = process.env.HMRC_TRANSACTION_ENGINE_URL || 'https://test-transaction-engine.tax.service.gov.uk'

// HMRC Test Data
const TEST_UTR = '1000000239' // Provided by HMRC for testing
const TEST_NINO = 'AB123456C' // Standard test NINO format

// =============================================================================
// Validation
// =============================================================================

function validateConfig(): boolean {
  const missing: string[] = []

  if (!VENDOR_ID) missing.push('HMRC_VENDOR_ID')
  if (!SENDER_ID) missing.push('HMRC_SENDER_ID')
  if (!SENDER_PASSWORD) missing.push('HMRC_SENDER_PASSWORD')

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(v => console.error(`   - ${v}`))
    console.error('\nPlease add these to your .env.local file:')
    console.error('')
    console.error('# HMRC Transaction Engine (from vendor registration)')
    console.error('HMRC_VENDOR_ID=9302')
    console.error('HMRC_SENDER_ID=SA0239')
    console.error('HMRC_SENDER_PASSWORD=fGuR34fAOEJf')
    console.error('HMRC_TRANSACTION_ENGINE_URL=https://test-transaction-engine.tax.service.gov.uk')
    return false
  }

  return true
}

// =============================================================================
// Test Data
// =============================================================================

// Test credentials - using HMRC-provided sender credentials
const testCredentials: GatewayCredentials = {
  userId: SENDER_ID,
  password: SENDER_PASSWORD,
}

// Test taxpayer identification using HMRC test UTR
const testTaxpayer: TaxpayerIdentification = {
  utr: TEST_UTR,
  nino: TEST_NINO,
}

// Minimal self-employment return for testing
const testReturnData: SA100Return = {
  taxYear: '2024-25',

  yourPersonalDetails: {
    dateOfBirth: '1980-01-15',
    nationalInsuranceNumber: TEST_NINO,
    taxpayerStatus: 'U', // Rest of UK
  },

  yourTaxReturn: {
    shortSelfEmploymentSchedule: 'yes',
    numberOfShortSelfEmploymentSchedules: 1,
  },

  finishing: {
    returnSigner: 'Individual',
  },

  // Simple self-employment with minimal income for testing
  sa103S: [
    {
      businessDetails: {
        businessName: 'Test Business',
        descriptionOfBusiness: 'Software Development',
      },
      accountingPeriod: {
        startDate: '2024-04-06',
        endDate: '2025-04-05',
      },
      cashBasisIndicator: 'yes',
      income: {
        turnover: 30000,
        // Note: otherBusinessIncome omitted - HMRC schema requires > 0 for this field
      },
      totalAllowableExpenses: 5000,
      netProfitOrLoss: 25000,
      totalTaxableProfits: 25000,
    },
  ],

  // SA110 - Tax calculation summary
  // For £25,000 self-employment profit (2024-25):
  // - Personal allowance: £12,570
  // - Taxable income: £12,430
  // - Income tax (20%): £2,486.00
  // - Class 4 NIC (9% on £12,570-£50,270): £745.80 (on £8,286.50 above lower limit of £12,570)
  // - Class 2 NIC: £3.45/week × 52 = £179.40 (approx)
  // Note: Class 4 calculated by HMRC at £745.80
  sa110: {
    totalTaxEtcDue: 3231.80,
    class4NICsDue: 745.80,
    class2NICsDue: 0, // Voluntary for profits under £12,570, but we're above
  },
}

// =============================================================================
// HTTP Submission Functions
// =============================================================================

interface SubmitResult {
  success: boolean
  correlationId?: string
  rawResponse: string
  error?: string
  qualifier?: string
}

async function submitToETS(xml: string): Promise<SubmitResult> {
  const submissionUrl = `${ETS_URL}/submission`

  console.log(`\n📤 Submitting to: ${submissionUrl}`)

  try {
    const response = await fetch(submissionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      body: xml,
    })

    const responseText = await response.text()

    console.log(`   HTTP Status: ${response.status} ${response.statusText}`)

    // Parse the GovTalk response
    const correlationIdMatch = responseText.match(/<CorrelationID>([^<]+)<\/CorrelationID>/i)
    const qualifierMatch = responseText.match(/<Qualifier>([^<]+)<\/Qualifier>/i)
    const errorMatch = responseText.match(/<Text>([^<]+)<\/Text>/i)

    const correlationId = correlationIdMatch?.[1]
    const qualifier = qualifierMatch?.[1]

    if (qualifier === 'acknowledgement') {
      return {
        success: true,
        correlationId,
        qualifier,
        rawResponse: responseText,
      }
    } else if (qualifier === 'error' || errorMatch) {
      return {
        success: false,
        correlationId,
        qualifier,
        error: errorMatch?.[1] || 'Unknown error',
        rawResponse: responseText,
      }
    }

    // Unexpected response
    return {
      success: response.ok,
      correlationId,
      qualifier,
      rawResponse: responseText,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      rawResponse: '',
    }
  }
}

/**
 * Build a poll request XML for HMRC
 */
function buildPollRequest(correlationId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-SA-SA100</Class>
      <Qualifier>poll</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${correlationId}</CorrelationID>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${SENDER_ID}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${SENDER_PASSWORD}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
  </GovTalkDetails>
  <Body/>
</GovTalkMessage>`
}

interface PollResult {
  status: 'pending' | 'accepted' | 'rejected' | 'error'
  correlationId?: string
  irmarkReceipt?: string
  submissionId?: string
  errors?: string[]
  rawResponse: string
}

async function pollForResponse(correlationId: string): Promise<PollResult> {
  const pollUrl = `${ETS_URL}/poll`
  const pollXml = buildPollRequest(correlationId)

  try {
    const response = await fetch(pollUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
      body: pollXml,
    })

    const responseText = await response.text()

    // Parse response
    const qualifierMatch = responseText.match(/<Qualifier>([^<]+)<\/Qualifier>/i)
    const qualifier = qualifierMatch?.[1]

    // Check if it's a final response or still pending
    if (qualifier === 'acknowledgement') {
      return {
        status: 'pending',
        correlationId,
        rawResponse: responseText,
      }
    }

    if (qualifier === 'response') {
      // Check for success or error
      const hasSuccess = responseText.includes('<SuccessResponse>') || responseText.includes('<IRmarkReceipt>')

      if (hasSuccess) {
        const irmarkMatch = responseText.match(/<IRmarkReceipt[^>]*>([^<]*)<\/IRmarkReceipt>/i)
        const submissionIdMatch = responseText.match(/<ResponseID>([^<]+)<\/ResponseID>/i)

        return {
          status: 'accepted',
          correlationId,
          irmarkReceipt: irmarkMatch?.[1],
          submissionId: submissionIdMatch?.[1],
          rawResponse: responseText,
        }
      } else {
        // Parse errors
        const errors: string[] = []
        const errorMatches = responseText.matchAll(/<Text>([^<]+)<\/Text>/gi)
        for (const match of errorMatches) {
          errors.push(match[1])
        }

        return {
          status: 'rejected',
          correlationId,
          errors,
          rawResponse: responseText,
        }
      }
    }

    if (qualifier === 'error') {
      const errors: string[] = []
      const errorMatches = responseText.matchAll(/<Text>([^<]+)<\/Text>/gi)
      for (const match of errorMatches) {
        errors.push(match[1])
      }

      return {
        status: 'error',
        correlationId,
        errors,
        rawResponse: responseText,
      }
    }

    // Unknown state
    return {
      status: 'pending',
      correlationId,
      rawResponse: responseText,
    }
  } catch (error) {
    return {
      status: 'error',
      correlationId,
      errors: [error instanceof Error ? error.message : 'Network error'],
      rawResponse: '',
    }
  }
}

async function pollUntilComplete(
  correlationId: string,
  options: {
    maxAttempts?: number
    delayMs?: number
  } = {}
): Promise<PollResult> {
  const { maxAttempts = 20, delayMs = 3000 } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`   Poll attempt ${attempt}/${maxAttempts}...`)

    const result = await pollForResponse(correlationId)

    if (result.status !== 'pending') {
      return result
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return {
    status: 'error',
    correlationId,
    errors: [`Polling timed out after ${maxAttempts} attempts`],
    rawResponse: '',
  }
}

// =============================================================================
// Main Test Script
// =============================================================================

async function main() {
  console.log('='.repeat(60))
  console.log('HMRC External Test Service (ETS) Submission Test')
  console.log('='.repeat(60))

  // Step 0: Validate configuration
  if (!validateConfig()) {
    process.exit(1)
  }

  console.log(`\nConfiguration:`)
  console.log(`  Vendor ID: ${VENDOR_ID}`)
  console.log(`  Sender ID: ${SENDER_ID}`)
  console.log(`  Password:  ${'*'.repeat(Math.min(SENDER_PASSWORD.length, 12))}`)
  console.log(`  Test UTR:  ${TEST_UTR}`)
  console.log(`  Endpoint:  ${ETS_URL}`)

  // Create output directory
  const outputDir = path.join(__dirname, '../test-ets-output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  try {
    // Step 1: Validate test data
    console.log('\n📋 Step 1: Validating test data...')
    const dataValidation = validateSA100Data(testReturnData)

    if (!dataValidation.valid) {
      console.log('   ❌ Data validation failed:')
      dataValidation.errors.forEach(err => console.log(`      - ${err.field}: ${err.message}`))
      process.exit(1)
    }

    if (dataValidation.warnings.length > 0) {
      console.log('   ⚠️  Warnings:')
      dataValidation.warnings.forEach(w => console.log(`      - ${w.field}: ${w.message}`))
    }

    console.log('   ✓ Data validation passed')

    // Step 2: Build XML
    console.log('\n📝 Step 2: Building SA100 XML...')
    const buildResult = buildSubmissionXML({
      credentials: testCredentials,
      taxpayer: testTaxpayer,
      returnData: testReturnData,
    })

    if (buildResult.validationErrors.length > 0) {
      console.log('   ⚠️  Build warnings:')
      buildResult.validationErrors.forEach(e => console.log(`      - ${e.field}: ${e.message}`))
    }

    console.log(`   ✓ XML generated (${buildResult.xml.length} bytes)`)
    console.log(`   ✓ IRmark: ${buildResult.irMark.substring(0, 20)}...`)

    // Save the submission XML
    const xmlPath = path.join(outputDir, 'ets-submission.xml')
    fs.writeFileSync(xmlPath, buildResult.xml, 'utf-8')
    console.log(`   ✓ Saved to: ${xmlPath}`)

    // Step 3: Validate generated XML
    console.log('\n🔍 Step 3: Validating generated XML...')
    const xmlValidation = validateXML(buildResult.xml)

    if (!xmlValidation.valid) {
      console.log('   ❌ XML validation failed:')
      xmlValidation.errors.forEach(err => console.log(`      - ${err.field}: ${err.message}`))
      process.exit(1)
    }

    console.log('   ✓ XML validation passed')
    console.log(`   ✓ IRmark verified: ${xmlValidation.irMarkValid ? 'Yes' : 'No'}`)

    // Step 4: Submit to ETS
    console.log('\n📤 Step 4: Submitting to HMRC ETS...')
    const submitResult = await submitToETS(buildResult.xml)

    // Save submission response
    const submitResponsePath = path.join(outputDir, 'ets-submit-response.xml')
    fs.writeFileSync(submitResponsePath, submitResult.rawResponse || 'No response', 'utf-8')
    console.log(`   Response saved to: ${submitResponsePath}`)

    if (!submitResult.success) {
      console.log('\n' + '='.repeat(60))
      console.log('❌ SUBMISSION FAILED')
      console.log('='.repeat(60))
      console.log(`Error: ${submitResult.error}`)
      console.log(`Qualifier: ${submitResult.qualifier || 'unknown'}`)
      console.log('\nCheck ets-submit-response.xml for full error details')
      process.exit(1)
    }

    console.log(`   ✓ Submission acknowledged`)
    console.log(`   ✓ Correlation ID: ${submitResult.correlationId}`)

    // Step 5: Poll for result
    console.log('\n⏳ Step 5: Polling for response...')
    const pollResult = await pollUntilComplete(submitResult.correlationId!, {
      maxAttempts: 20,
      delayMs: 3000,
    })

    // Save poll response
    const pollResponsePath = path.join(outputDir, 'ets-poll-response.xml')
    fs.writeFileSync(pollResponsePath, pollResult.rawResponse || 'No response', 'utf-8')
    console.log(`   Response saved to: ${pollResponsePath}`)

    // Step 6: Display final result
    console.log('\n' + '='.repeat(60))

    if (pollResult.status === 'accepted') {
      console.log('✅ SUCCESS - HMRC ACCEPTED THE SUBMISSION')
      console.log('='.repeat(60))
      console.log(`IRmark Receipt: ${pollResult.irmarkReceipt || 'Not provided'}`)
      console.log(`Submission ID:  ${pollResult.submissionId || 'Not provided'}`)
    } else if (pollResult.status === 'rejected') {
      console.log('❌ REJECTED - HMRC DID NOT ACCEPT THE SUBMISSION')
      console.log('='.repeat(60))
      if (pollResult.errors && pollResult.errors.length > 0) {
        console.log('\nErrors:')
        pollResult.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`))
      }
    } else if (pollResult.status === 'error') {
      console.log('⚠️  ERROR - SUBMISSION COULD NOT BE PROCESSED')
      console.log('='.repeat(60))
      if (pollResult.errors && pollResult.errors.length > 0) {
        console.log('\nErrors:')
        pollResult.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`))
      }
    } else {
      console.log(`⚠️  UNKNOWN STATUS: ${pollResult.status}`)
      console.log('='.repeat(60))
    }

    console.log('\nOutput files:')
    console.log(`  - ${xmlPath}`)
    console.log(`  - ${submitResponsePath}`)
    console.log(`  - ${pollResponsePath}`)

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }

  console.log('\n' + '='.repeat(60))
  console.log('Test complete')
  console.log('='.repeat(60))
}

// Run the test
main()
