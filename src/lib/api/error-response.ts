/**
 * Standard API Error Response Format
 *
 * Provides consistent error response structure across all API endpoints.
 */

import { NextResponse } from 'next/server'

/**
 * Individual error detail
 */
export interface APIError {
  code: string
  message: string
  userMessage: string
  field?: string
  suggestedAction?: string
}

/**
 * Error response structure
 */
export interface APIErrorResponse {
  success: false
  error: {
    type: 'validation' | 'submission' | 'authentication' | 'rate_limit' | 'server'
    message: string
    errors: APIError[]
    correlationId?: string
    retryable: boolean
    retryAfter?: number // seconds
  }
  timestamp: string
  requestId?: string
}

/**
 * Success response structure
 */
export interface APISuccessResponse<T> {
  success: true
  data: T
  timestamp: string
  requestId?: string
  warnings?: Array<{ code: string; message: string }>
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  options: {
    requestId?: string
    warnings?: Array<{ code: string; message: string }>
    headers?: Record<string, string>
  } = {}
): NextResponse<APISuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
      warnings: options.warnings,
    },
    { headers: options.headers }
  )
}

/**
 * Create a validation error response (400)
 */
export function validationErrorResponse(
  errors: APIError[],
  requestId?: string
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'validation',
        message: 'Validation failed',
        errors,
        retryable: true,
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 400 }
  )
}

/**
 * Create a submission error response (422)
 */
export function submissionErrorResponse(
  errors: APIError[],
  options: {
    correlationId?: string
    retryable?: boolean
    requestId?: string
  } = {}
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'submission',
        message: 'Submission failed',
        errors,
        correlationId: options.correlationId,
        retryable: options.retryable ?? false,
      },
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
    },
    { status: 422 }
  )
}

/**
 * Create an authentication error response (401)
 */
export function authenticationErrorResponse(
  message: string = 'Authentication required',
  requestId?: string
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'authentication',
        message,
        errors: [
          {
            code: 'AUTH_REQUIRED',
            message,
            userMessage: 'Please log in to continue.',
            suggestedAction: 'Sign in with your account credentials.',
          },
        ],
        retryable: false,
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 401 }
  )
}

/**
 * Create a rate limit error response (429)
 */
export function rateLimitErrorResponse(
  retryAfter: number,
  requestId?: string
): NextResponse<APIErrorResponse> {
  const minutes = Math.ceil(retryAfter / 60)

  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'rate_limit',
        message: 'Rate limit exceeded',
        errors: [
          {
            code: 'RATE_LIMIT',
            message: 'Too many requests',
            userMessage: "You've made too many requests. Please wait before trying again.",
            suggestedAction: `Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`,
          },
        ],
        retryable: true,
        retryAfter,
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}

/**
 * Create a server error response (500)
 */
export function serverErrorResponse(
  message: string = 'An unexpected error occurred',
  requestId?: string
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'server',
        message,
        errors: [
          {
            code: 'SERVER_ERROR',
            message,
            userMessage: 'Something went wrong on our end. Please try again later.',
            suggestedAction: 'If this persists, please contact support.',
          },
        ],
        retryable: true,
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 500 }
  )
}

/**
 * Create an HMRC unavailable response (503)
 */
export function hmrcUnavailableResponse(requestId?: string): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'server',
        message: 'HMRC service unavailable',
        errors: [
          {
            code: 'HMRC_UNAVAILABLE',
            message: 'HMRC service is temporarily unavailable',
            userMessage:
              "HMRC's service is currently unavailable. Your data has been saved and you can try again later.",
            suggestedAction:
              'Please try again in 30 minutes. HMRC services are typically available 24/7 but may have scheduled maintenance.',
          },
        ],
        retryable: true,
        retryAfter: 1800, // 30 minutes
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      status: 503,
      headers: {
        'Retry-After': '1800',
      },
    }
  )
}

/**
 * Create a not found response (404)
 */
export function notFoundResponse(
  resource: string = 'Resource',
  requestId?: string
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'validation',
        message: `${resource} not found`,
        errors: [
          {
            code: 'NOT_FOUND',
            message: `${resource} not found`,
            userMessage: `The requested ${resource.toLowerCase()} could not be found.`,
          },
        ],
        retryable: false,
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 404 }
  )
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(
  message: string = 'Access denied',
  requestId?: string
): NextResponse<APIErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        type: 'authentication',
        message,
        errors: [
          {
            code: 'FORBIDDEN',
            message,
            userMessage: "You don't have permission to perform this action.",
          },
        ],
        retryable: false,
      },
      timestamp: new Date().toISOString(),
      requestId,
    },
    { status: 403 }
  )
}
