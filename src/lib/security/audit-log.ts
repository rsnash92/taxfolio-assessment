/**
 * Security Audit Logging
 *
 * Provides structured audit logging for security-relevant events.
 * In production, this should be integrated with a logging service
 * like CloudWatch, Datadog, or similar.
 */

/**
 * Types of auditable events
 */
export type AuditEventType =
  // Authentication events
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_PASSWORD_RESET_REQUESTED'
  | 'AUTH_PASSWORD_RESET_COMPLETED'

  // HMRC submission events
  | 'SUBMISSION_STARTED'
  | 'SUBMISSION_SUCCESS'
  | 'SUBMISSION_FAILED'
  | 'SUBMISSION_VALIDATION_FAILED'

  // Rate limiting events
  | 'RATE_LIMIT_EXCEEDED'

  // Security events
  | 'VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'SUSPICIOUS_ACTIVITY'
  | 'ACCESS_DENIED'

  // Data access events
  | 'DATA_ACCESSED'
  | 'DATA_MODIFIED'
  | 'DATA_DELETED'

/**
 * Severity levels for audit events
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  /** ISO timestamp */
  timestamp: string
  /** Event type */
  eventType: AuditEventType
  /** Severity level */
  severity: AuditSeverity
  /** User ID if authenticated */
  userId?: string
  /** Client IP address */
  clientIp: string
  /** User agent */
  userAgent?: string
  /** Request ID for tracing */
  requestId?: string
  /** Additional event details (sanitized) */
  details: Record<string, unknown>
}

/**
 * Fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'secret',
  'token',
  'key',
  'nino',
  'utr',
  'nationalInsuranceNumber',
  'bankAccount',
  'sortCode',
  'accountNumber',
  'cardNumber',
  'cvv',
  'pin',
])

/**
 * Sanitize details object to remove sensitive information
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(details)) {
    const keyLower = key.toLowerCase()

    // Check if the key contains sensitive field names
    const isSensitive = SENSITIVE_FIELDS.has(keyLower) ||
      Array.from(SENSITIVE_FIELDS).some((field) => keyLower.includes(field))

    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Determine severity based on event type
 */
function getSeverityForEvent(eventType: AuditEventType): AuditSeverity {
  switch (eventType) {
    case 'AUTH_LOGIN_SUCCESS':
    case 'AUTH_LOGOUT':
    case 'SUBMISSION_SUCCESS':
    case 'DATA_ACCESSED':
      return 'info'

    case 'AUTH_LOGIN_FAILED':
    case 'AUTH_SESSION_EXPIRED':
    case 'AUTH_PASSWORD_RESET_REQUESTED':
    case 'VALIDATION_FAILED':
    case 'RATE_LIMIT_EXCEEDED':
    case 'SUBMISSION_VALIDATION_FAILED':
      return 'warning'

    case 'SUBMISSION_FAILED':
    case 'INVALID_CREDENTIALS':
    case 'ACCESS_DENIED':
    case 'DATA_MODIFIED':
    case 'DATA_DELETED':
      return 'error'

    case 'SUSPICIOUS_ACTIVITY':
    case 'AUTH_PASSWORD_RESET_COMPLETED':
    case 'SUBMISSION_STARTED':
      return 'info'

    default:
      return 'info'
  }
}

/**
 * Log a security audit event
 */
export function logAuditEvent(
  eventType: AuditEventType,
  options: {
    clientIp: string
    details?: Record<string, unknown>
    userId?: string
    userAgent?: string
    requestId?: string
    severity?: AuditSeverity
  }
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    severity: options.severity || getSeverityForEvent(eventType),
    userId: options.userId,
    clientIp: options.clientIp,
    userAgent: options.userAgent,
    requestId: options.requestId,
    details: sanitizeDetails(options.details || {}),
  }

  // Format log output
  const logMessage = JSON.stringify(entry)

  // In production, send to logging service
  // For now, we use console with appropriate levels
  if (process.env.NODE_ENV === 'production') {
    switch (entry.severity) {
      case 'critical':
      case 'error':
        console.error('[AUDIT]', logMessage)
        break
      case 'warning':
        console.warn('[AUDIT]', logMessage)
        break
      default:
        console.log('[AUDIT]', logMessage)
    }
  } else {
    // In development, use more readable format
    console.log('[AUDIT]', {
      ...entry,
      timestamp: entry.timestamp.split('T')[1], // Just time for brevity
    })
  }
}

/**
 * Helper to create an audit logger bound to a request
 */
export function createRequestLogger(
  clientIp: string,
  options: {
    userId?: string
    userAgent?: string
    requestId?: string
  } = {}
) {
  return {
    log: (eventType: AuditEventType, details: Record<string, unknown> = {}) => {
      logAuditEvent(eventType, {
        clientIp,
        details,
        ...options,
      })
    },
    info: (eventType: AuditEventType, details: Record<string, unknown> = {}) => {
      logAuditEvent(eventType, {
        clientIp,
        details,
        severity: 'info',
        ...options,
      })
    },
    warn: (eventType: AuditEventType, details: Record<string, unknown> = {}) => {
      logAuditEvent(eventType, {
        clientIp,
        details,
        severity: 'warning',
        ...options,
      })
    },
    error: (eventType: AuditEventType, details: Record<string, unknown> = {}) => {
      logAuditEvent(eventType, {
        clientIp,
        details,
        severity: 'error',
        ...options,
      })
    },
  }
}
