import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSubmissionXML } from '@/lib/sa100/xml-builder'
import type { GatewayCredentials, TaxpayerIdentification } from '@/lib/sa100/types'

interface SubmitRequest {
  gatewayUserId: string
  gatewayPassword: string
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: declarationId } = await context.params

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
    if (!gatewayUserId || !/^\d{12}$/.test(gatewayUserId)) {
      return NextResponse.json(
        { error: 'Invalid Government Gateway User ID - must be 12 digits' },
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
    const returnData = declaration.return_data
    const utr = returnData?.utr as string | undefined
    const nino = returnData?.yourPersonalDetails?.nationalInsuranceNumber as string | undefined

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
        { error: 'UTR or NINO not configured in your tax return' },
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

    // Check if sandbox mode
    const isSandbox = process.env.HMRC_SANDBOX_MODE === 'true'

    if (isSandbox) {
      // Build the XML even in sandbox mode to test the builder
      const xmlResult = buildSubmissionXML({
        credentials,
        taxpayer,
        returnData,
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
      returnData,
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

    // TODO: Submit to HMRC Transaction Engine
    // const transactionEngineUrl = process.env.HMRC_TRANSACTION_ENGINE_URL
    // const response = await fetch(transactionEngineUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/xml' },
    //   body: xmlResult.xml,
    // })

    // For now, return an error indicating production mode isn't fully implemented
    await supabase
      .from('sa100_submissions')
      .update({
        status: 'failed',
        error_code: 'NOT_IMPLEMENTED',
        error_message: 'Production submission to Transaction Engine not yet implemented',
      })
      .eq('id', submission.id)

    return NextResponse.json(
      { error: 'Production submission not yet implemented. Please use sandbox mode for testing.' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 500 }
    )
  }
}
