/**
 * Input Sanitization Utilities
 *
 * Functions to sanitize user input to prevent injection attacks
 * and ensure data integrity.
 */

/**
 * Sanitize a string for safe XML embedding
 * Escapes special XML characters to prevent injection
 */
export function sanitizeForXml(input: string): string {
  if (typeof input !== 'string') return ''

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .trim()
}

/**
 * Sanitize a field for HMRC submission
 * Removes characters not allowed in HMRC fields
 *
 * Allowed characters:
 * - Alphanumeric (A-Z, a-z, 0-9)
 * - Spaces
 * - Hyphens
 * - Apostrophes
 * - Commas
 * - Periods
 * - Forward slashes (for addresses)
 */
export function sanitizeHmrcField(input: string, maxLength: number = 35): string {
  if (typeof input !== 'string') return ''

  return input
    .replace(/[^\w\s\-',.\/]/g, '') // Keep only allowed chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, maxLength)
}

/**
 * Sanitize a numeric input
 * Converts to number and validates it's finite and not NaN
 */
export function sanitizeNumber(input: unknown): number {
  const num = Number(input)

  if (isNaN(num) || !isFinite(num)) {
    return 0
  }

  // Round to 2 decimal places (pence precision)
  return Math.round(num * 100) / 100
}

/**
 * Sanitize a UTR (Unique Taxpayer Reference)
 * Extracts only digits and validates length
 */
export function sanitizeUTR(input: string): string | null {
  if (typeof input !== 'string') return null

  const digits = input.replace(/\D/g, '')

  if (digits.length !== 10) {
    return null
  }

  return digits
}

/**
 * Sanitize a NINO (National Insurance Number)
 * Validates format and normalizes to uppercase without spaces
 */
export function sanitizeNINO(input: string): string | null {
  if (typeof input !== 'string') return null

  const normalized = input.toUpperCase().replace(/\s/g, '')

  // NINO format: 2 letters, 6 digits, 1 letter
  // First letter cannot be D, F, I, Q, U, or V
  // Second letter cannot be D, F, I, O, Q, U, or V
  const ninoRegex = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/

  if (!ninoRegex.test(normalized)) {
    return null
  }

  return normalized
}

/**
 * Sanitize a UK postcode
 * Normalizes format and validates
 */
export function sanitizePostcode(input: string): string | null {
  if (typeof input !== 'string') return null

  // Remove all spaces and convert to uppercase
  let normalized = input.toUpperCase().replace(/\s/g, '')

  // UK postcode regex
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/

  if (!postcodeRegex.test(normalized)) {
    return null
  }

  // Format with space before last 3 characters
  const outcode = normalized.slice(0, -3)
  const incode = normalized.slice(-3)

  return `${outcode} ${incode}`
}

/**
 * Sanitize a date string to YYYY-MM-DD format
 */
export function sanitizeDate(input: string): string | null {
  if (typeof input !== 'string') return null

  // Try to parse the date
  const date = new Date(input)

  if (isNaN(date.getTime())) {
    return null
  }

  // Format as YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Strip potentially dangerous content from a string
 * Removes script tags, event handlers, and other XSS vectors
 */
export function stripDangerousContent(input: string): string {
  if (typeof input !== 'string') return ''

  return input
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs that could contain scripts
    .replace(/data:text\/html/gi, '')
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(input: string, maxLength: number): string {
  if (typeof input !== 'string') return ''

  if (input.length <= maxLength) {
    return input
  }

  return input.slice(0, maxLength - 3) + '...'
}
