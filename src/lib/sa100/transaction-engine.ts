/**
 * HMRC Transaction Engine Client
 *
 * Handles submission of SA100 XML returns to HMRC.
 *
 * Flow:
 * 1. Build GovTalk envelope with XML content
 * 2. POST to Transaction Engine submission endpoint
 * 3. Poll for async response
 * 4. Handle success/failure
 *
 * Endpoints:
 * - Test: https://test-transaction-engine.tax.service.gov.uk/submission
 * - Production: https://transaction-engine.tax.service.gov.uk/submission
 */

import {
  GatewayCredentials,
  TaxpayerIdentification,
  SubmissionResponse,
  PollResponse,
  SubmissionError,
} from './types'

// Environment configuration
const TRANSACTION_ENGINE_URL =
  process.env.HMRC_TRANSACTION_ENGINE_URL ||
  'https://test-transaction-engine.tax.service.gov.uk'

const VENDOR_ID = process.env.HMRC_VENDOR_ID || ''

// Product identification for channel routing
const PRODUCT_NAME = 'TaxFolio'
const PRODUCT_VERSION = '1.0.0'

export interface SubmitOptions {
  /** Government Gateway credentials */
  credentials: GatewayCredentials
  /** Taxpayer identification */
  taxpayer: TaxpayerIdentification
  /** The complete XML content (GovTalk envelope) */
  xmlContent: string
  /** Optional correlation ID for tracking */
  correlationId?: string
}

/**
 * Submit SA100 return to HMRC Transaction Engine
 */
