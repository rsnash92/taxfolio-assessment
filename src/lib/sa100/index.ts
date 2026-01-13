/**
 * SA100 XML API Module
 *
 * Provides functionality for submitting Self Assessment tax returns
 * to HMRC via the Transaction Engine XML API.
 *
 * This is different from MTD ITSA:
 * - SA100 = Traditional annual tax return submission (this module)
 * - MTD ITSA = Quarterly digital submissions (starting April 2026)
 *
 * Usage:
 *   import {
 *     convertWizardToSA100,
 *     validateForSubmission,
 *     buildSubmissionXML,
 *     submitReturn,
 *     pollUntilComplete
 *   } from '@/lib/sa100'
 *
 *   // 1. Convert wizard data to SA100 format
 *   const taxpayer = { utr: '1234567890', nino: 'AB123456C' }
 *   const sa100Return = convertWizardToSA100(wizardData, taxpayer)
 *
 *   // 2. Validate before submission
 *   const validation = validateForSubmission(sa100Return)
 *   if (!validation.isValid) {
 *     console.error('Validation errors:', validation.errors)
 *     return
 *   }
 *
 *   // 3. Build XML from SA100 data
 *   const credentials = { userId: 'gateway-id', password: 'gateway-pass' }
 *   const { xml, irMark, validationErrors } = buildSubmissionXML({
 *     credentials,
 *     taxpayer,
 *     returnData: sa100Return,
 *   })
 *
 *   // 4. Submit to HMRC Transaction Engine
 *   const response = await submitReturn({
 *     credentials,
 *     taxpayer,
 *     xmlContent: xml,
 *   })
 *
 *   // 5. Poll for result
 *   const result = await pollUntilComplete(response.correlationId)
 */

// Types
export * from './types'

// XML Builder
export { buildSubmissionXML } from './xml-builder'
export type { BuildXMLOptions, BuildXMLResult, ValidationError } from './xml-builder'

// Transaction Engine Client
export {
  submitReturn,
  pollStatus,
  pollUntilComplete,
  getChannelRoutingInfo,
  TransactionEngineError,
} from './transaction-engine'
export type { SubmitOptions } from './transaction-engine'

// Wizard data conversion
export { convertWizardToSA100, validateForSubmission } from './wizard-converter'
export type { ConvertOptions, ValidationResult, ValidationError as WizardValidationError } from './wizard-converter'

// Schema reference (namespaces, validation patterns, etc.)
export {
  NAMESPACES,
  SCHEMA_VERSION,
  MESSAGE_CLASS,
  SUBMISSION_URLS,
  POLL_URLS,
  VALIDATION_PATTERNS,
  getPeriodEndDate,
  getPeriodStartDate,
} from './schema-reference'
export type { TaxpayerStatus, YesType, SenderType } from './schema-reference'

// IRmark calculation
export { calculateIRmark, verifyIRmark, insertIRmark } from './irmark'

// Validation
export {
  validateSA100Data,
  validateXML,
  validateWithLTS,
  isLTSAvailable,
} from './validate'
export type { ValidationResult as SA100ValidationResult } from './validate'
