import { NextRequest, NextResponse } from 'next/server';
import {
  submitSelfAssessment,
  validateForSubmission,
  isHMRCConnected,
} from '@/lib/hmrc';
import { WizardData } from '@/types/wizard';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      nino,
      taxYear,
      wizardData,
      options,
    }: {
      userId: string;
      nino: string;
      taxYear: string;
      wizardData: WizardData;
      options?: {
        skipCalculation?: boolean;
        skipFinalDeclaration?: boolean;
        validateOnly?: boolean;
      };
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    if (!nino) {
      return NextResponse.json(
        { error: 'Missing NINO' },
        { status: 400 }
      );
    }

    if (!taxYear) {
      return NextResponse.json(
        { error: 'Missing taxYear' },
        { status: 400 }
      );
    }

    if (!wizardData) {
      return NextResponse.json(
        { error: 'Missing wizardData' },
        { status: 400 }
      );
    }

    // Validate NINO format
    const ninoRegex = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/;
    if (!ninoRegex.test(nino.replace(/\s/g, '').toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid NINO format' },
        { status: 400 }
      );
    }

    // Validate tax year format
    const taxYearRegex = /^\d{4}-\d{2}$/;
    if (!taxYearRegex.test(taxYear)) {
      return NextResponse.json(
        { error: 'Invalid tax year format. Expected: YYYY-YY (e.g., 2024-25)' },
        { status: 400 }
      );
    }

    // If validate only, just run validation
    if (options?.validateOnly) {
      const validation = validateForSubmission(wizardData);
      return NextResponse.json({
        validation,
      });
    }

    // Check HMRC connection before attempting submission
    const connected = await isHMRCConnected(userId);
    if (!connected) {
      return NextResponse.json(
        { error: 'HMRC not connected. Please connect your HMRC account first.' },
        { status: 401 }
      );
    }

    // Run pre-submission validation
    const validation = validateForSubmission(wizardData);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validation,
        },
        { status: 400 }
      );
    }

    // Submit to HMRC
    // Note: In sandbox mode, we'll skip the final declaration to allow testing
    const isSandbox = process.env.HMRC_API_BASE_URL?.includes('test-api');

    const result = await submitSelfAssessment(
      userId,
      nino.replace(/\s/g, '').toUpperCase(),
      taxYear,
      wizardData,
      {
        skipCalculation: options?.skipCalculation,
        // Skip final declaration in sandbox for easier testing
        skipFinalDeclaration: options?.skipFinalDeclaration ?? isSandbox,
      }
    );

    console.log('HMRC submission result:', JSON.stringify(result, null, 2));

    if (result.success) {
      return NextResponse.json({
        success: true,
        calculationId: result.calculationId,
        hmrcReferenceNumber: result.hmrcReferenceNumber,
        calculation: result.calculation,
        steps: result.steps,
        warnings: result.warnings,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          errors: result.errors,
          steps: result.steps,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('HMRC submission error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving submission status/calculation
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const calculationId = searchParams.get('calculationId');

  if (!calculationId) {
    return NextResponse.json(
      { error: 'Missing calculationId parameter' },
      { status: 400 }
    );
  }

  // In production, you would retrieve the calculation from HMRC here
  // For now, return a placeholder
  return NextResponse.json({
    message: 'Use POST endpoint to retrieve calculation with full user context',
    calculationId,
  });
}
