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
 *   import { buildSubmissionXML, submitReturn } from '@/lib/sa100'
 *
 *   // 1. Build XML from wizard data
 *   const { xml, irMark, validationErrors } = buildSubmissionXML({
 *     credentials: { userId: '...', password: '...' },
 *     taxpayer: { utr: '...', nino: '...' },
 *     returnData: wizardDataToSA100(wizardData),
 *   })
 *
 *   // 2. Submit to HMRC
 *   const response = await submitReturn({
 *     credentials,
 *     taxpayer,
 *     xmlContent: xml,
 *   })
 *
 *   // 3. Poll for result
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

// Wizard data conversion (to be implemented)
// export { wizardDataToSA100 } from './wizard-converter'
