/**
 * Request Utilities
 *
 * Helper functions for working with HTTP requests.
 */

import { NextRequest } from 'next/server'

/**
 * Extract the client IP address from a request
 *
 * Checks headers in order of preference:
 * 1. X-Forwarded-For (from proxies/load balancers)
 * 2. X-Real-IP (from Nginx)
 * 3. CF-Connecting-IP (from Cloudflare)
 * 4. Request.ip (Next.js built-in)
 */
export function getClientIp(req: NextRequest): string | null {
  // X-Forwarded-For can contain multiple IPs - take the first one
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map((ip) => ip.trim())
    if (ips[0]) return ips[0]
  }

  // X-Real-IP (single IP)
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp

  // Cloudflare's connecting IP
  const cfIp = req.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // True-Client-IP (Akamai and others)
  const trueClientIp = req.headers.get('true-client-ip')
  if (trueClientIp) return trueClientIp

  return null
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent')
}

/**
 * Check if request is from a known crawler/bot
 */
export function isBot(req: NextRequest): boolean {
  const ua = getUserAgent(req)?.toLowerCase() || ''

  const botPatterns = [
    'bot',
    'crawler',
    'spider',
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebot',
    'ia_archiver',
  ]

  return botPatterns.some((pattern) => ua.includes(pattern))
}

/**
 * Get the origin from the request
 */
export function getOrigin(req: NextRequest): string | null {
  return req.headers.get('origin')
}

/**
 * Check if the request origin is allowed
 */
export function isAllowedOrigin(req: NextRequest, allowedOrigins: string[]): boolean {
  const origin = getOrigin(req)

  // No origin header (same-origin request or non-browser)
  if (!origin) return true

  return allowedOrigins.some((allowed) => {
    // Exact match
    if (origin === allowed) return true

    // Wildcard subdomain match (e.g., *.taxfolio.io)
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2)
      return origin.endsWith(domain) || origin === `https://${domain}`
    }

    return false
  })
}

/**
 * Create a unique identifier for the request
 * Used for logging and tracking
 */
export function getRequestId(req: NextRequest): string {
  // Check for existing request ID header
  const existingId = req.headers.get('x-request-id')
  if (existingId) return existingId

  // Generate a new one
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
