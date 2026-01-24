/**
 * HMRC GovTalk Response Parser
 *
 * Parses XML responses from HMRC Transaction Engine and extracts
 * structured error information.
 */

import { getHMRCErrorInfo, HMRCErrorInfo, getErrorSummary } from './hmrc-error-codes'

export interface HMRCResponse {
  success: boolean
  correlationId?: string
  irmark?: string
  acceptedTime?: string
  errors: HMRCErrorInfo[]
  warnings: HMRCErrorInfo[]
  summary: string
  rawResponse?: string
}

/**
 * Parse a GovTalk response from HMRC
 */
export function parseGovTalkResponse(xmlResponse: string): HMRCResponse {
  const result: HMRCResponse = {
    success: false,
    errors: [],
    warnings: [],
    summary: '',
    rawResponse: xmlResponse,
  }

  try {
    // Check for successful response
    const qualifierMatch = xmlResponse.match(/<Qualifier>(\w+)<\/Qualifier>/i)
    const qualifier = qualifierMatch?.[1]?.toLowerCase()

    // Extract correlation ID
    const correlationMatch = xmlResponse.match(/<CorrelationID>([^<]+)<\/CorrelationID>/i)
    if (correlationMatch) {
      result.correlationId = correlationMatch[1]
    }

    // Check for acceptance
    if (qualifier === 'response') {
      // Look for SuccessResponse
      if (xmlResponse.includes('<SuccessResponse')) {
        result.success = true

        // Extract accepted time
        const acceptedMatch = xmlResponse.match(/<AcceptedTime>([^<]+)<\/AcceptedTime>/i)
        if (acceptedMatch) {
          result.acceptedTime = acceptedMatch[1]
        }

        // Extract IRmark receipt
        const irmarkMatch = xmlResponse.match(/<DigestValue>([^<]+)<\/DigestValue>/i)
        if (irmarkMatch) {
          result.irmark = irmarkMatch[1]
        }
      }
    }

    // Parse all errors
    const errorRegex =
      /<Error[^>]*>[\s\S]*?<Number>(\d+)<\/Number>[\s\S]*?<Text>([^<]*)<\/Text>(?:[\s\S]*?<Location>([^<]*)<\/Location>)?[\s\S]*?<\/Error>/gi
    let errorMatch

    while ((errorMatch = errorRegex.exec(xmlResponse)) !== null) {
      const [, code, text, location] = errorMatch
      const errorInfo = getHMRCErrorInfo(code, text)

      // Add location if present
      if (location) {
        errorInfo.affectedField = location
      }

      if (errorInfo.severity === 'warning') {
        result.warnings.push(errorInfo)
      } else {
        result.errors.push(errorInfo)
        result.success = false
      }
    }

    // Check for error qualifier without specific errors
    if (qualifier === 'error' && result.errors.length === 0) {
      // Try to extract any error text
      const genericErrorMatch = xmlResponse.match(/<Text>([^<]+)<\/Text>/i)
      const genericCodeMatch = xmlResponse.match(/<Number>(\d+)<\/Number>/i)

      result.errors.push(
        getHMRCErrorInfo(
          genericCodeMatch?.[1] || '9999',
          genericErrorMatch?.[1] || 'Unknown HMRC error'
        )
      )
      result.success = false
    }

    // Generate summary
    result.summary = result.success
      ? 'Your tax return was accepted by HMRC.'
      : getErrorSummary(result.errors)
  } catch (parseError) {
    result.success = false
    result.errors.push({
      code: 'PARSE_ERROR',
      category: 'system',
      severity: 'fatal',
      technicalMessage: `Failed to parse HMRC response: ${parseError}`,
      userMessage: "We couldn't understand HMRC's response. Please try again.",
      suggestedAction: 'If this persists, contact support.',
    })
    result.summary = "We couldn't understand HMRC's response."
  }

  return result
}

/**
 * Extract the poll interval from acknowledgement response
 */
export function extractPollInterval(xmlResponse: string): number {
  const match = xmlResponse.match(/PollInterval="(\d+)"/i)
  return match ? parseInt(match[1], 10) : 10 // Default 10 seconds
}

/**
 * Extract response endpoint for polling
 */
export function extractResponseEndpoint(xmlResponse: string): string | null {
  const match = xmlResponse.match(/<ResponseEndPoint[^>]*>([^<]+)<\/ResponseEndPoint>/i)
  return match?.[1] || null
}

/**
 * Check if response indicates we should continue polling
 */
export function shouldContinuePolling(xmlResponse: string): boolean {
  const qualifierMatch = xmlResponse.match(/<Qualifier>(\w+)<\/Qualifier>/i)
  const qualifier = qualifierMatch?.[1]?.toLowerCase()

  // Continue polling if we get an acknowledgement
  return qualifier === 'acknowledgement'
}

/**
 * Extract detailed error location from XML path
 */
export function parseErrorLocation(location: string): {
  schedule?: string
  field?: string
  index?: number
} {
  const result: { schedule?: string; field?: string; index?: number } = {}

  // Parse paths like "SA102[1]/PayFromEmployment"
  const scheduleMatch = location.match(/^(SA\d+[A-Z]?)(?:\[(\d+)\])?/)
  if (scheduleMatch) {
    result.schedule = scheduleMatch[1]
    if (scheduleMatch[2]) {
      result.index = parseInt(scheduleMatch[2], 10)
    }
  }

  // Get the field name (last part after /)
  const fieldMatch = location.match(/\/([^\/]+)$/)
  if (fieldMatch) {
    result.field = fieldMatch[1]
  }

  return result
}

/**
 * Format errors for display to user
 */
export function formatErrorsForDisplay(errors: HMRCErrorInfo[]): Array<{
  title: string
  description: string
  action?: string
  field?: string
}> {
  return errors.map((error) => ({
    title: `Error ${error.code}`,
    description: error.userMessage,
    action: error.suggestedAction,
    field: error.affectedField,
  }))
}
