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

    // Step 1: Get or create business ID
    // In sandbox, test users may not have pre-registered businesses
    // We'll try to find an existing one, or use a synthetic businessId for sandbox testing
    let businessId: string | null = null;
    let usingSyntheticId = false;

    // Generate a deterministic synthetic business ID based on NINO
    // Format must match: ^X[A-Z0-9]{1}IS[0-9]{11}$
    const generateSyntheticBusinessId = (ninoVal: string): string => {
      // Use last 11 digits based on NINO hash for consistency
      const hash = ninoVal.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const numericPart = String(hash).padStart(11, '0').slice(-11);
      return `XAIS${numericPart}`;
    };

    try {
      // Try to get existing businesses using STATEFUL mode
      const businessesResponse = await hmrcClient.get<{
        listOfBusinesses: Array<{
          businessId: string;
          typeOfBusiness: string;
          tradingName?: string;
        }>;
      }>(user.id, `/individuals/business/details/${cleanNino}/list`, {
        govTestScenario: 'STATEFUL',
      });

      const allBusinesses = businessesResponse.listOfBusinesses || [];
      const selfEmploymentBusiness = allBusinesses.find(
        (b) => b.typeOfBusiness === 'self-employment'
      );

      if (selfEmploymentBusiness) {
        businessId = selfEmploymentBusiness.businessId;
        steps.push({
          step: 'Get business ID',
          status: 'success',
          message: `Found existing self-employment business: ${selfEmploymentBusiness.tradingName || businessId}`,
          data: { businessId, allBusinesses },
        });
      } else {
        // No self-employment business found - use synthetic ID for sandbox
        businessId = generateSyntheticBusinessId(cleanNino);
        usingSyntheticId = true;
        steps.push({
          step: 'Get business ID',
          status: 'success',
          message: `Using sandbox test business ID: ${businessId}`,
          data: { businessId, synthetic: true, existingBusinesses: allBusinesses },
        });
      }
    } catch (err) {
      // If listing fails (common in sandbox), use synthetic business ID
      businessId = generateSyntheticBusinessId(cleanNino);
      usingSyntheticId = true;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Get business ID',
        status: 'success',
        message: `Using sandbox test business ID: ${businessId} (list failed: ${errorMsg})`,
        data: { businessId, synthetic: true, listError: errorMsg },
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
      usingSyntheticId,
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
