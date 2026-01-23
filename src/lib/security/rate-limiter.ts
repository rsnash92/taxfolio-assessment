/**
 * Rate Limiter
 *
 * Simple in-memory rate limiter for API endpoints.
 * Uses a sliding window algorithm for accurate rate limiting.
 *
 * For production with multiple instances, consider using Redis-backed
 * rate limiting with @upstash/ratelimit.
 */

interface RateLimitEntry {
  /** Request timestamps within the window */
  timestamps: number[]
}

// In-memory store for rate limit entries
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every minute
const CLEANUP_INTERVAL = 60_000
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries with no recent activity (older than 1 hour)
      if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 3600_000) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)

  // Don't prevent Node from exiting
  cleanupTimer.unref()
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request should be allowed */
  success: boolean
  /** Number of requests remaining in the window */
  remaining: number
  /** When the rate limit resets (Unix timestamp) */
  resetTime: number
  /** Total requests allowed */
  limit: number
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMITS = {
  /** General API endpoints - 60 requests per minute */
  general: { maxRequests: 60, windowMs: 60_000 },

  /** Authentication endpoints - 10 requests per minute */
  auth: { maxRequests: 10, windowMs: 60_000 },

  /** HMRC submission - 5 requests per hour */
  submission: { maxRequests: 5, windowMs: 3600_000 },

  /** Strict limit for sensitive operations - 3 requests per 5 minutes */
  strict: { maxRequests: 3, windowMs: 300_000 },
} as const

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.general
): RateLimitResult {
  startCleanup()

  const now = Date.now()
  const windowStart = now - config.windowMs

  // Get or create entry
  let entry = rateLimitStore.get(identifier)
  if (!entry) {
    entry = { timestamps: [] }
    rateLimitStore.set(identifier, entry)
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart)

  // Check if limit exceeded
  if (entry.timestamps.length >= config.maxRequests) {
    // Find when the oldest request in the window will expire
    const oldestTimestamp = entry.timestamps[0]
    const resetTime = oldestTimestamp + config.windowMs

    return {
      success: false,
      remaining: 0,
      resetTime,
      limit: config.maxRequests,
    }
  }

  // Add current request timestamp
  entry.timestamps.push(now)

  return {
    success: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetTime: now + config.windowMs,
    limit: config.maxRequests,
  }
}

/**
 * Create rate limit headers for the response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    ...(result.success ? {} : {
      'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
    }),
  }
}

/**
 * Reset rate limit for an identifier (for testing)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear()
}
