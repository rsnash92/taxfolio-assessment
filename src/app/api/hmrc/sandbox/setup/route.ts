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

    // Step 1: Get business ID using SELF_EMPLOYMENT scenario
    // In sandbox, we use Gov-Test-Scenario headers to get pre-seeded test data
    let businessId: string | null = null;

    // First try STATEFUL mode to check for existing businesses
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

      const selfEmploymentBusiness = businessesResponse.listOfBusinesses?.find(
        (b) => b.typeOfBusiness === 'self-employment'
      );

      if (selfEmploymentBusiness) {
        businessId = selfEmploymentBusiness.businessId;
        steps.push({
          step: 'Get business ID',
          status: 'success',
          message: `Found existing business: ${selfEmploymentBusiness.tradingName || 'Unnamed'}`,
          data: { businessId },
        });
      }
    } catch {
      // No stateful businesses found, try scenario-based
    }

    // If no stateful business, try SELF_EMPLOYMENT scenario for pre-seeded data
    if (!businessId) {
      try {
        const scenarioResponse = await hmrcClient.get<{
          listOfBusinesses: Array<{
            businessId: string;
            typeOfBusiness: string;
            tradingName?: string;
          }>;
        }>(user.id, `/individuals/business/details/${cleanNino}/list`, {
          govTestScenario: 'SELF_EMPLOYMENT',
        });

        const selfEmploymentBusiness = scenarioResponse.listOfBusinesses?.find(
          (b) => b.typeOfBusiness === 'self-employment'
        );

        if (selfEmploymentBusiness) {
          businessId = selfEmploymentBusiness.businessId;
          steps.push({
            step: 'Get business ID',
            status: 'success',
            message: `Using pre-seeded sandbox business: ${selfEmploymentBusiness.tradingName || businessId}`,
            data: { businessId, scenario: 'SELF_EMPLOYMENT' },
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        steps.push({
          step: 'Get business ID',
          status: 'error',
          message: `Could not get business ID. The test user may need MTD ITSA enrolment. Error: ${errorMsg}`,
        });
        return NextResponse.json({
          success: false,
          steps,
          error: 'Failed to get business ID - ensure test user has MTD Income Tax enrolment',
        });
      }
    }

    if (!businessId) {
      steps.push({
        step: 'Get business ID',
        status: 'error',
        message: 'No business ID available. Try creating a new test user with MTD ITSA enrolment.',
      });
      return NextResponse.json({
        success: false,
        steps,
        error: 'No business ID available',
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
