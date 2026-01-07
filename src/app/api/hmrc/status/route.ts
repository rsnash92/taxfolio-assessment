import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hmrcClient, isHMRCConnected } from '@/lib/hmrc';

/**
 * GET /api/hmrc/status
 *
 * Returns the current state of a user's HMRC submissions including:
 * - Connection status
 * - Registered businesses (self-employment, property)
 * - Submitted income data
 * - Latest tax calculation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nino = searchParams.get('nino');
    const taxYear = searchParams.get('taxYear') || '2024-25';

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check HMRC connection
    const connected = await isHMRCConnected(user.id);
    if (!connected) {
      return NextResponse.json({
        connected: false,
        message: 'HMRC account not connected',
      });
    }

    if (!nino) {
      return NextResponse.json(
        { error: 'NINO is required. Pass ?nino=XX123456X' },
        { status: 400 }
      );
    }

    const cleanNino = nino.replace(/\s/g, '').toUpperCase();
    interface Business {
      businessId: string;
      typeOfBusiness: string;
      tradingName?: string;
      accountingPeriods?: Array<{ start: string; end: string }>;
    }

    // Helper to categorize errors
    const isSandboxError = (message: string): boolean => {
      return (
        message.includes('not subscribed to the API') ||
        message.includes('resource with the name in the request can not be found') ||
        message.includes('MATCHING_RESOURCE_NOT_FOUND') ||
        message.includes('NOT_FOUND')
      );
    };

    const status: {
      connected: boolean;
      nino: string;
      taxYear: string;
      businesses: Business[];
      selfEmployment: Array<{ businessId: string; tradingName?: string; periodData?: unknown; error?: string }>;
      property: { businessId: string; periodData?: unknown; error?: string } | null;
      employment: Array<{ employmentId: string; employerName: string; employerRef?: string }>;
      dividends: unknown;
      interest: unknown;
      calculations: Array<{ calculationId: string; calculationTimestamp: string; calculationType: string }>;
      errors: string[];
      sandboxWarnings: string[];
    } = {
      connected: true,
      nino: cleanNino,
      taxYear,
      businesses: [],
      selfEmployment: [],
      property: null,
      employment: [],
      dividends: null,
      interest: null,
      calculations: [],
      errors: [],
      sandboxWarnings: [],
    };

    // 1. List all businesses
    try {
      const businessesResponse = await hmrcClient.get<{
        listOfBusinesses: Business[];
      }>(user.id, `/individuals/business/details/${cleanNino}/list`, {
        govTestScenario: 'STATEFUL',
      });
      status.businesses = businessesResponse.listOfBusinesses || [];

      // 2. For each self-employment business, get period data
      const selfEmploymentBusinesses = status.businesses.filter(
        (b) => b.typeOfBusiness === 'self-employment'
      );

      for (const business of selfEmploymentBusinesses) {
        try {
          const periodData = await hmrcClient.get(
            user.id,
            `/individuals/business/self-employment/${cleanNino}/${business.businessId}/cumulative/${taxYear}`,
            { govTestScenario: 'STATEFUL' }
          );
          status.selfEmployment.push({
            businessId: business.businessId,
            tradingName: business.tradingName,
            periodData,
          });
        } catch (err) {
          status.selfEmployment.push({
            businessId: business.businessId,
            tradingName: business.tradingName,
            error: err instanceof Error ? err.message : 'Failed to fetch period data',
          });
        }
      }

      // 3. For property business, get period data
      const propertyBusiness = status.businesses.find(
        (b) => b.typeOfBusiness === 'uk-property'
      );

      if (propertyBusiness) {
        try {
          const propertyData = await hmrcClient.get(
            user.id,
            `/individuals/business/property/uk/${cleanNino}/${propertyBusiness.businessId}/period/${taxYear}`,
            { govTestScenario: 'STATEFUL' }
          );
          status.property = {
            businessId: propertyBusiness.businessId,
            periodData: propertyData,
          };
        } catch (err) {
          status.property = {
            businessId: propertyBusiness.businessId,
            error: err instanceof Error ? err.message : 'Failed to fetch property data',
          };
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (isSandboxError(msg)) {
        status.sandboxWarnings.push(`Businesses: ${msg}`);
      } else {
        status.errors.push(`Businesses: ${msg}`);
      }
    }

    // 4. Get employment data
    try {
      const employmentResponse = await hmrcClient.get<{
        employments: Array<{
          employmentId: string;
          employerName: string;
          employerRef?: string;
        }>;
      }>(user.id, `/individuals/employments-income/employments/${cleanNino}/${taxYear}`);
      status.employment = employmentResponse.employments || [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // Employment endpoint might return 404 if no employments
      if (!msg.includes('404')) {
        if (isSandboxError(msg)) {
          status.sandboxWarnings.push(`Employment: ${msg}`);
        } else {
          status.errors.push(`Employment: ${msg}`);
        }
      }
    }

    // 5. Get dividends data
    try {
      const dividendsResponse = await hmrcClient.get(
        user.id,
        `/individuals/income-received/dividends/${cleanNino}/${taxYear}`
      );
      status.dividends = dividendsResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // Might return 404 if no dividends submitted
      if (!msg.includes('404')) {
        if (isSandboxError(msg)) {
          status.sandboxWarnings.push(`Dividends: ${msg}`);
        } else {
          status.errors.push(`Dividends: ${msg}`);
        }
      }
    }

    // 6. Get interest/savings data
    try {
      const interestResponse = await hmrcClient.get(
        user.id,
        `/individuals/income-received/savings/${cleanNino}/${taxYear}`
      );
      status.interest = interestResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // Might return 404 if no interest submitted
      if (!msg.includes('404')) {
        if (isSandboxError(msg)) {
          status.sandboxWarnings.push(`Interest: ${msg}`);
        } else {
          status.errors.push(`Interest: ${msg}`);
        }
      }
    }

    // 7. List tax calculations
    try {
      const calculationsResponse = await hmrcClient.get<{
        calculations: Array<{
          calculationId: string;
          calculationTimestamp: string;
          calculationType: string;
        }>;
      }>(user.id, `/individuals/calculations/self-assessment/${cleanNino}/${taxYear}`);
      status.calculations = calculationsResponse.calculations || [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // Might return 404 if no calculations triggered
      if (!msg.includes('404')) {
        if (isSandboxError(msg)) {
          status.sandboxWarnings.push(`Calculations: ${msg}`);
        } else {
          status.errors.push(`Calculations: ${msg}`);
        }
      }
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('HMRC status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
