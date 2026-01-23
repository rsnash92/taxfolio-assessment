/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup and provides
 * type-safe access to configuration values.
 */

// Required environment variables for different features
const REQUIRED_ENV_VARS = {
  // Core authentication
  auth: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const,

  // HMRC submission (only required when submitting)
  hmrc: ['HMRC_VENDOR_ID', 'HMRC_SENDER_ID', 'HMRC_SENDER_PASSWORD'] as const,
} as const

/**
 * Validate that required environment variables are set
 * Call this at application startup
 */
export function validateEnvironment(features: (keyof typeof REQUIRED_ENV_VARS)[] = ['auth']): void {
  const missing: string[] = []

  for (const feature of features) {
    const vars = REQUIRED_ENV_VARS[feature]
    for (const envVar of vars) {
      if (!process.env[envVar]) {
        missing.push(envVar)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your .env.local file.`
    )
  }
}

/**
 * Get HMRC credentials from environment variables
 * Throws if credentials are not configured
 */
export function getHMRCCredentials(): {
  vendorId: string
  senderId: string
  password: string
  endpoint: string
  isProduction: boolean
} {
  const vendorId = process.env.HMRC_VENDOR_ID
  const senderId = process.env.HMRC_SENDER_ID
  const password = process.env.HMRC_SENDER_PASSWORD
  const endpoint =
    process.env.HMRC_TRANSACTION_ENGINE_URL ||
    'https://test-transaction-engine.tax.service.gov.uk'

  if (!vendorId || !senderId || !password) {
    throw new Error(
      'HMRC credentials not configured. ' +
        'Please set HMRC_VENDOR_ID, HMRC_SENDER_ID, and HMRC_SENDER_PASSWORD in .env.local'
    )
  }

  const isProduction = endpoint.includes('transaction-engine.tax.service.gov.uk') &&
    !endpoint.includes('test-')

  return {
    vendorId,
    senderId,
    password,
    endpoint,
    isProduction,
  }
}

/**
 * Check if HMRC credentials are configured (without throwing)
 */
export function hasHMRCCredentials(): boolean {
  return !!(
    process.env.HMRC_VENDOR_ID &&
    process.env.HMRC_SENDER_ID &&
    process.env.HMRC_SENDER_PASSWORD
  )
}

/**
 * Get the current environment
 */
export function getEnvironment(): 'development' | 'production' | 'test' {
  const env = process.env.NODE_ENV
  if (env === 'production') return 'production'
  if (env === 'test') return 'test'
  return 'development'
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}
