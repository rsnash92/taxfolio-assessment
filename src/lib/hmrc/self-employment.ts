// HMRC Self-Employment Submission Handler (SA103)
// Handles submission of self-employment income, expenses, and allowances

import { hmrcClient } from './client';
import { SelfEmploymentBusiness } from '@/types/wizard';

// MTD ITSA Self-Employment Business API base
const SE_API_BASE = '/individuals/business/self-employment';

// ============================================================================
// Types
// ============================================================================

interface BusinessDetails {
  businessId: string;
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  tradingName?: string;
  accountingPeriods?: { start: string; end: string }[];
}

interface ListBusinessesResponse {
  listOfBusinesses: BusinessDetails[];
}

interface CumulativePeriodSummary {
  periodDates: {
    periodStartDate: string;
    periodEndDate: string;
  };
  periodIncome?: {
    turnover?: number;
    other?: number;
  };
  periodExpenses?: {
    consolidatedExpenses?: number;
    costOfGoods?: number;
    paymentsToSubcontractors?: number;
    wagesAndStaffCosts?: number;
    carVanTravelExpenses?: number;
    premisesRunningCosts?: number;
    maintenanceCosts?: number;
    adminCosts?: number;
    businessEntertainmentCosts?: number;
    advertisingCosts?: number;
    interestOnBankOtherLoans?: number;
    financeCharges?: number;
    irrecoverableDebts?: number;
    professionalFees?: number;
    depreciation?: number;
    otherExpenses?: number;
  };
}

interface AnnualSummary {
  adjustments?: {
    includedNonTaxableProfits?: number;
    basisAdjustment?: number;
    overlapReliefUsed?: number;
    accountingAdjustment?: number;
    averagingAdjustment?: number;
    outstandingBusinessIncome?: number;
    balancingChargeBpra?: number;
    balancingChargeOther?: number;
    goodsAndServicesOwnUse?: number;
  };
  allowances?: {
    annualInvestmentAllowance?: number;
    capitalAllowanceMainPool?: number;
    capitalAllowanceSpecialRatePool?: number;
    zeroEmissionsGoodsVehicleAllowance?: number;
    enhancedCapitalAllowance?: number;
    allowanceOnSales?: number;
    capitalAllowanceSingleAssetPool?: number;
    electricChargePointAllowance?: number;
    tradingIncomeAllowance?: number;
    structuredBuildingAllowance?: number;
  };
}

export interface SelfEmploymentSubmissionResult {
  submitted: { businessId: string; businessName: string }[];
  errors: { businessId: string; businessName: string; error: string }[];
}

// ============================================================================
// Business Management Functions
// ============================================================================

/**
 * List all businesses for a user (MTD ITSA Business Details API)
 */
async function listAllBusinesses(
  userId: string,
  nino: string
): Promise<ListBusinessesResponse> {
  return hmrcClient.get(
    userId,
    `/individuals/business/details/${nino}/list`,
    { govTestScenario: 'STATEFUL' }
  );
}

/**
 * Get all self-employment businesses for a user
 */
export async function getSelfEmploymentBusinesses(
  userId: string,
  nino: string
): Promise<{ businesses: { businessId: string; tradingName?: string }[] }> {
  try {
    const response = await listAllBusinesses(userId, nino);
    const selfEmploymentBusinesses = response.listOfBusinesses
      ?.filter((b) => b.typeOfBusiness === 'self-employment')
      .map((b) => ({ businessId: b.businessId, tradingName: b.tradingName }));
    return { businesses: selfEmploymentBusinesses || [] };
  } catch {
    // If no businesses found, return empty array
    return { businesses: [] };
  }
}

/**
 * Create a new self-employment business
 */
export async function createSelfEmploymentBusiness(
  userId: string,
  nino: string,
  data: {
    accountingPeriodStartDate: string;
    accountingPeriodEndDate: string;
    tradingName: string;
    addressLineOne: string;
    addressLineTwo?: string;
    addressLineThree?: string;
    addressLineFour?: string;
    postalCode?: string;
    countryCode: string;
    commencementDate: string;
  }
): Promise<{ businessId: string }> {
  return hmrcClient.post(
    userId,
    `${SE_API_BASE}/${nino}`,
    data,
    { govTestScenario: 'STATEFUL' }
  );
}

// ============================================================================
// Period Submission Functions
// ============================================================================

/**
 * Map wizard expense categories to HMRC expense fields
 */
function mapExpensesToHMRC(
  byCategory: Record<string, number>
): CumulativePeriodSummary['periodExpenses'] {
  return {
    costOfGoods: byCategory['cost-of-goods'] || undefined,
    paymentsToSubcontractors: byCategory['subcontractors'] || undefined,
    wagesAndStaffCosts: byCategory['wages'] || undefined,
    carVanTravelExpenses: byCategory['travel'] || undefined,
    premisesRunningCosts: byCategory['premises'] || undefined,
    maintenanceCosts: byCategory['repairs'] || undefined,
    adminCosts: byCategory['admin'] || undefined,
    businessEntertainmentCosts: byCategory['entertainment'] || undefined,
    advertisingCosts: byCategory['advertising'] || undefined,
    interestOnBankOtherLoans: byCategory['interest'] || undefined,
    financeCharges: byCategory['finance-charges'] || undefined,
    irrecoverableDebts: byCategory['bad-debts'] || undefined,
    professionalFees: byCategory['professional-fees'] || undefined,
    depreciation: byCategory['depreciation'] || undefined,
    otherExpenses: byCategory['other'] || undefined,
  };
}

/**
 * Submit cumulative period summary for a self-employment business
 */
