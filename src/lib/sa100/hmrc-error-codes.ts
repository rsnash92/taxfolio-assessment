/**
 * HMRC Error Code Reference
 *
 * Maps HMRC GovTalk error codes to user-friendly messages and suggested actions.
 * Based on actual errors encountered during testing and HMRC documentation.
 */

export interface HMRCErrorInfo {
  code: string
  category: 'schema' | 'business' | 'authentication' | 'system' | 'duplicate'
  severity: 'fatal' | 'recoverable' | 'warning'
  technicalMessage: string
  userMessage: string
  suggestedAction?: string
  affectedField?: string
  /** Alias for technicalMessage - for backward compatibility */
  message?: string
  /** Alias for affectedField - for backward compatibility */
  location?: string
}

/**
 * Common HMRC error codes from testing and documentation
 */
export const HMRC_ERROR_CODES: Record<string, Omit<HMRCErrorInfo, 'code'>> = {
  // ==========================================================================
  // Schema/Validation Errors (1xxx, 4xxx, 6xxx)
  // ==========================================================================
  '1001': {
    category: 'schema',
    severity: 'fatal',
    technicalMessage: 'Schema validation failed',
    userMessage: 'There was an issue with your tax return format. Please try again or contact support.',
    suggestedAction: 'Check all required fields are completed correctly.',
  },
  '1046': {
    category: 'schema',
    severity: 'fatal',
    technicalMessage: 'IRmark validation failed',
    userMessage: 'The submission could not be verified. Please try again.',
    suggestedAction: 'This is usually a temporary issue. Try submitting again.',
  },
  '4065': {
    category: 'schema',
    severity: 'fatal',
    technicalMessage: 'XML element order incorrect',
    userMessage: 'There was a technical issue with your submission. Please contact support.',
    suggestedAction: 'Report this error to support with your reference number.',
  },
  '6020': {
    category: 'schema',
    severity: 'fatal',
    technicalMessage: 'Required element missing',
    userMessage: 'Some required information is missing from your return.',
    suggestedAction: 'Review your return and ensure all mandatory fields are completed.',
  },
  '6433': {
    category: 'business',
    severity: 'fatal',
    technicalMessage: 'Business start date invalid',
    userMessage: 'The business start date must be within the tax year.',
    suggestedAction: 'Check your self-employment start date is between 6 April 2024 and 5 April 2025.',
    affectedField: 'selfEmployment.startDate',
  },
  '6492': {
    category: 'business',
    severity: 'fatal',
    technicalMessage: 'Capital Gains Tax calculation error',
    userMessage: 'There is an issue with your capital gains calculation.',
    suggestedAction: 'Review your capital gains figures and ensure gains, losses, and reliefs are correct.',
    affectedField: 'capitalGains',
  },
  '8344': {
    category: 'business',
    severity: 'fatal',
    technicalMessage: 'Class 2 NIC amount required when voluntary flag set',
    userMessage: "You indicated voluntary Class 2 National Insurance but didn't provide the amount.",
    suggestedAction: 'Either enter the Class 2 NIC amount or remove the voluntary payment option.',
    affectedField: 'class2NIC',
  },

  // ==========================================================================
  // Authentication Errors (2xxx)
  // ==========================================================================
  '2001': {
    category: 'authentication',
    severity: 'fatal',
    technicalMessage: 'Authentication failed',
    userMessage: "We couldn't authenticate with HMRC. Please check your credentials and try again.",
    suggestedAction: 'Verify your Government Gateway User ID and password are correct.',
  },
  '2002': {
    category: 'authentication',
    severity: 'fatal',
    technicalMessage: 'Invalid credentials',
    userMessage: 'Your Government Gateway credentials were not accepted.',
    suggestedAction: 'Check your User ID and password. If you\'ve forgotten them, visit the Government Gateway.',
  },
  '2003': {
    category: 'authentication',
    severity: 'fatal',
    technicalMessage: 'Account locked',
    userMessage: 'Your Government Gateway account has been locked.',
    suggestedAction: 'Contact HMRC to unlock your Government Gateway account.',
  },

  // ==========================================================================
  // Business Rule Errors (3xxx)
  // ==========================================================================
  '3001': {
    category: 'business',
    severity: 'fatal',
    technicalMessage: 'Business rule validation failed',
    userMessage: 'HMRC found an issue with your tax calculations.',
    suggestedAction: 'Review your figures. If you believe they are correct, contact support.',
  },
  '3002': {
    category: 'business',
    severity: 'fatal',
    technicalMessage: 'UTR/NINO mismatch',
    userMessage: 'Your UTR and National Insurance number do not match HMRC records.',
    suggestedAction: 'Check your UTR and National Insurance number are entered correctly.',
    affectedField: 'personalDetails',
  },
  '3003': {
    category: 'business',
    severity: 'fatal',
    technicalMessage: 'Tax year mismatch',
    userMessage: 'The tax year in your return does not match expected values.',
    suggestedAction: 'Ensure you are submitting for the correct tax year (2024-25).',
  },

  // ==========================================================================
  // Duplicate Submission (5xxx)
  // ==========================================================================
  '5001': {
    category: 'duplicate',
    severity: 'warning',
    technicalMessage: 'Duplicate submission detected',
    userMessage: 'This return appears to have already been submitted.',
    suggestedAction: 'Check your previous submissions. If you need to amend, use the amendment process.',
  },
  '5002': {
    category: 'duplicate',
    severity: 'warning',
    technicalMessage: 'Return already filed for this tax year',
    userMessage: 'A return has already been filed for this tax year.',
    suggestedAction: 'If you need to make changes, you must submit an amended return.',
  },

  // ==========================================================================
  // System Errors (9xxx)
  // ==========================================================================
  '9001': {
    category: 'system',
    severity: 'recoverable',
    technicalMessage: 'HMRC service temporarily unavailable',
    userMessage: "HMRC's service is currently busy. Please try again shortly.",
    suggestedAction: 'Wait a few minutes and try again.',
  },
  '9002': {
    category: 'system',
    severity: 'recoverable',
    technicalMessage: 'Service maintenance in progress',
    userMessage: 'HMRC is performing scheduled maintenance.',
    suggestedAction: 'Please try again later. Maintenance usually lasts 2-4 hours.',
  },
  '9999': {
    category: 'system',
    severity: 'recoverable',
    technicalMessage: 'Unknown system error',
    userMessage: 'An unexpected error occurred. Please try again.',
    suggestedAction: 'If this persists, contact support with your reference number.',
  },
}

