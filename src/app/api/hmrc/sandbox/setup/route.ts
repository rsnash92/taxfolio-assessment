import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hmrcClient, hmrcAppClient } from '@/lib/hmrc';

/**
 * POST /api/hmrc/sandbox/setup
 *
 * Tests HMRC sandbox API integration using STATEFUL scenarios.
 *
 * Flow:
 * 1. Create a test business using Self Assessment Test Support API
 * 2. Submit self-employment income
 * 3. Submit dividends income
 * 4. Submit savings interest
 * 5. Trigger tax calculation
 *
 * Based on HMRC guidance: Use the "Create a Test Business" endpoint
 * within the Self Assessment Test Support (MTD) API for STATEFUL testing.
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Track the businessId we create
    let businessId: string | null = null;

    // =========================================================================
    // Step 1: Create Test Business using Self Assessment Test Support API
    // NOTE: This uses APPLICATION-RESTRICTED auth (client credentials)
    // =========================================================================
    try {
      const createBusinessResponse = await hmrcAppClient.post<{
        businessId: string;
        links?: Array<{ href: string; method: string; rel: string }>;
      }>(
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
          addressLineTwo: 'Test Town',
          addressPostcode: 'SW1A 1AA',
          countryCode: 'GB',
        },
        { govTestScenario: 'STATEFUL' }
      );

      businessId = createBusinessResponse.businessId;

      steps.push({
        step: 'Create test business',
        status: 'success',
        category: 'self-employment',
        message: `Test business created: ${businessId}`,
        data: {
          businessId,
          tradingName: 'TaxFolio Test Business',
          accountingType: 'CASH',
        },
      });
    } catch (err) {
      // Log full error for debugging
      console.error('=== CREATE TEST BUSINESS ERROR ===');
      console.error('Full error:', err);
      if (err && typeof err === 'object' && 'code' in err) {
        const hmrcErr = err as { code: string; statusCode: number; errors?: Array<{ code: string; message: string }> };
        console.error('HMRC Error Code:', hmrcErr.code);
        console.error('HMRC Status Code:', hmrcErr.statusCode);
        console.error('HMRC Errors array:', JSON.stringify(hmrcErr.errors, null, 2));
      }
      console.error('=================================');

      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Check if business already exists (common scenario)
      if (errorMsg.includes('BUSINESS_ALREADY_EXISTS') || errorMsg.includes('already exists')) {
        steps.push({
          step: 'Create test business',
          status: 'info',
          category: 'self-employment',
          message: 'Business already exists for this test user. Attempting to retrieve...',
        });

        // Try to get existing business
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
              step: 'Retrieve existing business',
              status: 'success',
              category: 'self-employment',
              message: `Found existing business: ${businessId}`,
              data: selfEmploymentBusiness,
            });
          }
        } catch (listErr) {
          steps.push({
            step: 'Retrieve existing business',
            status: 'error',
            category: 'self-employment',
            message: `Could not retrieve existing business: ${listErr instanceof Error ? listErr.message : 'Unknown error'}`,
          });
        }
      } else if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Create test business',
          status: 'info',
          category: 'self-employment',
          message: 'Test Support API not available for this test user. This is a sandbox limitation.',
        });
      } else {
        steps.push({
          step: 'Create test business',
          status: 'error',
          category: 'self-employment',
          message: `Error creating test business: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 2: Submit Self-Employment Income (if we have a businessId)
    // =========================================================================
    if (businessId) {
      try {
        // Submit cumulative self-employment data
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
          step: 'Submit self-employment income',
          status: 'success',
          category: 'self-employment',
          message: 'Self-employment income submitted: £50,000 turnover, £15,000 expenses (£35,500 profit)',
          data: {
            businessId,
            turnover: 50000,
            other: 500,
            expenses: 15000,
            profit: 35500,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        steps.push({
          step: 'Submit self-employment income',
          status: 'error',
          category: 'self-employment',
          message: `Self-employment submission error: ${errorMsg}`,
        });
      }
    } else {
      steps.push({
        step: 'Submit self-employment income',
        status: 'skipped',
        category: 'self-employment',
        message: 'Skipped - no business ID available',
      });
    }

    // =========================================================================
    // Step 3: Submit UK Dividends (STATEFUL mode)
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
        data: { ukDividends: 2500, otherUkDividends: 500 },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Submit UK dividends',
          status: 'info',
          category: 'dividends',
          message: 'Dividends API requires MTD ITSA subscription. This is a sandbox limitation.',
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
    // Step 4: Submit Savings Interest (STATEFUL mode)
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
        data: { grossAmount: 1000, taxTakenOff: 200, netAmount: 800 },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Submit savings interest',
          status: 'info',
          category: 'savings',
          message: 'Savings API requires MTD ITSA subscription. This is a sandbox limitation.',
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
    // Step 5: Submit UK Interest (taxed and untaxed)
    // =========================================================================
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/savings/uk-accounts/${cleanNino}/${taxYear}`,
        {
          taxedUkInterest: [
            {
              accountName: 'Test Bank Savings Account',
              grossAmount: 500,
              taxDeducted: 100,
            },
          ],
          untaxedUkInterest: [
            {
              accountName: 'Test ISA Account',
              grossAmount: 200,
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
        data: { taxedInterest: 500, untaxedInterest: 200 },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Submit UK interest',
          status: 'info',
          category: 'savings',
          message: 'UK Interest API requires MTD ITSA subscription. This is a sandbox limitation.',
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
    // Step 6: Trigger Tax Calculation
    // =========================================================================
    let calculationId: string | null = null;

    try {
      const calcResponse = await hmrcClient.post<{
        calculationId?: string;
        id?: string;
      }>(
        user.id,
        `/individuals/calculations/${cleanNino}/self-assessment/${taxYear}`,
        {
          calculationType: 'inYear',
        },
        { govTestScenario: 'STATEFUL' }
      );

      calculationId = calcResponse.calculationId || calcResponse.id || null;

      steps.push({
        step: 'Trigger tax calculation',
        status: 'success',
        category: 'calculation',
        message: `Tax calculation triggered${calculationId ? `: ${calculationId}` : ''}`,
        data: { calculationId },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxLimitation(errorMsg)) {
        steps.push({
          step: 'Trigger tax calculation',
          status: 'info',
          category: 'calculation',
          message: 'Calculation API requires submitted income data and MTD ITSA subscription.',
        });
      } else {
        steps.push({
          step: 'Trigger tax calculation',
          status: 'error',
          category: 'calculation',
          message: `Calculation API error: ${errorMsg}`,
        });
      }
    }

    // =========================================================================
    // Step 7: Retrieve Calculation Results (if calculation triggered)
    // =========================================================================
    if (calculationId) {
      try {
        const calcDetails = await hmrcClient.get<{
          calculation?: {
            incomeTax?: {
              totalIncomeReceivedFromAllSources?: number;
              totalTaxableIncome?: number;
              incomeTaxAmount?: number;
            };
            nationalInsuranceContributions?: {
              class2Nics?: { amount?: number };
              class4Nics?: { amount?: number };
            };
          };
        }>(
          user.id,
          `/individuals/calculations/${cleanNino}/self-assessment/${taxYear}/${calculationId}`,
          { govTestScenario: 'STATEFUL' }
        );

        const incomeTax = calcDetails.calculation?.incomeTax;
        const nics = calcDetails.calculation?.nationalInsuranceContributions;

        steps.push({
          step: 'Retrieve calculation results',
          status: 'success',
          category: 'calculation',
          message: 'Calculation results retrieved',
          data: {
            totalIncome: incomeTax?.totalIncomeReceivedFromAllSources,
            taxableIncome: incomeTax?.totalTaxableIncome,
            incomeTaxAmount: incomeTax?.incomeTaxAmount,
            class2Nics: nics?.class2Nics?.amount,
            class4Nics: nics?.class4Nics?.amount,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        steps.push({
          step: 'Retrieve calculation results',
          status: 'error',
          category: 'calculation',
          message: `Could not retrieve calculation: ${errorMsg}`,
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
      const categorySteps = steps.filter((s) => s.category === category);
      if (categorySteps.some((s) => s.status === 'success')) return 'Working';
      if (categorySteps.some((s) => s.status === 'error')) return 'Error';
      if (categorySteps.some((s) => s.status === 'info')) return 'Sandbox Limitation';
      return 'Skipped';
    };

    const categorySummary = {
      selfEmployment: getCategoryStatus('self-employment'),
      dividends: getCategoryStatus('dividends'),
      savings: getCategoryStatus('savings'),
      calculation: getCategoryStatus('calculation'),
    };

    return NextResponse.json({
      success: successCount > 0,
      mode: 'STATEFUL',
      explanation:
        'Using Self Assessment Test Support API to create test business, then submitting income data.',
      businessId,
      calculationId,
      steps,
      summary: {
        totalSteps: steps.length,
        successful: successCount,
        errors: errorCount,
        informational: infoCount,
        skipped: skippedCount,
      },
      categorySummary,
      nextSteps:
        successCount > 0
          ? [
              '✓ Test data created successfully',
              'Check HMRC Status page to verify submitted data',
              'Data persists for 7 days in sandbox',
              businessId ? `Business ID: ${businessId}` : null,
              calculationId ? `Calculation ID: ${calculationId}` : null,
            ].filter(Boolean)
          : [
              'Some APIs not available for this test user',
              'Try creating a new Individual test user at developer.service.hmrc.gov.uk/api-test-user',
              'Ensure MTD Income Tax (Self Assessment) is selected',
            ],
      notes: [
        'STATEFUL mode persists data for 7 days',
        'Test business created via Self Assessment Test Support API',
        'Production API will work differently - real users will have proper subscriptions',
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

/**
 * DELETE /api/hmrc/sandbox/setup
 *
 * Cleans up test data from the sandbox.
 * Uses the Self Assessment Test Support API to delete stateful data.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nino = searchParams.get('nino');

    if (!nino) {
      return NextResponse.json(
        { error: 'NINO is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const cleanNino = nino.replace(/\s/g, '').toUpperCase();

    // Delete stateful test data using Application-Restricted auth
    await hmrcAppClient.delete(
      `/individuals/self-assessment-test-support/vendor-state?nino=${cleanNino}`,
      { govTestScenario: 'STATEFUL' }
    );

    return NextResponse.json({
      success: true,
      message: `Stateful test data deleted for NINO: ${cleanNino}`,
    });
  } catch (error) {
    console.error('Sandbox cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