export async function submitSelfEmploymentPeriod(
  userId: string,
  nino: string,
  businessId: string,
  taxYear: string,
  business: Partial<SelfEmploymentBusiness>
): Promise<{ periodId?: string }> {
  // Determine period dates from business data or use tax year defaults
  const [startYear] = taxYear.split('-').map(Number);
  const periodStartDate = business.startDate || `${startYear}-04-06`;
  const periodEndDate = business.endDate || `${startYear + 1}-04-05`;

  // Map income and expenses to HMRC format
  const cumulativeSummary: CumulativePeriodSummary = {
    periodDates: {
      periodStartDate,
      periodEndDate,
    },
    periodIncome: {
      turnover: business.income?.total || 0,
      other: undefined,
    },
    periodExpenses: business.expenses?.byCategory
      ? mapExpensesToHMRC(business.expenses.byCategory)
      : undefined,
  };

  // If no itemised expenses but have a total, use consolidated
  if (!business.expenses?.byCategory && business.expenses?.total) {
    cumulativeSummary.periodExpenses = {
      consolidatedExpenses: business.expenses.total,
    };
  }

  return hmrcClient.put(
    userId,
    `${SE_API_BASE}/${nino}/${businessId}/cumulative/${taxYear}`,
    cumulativeSummary,
    { govTestScenario: 'STATEFUL' }
  );
}

/**
 * Submit annual summary (capital allowances, adjustments)
 */
export async function submitAnnualSummary(
  userId: string,
  nino: string,
  businessId: string,
  taxYear: string,
  business: Partial<SelfEmploymentBusiness>
): Promise<void> {
  const summary: AnnualSummary = {};

  // Map capital allowances if present
  if (business.capitalAllowances && business.capitalAllowances.total > 0) {
    summary.allowances = {
      annualInvestmentAllowance: business.capitalAllowances.equipment || undefined,
      capitalAllowanceMainPool: business.capitalAllowances.vehicles || undefined,
      capitalAllowanceSingleAssetPool: business.capitalAllowances.other || undefined,
    };
  }

  // Add loss brought forward as adjustment if present
  if (business.losses?.broughtForward) {
    summary.adjustments = {
      ...summary.adjustments,
      overlapReliefUsed: business.losses.broughtForward,
    };
  }

  // Only submit if we have data
  if (summary.adjustments || summary.allowances) {
    await hmrcClient.put(
      userId,
      `${SE_API_BASE}/${nino}/${businessId}/annual/${taxYear}`,
      summary
    );
  }
}

// ============================================================================
// Main Submission Function
// ============================================================================

/**
 * Submit all self-employment data for all businesses
 */
export async function submitAllSelfEmploymentData(
  userId: string,
  nino: string,
  taxYear: string,
  selfEmploymentData: Record<string, Partial<SelfEmploymentBusiness>>
): Promise<SelfEmploymentSubmissionResult> {
  const result: SelfEmploymentSubmissionResult = {
    submitted: [],
    errors: [],
  };

  // Get existing HMRC businesses
  const { businesses: existingBusinesses } = await getSelfEmploymentBusinesses(userId, nino);
  const existingByName = new Map(
    existingBusinesses.map((b) => [b.tradingName?.toLowerCase(), b.businessId])
  );

  // Process each business from wizard data
  for (const [wizardBusinessId, business] of Object.entries(selfEmploymentData)) {
    if (!business.businessName) {
      result.errors.push({
        businessId: wizardBusinessId,
        businessName: 'Unknown',
        error: 'Business name is required',
      });
      continue;
    }

    try {
      // Find or create HMRC business
      let hmrcBusinessId = existingByName.get(business.businessName.toLowerCase());

      if (!hmrcBusinessId) {
        // Create new business in HMRC
        const [startYear] = taxYear.split('-').map(Number);
        const createResult = await createSelfEmploymentBusiness(userId, nino, {
          accountingPeriodStartDate: `${startYear}-04-06`,
          accountingPeriodEndDate: `${startYear + 1}-04-05`,
          tradingName: business.businessName,
          addressLineOne: business.businessPostcode || 'Not specified',
          countryCode: 'GB',
          commencementDate: business.startDate || `${startYear}-04-06`,
        });
        hmrcBusinessId = createResult.businessId;
      }

      // Submit period data (income and expenses)
      await submitSelfEmploymentPeriod(userId, nino, hmrcBusinessId, taxYear, business);

      // Submit annual summary (capital allowances, losses)
      await submitAnnualSummary(userId, nino, hmrcBusinessId, taxYear, business);

      result.submitted.push({
        businessId: hmrcBusinessId,
        businessName: business.businessName,
      });
    } catch (error) {
      result.errors.push({
        businessId: wizardBusinessId,
        businessName: business.businessName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Calculate summary of self-employment data for display
 */
export function calculateSelfEmploymentSummary(
  selfEmploymentData: Record<string, Partial<SelfEmploymentBusiness>>
): {
  totalIncome: number;
  totalExpenses: number;
  totalCapitalAllowances: number;
  totalProfit: number;
  businessCount: number;
} {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalCapitalAllowances = 0;
  let totalProfit = 0;
  let businessCount = 0;

  for (const business of Object.values(selfEmploymentData)) {
    if (business.businessName) {
      businessCount++;
      totalIncome += business.income?.total || 0;
      totalExpenses += business.expenses?.total || 0;
      totalCapitalAllowances += business.capitalAllowances?.total || 0;
      totalProfit += business.profit || 0;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    totalCapitalAllowances,
    totalProfit,
    businessCount,
  };
}