/**
 * Get error info with fallback for unknown codes
 */
export function getHMRCErrorInfo(code: string, actualMessage?: string): HMRCErrorInfo {
  const info = HMRC_ERROR_CODES[code]

  if (info) {
    const technicalMessage = actualMessage || info.technicalMessage
    return {
      code,
      ...info,
      // Use actual HMRC message if provided
      technicalMessage,
      // Backward compatibility aliases
      message: technicalMessage,
      location: info.affectedField,
    }
  }

  // Categorise by code range for unknown codes
  const codeNum = parseInt(code, 10)
  let category: HMRCErrorInfo['category'] = 'system'

  if (codeNum >= 1000 && codeNum < 2000) category = 'schema'
  else if (codeNum >= 2000 && codeNum < 3000) category = 'authentication'
  else if (codeNum >= 3000 && codeNum < 5000) category = 'business'
  else if (codeNum >= 5000 && codeNum < 6000) category = 'duplicate'
  else if (codeNum >= 6000 && codeNum < 9000) category = 'schema'

  const technicalMessage = actualMessage || `HMRC error code: ${code}`
  return {
    code,
    category,
    severity: 'fatal',
    technicalMessage,
    userMessage: 'An error occurred while submitting your return. Please contact support.',
    suggestedAction: `Quote error code ${code} when contacting support.`,
    // Backward compatibility aliases
    message: technicalMessage,
    location: undefined,
  }
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(errorInfo: HMRCErrorInfo): boolean {
  return errorInfo.severity === 'recoverable' || errorInfo.category === 'system'
}

/**
 * Get a summary message for multiple errors
 */
export function getErrorSummary(errors: HMRCErrorInfo[]): string {
  if (errors.length === 0) {
    return 'An unknown error occurred.'
  }

  if (errors.length === 1) {
    return errors[0].userMessage
  }

  // Group by category
  const categories = new Set(errors.map((e) => e.category))

  if (categories.size === 1) {
    const category = errors[0].category
    switch (category) {
      case 'schema':
        return 'There are issues with the format of your return. Please review the errors below.'
      case 'business':
        return 'HMRC found issues with your tax calculations. Please review the errors below.'
      case 'authentication':
        return 'There was a problem with your credentials. Please check and try again.'
      default:
        return 'Multiple errors occurred. Please review the details below.'
    }
  }

  return `${errors.length} issues found with your submission. Please review the details below.`
}
