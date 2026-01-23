/**
 * Tax Input Validation Schemas
 *
 * Zod schemas for validating tax submission inputs.
 * These ensure data integrity and prevent injection attacks.
 */

import { z } from 'zod'

// =============================================================================
// Base Field Validators
// =============================================================================

/**
 * UTR validation (10 digits)
 */
export const utrSchema = z
  .string()
  .regex(/^\d{10}$/, 'UTR must be exactly 10 digits')

/**
 * NINO validation (2 letters, 6 digits, 1 letter)
 * Format: AB123456C
 */
export const ninoSchema = z
  .string()
  .regex(/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i, 'Invalid National Insurance number format')
  .transform((val) => val.toUpperCase())

/**
 * Money amount (non-negative, max 2 decimal places, reasonable max)
 */
export const moneySchema = z
  .number()
  .min(0, 'Amount cannot be negative')
  .max(999999999.99, 'Amount exceeds maximum allowed')
  .refine(
    (val) => Math.round(val * 100) === val * 100,
    'Amount can only have 2 decimal places'
  )

/**
 * Optional money amount (defaults to 0)
 */
export const optionalMoneySchema = moneySchema.optional().default(0)

/**
 * Date validation (YYYY-MM-DD format)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((val) => !isNaN(Date.parse(val)), 'Invalid date')

/**
 * UK postcode validation
 */
export const postcodeSchema = z
  .string()
  .regex(
    /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    'Invalid UK postcode format'
  )
  .transform((val) => val.toUpperCase().replace(/\s+/g, ' '))

/**
 * Taxpayer status (tax regime)
 */
export const taxpayerStatusSchema = z.enum(['U', 'S', 'C'], {
  errorMap: () => ({ message: 'Status must be U (England/NI), S (Scotland), or C (Wales)' }),
})

// =============================================================================
// Composite Schemas
// =============================================================================

/**
 * UK address validation
 */
export const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required').max(35, 'Address line 1 too long'),
  line2: z.string().max(35, 'Address line 2 too long').optional(),
  line3: z.string().max(35, 'Address line 3 too long').optional(),
  line4: z.string().max(35, 'Address line 4 too long').optional(),
  postcode: postcodeSchema,
})

/**
 * Personal details validation
 */
export const personalDetailsSchema = z.object({
  title: z.enum(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Rev']).optional(),
  firstName: z.string().min(1, 'First name is required').max(35, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(35, 'Last name too long'),
  dateOfBirth: dateSchema,
  nino: ninoSchema,
})

/**
 * Government Gateway credentials validation
 */
export const gatewayCredentialsSchema = z.object({
  userId: z
    .string()
    .min(6, 'User ID must be at least 6 characters')
    .max(12, 'User ID too long')
    .regex(/^[A-Za-z0-9]+$/, 'User ID must be alphanumeric'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password too long'),
})

// =============================================================================
// Main Tax Submission Schema
// =============================================================================

/**
 * Complete tax submission validation schema
 */
export const taxSubmissionSchema = z.object({
  // Identification
  utr: utrSchema,
  nino: ninoSchema,

  // Personal details
  title: z.enum(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Rev']).optional(),
  firstName: z.string().min(1).max(35),
  lastName: z.string().min(1).max(35),
  dateOfBirth: dateSchema,

  // Address
  address: addressSchema,

  // Tax status
  taxpayerStatus: taxpayerStatusSchema,

  // Employment income
  employmentIncome: optionalMoneySchema,
  employmentTaxDeducted: optionalMoneySchema,

  // Self-employment
  selfEmploymentProfits: optionalMoneySchema,

  // Savings income
  taxedInterest: optionalMoneySchema,
  untaxedInterest: optionalMoneySchema,

  // Dividends
  ukDividends: optionalMoneySchema,
  foreignDividends: optionalMoneySchema,

  // Property income
  propertyIncome: optionalMoneySchema,

  // Pension contributions (Relief at Source - net amount)
  pensionContributionsRAS: optionalMoneySchema,

  // Gift Aid donations (net amount)
  giftAidDonations: optionalMoneySchema,

  // Capital Gains
  capitalGainsNonResidential: optionalMoneySchema,
  capitalGainsResidential: optionalMoneySchema,
  badrQualifyingGains: optionalMoneySchema,
  capitalLossesInYear: optionalMoneySchema,
  capitalLossesBroughtForward: optionalMoneySchema,

  // HICBC
  childBenefitReceived: optionalMoneySchema,

  // Student loans
  hasStudentLoanPlan1: z.boolean().optional().default(false),
  hasStudentLoanPlan2: z.boolean().optional().default(false),
  hasStudentLoanPlan4: z.boolean().optional().default(false),
  hasPostgraduateLoan: z.boolean().optional().default(false),
})

export type TaxSubmissionInput = z.infer<typeof taxSubmissionSchema>

// =============================================================================
// API Request Schemas
// =============================================================================

/**
 * Schema for the HMRC submission request
 */
export const hmrcSubmissionRequestSchema = z.object({
  gatewayUserId: gatewayCredentialsSchema.shape.userId,
  gatewayPassword: gatewayCredentialsSchema.shape.password,
  declarationId: z.string().uuid('Invalid declaration ID'),
})

export type HMRCSubmissionRequest = z.infer<typeof hmrcSubmissionRequestSchema>
