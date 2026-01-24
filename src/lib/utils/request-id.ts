/**
 * Request ID Generator
 *
 * Generates unique identifiers for request tracking and correlation.
 */

/**
 * Generate a unique request ID
 *
 * Format: req_<16 hex characters>
 * Example: req_a1b2c3d4e5f67890
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(16)
  const random = Math.random().toString(16).slice(2, 10)
  return `req_${timestamp}${random}`.slice(0, 20)
}

/**
 * Generate a correlation ID for HMRC submissions
 *
 * Format: <32 uppercase hex characters>
 * Example: A1B2C3D4E5F67890A1B2C3D4E5F67890
 */
export function generateCorrelationId(): string {
  const hex = '0123456789ABCDEF'
  let id = ''
  for (let i = 0; i < 32; i++) {
    id += hex[Math.floor(Math.random() * 16)]
  }
  return id
}

/**
 * Validate a correlation ID format
 */
export function isValidCorrelationId(id: string): boolean {
  return /^[0-9A-F]{32}$/.test(id)
}

/**
 * Generate a submission reference for user display
 *
 * Format: TF-<YYYYMMDD>-<6 alphanumeric>
 * Example: TF-20250123-A1B2C3
 */
export function generateSubmissionReference(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let random = ''
  for (let i = 0; i < 6; i++) {
    random += chars[Math.floor(Math.random() * chars.length)]
  }
  return `TF-${dateStr}-${random}`
}
