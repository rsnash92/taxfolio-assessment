/**
 * HMRC Transaction Engine Client
 *
 * Handles submission to HMRC's Transaction Engine for SA100 returns.
 * Uses GovTalk XML protocol with polling for async responses.
 *
 * Features:
 * - Automatic retry with exponential backoff for transient failures
 * - Configurable timeouts
 * - Detailed error parsing with user-friendly messages
 */

import { DOMParser } from '@xmldom/xmldom'
import type {
  GatewayCredentials,
  TaxpayerIdentification,
  SubmissionResponse,
  PollResponse,
} from './types'
import { withRetry, HMRC_RETRY_OPTIONS, RetryableError } from '@/lib/utils/retry'
import { withTimeout, TimeoutError, TIMEOUTS } from '@/lib/utils/timeout'
import { getHMRCErrorInfo, HMRCErrorInfo } from './hmrc-error-codes'

const TRANSACTION_ENGINE_URL =
  process.env.HMRC_TRANSACTION_ENGINE_URL || 'https://test-transaction-engine.tax.service.gov.uk'

// Product identification for channel routing
const PRODUCT_NAME = 'TaxFolio'
const PRODUCT_VERSION = '1.0.0'

// =============================================================================
// Types used internally and by the submit route
// =============================================================================

export interface SubmissionResult {
  success: boolean
  correlationId?: string
  pollUrl?: string
  pollInterval?: number
  error?: {
    code: string
    message: string
    userMessage: string
    location?: string
    suggestedAction?: string
  }
  errors?: HMRCErrorInfo[]
  rawResponse?: string
  retryAttempts?: number
}

export interface PollResult {
  status: 'pending' | 'accepted' | 'rejected'
  correlationId?: string
  irmarkReceipt?: string
  acceptedTime?: string
  hmrcMessage?: string
  errors?: HMRCErrorInfo[]
  rawResponse?: string
}

/**
 * Submit XML to HMRC Transaction Engine
 *
 * Features:
 * - Automatic retry with exponential backoff for transient failures
 * - 60 second timeout
 * - Detailed error parsing
 */
export async function submitToTransactionEngine(
  xml: string,
  options: {
    onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
  } = {}
): Promise<SubmissionResult> {
  const endpoint = `${TRANSACTION_ENGINE_URL}/submission`

  console.log('[Transaction Engine] Submitting to:', endpoint)
  console.log('[Transaction Engine] XML length:', xml.length)

  // Log key parts of the XML for debugging (mask password)
  const senderIdMatch = xml.match(/<SenderID>([^<]+)<\/SenderID>/)
  const utrMatch = xml.match(/<UTR>([^<]+)<\/UTR>/)
  const ninoMatch = xml.match(/<NINO>([^<]+)<\/NINO>/)
  const classMatch = xml.match(/<Class>([^<]+)<\/Class>/)
  const functionMatch = xml.match(/<Function>([^<]+)<\/Function>/)

  console.log('[Transaction Engine] Request details:', {
    class: classMatch?.[1],
    function: functionMatch?.[1],
    senderId: senderIdMatch?.[1],
    utr: utrMatch?.[1],
    nino: ninoMatch?.[1],
  })

  let retryAttempts = 0

  try {
    const responseText = await withRetry(
      async () => {
        // Submit with timeout
        const response = await withTimeout(
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/xml',
            },
            body: xml,
          }),
          TIMEOUTS.hmrcSubmission,
          'HMRC submission request timed out'
        )

        console.log('[Transaction Engine] Response status:', response.status)

        // Check for retryable HTTP status codes
        if ([502, 503, 504, 429].includes(response.status)) {
          throw new RetryableError(
            `HMRC returned ${response.status}: ${response.statusText}`,
            response.status.toString(),
            true
          )
        }

        if (!response.ok) {
          throw new Error(`HMRC returned ${response.status}: ${response.statusText}`)
        }

        return response.text()
      },
      {
        ...HMRC_RETRY_OPTIONS,
        onRetry: (attempt, error, nextDelay) => {
          retryAttempts = attempt
          console.log(`[Transaction Engine] Retry ${attempt}: ${error.message}, waiting ${nextDelay}ms`)
          options.onRetry?.(attempt, error, nextDelay)
        },
      }
    )

    console.log('[Transaction Engine] Response:', responseText.substring(0, 2000))

    // Parse the response XML
    const doc = new DOMParser().parseFromString(responseText, 'text/xml')

    // Check for GovTalk errors
    const qualifier = getElementText(doc, 'Qualifier')
    const correlationId = getElementText(doc, 'CorrelationID')

    if (qualifier === 'error') {
      // Extract all errors
      const errors = extractErrorsWithInfo(doc)

      return {
        success: false,
        correlationId,
        errors,
        error: errors[0]
          ? {
              code: errors[0].code,
              message: errors[0].technicalMessage,
              userMessage: errors[0].userMessage,
              location: errors[0].affectedField,
              suggestedAction: errors[0].suggestedAction,
            }
          : {
              code: 'UNKNOWN',
              message: 'Unknown error from HMRC',
              userMessage: 'An unknown error occurred. Please try again.',
            },
        rawResponse: responseText,
        retryAttempts,
      }
    }

    if (qualifier === 'acknowledgement') {
      // Submission accepted, need to poll for result
      const pollUrl = getElementText(doc, 'ResponseEndPoint')
      const pollIntervalStr = getElementAttribute(doc, 'ResponseEndPoint', 'PollInterval')
      const pollInterval = pollIntervalStr ? parseInt(pollIntervalStr, 10) : 10

      return {
        success: true,
        correlationId,
        pollUrl: pollUrl || endpoint,
        pollInterval,
        rawResponse: responseText,
        retryAttempts,
      }
    }

    // Unexpected qualifier
    const errorInfo = getHMRCErrorInfo('9999', `Unexpected qualifier: ${qualifier}`)
    return {
      success: false,
      correlationId,
      error: {
        code: 'UNEXPECTED_RESPONSE',
        message: `Unexpected qualifier: ${qualifier}`,
        userMessage: errorInfo.userMessage,
      },
      rawResponse: responseText,
      retryAttempts,
    }
  } catch (error) {
    // Handle timeout errors
    if (error instanceof TimeoutError) {
      const errorInfo = getHMRCErrorInfo('9001')
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: error.message,
          userMessage: "HMRC's service is taking too long to respond. Please try again.",
          suggestedAction: 'Wait a few minutes and try again.',
        },
        retryAttempts,
      }
    }

    // Handle other errors
    const errorInfo = getHMRCErrorInfo('9999', error instanceof Error ? error.message : 'Unknown error')
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error during submission',
        userMessage: "We couldn't connect to HMRC. Please check your internet connection and try again.",
        suggestedAction: 'Check your internet connection and try again.',
      },
      retryAttempts,
    }
  }
}

