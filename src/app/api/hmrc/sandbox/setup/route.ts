import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hmrcClient } from '@/lib/hmrc';

/**
 * POST /api/hmrc/sandbox/setup
 *
 * Tests HMRC sandbox API integration using STATEFUL scenarios.
 *
 * IMPORTANT: HMRC sandbox requirements:
 * - Test user must have MTD ITSA enrolment (Individual test user)
 * - Self-employment requires a pre-registered business linked to the test user
 * - Businesses cannot be created via API in sandbox
 * - STATEFUL scenarios persist data for 7 days
 *
 * This endpoint tests:
 * 1. Business listing (check for existing businesses)
 * 2. UK Dividends income submission (STATEFUL)
 * 3. Savings/Interest income submission (STATEFUL)
 * 4. Tax calculation trigger (STATEFUL)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nino, taxYear = '2024-25' } = body;

    if (!nino) {
      return NextResponse.json(
        { error: 'NINO is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const cleanNino = nino.replace(/\s/g, '').toUpperCase();

    const steps: Array<{
      step: string;
      status: 'success' | 'error' | 'skipped' | 'info';
      message: string;
      data?: unknown;
      category?: string;
    }> = [];

    // Helper to check if error is a sandbox limitation vs actual error
    const isSandboxLimitation = (errorMsg: string): boolean => {
      return (
        errorMsg.includes('not subscribed') ||
        errorMsg.includes('MATCHING_RESOURCE_NOT_FOUND') ||
        errorMsg.includes('resource with the name in the request can not be found')
      );
    };

    // =========================================================================
    // Step 1: Check for existing businesses (informational)
    // =========================================================================
    let existingBusinesses: Array<{ businessId: string; typeOfBusiness: string; tradingName?: string }> = [];
    let selfEmploymentBusinessId: string | null = null;

    try {
      const businessesResponse = await hmrcClient.get<{
        listOfBusinesses: Array<{
          businessId: string;
          typeOfBusiness: string;
          tradingName?: string;
        }>;
      }>(user.id, `/individuals/business/details/${cleanNino}/list`, {
        govTestScenario: 'STATEFUL',
      });

      existingBusinesses = businessesResponse.listOfBusinesses || [];
      const selfEmploymentBusiness = existingBusinesses.find(
        (b) => b.typeOfBusiness === 'self-employment'
      );

      if (selfEmploymentBusiness) {
        selfEmploymentBusinessId = selfEmploymentBusiness.businessId;
        steps.push({
          step: 'Check businesses',
          status: 'success',
          category: 'self-employment',
          message: `Found self-employment business: ${selfEmploymentBusiness.tradingName || selfEmploymentBusiness.businessId}`,
          data: { businessId: selfEmploymentBusiness.businessId, allBusinesses: existingBusinesses },
        });
      } else {
        steps.push({
          step: 'Check businesses',
          status: 'info',
          category: 'self-employment',
          message: `No self-employment business found. Found ${existingBusinesses.length} other business(es).`,
          data: { existingBusinesses },
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Check businesses',
          status: 'info',
          category: 'self-employment',
          message: 'Business Details API not available for this test user. This is a sandbox limitation.',
        });
      } else {
        steps.push({
          step: 'Check businesses',
          status: 'error',
          category: 'self-employment',
          message: `Error listing businesses: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 2: Submit UK Dividends (STATEFUL mode)
    // Uses individuals-dividends-income-api
    // =========================================================================
    try {
      // Submit UK dividends data using STATEFUL scenario
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/dividends/${cleanNino}/${taxYear}`,
        {
          // UK Dividends (simpler structure that should work)
          ukDividends: 2500,
          otherUkDividends: 500,
        },
        { govTestScenario: 'STATEFUL' }
      );
      steps.push({
        step: 'Submit UK dividends',
        status: 'success',
        category: 'dividends',
        message: 'UK Dividends submitted: £2,500 dividends + £500 other dividends',
        data: { mode: 'STATEFUL', ukDividends: 2500, otherUkDividends: 500 },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Submit UK dividends',
          status: 'info',
          category: 'dividends',
          message: 'Dividends API requires MTD ITSA subscription on test user. This is a sandbox limitation.',
        });
      } else {
        steps.push({
          step: 'Submit UK dividends',
          status: 'error',
          category: 'dividends',
          message: `Dividends API error: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 3: Submit UK Savings Interest (STATEFUL mode)
    // Uses individuals-savings-income-api
    // =========================================================================
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/savings/${cleanNino}/${taxYear}`,
        {
          securities: {
            taxTakenOff: 200,
            grossAmount: 1000,
            netAmount: 800,
          },
        },
        { govTestScenario: 'STATEFUL' }
      );
      steps.push({
        step: 'Submit savings interest',
        status: 'success',
        category: 'savings',
        message: 'Savings submitted: £1,000 gross (£200 tax deducted)',
        data: { mode: 'STATEFUL', grossAmount: 1000, taxTakenOff: 200 },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Submit savings interest',
          status: 'info',
          category: 'savings',
          message: 'Savings API requires MTD ITSA subscription on test user. This is a sandbox limitation.',
        });
      } else {
        steps.push({
          step: 'Submit savings interest',
          status: 'error',
          category: 'savings',
          message: `Savings API error: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 4: Test Self-Employment Submission (if business exists)
    // =========================================================================
    if (selfEmploymentBusinessId) {
      const [startYear] = taxYear.split('-').map(Number);
      try {
        await hmrcClient.put(
          user.id,
          `/individuals/business/self-employment/${cleanNino}/${selfEmploymentBusinessId}/cumulative/${taxYear}`,
          {
            periodDates: {
              periodStartDate: `${startYear}-04-06`,
              periodEndDate: `${startYear + 1}-04-05`,
            },
            periodIncome: {
              turnover: 50000,
              other: 500,
            },
            periodExpenses: {
              consolidatedExpenses: 15000,
            },
          },
          { govTestScenario: 'STATEFUL' }
        );
        steps.push({
          step: 'Submit self-employment',
          status: 'success',
          category: 'self-employment',
          message: 'Self-employment submitted: £50,000 turnover, £15,000 expenses',
          data: { mode: 'STATEFUL', turnover: 50000, expenses: 15000, profit: 35000 },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        steps.push({
          step: 'Submit self-employment',
          status: 'error',
          category: 'self-employment',
          message: `Self-employment submission error: ${errorMsg}`,
        });
      }
    } else {
      steps.push({
        step: 'Submit self-employment',
        status: 'skipped',
        category: 'self-employment',
        message: 'Skipped - no self-employment business registered for this test user',
      });
    }

    // =========================================================================
    // Step 5: Trigger Tax Calculation (STATEFUL mode)
    // =========================================================================
    try {
      const calcResponse = await hmrcClient.post<{ calculationId?: string }>(
        user.id,
        `/individuals/calculations/${cleanNino}/self-assessment/${taxYear}`,
        {
          calculationType: 'inYear',
        },
        { govTestScenario: 'STATEFUL' }
      );
      steps.push({
        step: 'Trigger calculation',
        status: 'success',
        category: 'calculation',
        message: `Tax calculation triggered`,
        data: {
          calculationId: calcResponse.calculationId,
          mode: 'STATEFUL',
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Trigger calculation',
          status: 'info',
          category: 'calculation',
          message: 'Calculation API requires submitted income data and MTD ITSA subscription.',
        });
      } else {
        steps.push({
          step: 'Trigger calculation',
          status: 'error',
          category: 'calculation',
          message: `Calculation API error: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Summary
    // =========================================================================
    const successCount = steps.filter((s) => s.status === 'success').length;
    const errorCount = steps.filter((s) => s.status === 'error').length;
    const infoCount = steps.filter((s) => s.status === 'info').length;
    const skippedCount = steps.filter((s) => s.status === 'skipped').length;

    // Determine category status
    const getCategoryStatus = (category: string) => {
      const categorySteps = steps.filter(s => s.category === category);
      if (categorySteps.some(s => s.status === 'success')) return 'Working';
      if (categorySteps.some(s => s.status === 'error')) return 'Error';
      if (categorySteps.some(s => s.status === 'info')) return 'Sandbox Limitation';
      return 'Skipped';
    };

    const categorySummary = {
      selfEmployment: getCategoryStatus('self-employment'),
      dividends: getCategoryStatus('dividends'),
      savings: getCategoryStatus('savings'),
      calculation: getCategoryStatus('calculation'),
    };

    // Check if all issues are sandbox limitations (info status) vs real errors
    const allIssuesAreSandboxLimitations = errorCount === 0;

    return NextResponse.json({
      success: successCount > 0 || allIssuesAreSandboxLimitations,
      mode: 'STATEFUL',
      explanation: 'Using STATEFUL scenarios which persist data for 7 days. Some APIs may not be available depending on test user subscriptions.',
      steps,
      summary: {
        totalSteps: steps.length,
        successful: successCount,
        errors: errorCount,
        informational: infoCount,
        skipped: skippedCount,
      },
      categorySummary,
      nextSteps: errorCount > 0
        ? [
            'Review errors above',
            'Check HMRC API credentials and permissions',
            'Verify test user has correct MTD ITSA enrolment',
          ]
        : successCount > 0
        ? [
            '✓ Some APIs working successfully',
            'Check HMRC Status to verify submitted data',
            'Other APIs may require specific test user configuration',
          ]
        : [
            'All APIs showing sandbox limitations',
            'Test user may need different MTD enrolments',
            'Try creating a new Individual test user with MTD Income Tax enrolment',
          ],
      notes: [
        'STATEFUL mode persists data for 7 days',
        'Individual test users should have MTD ITSA enrolment',
        '"Sandbox Limitation" means the API is not available for this test user configuration',
        'Production API will work differently - real users will have proper subscriptions',
      ],
      hint: errorCount > 0 || successCount === 0
        ? 'Try creating a new Individual test user at developer.service.hmrc.gov.uk/api-test-user with MTD Income Tax (Self Assessment) enrolment'
        : undefined,
    });
  } catch (error) {
    console.error('Sandbox setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
