/**
 * Request Validation Middleware
 *
 * Provides type-safe request validation for API routes using Zod schemas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

/**
 * Validation error response format
 */
interface ValidationErrorResponse {
  error: 'Validation failed'
  details: Array<{
    field: string
    message: string
  }>
}

/**
 * Create a validated request handler
 *
 * @param schema - Zod schema to validate the request body against
 * @param handler - Handler function that receives the validated data
 * @returns Next.js route handler
 *
 * @example
 * ```typescript
 * export const POST = validateRequest(mySchema, async (req, data) => {
 *   // data is typed and validated
 *   return NextResponse.json({ success: true })
 * })
 * ```
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  handler: (req: NextRequest, data: T, params?: Record<string, string>) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // Parse request body
      let body: unknown
      try {
        body = await req.json()
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }

      // Validate against schema
      const validated = schema.parse(body)

      // Resolve params if present
      const params = context?.params ? await context.params : undefined

      // Call handler with validated data
      return handler(req, validated, params)
    } catch (error) {
      if (error instanceof ZodError) {
        const response: ValidationErrorResponse = {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        }

        return NextResponse.json(response, { status: 400 })
      }

      // Re-throw unexpected errors
      throw error
    }
  }
}

/**
 * Validate request body without wrapping the handler
 * Useful when you need more control over the response
 *
 * @returns The validated data or null with error response
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      const response: ValidationErrorResponse = {
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }

      return {
        data: null,
        error: NextResponse.json(response, { status: 400 }),
      }
    }

    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}
