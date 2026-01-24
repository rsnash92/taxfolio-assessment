/**
 * Health Check Endpoint
 *
 * Provides system health status for monitoring and deployment verification.
 * Returns status of environment configuration and can be extended for
 * database, external service, and HMRC connectivity checks.
 */

import { NextResponse } from 'next/server'

/**
 * Individual health check result
 */
interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  responseTimeMs?: number
}

/**
 * Overall health status response
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: HealthCheck[]
}

/**
 * Required environment variables for the application to function
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = [
  'HMRC_TRANSACTION_ENGINE_URL',
  'HMRC_CLIENT_ID',
  'HMRC_CLIENT_SECRET',
  'TURNSTILE_SECRET_KEY',
  'LOOPS_API_KEY',
] as const

/**
 * Check if required environment variables are configured
 */
function checkEnvironment(): HealthCheck {
  const missing: string[] = []
  const misconfigured: string[] = []

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName]
    if (!value) {
      missing.push(varName)
    } else if (value === 'undefined' || value === 'null' || value === '') {
      misconfigured.push(varName)
    }
  }

  if (missing.length > 0) {
    return {
      name: 'environment',
      status: 'unhealthy',
      message: `Missing required variables: ${missing.join(', ')}`,
    }
  }

  if (misconfigured.length > 0) {
    return {
      name: 'environment',
      status: 'degraded',
      message: `Misconfigured variables: ${misconfigured.join(', ')}`,
    }
  }

  // Check optional vars for warnings
  const missingOptional = OPTIONAL_ENV_VARS.filter((v) => !process.env[v])
  if (missingOptional.length > 0) {
    return {
      name: 'environment',
      status: 'healthy',
      message: `Optional vars not configured: ${missingOptional.join(', ')}`,
    }
  }

  return {
    name: 'environment',
    status: 'healthy',
  }
}

/**
 * Check HMRC Transaction Engine connectivity (optional, can be enabled)
 * This is a placeholder for future implementation
 */
async function checkHMRCConnectivity(): Promise<HealthCheck> {
  const hmrcUrl = process.env.HMRC_TRANSACTION_ENGINE_URL

  if (!hmrcUrl) {
    return {
      name: 'hmrc',
      status: 'degraded',
      message: 'HMRC URL not configured',
    }
  }

  // For now, just check that the URL is configured
  // In production, you might want to make a lightweight health check request
  return {
    name: 'hmrc',
    status: 'healthy',
    message: 'HMRC endpoint configured',
  }
}

/**
 * Determine overall status from individual checks
 */
function determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
  const hasUnhealthy = checks.some((c) => c.status === 'unhealthy')
  const hasDegraded = checks.some((c) => c.status === 'degraded')

  if (hasUnhealthy) return 'unhealthy'
  if (hasDegraded) return 'degraded'
  return 'healthy'
}

/**
 * GET /api/health
 *
 * Returns the health status of the application.
 * HTTP Status Codes:
 * - 200: Healthy or Degraded
 * - 503: Unhealthy
 */
export async function GET() {
  const checks: HealthCheck[] = []

  // Run health checks
  checks.push(checkEnvironment())

  // Optional: Add HMRC connectivity check
  // Uncomment when you want to include HMRC health checks
  // checks.push(await checkHMRCConnectivity())

  const overallStatus = determineOverallStatus(checks)

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  }

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(healthStatus, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
