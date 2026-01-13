import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hmrcClient } from '@/lib/hmrc';

/**
 * POST /api/hmrc/sandbox/setup
 *
 * Tests HMRC sandbox API integration using STATEFUL scenarios.
 *
 * IMPORTANT: Per HMRC guidance (Jan 2025), to test STATEFUL flow you must:
 * 1. Create a test business using the Self Assessment Test Support (MTD) API
 * 2. Then submit income data to that business
 * 3. Then trigger calculations
 *
 * Endpoint: POST /individuals/self-assessment-test-support/business/{nino}
 * (from mtd-sa-test-support-api)
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
    const [startYear] = taxYear.split('-').map(Number);

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

    let selfEmploymentBusinessId: string | null = null;

    // =========================================================================
    // Step 1: Create Test Business using Self Assessment Test Support API
    // Endpoint: POST /individuals/self-assessment-test-support/business/{nino}
    // =========================================================================
    try {
      const createBusinessResponse = await hmrcClient.post<{ businessId: string }>(
        user.id,
        `/individuals/self-assessment-test-support/business/${cleanNino}`,
        {
          typeOfBusiness: 'self-employment',
          tradingName: 'TaxFolio Test Business',
          firstAccountingPeriodStartDate: `${startYear}-04-06`,
          firstAccountingPeriodEndDate: `${startYear + 1}-04-05`,
          accountingType: 'CASH',
          latencyDetails: {
            latencyEndDate: `${startYear + 1}-04-05`,
            taxYear1: taxYear,
            latencyIndicator1: 'A',
            taxYear2: `${startYear + 1}-${(startYear + 2).toString().slice(-2)}`,
            latencyIndicator2: 'A',
          },
          addressLineOne: '123 Test Street',
          addressPostcode: 'SW1A 1AA',
          countryCode: 'GB',
        },
        { govTestScenario: 'STATEFUL' }
      );

      selfEmploymentBusinessId = createBusinessResponse.businessId;
      steps.push({
        step: 'Create test business',
        status: 'success',
        category: 'self-employment',
        message: `Created test business: ${selfEmploymentBusinessId}`,
        data: { businessId: selfEmploymentBusinessId, tradingName: 'TaxFolio Test Business' },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Check if business already exists - if so, try to retrieve it
      if (errorMsg.includes('BUSINESS_ALREADY_EXISTS') || errorMsg.includes('already exists')) {
        steps.push({
          step: 'Create test business',
          status: 'info',
          category: 'self-employment',
          message: 'Test business already exists for this NINO. Attempting to retrieve existing business...',
        });

        // Try to get existing business from Business Details API
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
            selfEmploymentBusinessId = selfEmploymentBusiness.businessId;
            steps.push({
              step: 'Retrieve existing business',
              status: 'success',
              category: 'self-employment',
              message: `Found existing business: ${selfEmploymentBusiness.tradingName || selfEmploymentBusinessId}`,
              data: { businessId: selfEmploymentBusinessId },
            });
          }
        } catch {
          steps.push({
            step: 'Retrieve existing business',
            status: 'error',
            category: 'self-employment',
            message: 'Could not retrieve existing business details',
          });
        }
      } else if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Create test business',
          status: 'info',
          category: 'self-employment',
          message: 'Test Support API not available for this test user. Ensure user has MTD ITSA enrolment.',
        });
      } else {
        steps.push({
          step: 'Create test business',
          status: 'error',
          category: 'self-employment',
          message: `Failed to create test business: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 2: Submit Self-Employment Income (if we have a business)
    // Uses self-employment-business-api
    // =========================================================================
    if (selfEmploymentBusinessId) {
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
          message: 'Self-employment submitted: £50,000 turnover, £15,000 expenses (profit: £35,500)',
          data: { mode: 'STATEFUL', turnover: 50000, other: 500, expenses: 15000, profit: 35500 },
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
        message: 'Skipped - no business ID available (create test business first)',
      });
    }

    // =========================================================================
    // Step 3: Submit UK Dividends (STATEFUL mode)
    // Uses individuals-dividends-income-api
    // =========================================================================
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/dividends/${cleanNino}/${taxYear}`,
        {
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
          message: 'Dividends API requires MTD ITSA subscription on test user.',
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
    // Step 4: Submit UK Savings Interest (STATEFUL mode)
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
          message: 'Savings API requires MTD ITSA subscription on test user.',
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
    // Step 5: Submit UK Interest (bank accounts)
    // Uses individuals-savings-income-api /uk-accounts endpoint
    // =========================================================================
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/savings/uk-accounts/${cleanNino}/${taxYear}`,
        {
          savingsAccounts: [
            {
              savingsAccountId: 'SAVKB2UVwUTBQGJ', // Example format from HMRC docs
              taxedUkInterest: 500,
              untaxedUkInterest: 200,
            },
          ],
        },
        { govTestScenario: 'STATEFUL' }
      );
      steps.push({
        step: 'Submit UK interest',
        status: 'success',
        category: 'savings',
        message: 'UK Interest submitted: £500 taxed + £200 untaxed',
        data: { mode: 'STATEFUL', taxedUkInterest: 500, untaxedUkInterest: 200 },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Submit UK interest',
          status: 'info',
          category: 'savings',
          message: 'UK Interest API requires MTD ITSA subscription.',
        });
      } else {
        steps.push({
          step: 'Submit UK interest',
          status: 'error',
          category: 'savings',
          message: `UK Interest API error: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 6: Trigger Tax Calculation (STATEFUL mode)
    // Uses individual-calculations-api
    // =========================================================================
    let calculationId: string | null = null;
    try {
      const calcResponse = await hmrcClient.post<{ calculationId?: string; id?: string }>(
        user.id,
        `/individuals/calculations/${cleanNino}/self-assessment/${taxYear}`,
        {
          calculationType: 'inYear',
        },
        { govTestScenario: 'STATEFUL' }
      );
      calculationId = calcResponse.calculationId || calcResponse.id || null;
      steps.push({
        step: 'Trigger calculation',
        status: 'success',
        category: 'calculation',
        message: calculationId ? `Tax calculation triggered: ${calculationId}` : 'Tax calculation triggered',
        data: {
          calculationId,
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
    // Step 7: Retrieve Calculation Results (if we have a calculation ID)
    // =========================================================================
    if (calculationId) {
      try {
        const calcDetails = await hmrcClient.get<{
          calculation?: {
            taxCalculation?: {
              incomeTax?: { totalIncomeReceivedFromAllSources?: number };
              totalIncomeTaxAndNicsDue?: number;
            };
          };
        }>(
          user.id,
          `/individuals/calculations/${cleanNino}/self-assessment/${taxYear}/${calculationId}`,
          { govTestScenario: 'STATEFUL' }
        );

        const taxDue = calcDetails.calculation?.taxCalculation?.totalIncomeTaxAndNicsDue;
        const totalIncome = calcDetails.calculation?.taxCalculation?.incomeTax?.totalIncomeReceivedFromAllSources;

        steps.push({
          step: 'Retrieve calculation',
          status: 'success',
          category: 'calculation',
          message: taxDue !== undefined
            ? `Tax calculation complete: £${taxDue.toLocaleString()} due on £${totalIncome?.toLocaleString() || 'N/A'} income`
            : 'Calculation retrieved (details may be processing)',
          data: calcDetails,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        steps.push({
          step: 'Retrieve calculation',
          status: 'info',
          category: 'calculation',
          message: `Calculation may still be processing: ${errorMsg}`,
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
      businessId: selfEmploymentBusinessId,
      mode: 'STATEFUL',
      explanation: 'Using Self Assessment Test Support API to create test business, then submit income data in STATEFUL mode.',
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
            '✓ APIs working successfully',
            selfEmploymentBusinessId ? `✓ Using business: ${selfEmploymentBusinessId}` : null,
            'Check HMRC Status to verify submitted data',
          ].filter(Boolean)
        : [
            'All APIs showing sandbox limitations',
            'Test user may need different MTD enrolments',
            'Try creating a new Individual test user with MTD Income Tax enrolment',
          ],
      notes: [
        'STATEFUL mode persists data for 7 days',
        'Test business created using Self Assessment Test Support API',
        'Individual test users should have MTD ITSA enrolment',
        '"Sandbox Limitation" means the API is not available for this test user configuration',
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

/**
 * DELETE /api/hmrc/sandbox/setup
 *
 * Clean up test data for a NINO using the Self Assessment Test Support API
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nino = searchParams.get('nino');

    if (!nino) {
      return NextResponse.json(
        { error: 'NINO is required as query parameter' },
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

    // Delete test data using the Test Support API
    try {
      await hmrcClient.delete(
        user.id,
        `/individuals/self-assessment-test-support/business/${cleanNino}`,
        { govTestScenario: 'STATEFUL' }
      );

      return NextResponse.json({
        success: true,
        message: `Test data deleted for NINO: ${cleanNino}`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({
        success: false,
        message: `Could not delete test data: ${errorMsg}`,
      });
    }
  } catch (error) {
    console.error('Sandbox cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
