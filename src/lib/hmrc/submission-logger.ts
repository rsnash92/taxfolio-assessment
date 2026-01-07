// Submission Logger
// Tracks all HMRC API interactions for debugging and audit purposes

import { createClient } from '@supabase/supabase-js';

// Use service role for inserting logs (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SubmissionLogEntry {
  userId: string;
  submissionId: string;
  taxYear: string;
  stepName: string;
  stepNumber: number;
  endpoint?: string;
  requestPayload?: unknown;
  responseStatus?: number;
  responseBody?: unknown;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'skipped';
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

/**
 * Generate a unique submission ID
 */
export function generateSubmissionId(): string {
  return `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Log a submission step
 */
export async function logSubmissionStep(entry: SubmissionLogEntry): Promise<void> {
  try {
    // Sanitize sensitive data from payloads
    const sanitizedRequest = sanitizePayload(entry.requestPayload);
    const sanitizedResponse = sanitizePayload(entry.responseBody);

    await supabaseAdmin.from('submission_logs').insert({
      user_id: entry.userId,
      submission_id: entry.submissionId,
      tax_year: entry.taxYear,
      step_name: entry.stepName,
      step_number: entry.stepNumber,
      endpoint: entry.endpoint,
      request_payload: sanitizedRequest,
      response_status: entry.responseStatus,
      response_body: sanitizedResponse,
      status: entry.status,
      error_message: entry.errorMessage,
      started_at: entry.startedAt?.toISOString(),
      completed_at: entry.completedAt?.toISOString(),
      duration_ms: entry.durationMs,
    });
  } catch (error) {
    // Don't fail the submission if logging fails
    console.error('Failed to log submission step:', error);
  }
}

/**
 * Create a logger instance for a specific submission
 */
export function createSubmissionLogger(userId: string, taxYear: string) {
  const submissionId = generateSubmissionId();
  let stepNumber = 0;

  return {
    submissionId,

    /**
     * Log the start of a step
     */
    async startStep(stepName: string, endpoint?: string, requestPayload?: unknown) {
      stepNumber++;
      await logSubmissionStep({
        userId,
        submissionId,
        taxYear,
        stepName,
        stepNumber,
        endpoint,
        requestPayload,
        status: 'in_progress',
        startedAt: new Date(),
      });
      return { stepNumber, startTime: Date.now() };
    },

    /**
     * Log successful completion of a step
     */
    async completeStep(
      stepName: string,
      stepNum: number,
      startTime: number,
      responseStatus?: number,
      responseBody?: unknown
    ) {
      const completedAt = new Date();
      await logSubmissionStep({
        userId,
        submissionId,
        taxYear,
        stepName,
        stepNumber: stepNum,
        responseStatus,
        responseBody,
        status: 'completed',
        completedAt,
        durationMs: Date.now() - startTime,
      });
    },

    /**
     * Log an error in a step
     */
    async errorStep(
      stepName: string,
      stepNum: number,
      startTime: number,
      error: Error | string,
      responseStatus?: number,
      responseBody?: unknown
    ) {
      const completedAt = new Date();
      await logSubmissionStep({
        userId,
        submissionId,
        taxYear,
        stepName,
        stepNumber: stepNum,
        responseStatus,
        responseBody,
        status: 'error',
        errorMessage: typeof error === 'string' ? error : error.message,
        completedAt,
        durationMs: Date.now() - startTime,
      });
    },

    /**
     * Log a skipped step
     */
    async skipStep(stepName: string, reason: string) {
      stepNumber++;
      await logSubmissionStep({
        userId,
        submissionId,
        taxYear,
        stepName,
        stepNumber,
        status: 'skipped',
        errorMessage: reason,
      });
    },
  };
}

/**
 * Sanitize sensitive data from payloads before logging
 */
function sanitizePayload(payload: unknown): unknown {
  if (!payload) return payload;

  if (typeof payload === 'string') {
    // Mask NINO patterns
    return payload.replace(/[A-Z]{2}\d{6}[A-Z]/gi, '**NINO**');
  }

  if (Array.isArray(payload)) {
    return payload.map(sanitizePayload);
  }

  if (typeof payload === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      // Mask sensitive keys
      if (['nino', 'nationalInsuranceNumber', 'accessToken', 'refreshToken', 'password'].includes(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizePayload(value);
      }
    }
    return sanitized;
  }

  return payload;
}

/**
 * Get submission logs for a user
 */
export async function getSubmissionLogs(
  userId: string,
  options?: {
    submissionId?: string;
    taxYear?: string;
    limit?: number;
  }
) {
  let query = supabaseAdmin
    .from('submission_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.submissionId) {
    query = query.eq('submission_id', options.submissionId);
  }

  if (options?.taxYear) {
    query = query.eq('tax_year', options.taxYear);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch submission logs:', error);
    return [];
  }

  return data;
}

export type SubmissionLogger = ReturnType<typeof createSubmissionLogger>;