/**
 * Poll HMRC for submission result
 */
export async function pollForResult(correlationId: string, pollUrl?: string): Promise<PollResult> {
  const endpoint = pollUrl || `${TRANSACTION_ENGINE_URL}/submission`

  // Build poll request XML
  const pollXml = buildPollRequest(correlationId)

  try {
    const response = await withTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: pollXml,
      }),
      TIMEOUTS.hmrcPoll,
      'HMRC poll request timed out'
    )

    const responseText = await response.text()

    // Parse the response XML
    const doc = new DOMParser().parseFromString(responseText, 'text/xml')

    // Check qualifier
    const qualifier = getElementText(doc, 'Qualifier')

    if (qualifier === 'acknowledgement') {
      // Still processing
      return {
        status: 'pending',
        correlationId,
        rawResponse: responseText,
      }
    }

    if (qualifier === 'response') {
      // Got a final response - check for success or error
      const successResponse = doc.getElementsByTagName('SuccessResponse')

      if (successResponse.length > 0) {
        // Success!
        const irmarkReceipt = getElementText(doc, 'DigestValue')
        const hmrcMessage = getMessageText(doc)
        const acceptedTime = getElementText(doc, 'AcceptedTime')

        return {
          status: 'accepted',
          correlationId,
          irmarkReceipt,
          hmrcMessage,
          acceptedTime,
          rawResponse: responseText,
        }
      }

      // Check for error response
      const errorResponse = doc.getElementsByTagName('ErrorResponse')
      if (errorResponse.length > 0) {
        const errors = extractErrorsWithInfo(doc)
        return {
          status: 'rejected',
          correlationId,
          errors,
          rawResponse: responseText,
        }
      }
    }

    if (qualifier === 'error') {
      // Error response
      const errors = extractErrorsWithInfo(doc)
      return {
        status: 'rejected',
        correlationId,
        errors,
        rawResponse: responseText,
      }
    }

    // Unknown status
    return {
      status: 'pending',
      correlationId,
      rawResponse: responseText,
    }
  } catch (error) {
    // Handle timeout
    if (error instanceof TimeoutError) {
      return {
        status: 'pending', // Treat timeout as pending, will retry
        correlationId,
      }
    }

    const errorInfo = getHMRCErrorInfo(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network error during polling'
    )
    return {
      status: 'rejected',
      correlationId,
      errors: [errorInfo],
    }
  }
}

/**
 * Poll with retries until we get a final result
 */
