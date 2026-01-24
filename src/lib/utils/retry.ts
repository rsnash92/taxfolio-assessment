/**
 * Retry Utility with Exponential Backoff
 *
 * Provides automatic retry logic for operations that may fail transiently,
 * such as network requests to external services.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number
  /** Initial delay between retries in milliseconds */
  initialDelayMs: number
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: number
  /** Multiplier for exponential backoff */
  backoffMultiplier: number
  /** Error codes/messages that should trigger a retry */
  retryableErrors: string[]
  /** Callback when a retry is about to happen */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'NETWORK_ERROR',
    'TIMEOUT',
    'fetch failed',
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504', // Gateway Timeout
    '429', // Too Many Requests
  ],
  onRetry: undefined,
}

/**
 * Error class for retryable errors
 */
export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly isRetryable: boolean = true
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

/**
 * Check if an error should trigger a retry
 */
function shouldRetry(error: Error, retryableErrors: string[]): boolean {
  // Check if it's explicitly a RetryableError
  if (error instanceof RetryableError) {
    return error.isRetryable
  }

  const errorString = `${error.message} ${(error as NodeJS.ErrnoException).code || ''}`

  return retryableErrors.some(
    (retryable) =>
      errorString.includes(retryable) || (error as NodeJS.ErrnoException).code === retryable
  )
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Add jitter to delay to prevent thundering herd
 */
function addJitter(delayMs: number): number {
  // Add up to 20% random jitter
  const jitter = delayMs * 0.2 * Math.random()
  return Math.floor(delayMs + jitter)
}

/**
 * Execute an operation with automatic retries
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | null = null
  let delay = opts.initialDelayMs

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Check if error is retryable
      const isRetryable = shouldRetry(lastError, opts.retryableErrors)

      // Don't retry if not retryable or last attempt
      if (!isRetryable || attempt === opts.maxAttempts) {
        throw error
      }

      // Calculate delay with jitter
      const actualDelay = addJitter(delay)

      // Notify about retry
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, actualDelay)
      }

      // Wait before retrying
      await sleep(actualDelay)

      // Increase delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError
}

/**
 * Create a retry wrapper with preset options
 */
export function createRetryWrapper(
  defaultOptions: Partial<RetryOptions>
): <T>(operation: () => Promise<T>, options?: Partial<RetryOptions>) => Promise<T> {
  return <T>(operation: () => Promise<T>, options: Partial<RetryOptions> = {}) =>
    withRetry(operation, { ...defaultOptions, ...options })
}

/**
 * Retry configuration for HMRC API calls
 */
export const HMRC_RETRY_OPTIONS: Partial<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'NETWORK_ERROR',
    'TIMEOUT',
    'fetch failed',
    '502',
    '503',
    '504',
    '429',
  ],
}
