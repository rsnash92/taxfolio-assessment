import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hmrcClient } from '@/lib/hmrc';

/**
 * POST /api/hmrc/sandbox/setup
 *
 * Sets up test data in the HMRC sandbox for testing the full submission flow.
 * This creates:
 * - A self-employment business
 * - Period summaries with income/expenses
 *
 * All operations use Gov-Test-Scenario: STATEFUL header to persist data.
 * Sandbox data persists for 7 days.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nino, taxYear = '2024-25', businessName = 'Test Business' } = body;

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
    const [startYear] = taxYear.split('-').map(Number);

    const steps: Array<{ step: string; status: 'success' | 'error' | 'skipped'; message: string; data?: unknown }> = [];

    // Step 1: Get business ID from HMRC
    // In sandbox, test users with MTD ITSA enrolment should have pre-registered businesses
    let businessId: string | null = null;
    let allBusinesses: Array<{ businessId: string; typeOfBusiness: string; tradingName?: string }> = [];

    try {
      // Use STATEFUL mode to get businesses (only valid scenario for Business Details API)
      const businessesResponse = await hmrcClient.get<{
        listOfBusinesses: Array<{
          businessId: string;
          typeOfBusiness: string;
          tradingName?: string;
        }>;
      }>(user.id, `/individuals/business/details/${cleanNino}/list`, {
        govTestScenario: 'STATEFUL',
      });

      allBusinesses = businessesResponse.listOfBusinesses || [];
      const selfEmploymentBusiness = allBusinesses.find(
        (b) => b.typeOfBusiness === 'self-employment'
      );

      if (selfEmploymentBusiness) {
        businessId = selfEmploymentBusiness.businessId;
        steps.push({
          step: 'Get business ID',
          status: 'success',
          message: `Found self-employment business: ${selfEmploymentBusiness.tradingName || businessId}`,
          data: { businessId, allBusinesses },
        });
      } else if (allBusinesses.length > 0) {
        // Has businesses but none are self-employment
        steps.push({
          step: 'Get business ID',
          status: 'error',
          message: `Found ${allBusinesses.length} business(es) but none are self-employment type. Found: ${allBusinesses.map(b => b.typeOfBusiness).join(', ')}`,
          data: { allBusinesses },
        });
        return NextResponse.json({
          success: false,
          steps,
          error: 'No self-employment business found. Your test user may only have property business enrolment.',
          hint: 'Create a new test user at developer.service.hmrc.gov.uk/api-test-user and ensure you select "MTD Income Tax" with self-employment.',
        });
      } else {
        // No businesses at all
        steps.push({
          step: 'Get business ID',
          status: 'error',
          message: 'No businesses registered for this test user.',
        });
        return NextResponse.json({
          success: false,
          steps,
          error: 'No businesses found for this NINO.',
          hint: 'Test users need to be created with MTD Income Tax (Self Assessment) enrolment. Create one at developer.service.hmrc.gov.uk/api-test-user',
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Check for specific error types
      if (errorMsg.includes('MATCHING_RESOURCE_NOT_FOUND') || errorMsg.includes('NOT_FOUND')) {
        steps.push({
          step: 'Get business ID',
          status: 'error',
          message: 'No businesses registered. The test user needs MTD ITSA enrolment with a self-employment business.',
        });
        return NextResponse.json({
          success: false,
          steps,
          error: 'Test user has no registered businesses',
          hint: 'Create a new test user at developer.service.hmrc.gov.uk/api-test-user. Select "MTD Income Tax" and choose self-employment as the business type.',
        });
      }

      steps.push({
        step: 'Get business ID',
        status: 'error',
        message: `Failed to retrieve businesses: ${errorMsg}`,
      });
      return NextResponse.json({
        success: false,
        steps,
        error: errorMsg,
      });
    }

    // Step 2: Submit cumulative period summary
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/business/self-employment/${cleanNino}/${businessId}/cumulative/${taxYear}`,
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
        step: 'Submit period summary',
        status: 'success',
        message: 'Submitted £50,000 turnover, £15,000 expenses',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Submit period summary',
        status: 'error',
        message: errorMsg,
      });
    }

    // Step 3: Submit annual summary (capital allowances)
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/business/self-employment/${cleanNino}/${businessId}/annual/${taxYear}`,
        {
          allowances: {
            annualInvestmentAllowance: 5000,
          },
        },
        { govTestScenario: 'STATEFUL' }
      );
      steps.push({
        step: 'Submit annual summary',
        status: 'success',
        message: 'Submitted £5,000 capital allowances',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Submit annual summary',
        status: 'error',
        message: errorMsg,
      });
    }

    // Check overall success
    const hasErrors = steps.some((s) => s.status === 'error');
    const successCount = steps.filter((s) => s.status === 'success').length;

    return NextResponse.json({
      success: !hasErrors,
      businessId,
      steps,
      summary: {
        totalSteps: steps.length,
        successful: successCount,
        errors: steps.filter((s) => s.status === 'error').length,
        skipped: steps.filter((s) => s.status === 'skipped').length,
      },
      nextSteps: hasErrors
        ? ['Review errors above and try again']
        : [
            'Check HMRC Status to verify data',
            'Go to Review & Submit step to test the full submission flow',
            'Trigger a tax calculation',
            'Submit final declaration (in-year only in sandbox)',
          ],
    });
  } catch (error) {
    console.error('Sandbox setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