export async function pollUntilComplete(
  correlationId: string,
  options: {
    pollUrl?: string
    maxAttempts?: number
    pollIntervalMs?: number
    onPoll?: (attempt: number) => void
  } = {}
): Promise<PollResult> {
  const { pollUrl, maxAttempts = 30, pollIntervalMs = 5000, onPoll } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onPoll?.(attempt)

    const result = await pollForResult(correlationId, pollUrl)

    if (result.status !== 'pending') {
      return result
    }

    // Wait before next poll
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    }
  }

  // Timed out
  return {
    status: 'rejected',
    correlationId,
    errors: [getHMRCErrorInfo('9001', `Polling timed out after ${maxAttempts} attempts`)],
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

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
    <SenderDetails/>
  </Header>
  <GovTalkDetails>
    <Keys/>
  </GovTalkDetails>
  <Body/>
</GovTalkMessage>`
}

function getElementText(doc: Document, tagName: string): string | undefined {
  const elements = doc.getElementsByTagName(tagName)
  if (elements.length > 0 && elements[0].textContent) {
    return elements[0].textContent.trim()
  }
  return undefined
}

function getElementAttribute(
  doc: Document,
  tagName: string,
  attrName: string
): string | undefined {
  const elements = doc.getElementsByTagName(tagName)
  if (elements.length > 0) {
    const attr = elements[0].getAttribute(attrName)
    return attr || undefined
  }
  return undefined
}

function getMessageText(doc: Document): string | undefined {
  // Try to find Message elements with text
  const messages = doc.getElementsByTagName('Message')
  for (let i = 0; i < messages.length; i++) {
    const text = messages[i].textContent?.trim()
    if (text) {
      return text
    }
  }
  return undefined
}

function extractErrors(doc: Document): Array<{ code: string; message: string; location?: string }> {
  const errors: Array<{ code: string; message: string; location?: string }> = []

  const errorElements = doc.getElementsByTagName('Error')
  for (let i = 0; i < errorElements.length; i++) {
    const error = errorElements[i]
    const number = getChildText(error, 'Number')
    const text = getChildText(error, 'Text')
    const location = getChildText(error, 'Location')

    if (text) {
      errors.push({
        code: number || 'UNKNOWN',
        message: text,
        location,
      })
    }
  }

  return errors
}

/**
 * Extract errors with full user-friendly information
 */
function extractErrorsWithInfo(doc: Document): HMRCErrorInfo[] {
  const errors: HMRCErrorInfo[] = []

  const errorElements = doc.getElementsByTagName('Error')
  for (let i = 0; i < errorElements.length; i++) {
    const error = errorElements[i]
    const number = getChildText(error, 'Number')
    const text = getChildText(error, 'Text')
    const location = getChildText(error, 'Location')

    if (number || text) {
      const errorInfo = getHMRCErrorInfo(number || 'UNKNOWN', text)
      if (location) {
        errorInfo.affectedField = location
      }
      errors.push(errorInfo)
    }
  }

  // If no specific errors found, add a generic one
  if (errors.length === 0) {
    errors.push(getHMRCErrorInfo('9999'))
  }

  return errors
}

function getChildText(element: Element, tagName: string): string | undefined {
  const children = element.getElementsByTagName(tagName)
  if (children.length > 0 && children[0].textContent) {
    return children[0].textContent.trim()
  }
  return undefined
}

// =============================================================================
// Exports for index.ts compatibility (using types from ./types.ts)
// =============================================================================

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
 * Custom error class for Transaction Engine errors
 */
export class TransactionEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message)
    this.name = 'TransactionEngineError'
  }
}

/**
 * Submit SA100 return to HMRC Transaction Engine
 * (Compatible with index.ts exports)
 */
export async function submitReturn(options: SubmitOptions): Promise<SubmissionResponse> {
  const { xmlContent, correlationId } = options

  const result = await submitToTransactionEngine(xmlContent)

  if (!result.success) {
    return {
      correlationId: result.correlationId || generateCorrelationId(),
      status: 'error',
      timestamp: new Date().toISOString(),
      errors: result.error
        ? [
            {
              code: result.error.code,
              message: result.error.message,
              location: result.error.location,
              severity: 'error' as const,
            },
          ]
        : [],
    }
  }

  return {
    correlationId: result.correlationId || generateCorrelationId(),
    status: 'pending',
    timestamp: new Date().toISOString(),
    pollUrl: result.pollUrl,
  }
}

/**
 * Poll for submission status
 * (Compatible with index.ts exports)
 */
export async function pollStatus(correlationId: string): Promise<PollResponse> {
  const result = await pollForResult(correlationId)

  if (result.status === 'accepted') {
    return {
      status: 'accepted',
      correlationId,
      successResponse: {
        irMarkReceipt: result.irmarkReceipt || '',
        submissionId: '',
        acceptedTimestamp: result.acceptedTime || new Date().toISOString(),
      },
    }
  }

  if (result.status === 'rejected') {
    return {
      status: 'rejected',
      correlationId,
      errors: result.errors?.map((e) => ({
        code: e.code,
        message: e.technicalMessage,
        location: e.affectedField,
        severity: 'error' as const,
      })),
    }
  }

  return {
    status: 'processing',
    correlationId,
  }
}

/**
 * Get channel routing information for the XML envelope
 */
export function getChannelRoutingInfo(): {
  uri: string
  product: string
  version: string
} {
  return {
    uri: '', // Empty URI is acceptable per HMRC docs
    product: PRODUCT_NAME,
    version: PRODUCT_VERSION,
  }
}

function generateCorrelationId(): string {
  const hex = '0123456789ABCDEF'
  let id = ''
  for (let i = 0; i < 32; i++) {
    id += hex[Math.floor(Math.random() * 16)]
  }
  return id
}
