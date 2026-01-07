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

    // Step 1: Check if business already exists
    let existingBusinessId: string | null = null;
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
        existingBusinessId = selfEmploymentBusiness.businessId;
        steps.push({
          step: 'Check existing businesses',
          status: 'success',
          message: `Found existing self-employment business: ${selfEmploymentBusiness.tradingName || 'Unnamed'}`,
          data: { businessId: existingBusinessId },
        });
      } else {
        steps.push({
          step: 'Check existing businesses',
          status: 'success',
          message: 'No existing self-employment business found',
        });
      }
    } catch (err) {
      // No businesses exist yet - that's fine
      steps.push({
        step: 'Check existing businesses',
        status: 'success',
        message: 'No businesses registered yet',
      });
    }

    // Step 2: Create self-employment business (if none exists)
    let businessId = existingBusinessId;
    if (!businessId) {
      try {
        const createResponse = await hmrcClient.post<{ businessId: string }>(
          user.id,
          `/individuals/business/self-employment/${cleanNino}`,
          {
            accountingPeriodStartDate: `${startYear}-04-06`,
            accountingPeriodEndDate: `${startYear + 1}-04-05`,
            tradingName: businessName,
            addressLineOne: '123 Test Street',
            addressLineTwo: 'Test Town',
            postalCode: 'TE1 1ST',
            countryCode: 'GB',
            commencementDate: `${startYear}-04-06`,
          },
          { govTestScenario: 'STATEFUL' }
        );
        businessId = createResponse.businessId;
        steps.push({
          step: 'Create self-employment business',
          status: 'success',
          message: `Created business "${businessName}"`,
          data: { businessId },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        steps.push({
          step: 'Create self-employment business',
          status: 'error',
          message: errorMsg,
        });
        return NextResponse.json({
          success: false,
          steps,
          error: 'Failed to create business',
        });
      }
    } else {
      steps.push({
        step: 'Create self-employment business',
        status: 'skipped',
        message: 'Using existing business',
        data: { businessId },
      });
    }

    // Step 3: Submit cumulative period summary
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

    // Step 4: Submit annual summary (capital allowances)
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
