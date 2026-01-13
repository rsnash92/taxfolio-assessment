/**
 * SA100 XML Validation
 *
 * Validates SA100 XML submissions against HMRC schemas and business rules.
 *
 * Validation levels:
 * 1. Structure validation - XML is well-formed
 * 2. Schema validation - Matches HMRC XSD schemas (requires LTS)
 * 3. Business rules - HMRC validation rules (cross-field checks)
 * 4. IRmark verification - Hash matches content
 *
 * For full schema validation, use the HMRC Local Test Service (LTS)
 * which provides offline validation against official schemas.
 */

import { VALIDATION_PATTERNS } from './schema-reference'
import { calculateIRmark, verifyIRmark } from './irmark'
import type { SA100Return } from './types'

// Validation error type
export interface ValidationError {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning'
}

// =============================================================================
// Main Validation Functions
// =============================================================================

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  irMarkValid?: boolean
}

/**
 * Validate SA100 return data before XML generation
 */
export function validateSA100Data(data: SA100Return): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Required fields
  validateRequiredFields(data, errors)

  // Format validation
  validateFormats(data, errors)

  // Business rules
  validateBusinessRules(data, errors, warnings)

  // Cross-field validation
  validateCrossFields(data, errors, warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate generated XML (structure and IRmark)
 */
export function validateXML(xml: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  let irMarkValid: boolean | undefined

  // Basic XML structure
  if (!xml.startsWith('<?xml')) {
    errors.push({
      field: 'xml',
      message: 'Missing XML declaration',
      severity: 'error',
    })
  }

  // Check required elements exist
  const requiredElements = [
    'GovTalkMessage',
    'IRenvelope',
    'IRheader',
    'MTR',
    'SA100',
    'YourPersonalDetails',
    'Finishing',
  ]

  for (const element of requiredElements) {
    if (!xml.includes(`<${element}`)) {
      errors.push({
        field: element,
        message: `Missing required element: ${element}`,
        severity: 'error',
      })
    }
  }

  // Verify IRmark
  const irMarkMatch = xml.match(/<IRmark[^>]*>([^<]+)<\/IRmark>/)
  if (irMarkMatch) {
    const declaredIRmark = irMarkMatch[1]
    irMarkValid = verifyIRmark(xml, declaredIRmark)
    if (!irMarkValid) {
      errors.push({
        field: 'IRmark',
        message: 'IRmark hash does not match content',
        severity: 'error',
      })
    }
  } else {
    errors.push({
      field: 'IRmark',
      message: 'Missing IRmark element',
      severity: 'error',
    })
  }

  // Check namespace declarations
  if (!xml.includes('xmlns="http://www.govtalk.gov.uk/CM/envelope"')) {
    errors.push({
      field: 'namespace',
      message: 'Missing GovTalk namespace declaration',
      severity: 'error',
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    irMarkValid,
  }
}

// =============================================================================
// Required Fields Validation
// =============================================================================

function validateRequiredFields(data: SA100Return, errors: ValidationError[]): void {
  // Tax year
  if (!data.taxYear) {
    errors.push({
      field: 'taxYear',
      message: 'Tax year is required',
      severity: 'error',
    })
  }

  // Personal details
  if (!data.yourPersonalDetails) {
    errors.push({
      field: 'yourPersonalDetails',
      message: 'Personal details section is required',
      severity: 'error',
    })
  } else {
    if (!data.yourPersonalDetails.dateOfBirth) {
      errors.push({
        field: 'yourPersonalDetails.dateOfBirth',
        message: 'Date of birth is required',
        severity: 'error',
      })
    }

    if (!data.yourPersonalDetails.nationalInsuranceNumber) {
      errors.push({
        field: 'yourPersonalDetails.nationalInsuranceNumber',
        message: 'National Insurance number is required',
        severity: 'error',
      })
    }

    if (!data.yourPersonalDetails.taxpayerStatus) {
      errors.push({
        field: 'yourPersonalDetails.taxpayerStatus',
        message: 'Taxpayer status is required (C=Welsh, S=Scottish, U=Rest of UK)',
        severity: 'error',
      })
    }
  }

  // Declaration
  if (!data.finishing) {
    errors.push({
      field: 'finishing',
      message: 'Declaration (Finishing) section is required',
      severity: 'error',
    })
  } else {
    if (!data.finishing.returnSigner) {
      errors.push({
        field: 'finishing.returnSigner',
        message: 'Return signer is required',
        severity: 'error',
      })
    }
  }
}

// =============================================================================
// Format Validation
// =============================================================================

function validateFormats(data: SA100Return, errors: ValidationError[]): void {
  // Tax year format (YYYY-YY)
  if (data.taxYear && !VALIDATION_PATTERNS.TAX_YEAR.test(data.taxYear)) {
    errors.push({
      field: 'taxYear',
      message: 'Tax year must be in format YYYY-YY (e.g., 2024-25)',
      severity: 'error',
    })
  }

  // NINO format
  if (data.yourPersonalDetails?.nationalInsuranceNumber) {
    const nino = data.yourPersonalDetails.nationalInsuranceNumber.replace(/\s/g, '').toUpperCase()
    if (!VALIDATION_PATTERNS.NINO.test(nino)) {
      errors.push({
        field: 'yourPersonalDetails.nationalInsuranceNumber',
        message: 'Invalid National Insurance number format. Expected: XX999999X (e.g., AB123456C)',
        severity: 'error',
      })
    }
  }

  // Date of birth format (YYYY-MM-DD)
  if (data.yourPersonalDetails?.dateOfBirth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.yourPersonalDetails.dateOfBirth)) {
      errors.push({
        field: 'yourPersonalDetails.dateOfBirth',
        message: 'Date of birth must be in format YYYY-MM-DD',
        severity: 'error',
      })
    }
  }

  // Taxpayer status (C/S/U)
  if (data.yourPersonalDetails?.taxpayerStatus) {
    if (!['C', 'S', 'U'].includes(data.yourPersonalDetails.taxpayerStatus)) {
      errors.push({
        field: 'yourPersonalDetails.taxpayerStatus',
        message: 'Taxpayer status must be C (Welsh), S (Scottish), or U (Rest of UK)',
        severity: 'error',
      })
    }
  }

  // Postcode format
  if (data.yourPersonalDetails?.newAddress?.postcode) {
    const postcode = data.yourPersonalDetails.newAddress.postcode.toUpperCase()
    if (!VALIDATION_PATTERNS.POSTCODE.test(postcode)) {
      errors.push({
        field: 'yourPersonalDetails.newAddress.postcode',
        message: 'Invalid UK postcode format',
        severity: 'error',
      })
    }
  }
}

// =============================================================================
// Business Rules Validation
// =============================================================================

function validateBusinessRules(
  data: SA100Return,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Check tax year is current or recent
  if (data.taxYear) {
    const [startYear] = data.taxYear.split('-').map(Number)
    const currentYear = new Date().getFullYear()
    if (startYear > currentYear || startYear < currentYear - 4) {
      warnings.push({
        field: 'taxYear',
        message: `Tax year ${data.taxYear} seems unusual. Expected recent tax year.`,
        severity: 'warning',
      })
    }
  }

  // Employment validation
  if (data.sa102) {
    for (let i = 0; i < data.sa102.length; i++) {
      const emp = data.sa102[i]

      // Employer name required
      if (!emp.employerDetails?.employerName) {
        errors.push({
          field: `sa102[${i}].employerDetails.employerName`,
          message: 'Employer name is required for employment',
          severity: 'error',
        })
      }

      // Tax deducted shouldn't exceed pay
      if (emp.ukTaxDeducted > emp.payFromEmployment) {
        warnings.push({
          field: `sa102[${i}].ukTaxDeducted`,
          message: 'Tax deducted exceeds pay from employment',
          severity: 'warning',
        })
      }
    }
  }

  // Self-employment validation
  if (data.sa103S) {
    for (let i = 0; i < data.sa103S.length; i++) {
      const biz = data.sa103S[i]

      // Business name required
      if (!biz.businessDetails?.businessName) {
        errors.push({
          field: `sa103S[${i}].businessDetails.businessName`,
          message: 'Business name is required',
          severity: 'error',
        })
      }

      // Accounting period validation
      if (biz.accountingPeriod) {
        const start = new Date(biz.accountingPeriod.startDate)
        const end = new Date(biz.accountingPeriod.endDate)
        if (end <= start) {
          errors.push({
            field: `sa103S[${i}].accountingPeriod`,
            message: 'Accounting period end date must be after start date',
            severity: 'error',
          })
        }
      }

      // Net profit calculation check
      const turnover = biz.income.turnover + (biz.income.otherBusinessIncome || 0)
      const expenses = biz.totalAllowableExpenses || 0
      const expectedProfit = turnover - expenses
      if (Math.abs(biz.netProfitOrLoss - expectedProfit) > 1) {
        warnings.push({
          field: `sa103S[${i}].netProfitOrLoss`,
          message: 'Net profit/loss does not match income minus expenses',
          severity: 'warning',
        })
      }
    }
  }

  // Schedule count limits
  if (data.sa102 && data.sa102.length > 50) {
    errors.push({
      field: 'sa102',
      message: 'Maximum 50 employments allowed',
      severity: 'error',
    })
  }

  if (data.sa103S && data.sa103S.length > 50) {
    errors.push({
      field: 'sa103S',
      message: 'Maximum 50 short self-employments allowed',
      severity: 'error',
    })
  }

  if (data.sa103F && data.sa103F.length > 50) {
    errors.push({
      field: 'sa103F',
      message: 'Maximum 50 full self-employments allowed',
      severity: 'error',
    })
  }
}

// =============================================================================
// Cross-Field Validation
// =============================================================================

function validateCrossFields(
  data: SA100Return,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Marriage allowance requires spouse details
  if (data.marriage) {
    if (data.marriage.transferToSpouseIndicator || data.marriage.receiveFromSpouseIndicator) {
      if (!data.marriage.spouseNINO) {
        errors.push({
          field: 'marriage.spouseNINO',
          message: "Spouse's NI number required when claiming marriage allowance",
          severity: 'error',
        })
      }
    }
  }

  // Blind person's allowance transfer requires spouse details
  if (data.blindPersonsAllowance?.transferSurplusIndicator) {
    if (!data.blindPersonsAllowance.spouseNINO) {
      errors.push({
        field: 'blindPersonsAllowance.spouseNINO',
        message: "Spouse's NI number required when transferring blind person's allowance",
        severity: 'error',
      })
    }
  }

  // Capital gains schedule indicator consistency
  if (data.sa108) {
    // Should have some gain/loss data if schedule is included
    const hasData =
      data.sa108.listedSharesAndSecurities ||
      data.sa108.unlistedShares ||
      data.sa108.otherPropertyAndAssets ||
      data.sa108.ukResidentialProperty
    if (!hasData) {
      warnings.push({
        field: 'sa108',
        message: 'Capital gains schedule included but no disposals recorded',
        severity: 'warning',
      })
    }
  }
}

// =============================================================================
// LTS Integration (Local Test Service)
// =============================================================================

/**
 * Validate XML using HMRC Local Test Service
 *
 * The LTS provides full schema validation against official HMRC schemas.
 * It must be installed and running locally.
 *
 * @param xml - The XML document to validate
 * @param ltsEndpoint - LTS endpoint URL (default: http://localhost:8080)
 * @returns Validation result from LTS
 */
export async function validateWithLTS(
  xml: string,
  ltsEndpoint: string = 'http://localhost:8080'
): Promise<ValidationResult> {
  try {
    const response = await fetch(`${ltsEndpoint}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xml,
    })

    if (!response.ok) {
      return {
        valid: false,
        errors: [
          {
            field: 'lts',
            message: `LTS returned status ${response.status}`,
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }

    const result = await response.text()

    // Parse LTS response (simplified - actual format depends on LTS version)
    const hasErrors = result.includes('<error>') || result.includes('<Error>')

    if (hasErrors) {
      // Extract errors from response
      const errorMatches = result.match(/<(?:error|Error)>([^<]+)<\/(?:error|Error)>/g) || []
      const errors: ValidationError[] = errorMatches.map((match) => {
        const message = match.replace(/<\/?(?:error|Error)>/gi, '')
        return {
          field: 'schema',
          message,
          severity: 'error' as const,
        }
      })

      return { valid: false, errors, warnings: [] }
    }

    return { valid: true, errors: [], warnings: [] }
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: 'lts',
          message: `Failed to connect to LTS: ${error instanceof Error ? error.message : 'Unknown error'}. Is LTS running?`,
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }
}

/**
 * Check if LTS is available
 */
export async function isLTSAvailable(
  ltsEndpoint: string = 'http://localhost:8080'
): Promise<boolean> {
  try {
    const response = await fetch(`${ltsEndpoint}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    })
    return response.ok
  } catch {
    return false
  }
}
