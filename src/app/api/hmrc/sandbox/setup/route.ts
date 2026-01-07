import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hmrcClient } from '@/lib/hmrc';

/**
 * POST /api/hmrc/sandbox/setup
 *
 * Tests HMRC sandbox API integration using DYNAMIC (stateless) scenarios.
 *
 * IMPORTANT: HMRC sandbox has limitations:
 * - Self-employment requires a pre-registered business linked to the test user
 * - Businesses cannot be created via API in sandbox
 * - DYNAMIC scenarios return mock success responses without actual data persistence
 *
 * This endpoint tests:
 * 1. Self-employment (will fail without pre-registered business - expected)
 * 2. Dividends income - uses dynamic scenarios
 * 3. Savings/Interest income - uses dynamic scenarios
 * 4. Tax calculation trigger - uses dynamic scenarios
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

    // =========================================================================
    // Step 1: Check for existing businesses (informational)
    // =========================================================================
    let existingBusinesses: Array<{ businessId: string; typeOfBusiness: string; tradingName?: string }> = [];

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
          message: 'No self-employment business registered for this test user. This is expected - HMRC sandbox does not support business creation via API.',
          data: { existingBusinesses },
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Check businesses',
        status: 'info',
        category: 'self-employment',
        message: `Could not list businesses: ${errorMsg}. Self-employment testing requires manual business registration.`,
      });
    }

    // =========================================================================
    // Step 2: Test Dividends API (DYNAMIC scenario - mock response)
    // =========================================================================
    try {
      // Submit dividends data using dynamic scenario
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/dividends/${cleanNino}/${taxYear}`,
        {
          foreignDividend: [
            {
              countryCode: 'USA',
              amountBeforeTax: 1000,
              taxTakenOff: 150,
              specialWithholdingTax: 0,
              foreignTaxCreditRelief: true,
              taxableAmount: 850,
            },
          ],
          dividendIncomeReceivedWhilstAbroad: [],
          stockDividend: {
            customerReference: 'STOCK-DIV-001',
            grossAmount: 500,
          },
          redeemableShares: {
            customerReference: 'REDEEM-001',
            grossAmount: 200,
          },
          bonusIssuesOfSecurities: {
            customerReference: 'BONUS-001',
            grossAmount: 100,
          },
          closeCompanyLoansWrittenOff: {
            customerReference: 'LOAN-001',
            grossAmount: 300,
          },
        },
        { govTestScenario: 'DYNAMIC' }
      );
      steps.push({
        step: 'Submit dividends',
        status: 'success',
        category: 'dividends',
        message: 'Dividends API integration verified (£1,000 foreign dividends, £500 stock dividends)',
        data: { mode: 'DYNAMIC', note: 'Mock response - data not persisted' },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Submit dividends',
        status: 'error',
        category: 'dividends',
        message: `Dividends API error: ${errorMsg}`,
      });
    }

    // =========================================================================
    // Step 3: Test Savings/Interest API (DYNAMIC scenario - mock response)
    // =========================================================================
    try {
      // Submit savings data using dynamic scenario
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/savings/${cleanNino}/${taxYear}`,
        {
          securities: {
            taxTakenOff: 100,
            grossAmount: 2000,
            netAmount: 1900,
          },
          foreignInterest: [
            {
              amountBeforeTax: 500,
              countryCode: 'DEU',
              taxTakenOff: 75,
              specialWithholdingTax: 0,
              taxableAmount: 425,
              foreignTaxCreditRelief: true,
            },
          ],
        },
        { govTestScenario: 'DYNAMIC' }
      );
      steps.push({
        step: 'Submit savings',
        status: 'success',
        category: 'savings',
        message: 'Savings/Interest API integration verified (£2,000 securities, £500 foreign interest)',
        data: { mode: 'DYNAMIC', note: 'Mock response - data not persisted' },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Submit savings',
        status: 'error',
        category: 'savings',
        message: `Savings API error: ${errorMsg}`,
      });
    }

    // =========================================================================
    // Step 4: Test UK Interest API (DYNAMIC scenario - mock response)
    // =========================================================================
    try {
      await hmrcClient.put(
        user.id,
        `/individuals/income-received/uk-savings-accounts/${cleanNino}/${taxYear}`,
        {
          incomeSourceId: 'SAVKB2UVwUTBQGJ',
          taxedUkInterest: 1500,
          untaxedUkInterest: 300,
        },
        { govTestScenario: 'DYNAMIC' }
      );
      steps.push({
        step: 'Submit UK interest',
        status: 'success',
        category: 'savings',
        message: 'UK Interest API integration verified (£1,500 taxed, £300 untaxed)',
        data: { mode: 'DYNAMIC', note: 'Mock response - data not persisted' },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      // This endpoint might not exist or have different requirements
      steps.push({
        step: 'Submit UK interest',
        status: 'info',
        category: 'savings',
        message: `UK Interest endpoint: ${errorMsg}`,
      });
    }

    // =========================================================================
    // Step 5: Test Tax Calculation trigger (DYNAMIC scenario)
    // =========================================================================
    try {
      const calcResponse = await hmrcClient.post<{ calculationId?: string }>(
        user.id,
        `/individuals/calculations/self-assessment/${cleanNino}/${taxYear}`,
        {},
        { govTestScenario: 'DYNAMIC' }
      );
      steps.push({
        step: 'Trigger calculation',
        status: 'success',
        category: 'calculation',
        message: `Tax calculation API integration verified`,
        data: {
          calculationId: calcResponse.calculationId || 'mock-id',
          mode: 'DYNAMIC',
          note: 'Mock response - no actual calculation performed'
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      steps.push({
        step: 'Trigger calculation',
        status: 'error',
        category: 'calculation',
        message: `Calculation API error: ${errorMsg}`,
      });
    }

    // =========================================================================
    // Summary
    // =========================================================================
    const successCount = steps.filter((s) => s.status === 'success').length;
    const errorCount = steps.filter((s) => s.status === 'error').length;
    const infoCount = steps.filter((s) => s.status === 'info').length;

    const categorySummary = {
      selfEmployment: steps.find(s => s.category === 'self-employment')?.status === 'success'
        ? 'Working'
        : 'Requires manual business registration',
      dividends: steps.find(s => s.category === 'dividends')?.status === 'success'
        ? 'Working'
        : 'Error',
      savings: steps.filter(s => s.category === 'savings' && s.status === 'success').length > 0
        ? 'Working'
        : 'Error',
      calculation: steps.find(s => s.category === 'calculation')?.status === 'success'
        ? 'Working'
        : 'Error',
    };

    return NextResponse.json({
      success: errorCount === 0,
      mode: 'DYNAMIC (Stateless)',
      explanation: 'Using DYNAMIC scenarios which return mock success responses. This verifies API integration without requiring pre-registered businesses.',
      steps,
      summary: {
        totalSteps: steps.length,
        successful: successCount,
        errors: errorCount,
        informational: infoCount,
      },
      categorySummary,
      nextSteps: errorCount > 0
        ? [
            'Review errors above',
            'Check HMRC API credentials and permissions',
            'Verify test user has correct MTD ITSA enrolment',
          ]
        : [
            '✓ API integration verified for dividends and savings',
            '✓ Tax calculation trigger working',
            'Self-employment requires business registration in HMRC portal',
            'For production: Real businesses will be available after user connects their HMRC account',
          ],
      notes: [
        'DYNAMIC mode returns mock responses - data is not persisted',
        'Self-employment in sandbox requires manually registered business via HMRC portal',
        'Production API will work differently - users will have real businesses registered',
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
