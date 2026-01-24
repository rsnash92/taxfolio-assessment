/**
 * Timeout Utility
 *
 * Wraps promises with a timeout to prevent hanging on slow operations.
 */

/**
 * Error class for timeout errors
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wrap a promise with a timeout
 *
 * @param operation - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 * @returns The result of the operation
 * @throws TimeoutError if the operation takes too long
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API request timed out'
 * )
 * ```
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TimeoutError(`${errorMessage} after ${timeoutMs}ms`, timeoutMs))
    }, timeoutMs)
  })

  try {
    return await Promise.race([operation, timeoutPromise])
  } finally {
    clearTimeout(timeoutHandle!)
  }
}

/**
 * Create a timeout wrapper with preset timeout
 */
export function createTimeoutWrapper(
  defaultTimeoutMs: number,
  defaultMessage?: string
): <T>(operation: Promise<T>, timeoutMs?: number, message?: string) => Promise<T> {
  return <T>(
    operation: Promise<T>,
    timeoutMs: number = defaultTimeoutMs,
    message: string = defaultMessage || 'Operation timed out'
  ) => withTimeout(operation, timeoutMs, message)
}

/**
 * Abort controller-based timeout for fetch requests
 * Returns both the signal and a cleanup function
 */
export function createFetchTimeout(timeoutMs: number): {
  signal: AbortSignal
  cleanup: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  }
}

/**
 * Common timeout values
 */
export const TIMEOUTS = {
  /** Quick operations (health checks, simple queries) */
  quick: 5000,
  /** Standard API calls */
  standard: 30000,
  /** HMRC submission timeout */
  hmrcSubmission: 60000,
  /** HMRC polling timeout (per poll) */
  hmrcPoll: 30000,
  /** Total HMRC polling duration */
  hmrcPollTotal: 120000,
} as const
