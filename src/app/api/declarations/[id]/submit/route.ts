import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSubmissionXML } from '@/lib/sa100/xml-builder'
import {
  submitToTransactionEngine,
  pollUntilComplete,
} from '@/lib/sa100/transaction-engine'
import { calculateTax, getTaxpayerStatus, TaxCalculationInput } from '@/lib/sa100/tax-calculator'
import type { GatewayCredentials, TaxpayerIdentification, SA100Return } from '@/lib/sa100/types'
import { checkRateLimit, createRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter'
import { logAuditEvent } from '@/lib/security/audit-log'
import { getClientIp, getUserAgent, getRequestId } from '@/lib/utils/request'

interface SubmitRequest {
  gatewayUserId: string
  gatewayPassword: string
}

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Convert wizard data structure to SA100Return format expected by XML builder
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertWizardDataToSA100(wizardData: any, taxpayer: TaxpayerIdentification): SA100Return {
  const personalInfo = wizardData.personalInfo || {}

  // Build yourPersonalDetails from wizard personalInfo
  const yourPersonalDetails: SA100Return['yourPersonalDetails'] = {
    // Date of birth - required by HMRC, use placeholder if not provided
    dateOfBirth: personalInfo.dateOfBirth || '1990-01-01',
    nationalInsuranceNumber: taxpayer.nino,
    // Taxpayer status - S=Scottish, C=Welsh, U=rest of UK (default)
    taxpayerStatus: personalInfo.taxpayerStatus || 'U',
  }

  // Add new address if changed
  if (personalInfo.addressChanged && personalInfo.newAddress) {
    yourPersonalDetails.newAddress = {
      addressLine1: personalInfo.newAddress || '',
      postcode: personalInfo.newPostcode || '',
      effectiveFrom: personalInfo.moveDate,
    }
  }

  // Build schedule indicators based on income sources
  const incomeSources = wizardData.incomeSources || []
  const hasEmployment = incomeSources.some((s: { type: string }) => s.type === 'employment')
  const hasSelfEmployment = incomeSources.some((s: { type: string }) => s.type === 'self-employment')
  const hasRental = incomeSources.some((s: { type: string }) => s.type === 'rental')
  const hasCapitalGains = incomeSources.some((s: { type: string }) => s.type === 'capital-gains')

  const yourTaxReturn: SA100Return['yourTaxReturn'] = {}

  if (hasEmployment) {
    yourTaxReturn.employmentSchedule = 'yes'
    yourTaxReturn.numberOfEmploymentSchedules = Object.keys(wizardData.employmentData || {}).length
  }

  if (hasSelfEmployment) {
    // Use short schedule for simpler businesses
    yourTaxReturn.shortSelfEmploymentSchedule = 'yes'
    yourTaxReturn.numberOfShortSelfEmploymentSchedules = Object.keys(wizardData.selfEmploymentData || {}).length
  }

  if (hasRental) {
    yourTaxReturn.ukPropertySchedule = 'yes'
  }

  if (hasCapitalGains) {
    yourTaxReturn.capitalGainsSchedule = 'yes'
  }

  // Build finishing/declaration section
  const finishing: SA100Return['finishing'] = {
    returnSigner: 'Individual',
  }

  // Build the SA100Return
  const sa100Return: SA100Return = {
    taxYear: wizardData.taxYear || '2024-25',
    yourPersonalDetails,
    yourTaxReturn,
    finishing,
  }

  // Add employment data if present
  if (hasEmployment && wizardData.employmentData) {
    sa100Return.sa102 = Object.values(wizardData.employmentData).map((emp: any) => ({
      employerDetails: {
        employerName: emp.employerName || '',
        payeReference: emp.employerPAYERef,
      },
      payFromEmployment: Math.round((emp.payReceived || 0) / 100), // Convert pence to pounds
      ukTaxDeducted: Math.round((emp.taxDeducted || 0) / 100),
    }))
  }

  // Add self-employment data if present
  if (hasSelfEmployment && wizardData.selfEmploymentData) {
    sa100Return.sa103S = Object.values(wizardData.selfEmploymentData).map((se: any) => {
      const turnover = Math.round((se.income?.total || 0) / 100)
      const expenses = Math.round((se.expenses?.total || 0) / 100)
      const netProfitOrLoss = turnover - expenses

      return {
        businessDetails: {
          businessName: se.businessName || 'Business',
          descriptionOfBusiness: se.businessDescription || 'General trading',
          businessAddress: se.businessAddress ? {
            addressLine1: se.businessAddress.line1 || '',
            postcode: se.businessAddress.postcode || '',
          } : undefined,
          businessStartDate: se.startDate,
        },
        accountingPeriod: {
          startDate: se.accountingPeriodStart || `${wizardData.taxYear?.split('-')[0]}-04-06`,
          endDate: se.accountingPeriodEnd || `20${wizardData.taxYear?.split('-')[1]}-04-05`,
        },
        income: {
          turnover,
        },
        totalAllowableExpenses: expenses,
        netProfitOrLoss,
        totalTaxableProfits: Math.max(0, netProfitOrLoss),
      }
    })
  }

  // Add UK interest if present
  if (wizardData.interestData?.untaxedUKInterest || wizardData.interestData?.taxedUKInterest) {
    sa100Return.ukInterestEtc = {
      untaxedUKInterestAmount: Math.round((wizardData.interestData.untaxedUKInterest || 0) / 100),
      taxedUKInterestAmount: Math.round((wizardData.interestData.taxedUKInterest || 0) / 100),
    }
  }

  // Add UK dividends if present
  if (wizardData.dividendsData?.ukDividends) {
    sa100Return.ukDividends = {
      ukDividendsAmount: Math.round((wizardData.dividendsData.ukDividends || 0) / 100),
    }
  }

  // Calculate SA110 tax summary using HMRC-compliant calculator
  // Gather income data for tax calculation
  let totalEmploymentIncome = 0
  let totalEmploymentTaxDeducted = 0
  let totalSelfEmploymentProfits = 0

  if (sa100Return.sa102) {
    for (const emp of sa100Return.sa102) {
      totalEmploymentIncome += emp.payFromEmployment || 0
      totalEmploymentTaxDeducted += emp.ukTaxDeducted || 0
    }
  }

  if (sa100Return.sa103S) {
    for (const se of sa100Return.sa103S) {
      totalSelfEmploymentProfits += se.totalTaxableProfits || 0
    }
  }

  const taxInput: TaxCalculationInput = {
    status: getTaxpayerStatus(yourPersonalDetails.taxpayerStatus),
    employmentIncome: totalEmploymentIncome,
    employmentTaxDeducted: totalEmploymentTaxDeducted,
    selfEmploymentProfits: totalSelfEmploymentProfits,
    untaxedInterest: sa100Return.ukInterestEtc?.untaxedUKInterestAmount,
    taxedInterest: sa100Return.ukInterestEtc?.taxedUKInterestAmount,
    ukDividends: sa100Return.ukDividends?.ukDividendsAmount,
  }

  console.log('[Submit Route] Tax calculation input:', taxInput)

  const taxResult = calculateTax(taxInput)

  console.log('[Submit Route] Tax calculation result:', {
    totalIncome: taxResult.totalIncome,
    taxableIncome: taxResult.totalTaxableIncome,
    incomeTax: taxResult.totalIncomeTax,
    taxDeducted: taxResult.taxDeductedAtSource,
    class4NIC: taxResult.class4NIC,
    class2NIC: taxResult.class2NIC,
    taxDueOrRefund: taxResult.taxDueOrRefund,
    sa110: taxResult.sa110,
  })

  // Set SA110 with calculated values
  sa100Return.sa110 = {
    totalTaxEtcDue: taxResult.sa110.totalTaxEtcDue,
    class4NICsDue: taxResult.sa110.class4NICsDue,
    class2NICsDue: taxResult.sa110.class2NICsDue,
    studentLoanRepaymentDue: taxResult.sa110.studentLoanRepaymentDue,
    postgraduateLoanRepaymentDue: taxResult.sa110.postgraduateLoanRepaymentDue,
  }

  return sa100Return
}

export async function POST(request: NextRequest, context: RouteContext) {
  // Extract request metadata for security logging
  const clientIp = getClientIp(request) || 'unknown'
  const userAgent = getUserAgent(request) || undefined
  const requestId = getRequestId(request)

  // Rate limiting - 5 submissions per hour per IP
  const rateLimit = checkRateLimit(`submit:${clientIp}`, RATE_LIMITS.submission)
  if (!rateLimit.success) {
    logAuditEvent('RATE_LIMIT_EXCEEDED', {
      clientIp,
      userAgent,
      requestId,
      details: { endpoint: 'submit', limit: rateLimit.limit },
    })

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many submission attempts. Please try again later.',
        retryAfter: new Date(rateLimit.resetTime).toISOString(),
      },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimit),
      }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    logAuditEvent('ACCESS_DENIED', {
      clientIp,
      userAgent,
      requestId,
      details: { reason: 'Not authenticated' },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: declarationId } = await context.params

  // Log submission attempt
  logAuditEvent('SUBMISSION_STARTED', {
    clientIp,
    userAgent,
    requestId,
    userId: user.id,
    details: { declarationId },
  })

  // Get the declaration
  const { data: declaration, error: declError } = await supabase
    .from('declarations')
    .select('*')
    .eq('id', declarationId)
    .eq('user_id', user.id)
    .single()

  if (declError || !declaration) {
    return NextResponse.json({ error: 'Declaration not found' }, { status: 404 })
  }

  // Check declaration is paid
  if (declaration.status !== 'paid') {
    return NextResponse.json(
      { error: 'Declaration must be paid before submission' },
      { status: 400 }
    )
  }

  try {
    const body: SubmitRequest = await request.json()
    const { gatewayUserId, gatewayPassword } = body

    // Validate credentials format
    // HMRC Sender ID: alphanumeric, typically 4-12 characters (e.g., SA0239)
    if (!gatewayUserId || !/^[A-Za-z0-9]{4,12}$/.test(gatewayUserId)) {
      return NextResponse.json(
        { error: 'Invalid HMRC Sender ID - must be 4-12 alphanumeric characters' },
        { status: 400 }
      )
    }

    if (!gatewayPassword || gatewayPassword.length < 8) {
      return NextResponse.json(
        { error: 'Invalid password - must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Create a submission record
    const { data: submission, error: subError } = await supabase
      .from('sa100_submissions')
      .insert({
        user_id: user.id,
        declaration_id: declarationId,
        tax_year: declaration.tax_year,
        status: 'submitting',
      })
      .select()
      .single()

    if (subError || !submission) {
      console.error('Failed to create submission record:', subError)
      return NextResponse.json(
        { error: 'Failed to create submission record' },
        { status: 500 }
      )
    }

    // Get taxpayer identification from return data
    // The wizard stores data in personalInfo.utr and personalInfo.nino
    const returnData = declaration.return_data
    const utr = (returnData?.personalInfo?.utr || returnData?.utr) as string | undefined
    const nino = (returnData?.personalInfo?.nino || returnData?.yourPersonalDetails?.nationalInsuranceNumber) as string | undefined

    if (!utr || !nino) {
      await supabase
        .from('sa100_submissions')
        .update({
          status: 'failed',
          error_code: 'MISSING_TAXPAYER_ID',
          error_message: 'UTR or NINO not found in return data',
        })
        .eq('id', submission.id)

      return NextResponse.json(
        { error: 'UTR or NINO not configured in your tax return. Please ensure you have entered both your UTR and National Insurance number.' },
        { status: 400 }
      )
    }

    // Build credentials and taxpayer objects
    const credentials: GatewayCredentials = {
      userId: gatewayUserId,
      password: gatewayPassword,
    }

    const taxpayer: TaxpayerIdentification = {
      utr,
      nino,
    }

    console.log('[Submit Route] Credentials:', {
      userId: gatewayUserId,
      userIdLength: gatewayUserId.length,
      passwordLength: gatewayPassword.length,
      passwordFirst2: gatewayPassword.substring(0, 2),
      passwordLast2: gatewayPassword.substring(gatewayPassword.length - 2),
    })
    console.log('[Submit Route] Taxpayer:', { utr, nino })

    // Convert wizard data to SA100 format expected by XML builder
    const sa100Data = convertWizardDataToSA100(returnData, taxpayer)
    console.log('[Submit Route] SA100 data:', JSON.stringify(sa100Data, null, 2))

    // Check if sandbox mode
    const isSandbox = process.env.HMRC_SANDBOX_MODE === 'true'

    // Detect if using test endpoint (ETS) - GatewayTest=1 is required for test submissions
    const transactionEngineUrl = process.env.HMRC_TRANSACTION_ENGINE_URL || 'https://test-transaction-engine.tax.service.gov.uk'
    const isTestSubmission = transactionEngineUrl.includes('test-transaction-engine')

    if (isSandbox) {
      // Build the XML even in sandbox mode to test the builder
      const xmlResult = buildSubmissionXML({
        credentials,
        taxpayer,
        returnData: sa100Data,
        isTestSubmission,
      })

      // Store the XML for debugging
      await supabase
        .from('sa100_submissions')
        .update({
          submission_xml: xmlResult.xml,
        })
        .eq('id', submission.id)

      // Simulate successful submission
      const mockCorrelationId = `SANDBOX-${Date.now()}`

      await supabase
        .from('sa100_submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          correlation_id: mockCorrelationId,
          irmark: xmlResult.irMark,
        })
        .eq('id', submission.id)

      // Update declaration status
      await supabase
        .from('declarations')
        .update({ status: 'submitted' })
        .eq('id', declarationId)

      logAuditEvent('SUBMISSION_SUCCESS', {
        clientIp,
        userAgent,
        requestId,
        userId: user.id,
        details: { declarationId, correlationId: mockCorrelationId, sandbox: true },
      })

      return NextResponse.json({
        success: true,
        submissionId: submission.id,
        correlationId: mockCorrelationId,
        irmark: xmlResult.irMark,
        sandbox: true,
      })
    }

    // Production: Build XML and submit to HMRC Transaction Engine
    const xmlResult = buildSubmissionXML({
      credentials,
      taxpayer,
      returnData: sa100Data,
      isTestSubmission,
    })

    // Check for validation errors
    const errors = xmlResult.validationErrors.filter(e => e.severity === 'error')
    if (errors.length > 0) {
      await supabase
        .from('sa100_submissions')
        .update({
          status: 'failed',
          error_code: 'VALIDATION_ERROR',
          error_message: errors.map(e => `${e.field}: ${e.message}`).join('; '),
        })
        .eq('id', submission.id)

      logAuditEvent('SUBMISSION_VALIDATION_FAILED', {
        clientIp,
        userAgent,
        requestId,
        userId: user.id,
        details: { declarationId, errors: errors.map(e => e.message) },
      })

      return NextResponse.json(
        { error: 'Validation errors: ' + errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    // Store the XML
    await supabase
      .from('sa100_submissions')
      .update({
        submission_xml: xmlResult.xml,
        irmark: xmlResult.irMark,
      })
      .eq('id', submission.id)

    // Submit to HMRC Transaction Engine
    console.log('Submitting to HMRC Transaction Engine...')
    const submitResult = await submitToTransactionEngine(xmlResult.xml)

    if (!submitResult.success) {
      console.error('HMRC submission failed:', submitResult.error)
      await supabase
        .from('sa100_submissions')
        .update({
          status: 'failed',
          error_code: submitResult.error?.code || 'SUBMISSION_ERROR',
          error_message: submitResult.error?.message || 'Submission failed',
          response_xml: submitResult.rawResponse,
        })
        .eq('id', submission.id)

      logAuditEvent('SUBMISSION_FAILED', {
        clientIp,
        userAgent,
        requestId,
        userId: user.id,
        details: { declarationId, errorCode: submitResult.error?.code, errorMessage: submitResult.error?.message },
      })

      return NextResponse.json(
        {
          error: submitResult.error?.message || 'HMRC submission failed',
          errorCode: submitResult.error?.code,
        },
        { status: 400 }
      )
    }

    // Update with correlation ID
    await supabase
      .from('sa100_submissions')
      .update({
        correlation_id: submitResult.correlationId,
        status: 'polling',
      })
      .eq('id', submission.id)

    // Poll for result (HMRC processes async)
    console.log(`Polling for result, correlation ID: ${submitResult.correlationId}`)
    const pollResult = await pollUntilComplete(submitResult.correlationId!, {
      pollUrl: submitResult.pollUrl,
      pollIntervalMs: (submitResult.pollInterval || 5) * 1000,
      maxAttempts: 30,
    })

    if (pollResult.status === 'accepted') {
      // Success!
      await supabase
        .from('sa100_submissions')
        .update({
          status: 'submitted',
          submitted_at: pollResult.acceptedTime || new Date().toISOString(),
          hmrc_message: pollResult.hmrcMessage,
          response_xml: pollResult.rawResponse,
        })
        .eq('id', submission.id)

      // Update declaration status
      await supabase.from('declarations').update({ status: 'submitted' }).eq('id', declarationId)

      logAuditEvent('SUBMISSION_SUCCESS', {
        clientIp,
        userAgent,
        requestId,
        userId: user.id,
        details: { declarationId, correlationId: submitResult.correlationId },
      })

      return NextResponse.json({
        success: true,
        submissionId: submission.id,
        correlationId: submitResult.correlationId,
        irmark: xmlResult.irMark,
        hmrcMessage: pollResult.hmrcMessage,
        acceptedTime: pollResult.acceptedTime,
      })
    } else {
      // Rejected
      const errorMessage = pollResult.errors?.map((e) => e.technicalMessage).join('; ') || 'Submission rejected by HMRC'
      const errorCode = pollResult.errors?.[0]?.code || 'REJECTED'

      await supabase
        .from('sa100_submissions')
        .update({
          status: 'failed',
          error_code: errorCode,
          error_message: errorMessage,
          response_xml: pollResult.rawResponse,
        })
        .eq('id', submission.id)

      logAuditEvent('SUBMISSION_FAILED', {
        clientIp,
        userAgent,
        requestId,
        userId: user.id,
        details: { declarationId, errorCode, errorMessage },
      })

      return NextResponse.json(
        {
          error: errorMessage,
          errorCode,
          errors: pollResult.errors,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Submission error:', error)

    logAuditEvent('SUBMISSION_FAILED', {
      clientIp,
      userAgent,
      requestId,
      details: { declarationId, error: error instanceof Error ? error.message : 'Unknown error' },
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 500 }
    )
  }
}