export async function submitReturn(
  options: SubmitOptions
): Promise<SubmissionResponse> {
  const { xmlContent, correlationId } = options

  const submissionUrl = `${TRANSACTION_ENGINE_URL}/submission`

  console.log('[TransactionEngine] Submitting to:', submissionUrl)
  console.log('[TransactionEngine] Correlation ID:', correlationId)

  try {
    const response = await fetch(submissionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        Accept: 'application/xml',
        'X-Correlation-ID': correlationId || generateCorrelationId(),
      },
      body: xmlContent,
    })

    const responseText = await response.text()

    console.log('[TransactionEngine] Response status:', response.status)

    if (!response.ok) {
      console.error('[TransactionEngine] Error response:', responseText)
      return parseErrorResponse(responseText, response.status)
    }

    return parseSubmissionResponse(responseText)
  } catch (error) {
    console.error('[TransactionEngine] Submission error:', error)
    throw new TransactionEngineError(
      'Failed to submit return to HMRC',
      'SUBMISSION_FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Poll for submission status
 */
export async function pollStatus(
  correlationId: string
): Promise<PollResponse> {
  const pollUrl = `${TRANSACTION_ENGINE_URL}/poll`

  console.log('[TransactionEngine] Polling status for:', correlationId)

  try {
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/xml',
        'X-Correlation-ID': correlationId,
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error('[TransactionEngine] Poll error:', responseText)
      throw new TransactionEngineError(
        'Failed to poll submission status',
        'POLL_FAILED',
        responseText
      )
    }

    return parsePollResponse(responseText)
  } catch (error) {
    if (error instanceof TransactionEngineError) throw error

    console.error('[TransactionEngine] Poll error:', error)
    throw new TransactionEngineError(
      'Failed to poll submission status',
      'POLL_FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

/**
 * Poll with automatic retry until complete
 */
export async function pollUntilComplete(
  correlationId: string,
  options: {
    maxAttempts?: number
    intervalMs?: number
    onProgress?: (status: PollResponse) => void
  } = {}
): Promise<PollResponse> {
  const { maxAttempts = 30, intervalMs = 5000, onProgress } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[TransactionEngine] Poll attempt ${attempt}/${maxAttempts}`)

    const status = await pollStatus(correlationId)

    if (onProgress) {
      onProgress(status)
    }

    if (status.status === 'accepted' || status.status === 'rejected' || status.status === 'error') {
      return status
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs)
    }
  }

  throw new TransactionEngineError(
    'Polling timed out',
    'POLL_TIMEOUT',
    `Max attempts (${maxAttempts}) exceeded`
  )
}

// =============================================================================
// Response Parsing (Stub - will need actual XML parsing when we get schemas)
// =============================================================================

function parseSubmissionResponse(xml: string): SubmissionResponse {
  // TODO: Parse actual GovTalk response XML
  // This is a stub that returns a basic structure

  // Look for common elements in the response
  const correlationIdMatch = xml.match(/<CorrelationID>([^<]+)<\/CorrelationID>/i)
  const transactionIdMatch = xml.match(/<TransactionID>([^<]+)<\/TransactionID>/i)
  const errorMatch = xml.match(/<Error>/i)

  if (errorMatch) {
    const errors = parseErrors(xml)
    return {
      correlationId: correlationIdMatch?.[1] || 'unknown',
      status: 'rejected',
      timestamp: new Date().toISOString(),
      errors,
    }
  }

  return {
    correlationId: correlationIdMatch?.[1] || generateCorrelationId(),
    transactionId: transactionIdMatch?.[1],
    status: 'pending',
    timestamp: new Date().toISOString(),
    pollUrl: `${TRANSACTION_ENGINE_URL}/poll`,
  }
}

function parsePollResponse(xml: string): PollResponse {
  // TODO: Parse actual GovTalk poll response XML
  // This is a stub

  const correlationIdMatch = xml.match(/<CorrelationID>([^<]+)<\/CorrelationID>/i)
  const statusMatch = xml.match(/<Status>([^<]+)<\/Status>/i)
  const irMarkMatch = xml.match(/<IRmarkReceipt>([^<]+)<\/IRmarkReceipt>/i)
  const submissionIdMatch = xml.match(/<SubmissionID>([^<]+)<\/SubmissionID>/i)

  const status = statusMatch?.[1]?.toLowerCase() as PollResponse['status'] || 'pending'

  const response: PollResponse = {
    correlationId: correlationIdMatch?.[1] || 'unknown',
    status,
  }

  if (status === 'accepted' && irMarkMatch && submissionIdMatch) {
    response.successResponse = {
      irMarkReceipt: irMarkMatch[1],
      submissionId: submissionIdMatch[1],
      acceptedTimestamp: new Date().toISOString(),
    }
  }

  if (status === 'rejected' || status === 'error') {
    response.errors = parseErrors(xml)
  }

  return response
}

function parseErrorResponse(xml: string, statusCode: number): SubmissionResponse {
  const errors = parseErrors(xml)

  return {
    correlationId: 'error',
    status: 'error',
    timestamp: new Date().toISOString(),
    errors: errors.length > 0 ? errors : [{
      code: `HTTP_${statusCode}`,
      message: `HTTP error ${statusCode}`,
      severity: 'error',
    }],
  }
}

function parseErrors(xml: string): SubmissionError[] {
  // TODO: Parse actual error elements from GovTalk response
  // This is a stub implementation

  const errors: SubmissionError[] = []
  const errorMatches = xml.matchAll(
    /<Error[^>]*>[\s\S]*?<Text>([^<]+)<\/Text>[\s\S]*?<\/Error>/gi
  )

  for (const match of errorMatches) {
    errors.push({
      code: 'UNKNOWN',
      message: match[1],
      severity: 'error',
    })
  }

  // If no structured errors found, check for error message
  if (errors.length === 0) {
    const messageMatch = xml.match(/<Message>([^<]+)<\/Message>/i)
    if (messageMatch) {
      errors.push({
        code: 'UNKNOWN',
        message: messageMatch[1],
        severity: 'error',
      })
    }
  }

  return errors
}

// =============================================================================
// Helpers
// =============================================================================

function generateCorrelationId(): string {
  return `TF-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get vendor/product info for channel routing
 */
export function getChannelRoutingInfo() {
  return {
    vendorId: VENDOR_ID,
    product: PRODUCT_NAME,
    version: PRODUCT_VERSION,
  }
}

// =============================================================================
// Error Class
// =============================================================================

export class TransactionEngineError extends Error {
  code: string
  details?: string

  constructor(message: string, code: string, details?: string) {
    super(message)
    this.name = 'TransactionEngineError'
    this.code = code
    this.details = details
  }
}
